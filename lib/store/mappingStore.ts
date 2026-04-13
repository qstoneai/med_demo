// ─── Mapping Session Store ────────────────────────────────────────────────────
// In-memory store for MappingSession objects.
// Resets on server cold-start — acceptable for MVP/demo.
// Replace _sessions Map with a DB-backed implementation for production.

import type { MappingSession } from '@/lib/types/mapping'

// ── Storage ───────────────────────────────────────────────────────────────────
const _sessions    = new Map<string, MappingSession>()
const _byDocument  = new Map<string, string[]>()   // documentId → sessionId[]

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveMappingSession(session: MappingSession): void {
  _sessions.set(session.id, session)

  const existing = _byDocument.get(session.documentId) ?? []
  if (!existing.includes(session.id)) {
    _byDocument.set(session.documentId, [session.id, ...existing])
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getMappingSession(id: string): MappingSession | null {
  return _sessions.get(id) ?? null
}

/**
 * Returns all sessions for a document, newest-first.
 * Returns an empty array if no sessions exist for the document.
 */
export function getSessionsForDocument(documentId: string): MappingSession[] {
  const ids = _byDocument.get(documentId) ?? []
  return ids
    .map((id) => _sessions.get(id))
    .filter((s): s is MappingSession => s !== undefined)
}

/** Returns all sessions across all documents, newest-first. */
export function listAllSessions(): MappingSession[] {
  return [..._sessions.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function deleteMappingSession(id: string): boolean {
  const session = _sessions.get(id)
  if (!session) return false

  _sessions.delete(id)

  const docSessions = _byDocument.get(session.documentId) ?? []
  _byDocument.set(
    session.documentId,
    docSessions.filter((sid) => sid !== id),
  )

  return true
}
