import type { AuditEntry } from './types'

// ─── In-memory audit store (demo) ─────────────────────────────────────────────
// In production this would be a database (Postgres, Firestore, etc.)

const store: AuditEntry[] = [
  {
    id: 'aud-001',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    user: 'Dr. Sarah Kim',
    action: 'file_upload',
    document: '510k_submission_draft.pdf',
    details: 'Uploaded 510(k) submission draft for review',
    status: 'success',
  },
  {
    id: 'aud-002',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    user: 'Dr. Sarah Kim',
    action: 'file_review',
    document: '510k_submission_draft.pdf',
    details: 'Compliance analysis completed — 3 gaps found',
    status: 'success',
  },
  {
    id: 'aud-003',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    user: 'James Park',
    action: 'chat_query',
    details: 'Query: EU MDR Annex II technical documentation requirements',
    status: 'success',
  },
  {
    id: 'aud-004',
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    user: 'James Park',
    action: 'chat_query',
    details: 'Query: ISO 13485 section 7.3 design and development requirements',
    status: 'success',
  },
  {
    id: 'aud-005',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    user: 'Min-jun Lee',
    action: 'file_upload',
    document: 'risk_management_report.docx',
    details: 'Uploaded risk management report',
    status: 'success',
  },
  {
    id: 'aud-006',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    user: 'Min-jun Lee',
    action: 'file_review',
    document: 'risk_management_report.docx',
    details: 'Compliance analysis completed — 1 critical gap found',
    status: 'success',
  },
  {
    id: 'aud-007',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    user: 'Dr. Sarah Kim',
    action: 'export',
    details: 'Exported audit log as CSV',
    status: 'success',
  },
]

export function getAuditLog(): AuditEntry[] {
  return [...store].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

export function addAuditEntry(
  entry: Omit<AuditEntry, 'id' | 'timestamp'>
): AuditEntry {
  const newEntry: AuditEntry = {
    ...entry,
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  }
  store.push(newEntry)
  return newEntry
}

export function getKpiData() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return {
    documentsReviewed: store.filter((e) => e.action === 'file_review' && e.status === 'success').length,
    chatsToday: store.filter(
      (e) => e.action === 'chat_query' && new Date(e.timestamp) >= todayStart
    ).length,
    pendingReviews: 2,
    auditEvents: store.length,
  }
}
