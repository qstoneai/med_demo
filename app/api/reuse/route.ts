// ─── /api/reuse ────────────────────────────────────────────────────────────────
//
// POST  — Generate a re-use recommendation report
//   Body variant A: { sessionId: string }
//     Derives recommendations from an existing MappingSession.
//   Body variant B: { documentId: string, requirementIds: string[] }
//     Runs mapping first, then derives recommendations.
//   200: { report: ReuseReport }
//   400: { error: string }
//   500: { error: string }
//
// GET   — Retrieve reports
//   ?id=<reportId>           → { report: ReuseReport }
//   ?sessionId=<sessionId>   → { report: ReuseReport }
//   ?documentId=<docId>      → { reports: ReuseReport[] }
//   (no params)              → { reports: ReuseReport[] }

import { NextRequest, NextResponse } from 'next/server'
import { runMapping } from '@/lib/services/mapping'
import { buildReuseReport } from '@/lib/services/reuse'
import { recordReuseAnalysisRun } from '@/lib/services/history'
import { getMappingSession } from '@/lib/store/mappingStore'
import {
  getReuseReport,
  getReuseReportBySession,
  getReuseReportsForDocument,
  listAllReuseReports,
} from '@/lib/store/reuseStore'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const reportId   = searchParams.get('id')
  const sessionId  = searchParams.get('sessionId')
  const documentId = searchParams.get('documentId')

  if (reportId) {
    const report = getReuseReport(reportId)
    if (!report) {
      return NextResponse.json({ error: `Report not found: ${reportId}` }, { status: 404 })
    }
    return NextResponse.json({ report })
  }

  if (sessionId) {
    const report = getReuseReportBySession(sessionId)
    if (!report) {
      return NextResponse.json({ error: `No reuse report for session: ${sessionId}` }, { status: 404 })
    }
    return NextResponse.json({ report })
  }

  if (documentId) {
    return NextResponse.json({ reports: getReuseReportsForDocument(documentId) })
  }

  return NextResponse.json({ reports: listAllReuseReports() })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>

  // ── Variant A: derive from existing session ────────────────────────────────
  if ('sessionId' in payload) {
    const { sessionId } = payload
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json({ error: 'sessionId must be a non-empty string.' }, { status: 400 })
    }

    const session = getMappingSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: `Mapping session not found: ${sessionId}` }, { status: 404 })
    }

    try {
      const report = buildReuseReport(session)
      recordReuseAnalysisRun({ reportId: report.id, sessionId: report.sessionId, documentId: report.documentId, documentName: report.documentName, candidateCount: report.summary.totalCandidates, groupCount: report.summary.requirementsWithCandidates })
      return NextResponse.json({ report })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reuse analysis failed.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // ── Variant B: run mapping + reuse analysis ────────────────────────────────
  const { documentId, requirementIds } = payload

  if (typeof documentId !== 'string' || !documentId.trim()) {
    return NextResponse.json(
      { error: 'Provide either sessionId or (documentId + requirementIds).' },
      { status: 400 },
    )
  }

  if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
    return NextResponse.json(
      { error: 'requirementIds must be a non-empty array.' },
      { status: 400 },
    )
  }

  const ids = (requirementIds as unknown[]).filter((id): id is string => typeof id === 'string')
  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'requirementIds must contain at least one valid string.' },
      { status: 400 },
    )
  }

  try {
    const session = await runMapping(documentId, ids)
    const report  = buildReuseReport(session)
    recordReuseAnalysisRun({ reportId: report.id, sessionId: report.sessionId, documentId: report.documentId, documentName: report.documentName, candidateCount: report.summary.totalCandidates, groupCount: report.summary.requirementsWithCandidates })
    return NextResponse.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reuse analysis failed.'
    const isValidation =
      message.includes('not found') ||
      message.includes('no parsed chunks') ||
      message.includes('None of the provided')
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 })
  }
}
