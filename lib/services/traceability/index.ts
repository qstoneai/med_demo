// ─── Traceability Service ─────────────────────────────────────────────────────
// Builds and manages trace links between requirements, chunks, and domains.
//
// Three link sources:
//   1. seedTemplateLinks()        — req-req links from plugin related_requirements
//   2. buildLinksFromSession()    — req-chunk links from a mapping session
//   3. buildLinksFromReuse()      — suggested req-chunk + domain-domain links
//
// Impact analysis:
//   analyzeImpact(entityId)       — compute blast radius of a hypothetical change
//
// Status transitions always emit a ChangeEvent.

import { randomUUID } from 'crypto'
import type { MappingSession } from '@/lib/types/mapping'
import type { ReuseReport }    from '@/lib/types/reuse'
import type {
  TraceLink,
  ChangeEvent,
  ImpactAnalysis,
  ImpactNode,
  TraceLinkStatus,
  ChangeEventType,
} from '@/lib/types/traceability'
import type { Priority } from '@/lib/plugins/types'
import { getAllTemplates } from '@/lib/plugins/loader'
import {
  saveTraceLink,
  saveTraceLinksBatch,
  saveChangeEvent,
  updateLinkStatus,
  getLinksForEntity,
  queryTraceLinks,
  linkExists,
  getTraceLink,
} from '@/lib/store/traceStore'

// ── Config ────────────────────────────────────────────────────────────────────

/** Minimum chunk relevance score to establish an active req-chunk link. */
const MIN_LINK_SCORE = 0.12

// ── Internal event builder ────────────────────────────────────────────────────

function makeEvent(
  eventType: ChangeEventType,
  opts: {
    entityType: ChangeEvent['entityType']
    entityId:   string
    entityLabel: string
    actor:       ChangeEvent['actor']
    description: string
    documentId?:  string
    sessionId?:   string
    rippleEffectLinkIds?: string[]
    details?: Record<string, unknown>
  },
): ChangeEvent {
  return {
    id:                  randomUUID(),
    eventType,
    entityType:          opts.entityType,
    entityId:            opts.entityId,
    entityLabel:         opts.entityLabel,
    actor:               opts.actor,
    description:         opts.description,
    documentId:          opts.documentId,
    sessionId:           opts.sessionId,
    rippleEffectLinkIds: opts.rippleEffectLinkIds ?? [],
    details:             opts.details,
    timestamp:           new Date().toISOString(),
  }
}

// ── 1. Seed template-based req-req links ──────────────────────────────────────

/**
 * Creates 'active' req-req TraceLinks from every template's related_requirements.
 * Links are bidirectional — only the canonical direction is stored (lower ID → higher ID).
 * Idempotent: skips links that already exist.
 *
 * Returns the number of new links created.
 */
export function seedTemplateLinks(): { created: number } {
  const templates = getAllTemplates()
  const reqById   = new Map(templates.map((t) => [t.requirement_id, t]))
  const now       = new Date().toISOString()
  const newLinks: TraceLink[] = []

  for (const req of templates) {
    for (const relId of req.related_requirements) {
      const relReq = reqById.get(relId)
      if (!relReq) continue

      // Canonical order: sort IDs to avoid bidirectional duplicates
      const [srcId, tgtId] = [req.requirement_id, relId].sort()
      if (linkExists(srcId, tgtId, 'req-req')) continue

      const src = reqById.get(srcId)!
      const tgt = reqById.get(tgtId)!

      newLinks.push({
        id:          randomUUID(),
        kind:        'req-req',
        sourceType:  'requirement',
        sourceId:    srcId,
        sourceLabel: src.title,
        targetType:  'requirement',
        targetId:    tgtId,
        targetLabel: tgt.title,
        status:      'active',
        origin:      'template',
        confidence:  1.0,
        createdAt:   now,
        updatedAt:   now,
      })
    }
  }

  saveTraceLinksBatch(newLinks)

  if (newLinks.length > 0) {
    saveChangeEvent(makeEvent('created', {
      entityType:  'session',
      entityId:    'template-seed',
      entityLabel: 'Template registry',
      actor:       'system',
      description: `Seeded ${newLinks.length} requirement-to-requirement links from template related_requirements.`,
      details:     { count: newLinks.length },
    }))
  }

  return { created: newLinks.length }
}

// ── 2. Build req-chunk links from a mapping session ───────────────────────────

/**
 * Creates TraceLinks from a completed MappingSession.
 * - Chunks scoring >= MIN_LINK_SCORE → 'active' req-chunk link
 * - Also adds req-req links for template relationships (idempotent)
 *
 * Emits a ChangeEvent for the session sync.
 * Returns counts of created links.
 */
export function buildLinksFromSession(session: MappingSession): {
  reqChunk: number
  reqReq:   number
} {
  const now = new Date().toISOString()
  const newLinks: TraceLink[] = []

  for (const mapping of session.mappings) {
    const req = mapping.requirement

    // ── req-chunk links ──────────────────────────────────────────────────────
    for (const match of mapping.matchedChunks) {
      if (match.relevanceScore < MIN_LINK_SCORE) continue
      if (linkExists(req.requirement_id, match.chunkId, 'req-chunk')) continue

      const cit = match.chunk.citation
      const loc = cit.pageNumber
        ? `p.${cit.pageNumber}`
        : cit.sheetName
          ? `"${cit.sheetName}"`
          : 'unknown location'

      newLinks.push({
        id:          randomUUID(),
        kind:        'req-chunk',
        sourceType:  'requirement',
        sourceId:    req.requirement_id,
        sourceLabel: req.title,
        targetType:  'chunk',
        targetId:    match.chunkId,
        targetLabel: `${cit.fileName} ${loc}${cit.sectionHeading ? ' § ' + cit.sectionHeading.slice(0, 50) : ''}`,
        status:      'active',
        origin:      'mapping',
        confidence:  match.relevanceScore,
        documentId:  session.documentId,
        sessionId:   session.id,
        createdAt:   now,
        updatedAt:   now,
      })
    }

    // ── req-req links (idempotent via linkExists) ────────────────────────────
    for (const relId of req.related_requirements) {
      const [srcId, tgtId] = [req.requirement_id, relId].sort()
      if (linkExists(srcId, tgtId, 'req-req')) continue

      const srcLabel = req.requirement_id === srcId ? req.title : relId
      const tgtLabel = req.requirement_id === tgtId ? req.title : srcId

      newLinks.push({
        id:          randomUUID(),
        kind:        'req-req',
        sourceType:  'requirement',
        sourceId:    srcId,
        sourceLabel: srcLabel,
        targetType:  'requirement',
        targetId:    tgtId,
        targetLabel: tgtLabel,
        status:      'active',
        origin:      'template',
        confidence:  1.0,
        sessionId:   session.id,
        createdAt:   now,
        updatedAt:   now,
      })
    }
  }

  saveTraceLinksBatch(newLinks)

  const reqChunkCount = newLinks.filter((l) => l.kind === 'req-chunk').length
  const reqReqCount   = newLinks.filter((l) => l.kind === 'req-req').length

  saveChangeEvent(makeEvent('created', {
    entityType:  'session',
    entityId:    session.id,
    entityLabel: `Mapping session: ${session.documentName}`,
    actor:       'ai',
    description: `Built ${reqChunkCount} evidence links and ${reqReqCount} requirement links from mapping session (${session.method} mode).`,
    documentId:  session.documentId,
    sessionId:   session.id,
    details:     { reqChunk: reqChunkCount, reqReq: reqReqCount, method: session.method },
  }))

  return { reqChunk: reqChunkCount, reqReq: reqReqCount }
}

// ── 3. Build suggested links from reuse report ────────────────────────────────

/**
 * Creates 'suggested' TraceLinks from a ReuseReport.
 * - One req-chunk link per high-confidence candidate
 * - One domain-domain link per unique cross-domain pair
 *
 * All links start as 'suggested' — require human review.
 */
export function buildLinksFromReuse(report: ReuseReport): {
  reqChunk:     number
  domainDomain: number
} {
  const now = new Date().toISOString()
  const newLinks: TraceLink[] = []
  const seenDomainPairs = new Set<string>()

  for (const group of report.groups) {
    const tgt = group.targetRequirement

    for (const candidate of group.candidates) {
      // req-chunk (suggested)
      if (!linkExists(tgt.requirement_id, candidate.chunkId, 'req-chunk')) {
        const cit = candidate.citation
        const loc = cit.pageNumber
          ? `p.${cit.pageNumber}`
          : cit.sheetName
            ? `"${cit.sheetName}"`
            : ''

        newLinks.push({
          id:          randomUUID(),
          kind:        'req-chunk',
          sourceType:  'requirement',
          sourceId:    tgt.requirement_id,
          sourceLabel: tgt.title,
          targetType:  'chunk',
          targetId:    candidate.chunkId,
          targetLabel: `${cit.fileName}${loc ? ' ' + loc : ''}`,
          status:      'suggested',
          origin:      'reuse_suggestion',
          confidence:  candidate.suggestedRelevance,
          documentId:  report.documentId,
          sessionId:   report.sessionId,
          createdAt:   now,
          updatedAt:   now,
        })
      }

      // domain-domain (suggested) — one per unique pair
      const src = candidate.sourceRequirement
      if (src.domain !== tgt.domain) {
        const pairKey = [src.domain, tgt.domain].sort().join('↔')
        if (!seenDomainPairs.has(pairKey)) {
          seenDomainPairs.add(pairKey)
          const [dA, dB] = [src.domain, tgt.domain].sort()
          if (!linkExists(dA, dB, 'domain-domain')) {
            newLinks.push({
              id:          randomUUID(),
              kind:        'domain-domain',
              sourceType:  'domain',
              sourceId:    dA,
              sourceLabel: dA,
              targetType:  'domain',
              targetId:    dB,
              targetLabel: dB,
              status:      'suggested',
              origin:      'reuse_suggestion',
              confidence:  0.7,
              documentId:  report.documentId,
              sessionId:   report.sessionId,
              createdAt:   now,
              updatedAt:   now,
            })
          }
        }
      }
    }
  }

  saveTraceLinksBatch(newLinks)

  const reqChunkCount     = newLinks.filter((l) => l.kind === 'req-chunk').length
  const domainDomainCount = newLinks.filter((l) => l.kind === 'domain-domain').length

  if (newLinks.length > 0) {
    saveChangeEvent(makeEvent('created', {
      entityType:  'session',
      entityId:    report.sessionId,
      entityLabel: `Reuse report: ${report.documentName}`,
      actor:       'ai',
      description: `Added ${reqChunkCount} suggested evidence links and ${domainDomainCount} cross-domain links from reuse analysis.`,
      documentId:  report.documentId,
      sessionId:   report.sessionId,
      details:     { reqChunk: reqChunkCount, domainDomain: domainDomainCount },
    }))
  }

  return { reqChunk: reqChunkCount, domainDomain: domainDomainCount }
}

// ── 4. Impact analysis ────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4, major: 3, minor: 2, informational: 1,
}

/**
 * Computes the blast radius if the given entity changes.
 * Walks one hop of the link graph and scores impact by:
 *   - Link kind (req-req = high, req-chunk = medium, domain-domain = low)
 *   - Link confidence
 *   - Whether linked entity is a critical requirement
 *
 * Pure function — reads from the store, writes nothing.
 */
export function analyzeImpact(
  entityId:    string,
  entityLabel: string,
  entityType:  'requirement' | 'chunk' | 'domain',
): ImpactAnalysis {
  const directLinks = getLinksForEntity(entityId)

  const templates  = getAllTemplates()
  const reqById    = new Map(templates.map((t) => [t.requirement_id, t]))

  const nodeMap = new Map<string, ImpactNode>()

  for (const link of directLinks) {
    // The "other end" of the link
    const peerId    = link.sourceId === entityId ? link.targetId    : link.sourceId
    const peerLabel = link.sourceId === entityId ? link.targetLabel : link.sourceLabel
    const peerType  = link.sourceId === entityId ? link.targetType  : link.sourceType

    // Skip rejected links — they're dead ends
    if (link.status === 'rejected') continue

    let severity: 'high' | 'medium' | 'low'
    let reason: string

    if (link.kind === 'req-req') {
      severity = 'high'
      reason   = `Directly linked requirement — changes may invalidate the compliance relationship.`
    } else if (link.kind === 'req-chunk') {
      const isReq = entityType === 'requirement'
      severity    = 'medium'
      reason      = isReq
        ? `Evidence chunk sourced from this requirement — re-mapping may be needed.`
        : `Requirement evidenced by this chunk — document changes require re-verification.`
    } else if (link.kind === 'domain-domain') {
      severity = 'low'
      reason   = `Cross-domain reference — changes may affect related regulatory domain.`
    } else {
      severity = 'low'
      reason   = `Adjacent chunk in the same document section.`
    }

    // Escalate severity for critical requirements
    if (peerType === 'requirement') {
      const peerReq = reqById.get(peerId)
      if (peerReq?.priority === 'critical' && severity === 'medium') {
        severity = 'high'
        reason  += ` (critical priority requirement)`
      }
    }

    // link.status is already narrowed to exclude 'rejected' (we continued above)
    const requiresReview = severity !== 'low'

    if (nodeMap.has(peerId)) {
      // Merge: take higher severity and accumulate links
      const existing = nodeMap.get(peerId)!
      const order    = { high: 3, medium: 2, low: 1 }
      if (order[severity] > order[existing.impactSeverity]) {
        nodeMap.set(peerId, { ...existing, impactSeverity: severity, reason })
      }
      existing.linkIds.push(link.id)
    } else {
      nodeMap.set(peerId, {
        entityType:    peerType,
        entityId:      peerId,
        entityLabel:   peerLabel,
        impactSeverity: severity,
        reason,
        requiresReview,
        linkIds:       [link.id],
      })
    }
  }

  const affectedNodes = [...nodeMap.values()].sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 }
    return order[b.impactSeverity] - order[a.impactSeverity]
  })

  const reviewNeededCount = affectedNodes.filter((n) => n.requiresReview).length
  const highImpactCount   = affectedNodes.filter((n) => n.impactSeverity === 'high').length

  // Suggested actions
  const actions: string[] = []
  if (highImpactCount > 0) {
    actions.push(`Review ${highImpactCount} high-impact linked requirement(s) to confirm the compliance relationship still holds.`)
  }
  if (affectedNodes.some((n) => n.entityType === 'chunk')) {
    actions.push('Re-run mapping analysis to refresh evidence links after the change.')
  }
  if (affectedNodes.some((n) => n.entityType === 'domain')) {
    actions.push('Check cross-domain requirements — this change may have regulatory implications in related domains.')
  }
  if (actions.length === 0) {
    actions.push('No immediate actions required. Monitor related requirements for secondary effects.')
  }

  return {
    triggerEntityId:    entityId,
    triggerEntityLabel: entityLabel,
    triggerEntityType:  entityType,
    affectedNodes,
    totalAffected:      affectedNodes.length,
    reviewNeededCount,
    highImpactCount,
    suggestedActions:   actions,
    computedAt:         new Date().toISOString(),
  }
}

// ── 5. Link review ────────────────────────────────────────────────────────────

/**
 * Records a human review action on a link.
 * Status transitions:
 *   suggested / review_needed  →  approved: status becomes 'active'
 *   suggested / active         →  rejected: status becomes 'rejected'
 *   any                        →  reviewed: status becomes 'active' (acknowledged)
 */
export function reviewLink(
  linkId:  string,
  action:  'approve' | 'reject' | 'reviewed',
  options: { reviewedBy?: string; notes?: string } = {},
): TraceLink | null {
  const link = getTraceLink(linkId)
  if (!link) return null

  const newStatus: TraceLinkStatus =
    action === 'approve' || action === 'reviewed' ? 'active' : 'rejected'

  const updated = updateLinkStatus(linkId, newStatus, {
    reviewedBy: options.reviewedBy ?? 'Reviewer',
    notes:      options.notes,
  })

  if (updated) {
    const eventTypeMap: Record<string, ChangeEventType> = {
      approve:  'approved',
      reject:   'rejected',
      reviewed: 'reviewed',
    }
    saveChangeEvent(makeEvent(eventTypeMap[action] as ChangeEventType, {
      entityType:  'link',
      entityId:    linkId,
      entityLabel: `${link.sourceLabel} → ${link.targetLabel}`,
      actor:       'user',
      description: `Link ${action}d by ${options.reviewedBy ?? 'reviewer'}.${options.notes ? ' Note: ' + options.notes : ''}`,
      documentId:  link.documentId,
      sessionId:   link.sessionId,
    }))
  }

  return updated
}

// ── 6. Mark links review_needed (change propagation) ─────────────────────────

/**
 * When an entity changes (e.g. document re-uploaded), marks all linked
 * 'active' and 'suggested' links as 'review_needed'.
 * Emits one ChangeEvent with the ripple effect list.
 */
export function propagateChange(
  entityId:    string,
  entityLabel: string,
  reason:      string,
): { affectedLinks: number } {
  const links = getLinksForEntity(entityId).filter(
    (l) => l.status === 'active' || l.status === 'suggested',
  )

  const affectedIds: string[] = []
  for (const link of links) {
    updateLinkStatus(link.id, 'review_needed')
    affectedIds.push(link.id)
  }

  if (affectedIds.length > 0) {
    saveChangeEvent(makeEvent('updated', {
      entityType:  'document',
      entityId,
      entityLabel,
      actor:       'system',
      description: `${reason} ${affectedIds.length} linked evidence relationship(s) marked for review.`,
      rippleEffectLinkIds: affectedIds,
      details: { reason, affectedCount: affectedIds.length },
    }))
  }

  return { affectedLinks: affectedIds.length }
}
