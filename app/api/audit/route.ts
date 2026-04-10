import { NextResponse } from 'next/server'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  timestamp: string
  actionType: 'chat_query' | 'document_review' | 'file_upload' | 'export'
  summary: string
  modelName: string
  citationsCount: number
}

// ─── In-memory demo data ───────────────────────────────────────────────────────

const DEMO_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-04-09T01:45:00.000Z',
    actionType: 'document_review',
    summary: 'Reviewed 510(k) premarket notification for Class II cardiac monitor',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 5,
  },
  {
    id: 'audit-002',
    timestamp: '2026-04-09T01:52:30.000Z',
    actionType: 'chat_query',
    summary: 'Query: "What are the ISO 14971 risk acceptability criteria requirements?"',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 3,
  },
  {
    id: 'audit-003',
    timestamp: '2026-04-09T02:10:15.000Z',
    actionType: 'file_upload',
    summary: 'Uploaded risk_management_file_v2.pdf for compliance review',
    modelName: 'n/a',
    citationsCount: 0,
  },
  {
    id: 'audit-004',
    timestamp: '2026-04-09T02:18:44.000Z',
    actionType: 'document_review',
    summary: 'Reviewed risk management file against ISO 14971:2019 — 3 gaps identified',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 4,
  },
  {
    id: 'audit-005',
    timestamp: '2026-04-09T02:35:08.000Z',
    actionType: 'chat_query',
    summary: 'Query: "Summarise EU MDR Annex I general safety and performance requirements"',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 6,
  },
  {
    id: 'audit-006',
    timestamp: '2026-04-09T02:50:00.000Z',
    actionType: 'file_upload',
    summary: 'Uploaded clinical_evaluation_report_draft.docx for compliance review',
    modelName: 'n/a',
    citationsCount: 0,
  },
  {
    id: 'audit-007',
    timestamp: '2026-04-09T02:55:22.000Z',
    actionType: 'document_review',
    summary: 'Reviewed clinical evaluation report — labelling and PMCF plan partially addressed',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 3,
  },
  {
    id: 'audit-008',
    timestamp: '2026-04-09T03:12:47.000Z',
    actionType: 'chat_query',
    summary: 'Query: "How does IEC 62304 classify software safety levels for Class IIa devices?"',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 2,
  },
  {
    id: 'audit-009',
    timestamp: '2026-04-09T03:30:05.000Z',
    actionType: 'export',
    summary: 'Exported audit log to CSV — 8 entries included',
    modelName: 'n/a',
    citationsCount: 0,
  },
  {
    id: 'audit-010',
    timestamp: '2026-04-09T03:45:19.000Z',
    actionType: 'document_review',
    summary: 'Reviewed QMS procedure document against ISO 13485:2016 — 2 gaps identified',
    modelName: 'claude-sonnet-4-5',
    citationsCount: 4,
  },
]

// ─── Route handler ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const sorted = [...DEMO_AUDIT_LOG].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    return NextResponse.json({ entries: sorted, total: sorted.length })
  } catch (err) {
    console.error('[audit/route] unexpected error', err)
    return NextResponse.json({ error: 'Failed to retrieve audit log' }, { status: 500 })
  }
}
