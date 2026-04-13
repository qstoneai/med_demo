// ─── Gap Report Store ─────────────────────────────────────────────────────────
// In-memory store for GapReport objects.
// Resets on server cold-start — acceptable for MVP/demo.

import type { GapReport } from '@/lib/types/gap'

const _reports    = new Map<string, GapReport>()
const _bySession  = new Map<string, string>()    // sessionId → reportId
const _byDocument = new Map<string, string[]>()  // documentId → reportId[]

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveGapReport(report: GapReport): void {
  _reports.set(report.id, report)
  _bySession.set(report.sessionId, report.id)

  const existing = _byDocument.get(report.documentId) ?? []
  if (!existing.includes(report.id)) {
    _byDocument.set(report.documentId, [report.id, ...existing])
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getGapReport(id: string): GapReport | null {
  return _reports.get(id) ?? null
}

export function getGapReportBySession(sessionId: string): GapReport | null {
  const id = _bySession.get(sessionId)
  return id ? (_reports.get(id) ?? null) : null
}

export function getGapReportsForDocument(documentId: string): GapReport[] {
  const ids = _byDocument.get(documentId) ?? []
  return ids
    .map((id) => _reports.get(id))
    .filter((r): r is GapReport => r !== undefined)
}

export function listAllGapReports(): GapReport[] {
  return [..._reports.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function deleteGapReport(id: string): boolean {
  const report = _reports.get(id)
  if (!report) return false

  _reports.delete(id)
  _bySession.delete(report.sessionId)

  const docReports = _byDocument.get(report.documentId) ?? []
  _byDocument.set(
    report.documentId,
    docReports.filter((rid) => rid !== id),
  )
  return true
}
