// ─── Traceability Store ───────────────────────────────────────────────────────
// In-memory store for TraceLinks and ChangeEvents.
// Uses multi-index Maps for efficient entity-based lookups.
// Resets on cold-start — acceptable for MVP/demo.

import type {
  TraceLink,
  ChangeEvent,
  TraceLinkStatus,
  TraceLinkKind,
  TraceLinkQuery,
} from '@/lib/types/traceability'

// ── Primary storage ───────────────────────────────────────────────────────────

const _links  = new Map<string, TraceLink>()
const _events = new Map<string, ChangeEvent>()

// ── Indexes ───────────────────────────────────────────────────────────────────

/** entity ID → set of link IDs (source or target) */
const _byEntity = new Map<string, Set<string>>()

/** status → set of link IDs */
const _byStatus = new Map<TraceLinkStatus, Set<string>>()

/** kind → set of link IDs */
const _byKind = new Map<TraceLinkKind, Set<string>>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function addToIndex<K>(map: Map<K, Set<string>>, key: K, id: string) {
  const s = map.get(key) ?? new Set()
  s.add(id)
  map.set(key, s)
}

function removeFromIndex<K>(map: Map<K, Set<string>>, key: K, id: string) {
  map.get(key)?.delete(id)
}

// ── Link write operations ─────────────────────────────────────────────────────

export function saveTraceLink(link: TraceLink): void {
  // If updating, remove old indexes first
  const existing = _links.get(link.id)
  if (existing) {
    removeFromIndex(_byEntity, existing.sourceId, link.id)
    removeFromIndex(_byEntity, existing.targetId, link.id)
    removeFromIndex(_byStatus, existing.status, link.id)
    removeFromIndex(_byKind,   existing.kind,   link.id)
  }

  _links.set(link.id, link)
  addToIndex(_byEntity, link.sourceId, link.id)
  addToIndex(_byEntity, link.targetId, link.id)
  addToIndex(_byStatus, link.status,   link.id)
  addToIndex(_byKind,   link.kind,     link.id)
}

export function saveTraceLinksBatch(links: TraceLink[]): void {
  for (const link of links) saveTraceLink(link)
}

export function updateLinkStatus(
  id: string,
  status: TraceLinkStatus,
  reviewerNotes?: { reviewedBy?: string; notes?: string },
): TraceLink | null {
  const link = _links.get(id)
  if (!link) return null

  const updated: TraceLink = {
    ...link,
    status,
    updatedAt:  new Date().toISOString(),
    reviewedAt: reviewerNotes ? new Date().toISOString() : link.reviewedAt,
    reviewedBy: reviewerNotes?.reviewedBy ?? link.reviewedBy,
    notes:      reviewerNotes?.notes ?? link.notes,
  }
  saveTraceLink(updated)
  return updated
}

// ── Link read operations ──────────────────────────────────────────────────────

export function getTraceLink(id: string): TraceLink | null {
  return _links.get(id) ?? null
}

export function queryTraceLinks(query: TraceLinkQuery = {}): TraceLink[] {
  let ids: Set<string> | null = null

  const intersect = (newSet: Set<string>) => {
    ids = ids === null ? new Set(newSet) : new Set([...ids].filter((id) => newSet.has(id)))
  }

  if (query.entityId) {
    intersect(_byEntity.get(query.entityId) ?? new Set())
  }
  if (query.status) {
    intersect(_byStatus.get(query.status) ?? new Set())
  }
  if (query.kind) {
    intersect(_byKind.get(query.kind) ?? new Set())
  }

  const allIds = ids ?? new Set(_links.keys())
  const results: TraceLink[] = []
  for (const id of allIds) {
    const link = _links.get(id)
    if (!link) continue
    if (query.documentId && link.documentId !== query.documentId) continue
    results.push(link)
  }

  return results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function getLinksForEntity(entityId: string): TraceLink[] {
  return queryTraceLinks({ entityId })
}

export function getReviewQueue(): TraceLink[] {
  const suggested     = queryTraceLinks({ status: 'suggested' })
  const reviewNeeded  = queryTraceLinks({ status: 'review_needed' })
  return [...reviewNeeded, ...suggested]
}

export function linkExists(sourceId: string, targetId: string, kind: TraceLinkKind): boolean {
  const ids = _byEntity.get(sourceId) ?? new Set()
  for (const id of ids) {
    const link = _links.get(id)
    if (link && link.kind === kind &&
        ((link.sourceId === sourceId && link.targetId === targetId) ||
         (link.sourceId === targetId && link.targetId === sourceId))) {
      return true
    }
  }
  return false
}

// ── ChangeEvent write operations ──────────────────────────────────────────────

export function saveChangeEvent(event: ChangeEvent): void {
  _events.set(event.id, event)
}

// ── ChangeEvent read operations ───────────────────────────────────────────────

export function getChangeEvent(id: string): ChangeEvent | null {
  return _events.get(id) ?? null
}

export function listChangeEvents(limit = 50): ChangeEvent[] {
  return [..._events.values()]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

export function getEventsForEntity(entityId: string, limit = 20): ChangeEvent[] {
  return [..._events.values()]
    .filter((e) => e.entityId === entityId || e.documentId === entityId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

// ── Overview stats ────────────────────────────────────────────────────────────

export function getTraceOverview() {
  const byStatus: Record<string, number> = {}
  const byKind:   Record<string, number> = {}

  for (const link of _links.values()) {
    byStatus[link.status] = (byStatus[link.status] ?? 0) + 1
    byKind[link.kind]     = (byKind[link.kind]     ?? 0) + 1
  }

  return {
    totalLinks:        _links.size,
    activeLinks:       byStatus['active']        ?? 0,
    suggestedLinks:    byStatus['suggested']      ?? 0,
    reviewNeededLinks: byStatus['review_needed']  ?? 0,
    rejectedLinks:     byStatus['rejected']       ?? 0,
    recentEvents:      listChangeEvents(10),
    linksByKind:       byKind,
  }
}
