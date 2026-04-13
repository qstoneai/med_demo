// ─── Gap Analysis Service ─────────────────────────────────────────────────────
// Derives a GapReport from an existing MappingSession.
//
// Responsibilities:
//   1. Translate MappingGapStatus → GapStatus (covered → sufficient)
//   2. Generate actionable recommendedActions per requirement
//   3. Compute priority-weighted readiness score
//   4. Assemble per-domain breakdown
//   5. Persist the GapReport via gapStore

import { randomUUID } from 'crypto'
import type { MappingSession, RequirementMapping } from '@/lib/types/mapping'
import type {
  GapReport,
  GapItem,
  GapStatus,
  GapSummary,
  DomainReadiness,
} from '@/lib/types/gap'
import type { Priority, Domain } from '@/lib/plugins/types'
import { saveGapReport } from '@/lib/store/gapStore'

// ── Status translation ────────────────────────────────────────────────────────

function toGapStatus(s: 'covered' | 'partial' | 'missing'): GapStatus {
  return s === 'covered' ? 'sufficient' : s
}

// ── Priority weight ───────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical:      4,
  major:         3,
  minor:         2,
  informational: 1,
}

const STATUS_SCORE: Record<GapStatus, number> = {
  sufficient: 1.0,
  partial:    0.4,
  missing:    0.0,
}

// ── Action generator ──────────────────────────────────────────────────────────

/** Domain-specific action templates for 'missing' requirements. */
const DOMAIN_MISSING_ACTIONS: Partial<Record<Domain, string>> = {
  Risk:
    'Establish a risk management process with hazard identification, risk estimation, and risk control documentation.',
  Cybersecurity:
    'Document security controls, threat model, and Software Bill of Materials (SBOM).',
  SWValidation:
    'Create a software development plan and validation records per IEC 62304 lifecycle requirements.',
  Usability:
    'Conduct formative and summative usability evaluations and document user interface specification.',
  Clinical:
    'Prepare clinical evaluation report (CER) with literature review and clinical data summary.',
  QMS:
    'Define and document quality management system procedures, including CAPA and change control.',
  Labeling:
    'Draft device labeling and Instructions for Use (IFU) meeting applicable regulatory requirements.',
  PMS:
    'Implement a post-market surveillance plan with PSUR/PMCF schedule as applicable.',
  General:
    'Create the required documentation section addressing the device description and classification rationale.',
}

/**
 * Generates 1–4 specific, actionable next-step strings for a requirement.
 * Rules:
 *   sufficient  → verification + traceability reminders
 *   partial     → targeted gap closure based on missingPoints
 *   missing     → creation actions ordered by severity
 */
function generateRecommendedActions(mapping: RequirementMapping): string[] {
  const { requirement, gapStatus, missingEvidence } = mapping
  const { title, regulation, article, domain, priority } = requirement
  const status = toGapStatus(gapStatus)

  if (status === 'sufficient') {
    return [
      `Verify documentation aligns with the latest ${regulation} amendments.`,
      `Maintain traceability links for "${title}" in the technical file.`,
    ]
  }

  if (status === 'missing') {
    const actions: string[] = []

    if (priority === 'critical') {
      actions.push(
        `[URGENT] Create "${title}" documentation — this is a critical requirement under ${regulation} ${article}.`,
      )
    } else if (priority === 'major') {
      actions.push(
        `Create a dedicated section addressing "${title}" per ${regulation} ${article}.`,
      )
    } else {
      actions.push(
        `Draft documentation covering "${title}" (${regulation} ${article}).`,
      )
    }

    // Add domain-specific guidance
    const domainAction = DOMAIN_MISSING_ACTIONS[domain]
    if (domainAction) actions.push(domainAction)

    // Add specific evidence targets
    if (missingEvidence.length > 0) {
      const targets = missingEvidence.slice(0, 2).join('; ')
      actions.push(`Ensure the following artifacts are included: ${targets}.`)
    }

    return actions.slice(0, 3)
  }

  // partial
  const actions: string[] = []

  if (missingEvidence.length > 0) {
    const targets = missingEvidence.slice(0, 2).join('; ')
    actions.push(`Supplement existing content with the following: ${targets}.`)
    if (missingEvidence.length > 2) {
      actions.push(
        `Review the remaining ${missingEvidence.length - 2} missing evidence item(s) against the ${regulation} ${article} checklist.`,
      )
    }
  } else {
    actions.push(
      `Strengthen existing "${title}" coverage — current evidence may be insufficient for a full regulatory review.`,
    )
    actions.push(
      `Cross-reference the ${regulation} ${article} expected evidence list and close any remaining documentation gaps.`,
    )
  }

  return actions
}

// ── Domain breakdown ──────────────────────────────────────────────────────────

function buildDomainBreakdown(items: GapItem[]): DomainReadiness[] {
  const map = new Map<string, { sufficient: number; partial: number; missing: number; total: number }>()

  for (const item of items) {
    const d = item.requirement.domain
    if (!map.has(d)) map.set(d, { sufficient: 0, partial: 0, missing: 0, total: 0 })
    const rec = map.get(d)!
    rec.total++
    rec[item.status]++
  }

  return [...map.entries()]
    .map(([domain, rec]) => ({
      domain,
      total:     rec.total,
      sufficient: rec.sufficient,
      partial:   rec.partial,
      missing:   rec.missing,
      score:     Math.round(
        ((rec.sufficient + rec.partial * 0.4) / rec.total) * 100,
      ),
    }))
    .sort((a, b) => a.score - b.score)  // worst first
}

// ── Summary builder ───────────────────────────────────────────────────────────

function buildSummary(items: GapItem[]): GapSummary {
  let weightedSum = 0
  let totalWeight = 0
  const criticalGaps: string[] = []

  const counts = { sufficient: 0, partial: 0, missing: 0 }

  for (const item of items) {
    const w = PRIORITY_WEIGHT[item.requirement.priority]
    weightedSum += w * STATUS_SCORE[item.status]
    totalWeight += w
    counts[item.status]++

    if (item.requirement.priority === 'critical' && item.status === 'missing') {
      criticalGaps.push(item.requirementId)
    }
  }

  const readinessScore = totalWeight === 0 ? 0 : Math.round((weightedSum / totalWeight) * 100)
  const readinessLevel =
    readinessScore >= 80 ? 'high'
    : readinessScore >= 60 ? 'medium'
    : readinessScore >= 40 ? 'low'
    : 'critical'

  return {
    total:          items.length,
    sufficient:     counts.sufficient,
    partial:        counts.partial,
    missing:        counts.missing,
    readinessScore,
    readinessLevel,
    criticalGaps,
    domainBreakdown: buildDomainBreakdown(items),
  }
}

// ── Item sort order ────────────────────────────────────────────────────────────

const STATUS_SEVERITY: Record<GapStatus, number> = { missing: 2, partial: 1, sufficient: 0 }

function sortItems(items: GapItem[]): GapItem[] {
  return [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_WEIGHT[b.requirement.priority] - PRIORITY_WEIGHT[a.requirement.priority]
    if (priorityDiff !== 0) return priorityDiff
    return STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status]
  })
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Builds a GapReport from a completed MappingSession.
 * Persists the report to gapStore and returns it.
 */
export function buildGapReport(session: MappingSession): GapReport {
  const items: GapItem[] = session.mappings.map((mapping) => ({
    requirementId:     mapping.requirementId,
    requirement:       mapping.requirement,
    status:            toGapStatus(mapping.gapStatus),
    overallScore:      mapping.overallScore,
    missingPoints:     mapping.missingEvidence,
    recommendedActions: generateRecommendedActions(mapping),
    citations:         mapping.citations,
    matchedChunkCount: mapping.matchedChunks.length,
    gapExplanation:    mapping.gapExplanation,
  }))

  const sorted = sortItems(items)

  const report: GapReport = {
    id:           randomUUID(),
    sessionId:    session.id,
    documentId:   session.documentId,
    documentName: session.documentName,
    createdAt:    new Date().toISOString(),
    method:       session.method,
    items:        sorted,
    summary:      buildSummary(sorted),
  }

  saveGapReport(report)
  return report
}
