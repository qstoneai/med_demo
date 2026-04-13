// ─── History Store ────────────────────────────────────────────────────────────
// In-memory store for HistoryEntry objects.
// Multi-index for efficient per-entity and per-actor queries.
//
// To upgrade to a database: replace this module with a DB-backed implementation
// that exposes the same public API.  All call sites depend only on these exports.

import type { HistoryEntry, HistoryQuery, HistoryListResponse } from '@/lib/types/history'

// ── Storage ───────────────────────────────────────────────────────────────────

/** Primary store — insertion order = chronological order */
const _entries: HistoryEntry[] = []

/** Secondary indexes for fast lookups */
const _byTargetId  = new Map<string, number[]>()   // targetId → array indexes
const _byActorId   = new Map<string, number[]>()   // actorId  → array indexes
const _byTargetType = new Map<string, number[]>()  // targetType → array indexes

// ── Write ─────────────────────────────────────────────────────────────────────

export function appendHistoryEntry(entry: HistoryEntry): void {
  const idx = _entries.length
  _entries.push(entry)

  const addIdx = (map: Map<string, number[]>, key: string) => {
    const arr = map.get(key) ?? []
    arr.push(idx)
    map.set(key, arr)
  }

  addIdx(_byTargetId,   entry.targetId)
  addIdx(_byActorId,    entry.actor.id)
  addIdx(_byTargetType, entry.targetType)
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Queries the history log.  All filters are applied in-memory.
 * Returns entries newest-first (reverse insertion order).
 */
export function queryHistory(query: HistoryQuery = {}): HistoryListResponse {
  let candidates: HistoryEntry[]

  // Use most-selective index when available
  if (query.targetId) {
    const idxs = _byTargetId.get(query.targetId) ?? []
    candidates = idxs.map((i) => _entries[i]).filter(Boolean)
  } else if (query.targetType) {
    const idxs = _byTargetType.get(query.targetType) ?? []
    candidates = idxs.map((i) => _entries[i]).filter(Boolean)
  } else if (query.actorId) {
    const idxs = _byActorId.get(query.actorId) ?? []
    candidates = idxs.map((i) => _entries[i]).filter(Boolean)
  } else {
    candidates = [..._entries]
  }

  // Additional filters
  if (query.action) {
    candidates = candidates.filter((e) => e.action === query.action)
  }
  if (query.since) {
    const sinceMs = new Date(query.since).getTime()
    candidates = candidates.filter((e) => new Date(e.timestamp).getTime() >= sinceMs)
  }

  // Sort newest first
  candidates = [...candidates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const total   = candidates.length
  const offset  = query.offset ?? 0
  const limit   = query.limit  ?? 100
  const page    = candidates.slice(offset, offset + limit)

  return { entries: page, total, hasMore: offset + limit < total }
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  return _entries.find((e) => e.id === id) ?? null
}

export function getHistoryForEntity(targetId: string, limit = 50): HistoryEntry[] {
  return queryHistory({ targetId, limit }).entries
}

export function countEntries(): number {
  return _entries.length
}

// ── Re-export type for convenience ────────────────────────────────────────────
export type { HistoryListResponse } from '@/lib/types/history'
