// ─── /api/mapping ─────────────────────────────────────────────────────────────
//
// POST  — Run a new mapping session
//   Body: { documentId: string, requirementIds: string[] }
//   200:  { session: MappingSession }
//   400:  { error: string }  — validation failure
//   500:  { error: string }  — mapping failure
//
// GET   — Retrieve a session or list sessions for a document
//   ?id=<sessionId>           → { session: MappingSession }
//   ?documentId=<docId>       → { sessions: MappingSession[] }
//   (no params)               → { sessions: MappingSession[] }  (all, newest first)

import { NextRequest, NextResponse } from 'next/server'
import { runMapping } from '@/lib/services/mapping'
import { recordMappingRun } from '@/lib/services/history'
import {
  getMappingSession,
  getSessionsForDocument,
  listAllSessions,
} from '@/lib/store/mappingStore'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const sessionId  = searchParams.get('id')
  const documentId = searchParams.get('documentId')

  if (sessionId) {
    const session = getMappingSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: `Session not found: ${sessionId}` }, { status: 404 })
    }
    return NextResponse.json({ session })
  }

  if (documentId) {
    const sessions = getSessionsForDocument(documentId)
    return NextResponse.json({ sessions })
  }

  return NextResponse.json({ sessions: listAllSessions() })
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

  const { documentId, requirementIds } = body as Record<string, unknown>

  if (typeof documentId !== 'string' || !documentId.trim()) {
    return NextResponse.json(
      { error: 'documentId is required and must be a non-empty string.' },
      { status: 400 },
    )
  }

  if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
    return NextResponse.json(
      { error: 'requirementIds must be a non-empty array of requirement ID strings.' },
      { status: 400 },
    )
  }

  const ids = requirementIds.filter((id): id is string => typeof id === 'string')
  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'requirementIds must contain at least one valid string.' },
      { status: 400 },
    )
  }

  try {
    const session = await runMapping(documentId, ids)
    recordMappingRun({
      sessionId:       session.id,
      documentId:      session.documentId,
      documentName:    session.documentName,
      requirementCount: session.requirementIds.length,
      method:          session.method,
    })
    return NextResponse.json({ session })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mapping failed.'
    const isValidation =
      message.includes('not found') ||
      message.includes('no parsed chunks') ||
      message.includes('None of the provided')
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 })
  }
}
