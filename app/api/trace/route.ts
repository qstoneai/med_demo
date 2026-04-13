// ─── /api/trace ────────────────────────────────────────────────────────────────
//
// GET  — Query links, events, or overview
//   ?overview=true                        → TraceOverview stats
//   ?links=true&entityId=X               → TraceLink[] for an entity
//   ?links=true&status=review_needed     → TraceLink[] for review queue
//   ?links=true&kind=req-req             → TraceLink[] by kind
//   ?events=true[&limit=N]               → ChangeEvent[] (newest first)
//   ?impact=true&entityId=X&label=Y&type=Z → ImpactAnalysis
//
// POST — Mutations
//   { action: 'seed_templates' }
//     → seed req-req links from template related_requirements
//
//   { action: 'sync_session', sessionId: string }
//     → build req-chunk + req-req links from a mapping session
//
//   { action: 'sync_reuse', reportId: string }
//     → build suggested links from a reuse report
//     (NOTE: reportId is the ReuseReport id from /api/reuse)
//
//   { action: 'review_link', linkId: string, review: 'approve'|'reject'|'reviewed',
//     reviewedBy?: string, notes?: string }
//     → record human review on a single link
//
//   { action: 'propagate_change', entityId: string, entityLabel: string, reason: string }
//     → mark all active links for an entity as review_needed

import { NextRequest, NextResponse } from 'next/server'
import {
  seedTemplateLinks,
  buildLinksFromSession,
  buildLinksFromReuse,
  reviewLink,
  propagateChange,
  analyzeImpact,
} from '@/lib/services/traceability'
import {
  recordTraceLinkSeeded,
  recordTraceLinkSynced,
  recordLinkReviewed,
} from '@/lib/services/history'
import { getMappingSession } from '@/lib/store/mappingStore'
import { getReuseReport }    from '@/lib/store/reuseStore'
import {
  queryTraceLinks,
  getReviewQueue,
  listChangeEvents,
  getTraceOverview,
} from '@/lib/store/traceStore'
import type { TraceLinkKind, TraceLinkStatus } from '@/lib/types/traceability'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // ── Overview stats ───────────────────────────────────────────────────────
  if (searchParams.get('overview') === 'true') {
    return NextResponse.json(getTraceOverview())
  }

  // ── Links query ──────────────────────────────────────────────────────────
  if (searchParams.get('links') === 'true') {
    const entityId = searchParams.get('entityId')  ?? undefined
    const status   = searchParams.get('status')    as TraceLinkStatus | null
    const kind     = searchParams.get('kind')      as TraceLinkKind   | null

    if (status === 'review_needed' || status === 'suggested') {
      return NextResponse.json({ links: getReviewQueue() })
    }

    const links = queryTraceLinks({
      entityId: entityId ?? undefined,
      status:   status   ?? undefined,
      kind:     kind     ?? undefined,
    })
    return NextResponse.json({ links })
  }

  // ── Events ───────────────────────────────────────────────────────────────
  if (searchParams.get('events') === 'true') {
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    return NextResponse.json({ events: listChangeEvents(limit) })
  }

  // ── Impact analysis ──────────────────────────────────────────────────────
  if (searchParams.get('impact') === 'true') {
    const entityId   = searchParams.get('entityId')
    const entityLabel = searchParams.get('label') ?? entityId ?? ''
    const entityType  = (searchParams.get('type') ?? 'requirement') as 'requirement' | 'chunk' | 'domain'

    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required for impact analysis.' }, { status: 400 })
    }

    const analysis = analyzeImpact(entityId, entityLabel, entityType)
    return NextResponse.json({ analysis })
  }

  return NextResponse.json({ error: 'Specify ?overview, ?links, ?events, or ?impact.' }, { status: 400 })
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
  const action  = payload.action

  // ── seed_templates ───────────────────────────────────────────────────────
  if (action === 'seed_templates') {
    const result = seedTemplateLinks()
    if (result.created > 0) recordTraceLinkSeeded(result.created)
    return NextResponse.json({ ok: true, ...result })
  }

  // ── sync_session ─────────────────────────────────────────────────────────
  if (action === 'sync_session') {
    const { sessionId } = payload
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json({ error: 'sessionId is required.' }, { status: 400 })
    }
    const session = getMappingSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: `Session not found: ${sessionId}` }, { status: 404 })
    }
    const result = buildLinksFromSession(session)
    recordTraceLinkSynced({ sessionId: session.id, documentName: session.documentName, reqChunk: result.reqChunk, reqReq: result.reqReq })
    return NextResponse.json({ ok: true, ...result })
  }

  // ── sync_reuse ────────────────────────────────────────────────────────────
  if (action === 'sync_reuse') {
    const { reportId } = payload
    if (typeof reportId !== 'string' || !reportId.trim()) {
      return NextResponse.json({ error: 'reportId is required.' }, { status: 400 })
    }
    const report = getReuseReport(reportId)
    if (!report) {
      return NextResponse.json({ error: `Reuse report not found: ${reportId}` }, { status: 404 })
    }
    const result = buildLinksFromReuse(report)
    return NextResponse.json({ ok: true, ...result })
  }

  // ── review_link ───────────────────────────────────────────────────────────
  if (action === 'review_link') {
    const { linkId, review, reviewedBy, notes } = payload
    if (typeof linkId !== 'string') {
      return NextResponse.json({ error: 'linkId is required.' }, { status: 400 })
    }
    if (review !== 'approve' && review !== 'reject' && review !== 'reviewed') {
      return NextResponse.json(
        { error: 'review must be "approve", "reject", or "reviewed".' },
        { status: 400 },
      )
    }
    const rBy = typeof reviewedBy === 'string' ? reviewedBy : 'Reviewer'
    const updated = reviewLink(linkId, review, { reviewedBy: rBy, notes: typeof notes === 'string' ? notes : undefined })
    if (!updated) {
      return NextResponse.json({ error: `Link not found: ${linkId}` }, { status: 404 })
    }
    recordLinkReviewed({ linkId, linkLabel: `${updated.sourceLabel} → ${updated.targetLabel}`, review, reviewedBy: rBy, notes: typeof notes === 'string' ? notes : undefined })
    return NextResponse.json({ ok: true, link: updated })
  }

  // ── propagate_change ──────────────────────────────────────────────────────
  if (action === 'propagate_change') {
    const { entityId, entityLabel, reason } = payload
    if (typeof entityId !== 'string') {
      return NextResponse.json({ error: 'entityId is required.' }, { status: 400 })
    }
    const result = propagateChange(
      entityId,
      typeof entityLabel === 'string' ? entityLabel : entityId,
      typeof reason      === 'string' ? reason      : 'Entity changed.',
    )
    return NextResponse.json({ ok: true, ...result })
  }

  return NextResponse.json(
    { error: 'Unknown action. Valid: seed_templates | sync_session | sync_reuse | review_link | propagate_change' },
    { status: 400 },
  )
}
