// ─── Evidence Re-use Recommendation Service ──────────────────────────────────
// Derives a ReuseReport from a completed MappingSession.
//
// Algorithm:
//   1. Index all chunks that scored well (>= MIN_SOURCE_SCORE) in the session.
//   2. Build a bidirectional link graph from related_requirements.
//   3. For each (chunk, source_req) pair, walk related target requirements.
//   4. Skip targets already well-covered by this chunk.
//   5. Re-score the chunk against the target using keyword scorer (fast, pure).
//   6. If score >= MIN_REUSE_SCORE → emit a ReuseCandidate.
//   7. Group by target requirement, deduplicate, sort, compute improvements.

import { randomUUID } from 'crypto'
import type { MappingSession, RequirementMapping } from '@/lib/types/mapping'
import type {
  ReuseReport,
  ReuseCandidate,
  RequirementReuseGroup,
  ReuseSummary,
  ReuseLinkType,
} from '@/lib/types/reuse'
import type { GapStatus } from '@/lib/types/gap'
import type { RequirementTemplate, Priority } from '@/lib/plugins/types'
import type { DocumentChunk } from '@/lib/types/documents'
import { scoreChunk } from '@/lib/services/mapping/scorer'
import { saveReuseReport } from '@/lib/store/reuseStore'

// ── Config ────────────────────────────────────────────────────────────────────

/** Minimum source relevanceScore for a chunk to be considered for reuse. */
const MIN_SOURCE_SCORE = 0.15

/**
 * Minimum re-score against target requirement to emit a candidate.
 * Deliberately low — we want to surface opportunities, not filter aggressively.
 */
const MIN_REUSE_SCORE = 0.06

/**
 * A chunk scoring >= this against the target is considered "already present" —
 * reuse not needed.
 */
const ALREADY_PRESENT_THRESHOLD = 0.12

/** Boost applied to suggestedRelevance when an explicit link exists. */
const RELATED_LINK_BOOST = 1.25

// ── Domain pair explanations ──────────────────────────────────────────────────

const DOMAIN_PAIR_CONTEXT: Record<string, string> = {
  'Risk-Cybersecurity':
    'Cybersecurity hazard evidence (threat models, security risk controls) can satisfy ISO 14971 risk management requirements.',
  'Cybersecurity-Risk':
    'Risk management evidence (hazard analysis, control measures) may cover cybersecurity-safety integration requirements per IEC 81001-5-1.',
  'Risk-SWValidation':
    'Software hazard analysis documentation overlaps with software safety classification and requirements traceability.',
  'SWValidation-Risk':
    'Software development artefacts containing risk-related requirements can support ISO 14971 risk analysis records.',
  'Risk-Usability':
    'Use error analysis from risk management may directly satisfy IEC 62366 usability engineering requirements.',
  'Usability-Risk':
    'Summative usability evaluation findings (use errors, root causes) contribute to residual risk assessment under ISO 14971.',
  'Cybersecurity-SWValidation':
    'SBOM and security lifecycle artefacts align closely with IEC 62304 software development documentation requirements.',
  'SWValidation-Cybersecurity':
    'Software development plan and requirements specification evidence may satisfy IEC 81001-5-1 security lifecycle requirements.',
  'SWValidation-Usability':
    'Software requirements specification with UI/UX requirements may satisfy IEC 62366 use specification artefacts.',
  'Usability-SWValidation':
    'Usability evaluation findings and user task analysis can contribute to software requirements traceability evidence.',
}

// ── GapStatus helpers ─────────────────────────────────────────────────────────

function mappingStatusToGapStatus(s: 'covered' | 'partial' | 'missing'): GapStatus {
  return s === 'covered' ? 'sufficient' : s
}

const GAP_SEVERITY: Record<GapStatus, number> = { missing: 2, partial: 1, sufficient: 0 }
const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4, major: 3, minor: 2, informational: 1,
}

// ── Explanation builder ───────────────────────────────────────────────────────

function buildExplanation(
  chunk: DocumentChunk,
  sourceReq: RequirementTemplate,
  targetReq: RequirementTemplate,
  matchedKeywords: string[],
  linkType: ReuseLinkType,
): string {
  const loc = chunk.citation.pageNumber
    ? `p.${chunk.citation.pageNumber}`
    : chunk.citation.sheetName
      ? `sheet "${chunk.citation.sheetName}"`
      : 'this section'

  const kwPhrase =
    matchedKeywords.length > 0
      ? ` Shared terms: [${matchedKeywords.slice(0, 4).join(', ')}].`
      : ''

  const pairKey = `${sourceReq.domain}-${targetReq.domain}`
  const domainContext = DOMAIN_PAIR_CONTEXT[pairKey]

  if (domainContext) {
    return `${domainContext}${kwPhrase} Source: ${loc}.`
  }

  if (linkType === 'related' || linkType === 'both') {
    return (
      `This evidence from "${sourceReq.title}" (${loc}) is explicitly linked to ` +
      `"${targetReq.title}" via regulatory cross-reference.${kwPhrase}`
    )
  }

  return (
    `This ${sourceReq.domain} evidence (${loc}) may address part of the ` +
    `"${targetReq.title}" requirement based on shared terminology.${kwPhrase}`
  )
}

// ── Potential improvement estimator ──────────────────────────────────────────

function estimatePotentialImprovement(
  currentStatus: GapStatus,
  candidates: ReuseCandidate[],
): GapStatus | null {
  if (currentStatus === 'sufficient') return null

  const bestScore = Math.max(...candidates.map((c) => c.suggestedRelevance), 0)
  const highCount = candidates.filter((c) => c.suggestedRelevance >= 0.20).length

  if (currentStatus === 'missing') {
    // Even one decent candidate moves it to partial
    if (bestScore >= 0.10) return 'partial'
  }

  if (currentStatus === 'partial') {
    // Need a strong candidate to move to sufficient
    if (bestScore >= 0.35 && highCount >= 1) return 'sufficient'
  }

  return null
}

// ── Cross-domain pair counter ─────────────────────────────────────────────────

function buildCrossDomainPairs(
  groups: RequirementReuseGroup[],
): ReuseSummary['crossDomainPairs'] {
  const counter = new Map<string, number>()
  for (const group of groups) {
    for (const c of group.candidates) {
      if (c.sourceRequirement.domain !== group.targetRequirement.domain) {
        const key = `${c.sourceRequirement.domain}→${group.targetRequirement.domain}`
        counter.set(key, (counter.get(key) ?? 0) + 1)
      }
    }
  }
  return [...counter.entries()].map(([pair, count]) => {
    const [sourceDomain, targetDomain] = pair.split('→')
    return { sourceDomain, targetDomain, count }
  }).sort((a, b) => b.count - a.count)
}

// ── Main builder ──────────────────────────────────────────────────────────────

/**
 * Derives a ReuseReport from a completed MappingSession.
 * Persists the report to reuseStore and returns it.
 */
export function buildReuseReport(session: MappingSession): ReuseReport {
  // ── 1. Index chunks that scored well in the session ────────────────────────
  // chunkSources: chunkId → list of {reqId, score, chunk}
  const chunkSources = new Map<
    string,
    Array<{ reqId: string; score: number; chunk: DocumentChunk }>
  >()

  for (const mapping of session.mappings) {
    for (const match of mapping.matchedChunks) {
      if (match.relevanceScore < MIN_SOURCE_SCORE) continue
      const existing = chunkSources.get(match.chunkId) ?? []
      // Avoid duplicate source entries for the same (chunk, req) pair
      if (!existing.some((e) => e.reqId === mapping.requirementId)) {
        existing.push({
          reqId: mapping.requirementId,
          score: match.relevanceScore,
          chunk: match.chunk,
        })
      }
      chunkSources.set(match.chunkId, existing)
    }
  }

  // ── 2. Build bidirectional link graph ──────────────────────────────────────
  const reqById = new Map<string, RequirementTemplate>()
  const relatedLinks = new Map<string, Set<string>>()

  for (const mapping of session.mappings) {
    const req = mapping.requirement
    reqById.set(req.requirement_id, req)

    const fwd = relatedLinks.get(req.requirement_id) ?? new Set()
    for (const relId of req.related_requirements) {
      fwd.add(relId)
    }
    relatedLinks.set(req.requirement_id, fwd)

    // Reverse direction
    for (const relId of req.related_requirements) {
      const rev = relatedLinks.get(relId) ?? new Set()
      rev.add(req.requirement_id)
      relatedLinks.set(relId, rev)
    }
  }

  // ── 3. Index chunks already well-matched to each requirement ───────────────
  const reqPresentChunks = new Map<string, Set<string>>()
  for (const mapping of session.mappings) {
    reqPresentChunks.set(
      mapping.requirementId,
      new Set(
        mapping.matchedChunks
          .filter((m) => m.relevanceScore >= ALREADY_PRESENT_THRESHOLD)
          .map((m) => m.chunkId),
      ),
    )
  }

  // ── 4. Gap status per requirement ──────────────────────────────────────────
  const gapByReq = new Map<string, GapStatus>()
  for (const mapping of session.mappings) {
    gapByReq.set(mapping.requirementId, mappingStatusToGapStatus(mapping.gapStatus))
  }

  // ── 5. Find candidates ─────────────────────────────────────────────────────
  // targetKey = targetReqId | chunkId → best candidate (avoid duplicates)
  const bestCandidates = new Map<string, ReuseCandidate>()

  for (const [chunkId, sources] of chunkSources) {
    for (const { reqId: sourceReqId, chunk } of sources) {
      const related = relatedLinks.get(sourceReqId) ?? new Set()

      for (const targetReqId of related) {
        if (targetReqId === sourceReqId) continue

        const targetReq = reqById.get(targetReqId)
        if (!targetReq) continue  // not in this session

        // Skip targets that are already well covered
        const targetStatus = gapByReq.get(targetReqId)
        if (targetStatus === 'sufficient') continue

        // Skip chunks already present in the target's matched list
        if (reqPresentChunks.get(targetReqId)?.has(chunkId)) continue

        // Re-score the chunk against the target requirement
        const { score: rawScore, matchedKeywords } = scoreChunk(chunk, targetReq)
        if (rawScore < MIN_REUSE_SCORE) continue

        const sourceReq = reqById.get(sourceReqId)!

        // Determine link type
        const explicitFwd = sourceReq.related_requirements.includes(targetReqId)
        const explicitRev = targetReq.related_requirements.includes(sourceReqId)
        const isExplicit  = explicitFwd || explicitRev

        const linkType: ReuseLinkType =
          isExplicit && rawScore >= MIN_REUSE_SCORE * 1.5 ? 'both'
          : isExplicit                                    ? 'related'
          :                                                 'keyword'

        const suggestedRelevance = Math.min(
          rawScore * (isExplicit ? RELATED_LINK_BOOST : 1.0),
          1,
        )

        const candidate: ReuseCandidate = {
          chunkId,
          chunk,
          sourceRequirementId: sourceReqId,
          sourceRequirement:   sourceReq,
          targetRequirementId: targetReqId,
          targetRequirement:   targetReq,
          suggestedRelevance,
          linkType,
          explanation: buildExplanation(chunk, sourceReq, targetReq, matchedKeywords, linkType),
          status:      'suggested',
          citation:    chunk.citation,
        }

        // Deduplication: keep best candidate per (target, chunk) pair
        const key = `${targetReqId}|${chunkId}`
        const existing = bestCandidates.get(key)
        if (!existing || candidate.suggestedRelevance > existing.suggestedRelevance) {
          bestCandidates.set(key, candidate)
        }
      }
    }
  }

  // ── 6. Group candidates by target requirement ──────────────────────────────
  const groupMap = new Map<string, ReuseCandidate[]>()
  for (const candidate of bestCandidates.values()) {
    const list = groupMap.get(candidate.targetRequirementId) ?? []
    list.push(candidate)
    groupMap.set(candidate.targetRequirementId, list)
  }

  const groups: RequirementReuseGroup[] = []
  for (const [targetReqId, candidates] of groupMap) {
    const targetReq    = reqById.get(targetReqId)!
    const currentStatus = gapByReq.get(targetReqId) ?? 'missing'

    // Sort candidates: highest relevance first
    const sorted = [...candidates].sort(
      (a, b) => b.suggestedRelevance - a.suggestedRelevance,
    )

    groups.push({
      targetRequirementId: targetReqId,
      targetRequirement:   targetReq,
      currentGapStatus:    currentStatus,
      potentialImprovement: estimatePotentialImprovement(currentStatus, sorted),
      candidates:          sorted,
    })
  }

  // ── 7. Sort groups: highest-priority, worst-status, most-improvable first ──
  groups.sort((a, b) => {
    const priorityDiff =
      PRIORITY_WEIGHT[b.targetRequirement.priority] -
      PRIORITY_WEIGHT[a.targetRequirement.priority]
    if (priorityDiff !== 0) return priorityDiff
    return GAP_SEVERITY[b.currentGapStatus] - GAP_SEVERITY[a.currentGapStatus]
  })

  // ── 8. Build summary ───────────────────────────────────────────────────────
  const totalCandidates = [...bestCandidates.values()].length
  const criticalCoverageCount = groups.filter(
    (g) =>
      g.targetRequirement.priority === 'critical' &&
      g.currentGapStatus === 'missing',
  ).length
  const improvableRequirements = groups.filter(
    (g) => g.potentialImprovement !== null,
  ).length

  const summary: ReuseSummary = {
    requirementsWithCandidates: groups.length,
    totalCandidates,
    criticalCoverageCount,
    crossDomainPairs: buildCrossDomainPairs(groups),
    improvableRequirements,
  }

  const report: ReuseReport = {
    id:           randomUUID(),
    sessionId:    session.id,
    documentId:   session.documentId,
    documentName: session.documentName,
    createdAt:    new Date().toISOString(),
    groups,
    summary,
  }

  saveReuseReport(report)
  return report
}
