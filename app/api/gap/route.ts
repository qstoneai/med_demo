// ─── /api/gap ──────────────────────────────────────────────────────────────────
//
// POST  — Generate a gap report
//   Body variant A: { sessionId: string }
//     Derives a report from an existing MappingSession.
//   Body variant B: { documentId: string, requirementIds: string[] }
//     Runs mapping first, then derives a gap report.
//   200: { report: GapReport }
//   400: { error: string }
//   500: { error: string }
//
// GET   — Retrieve gap reports
//   ?id=<reportId>            → { report: GapReport }
//   ?sessionId=<sessionId>    → { report: GapReport }
//   ?documentId=<docId>       → { reports: GapReport[] }
//   (no params)               → { reports: GapReport[] }  (all, newest first)

import { NextRequest, NextResponse } from 'next/server'
import { runMapping } from '@/lib/services/mapping'
import { buildGapReport } from '@/lib/services/gap'
import { recordGapAnalysisRun } from '@/lib/services/history'
import { getMappingSession } from '@/lib/store/mappingStore'
import {
  getGapReport,
  getGapReportBySession,
  getGapReportsForDocument,
  listAllGapReports,
} from '@/lib/store/gapStore'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const reportId   = searchParams.get('id')
  const sessionId  = searchParams.get('sessionId')
  const documentId = searchParams.get('documentId')

  if (reportId) {
    const report = getGapReport(reportId)
    if (!report) {
      return NextResponse.json({ error: `Report not found: ${reportId}` }, { status: 404 })
    }
    return NextResponse.json({ report })
  }

  if (sessionId) {
    const report = getGapReportBySession(sessionId)
    if (!report) {
      return NextResponse.json({ error: `No gap report for session: ${sessionId}` }, { status: 404 })
    }
    return NextResponse.json({ report })
  }

  if (documentId) {
    return NextResponse.json({ reports: getGapReportsForDocument(documentId) })
  }

  return NextResponse.json({ reports: listAllGapReports() })
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
      const report = buildGapReport(session)
      recordGapAnalysisRun({ reportId: report.id, sessionId: report.sessionId, documentId: report.documentId, documentName: report.documentName, sufficient: report.summary.sufficient, partial: report.summary.partial, missing: report.summary.missing, readinessScore: report.summary.readinessScore })
      return NextResponse.json({ report })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gap analysis failed.'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // ── Variant B: run mapping + gap analysis ─────────────────────────────────
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
    const report  = buildGapReport(session)
    recordGapAnalysisRun({ reportId: report.id, sessionId: report.sessionId, documentId: report.documentId, documentName: report.documentName, sufficient: report.summary.sufficient, partial: report.summary.partial, missing: report.summary.missing, readinessScore: report.summary.readinessScore })
    return NextResponse.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gap analysis failed.'
    const isValidation =
      message.includes('not found') ||
      message.includes('no parsed chunks') ||
      message.includes('None of the provided')
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 })
  }
}
