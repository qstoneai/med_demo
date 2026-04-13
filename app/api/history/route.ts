// ─── /api/history ─────────────────────────────────────────────────────────────
//
// GET  — Query the audit history log
//   ?targetId=X             → entries for a specific entity
//   ?targetType=document    → all entries for a target type
//   ?action=mapping_run     → entries filtered by action
//   ?limit=N&offset=M       → pagination
//   ?since=ISO8601          → entries after timestamp
//   (no params)             → all entries, newest first (limit 100)
//
// POST — Manually record a history entry (for user actions from the UI)
//   Body: { actor?, action, targetType, targetId, targetLabel, changeSummary,
//           context?, metadata?, tags?, diff? }

import { NextRequest, NextResponse } from 'next/server'
import { recordHistory, queryHistory } from '@/lib/services/history'
import { ACTOR_USER } from '@/lib/types/history'
import type { HistoryAction, HistoryTargetType } from '@/lib/types/history'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const targetId   = searchParams.get('targetId')   ?? undefined
  const targetType = searchParams.get('targetType') as HistoryTargetType | null
  const action     = searchParams.get('action')     as HistoryAction     | null
  const since      = searchParams.get('since')      ?? undefined
  const limit      = Math.min(parseInt(searchParams.get('limit')  ?? '100', 10), 500)
  const offset     = parseInt(searchParams.get('offset') ?? '0', 10)

  const result = queryHistory({
    targetId,
    targetType:  targetType  ?? undefined,
    action:      action      ?? undefined,
    since,
    limit,
    offset,
  })

  return NextResponse.json(result)
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

  const { action, targetType, targetId, targetLabel, changeSummary } = payload

  if (typeof action       !== 'string') return NextResponse.json({ error: 'action is required.'       }, { status: 400 })
  if (typeof targetType   !== 'string') return NextResponse.json({ error: 'targetType is required.'   }, { status: 400 })
  if (typeof targetId     !== 'string') return NextResponse.json({ error: 'targetId is required.'     }, { status: 400 })
  if (typeof targetLabel  !== 'string') return NextResponse.json({ error: 'targetLabel is required.'  }, { status: 400 })
  if (typeof changeSummary !== 'string') return NextResponse.json({ error: 'changeSummary is required.' }, { status: 400 })

  const entry = recordHistory({
    actor:         (payload.actor as typeof ACTOR_USER | undefined) ?? ACTOR_USER,
    action:        action        as HistoryAction,
    targetType:    targetType    as HistoryTargetType,
    targetId,
    targetLabel,
    changeSummary,
    context:       payload.context  as Record<string, unknown> | undefined,
    metadata:      payload.metadata as Record<string, unknown> | undefined,
    tags:          Array.isArray(payload.tags) ? payload.tags as string[] : undefined,
  })

  return NextResponse.json({ entry })
}
