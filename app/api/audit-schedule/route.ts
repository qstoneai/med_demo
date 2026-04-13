// ─── /api/audit-schedule ──────────────────────────────────────────────────────
//
// GET   — Query schedules
//   (no params)              → { schedules: AuditSchedule[], counts }
//   ?id=<scheduleId>         → { schedule: AuditSchedule }
//   ?status=overdue          → { schedules: AuditSchedule[] }
//   ?readiness=true          → { summary: AuditReadinessSummary }
//
// POST  — Create or update a schedule
//   Body: { id?, authority, itemType, itemId, itemLabel, cycle, cycleDays?,
//           nextReviewDate, owner, reminderWindowDays, notes? }
//   200: { schedule: AuditSchedule }
//
// PATCH — Mark a review as completed (advances to next cycle)
//   Body: { id: string, reviewedAt?: string }
//   200: { schedule: AuditSchedule }
//
// DELETE — Remove a schedule
//   ?id=<scheduleId>         → { ok: true }

import { NextRequest, NextResponse } from 'next/server'
import {
  listAllAuditSchedules,
  getAuditSchedule,
  getSchedulesByStatus,
  saveAuditSchedule,
  deleteAuditSchedule,
  completeReview,
  countByStatus,
} from '@/lib/store/auditStore'
import { computeReadiness } from '@/lib/services/auditReadiness'
import type {
  AuditSchedule,
  ReviewCycle,
  ScheduleItemType,
  ScheduleStatus,
} from '@/lib/types/auditSchedule'

export const dynamic = 'force-dynamic'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Readiness summary
  if (searchParams.get('readiness') === 'true') {
    const summary = computeReadiness()
    return NextResponse.json({ summary })
  }

  // Single schedule by id
  const id = searchParams.get('id')
  if (id) {
    const schedule = getAuditSchedule(id)
    if (!schedule) {
      return NextResponse.json({ error: `Schedule not found: ${id}` }, { status: 404 })
    }
    return NextResponse.json({ schedule })
  }

  // Filter by status
  const status = searchParams.get('status') as ScheduleStatus | null
  if (status) {
    return NextResponse.json({ schedules: getSchedulesByStatus(status) })
  }

  // All schedules + counts
  return NextResponse.json({
    schedules: listAllAuditSchedules(),
    counts:    countByStatus(),
  })
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

  const p = body as Record<string, unknown>

  // Required fields
  const required: Array<keyof typeof p> = [
    'authority', 'itemType', 'itemId', 'itemLabel',
    'cycle', 'nextReviewDate', 'owner', 'reminderWindowDays',
  ]
  for (const field of required) {
    if (typeof p[field] !== 'string' && typeof p[field] !== 'number') {
      return NextResponse.json({ error: `${field} is required.` }, { status: 400 })
    }
  }

  const id = typeof p.id === 'string' && p.id.trim()
    ? p.id
    : `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const now = new Date().toISOString()
  const existing = getAuditSchedule(id)

  const schedule: AuditSchedule = {
    id,
    authority:         p.authority       as string,
    itemType:          p.itemType        as ScheduleItemType,
    itemId:            p.itemId          as string,
    itemLabel:         p.itemLabel       as string,
    cycle:             p.cycle           as ReviewCycle,
    cycleDays:         typeof p.cycleDays === 'number' ? p.cycleDays : undefined,
    nextReviewDate:    p.nextReviewDate   as string,
    owner:             p.owner           as string,
    reminderWindowDays: Number(p.reminderWindowDays),
    notes:             typeof p.notes === 'string' ? p.notes : undefined,
    lastReviewDate:    typeof p.lastReviewDate === 'string' ? p.lastReviewDate : existing?.lastReviewDate,
    status:            'upcoming',  // recomputed inside saveAuditSchedule
    createdAt:         existing?.createdAt ?? now,
    updatedAt:         now,
  }

  saveAuditSchedule(schedule)
  return NextResponse.json({ schedule: getAuditSchedule(id) })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 })
  }

  const p = body as Record<string, unknown>

  if (typeof p.id !== 'string') {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 })
  }

  const reviewedAt = typeof p.reviewedAt === 'string' ? p.reviewedAt : undefined
  const updated = completeReview(p.id, reviewedAt)
  if (!updated) {
    return NextResponse.json({ error: `Schedule not found: ${p.id}` }, { status: 404 })
  }

  return NextResponse.json({ schedule: updated })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required.' }, { status: 400 })
  }

  const deleted = deleteAuditSchedule(id)
  if (!deleted) {
    return NextResponse.json({ error: `Schedule not found: ${id}` }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
