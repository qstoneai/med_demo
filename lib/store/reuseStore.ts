// ─── Re-use Report Store ──────────────────────────────────────────────────────
// In-memory store for ReuseReport objects.
// Resets on server cold-start — acceptable for MVP/demo.

import type { ReuseReport } from '@/lib/types/reuse'

const _reports    = new Map<string, ReuseReport>()
const _bySession  = new Map<string, string>()    // sessionId → reportId
const _byDocument = new Map<string, string[]>()  // documentId → reportId[]

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveReuseReport(report: ReuseReport): void {
  _reports.set(report.id, report)
  _bySession.set(report.sessionId, report.id)

  const existing = _byDocument.get(report.documentId) ?? []
  if (!existing.includes(report.id)) {
    _byDocument.set(report.documentId, [report.id, ...existing])
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getReuseReport(id: string): ReuseReport | null {
  return _reports.get(id) ?? null
}

export function getReuseReportBySession(sessionId: string): ReuseReport | null {
  const id = _bySession.get(sessionId)
  return id ? (_reports.get(id) ?? null) : null
}

export function getReuseReportsForDocument(documentId: string): ReuseReport[] {
  const ids = _byDocument.get(documentId) ?? []
  return ids
    .map((id) => _reports.get(id))
    .filter((r): r is ReuseReport => r !== undefined)
}

export function listAllReuseReports(): ReuseReport[] {
  return [..._reports.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
