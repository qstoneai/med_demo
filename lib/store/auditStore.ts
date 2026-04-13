// ─── Audit Schedule Store ─────────────────────────────────────────────────────
// In-memory store for AuditSchedule objects.
// Seeded with realistic demo data so the UI is non-empty on first load.
// To upgrade: replace this module with a DB-backed implementation that exposes
// the same public API.

import type { AuditSchedule, ScheduleStatus, ReviewCycle } from '@/lib/types/auditSchedule'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split('T')[0]
}

function computeStatus(
  nextReviewDate: string,
  reminderWindowDays: number,
  lastReviewDate?: string,
): ScheduleStatus {
  const now   = new Date()
  const next  = new Date(nextReviewDate)
  const diffMs = next.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (lastReviewDate) {
    const last = new Date(lastReviewDate)
    // If last review is after next due date, it's completed until next cycle
    if (last >= next) return 'completed'
  }
  if (diffDays < 0)              return 'overdue'
  if (diffDays <= reminderWindowDays) return 'due_soon'
  return 'upcoming'
}

/** Returns cycleDays for a named cycle. */
function cycleToDays(cycle: ReviewCycle, customDays?: number): number {
  switch (cycle) {
    case 'monthly':     return 30
    case 'quarterly':   return 90
    case 'semi-annual': return 180
    case 'annual':      return 365
    case 'custom':      return customDays ?? 90
  }
}

// ── Storage ───────────────────────────────────────────────────────────────────

const _schedules = new Map<string, AuditSchedule>()

// ── Seed ──────────────────────────────────────────────────────────────────────

function seed(s: Omit<AuditSchedule, 'status'>): void {
  const status = computeStatus(s.nextReviewDate, s.reminderWindowDays, s.lastReviewDate)
  _schedules.set(s.id, { ...s, status })
}

const NOW_ISO = new Date().toISOString()

seed({
  id: 'sched-001',
  authority: 'FDA 21 CFR Part 820',
  itemType: 'domain',
  itemId: 'SWValidation',
  itemLabel: 'SW Validation — Full Review',
  cycle: 'quarterly',
  nextReviewDate: isoDate(12),
  owner: 'Dr. Sarah Kim',
  reminderWindowDays: 14,
  notes: 'Covers IEC 62304 compliance for all SW modules.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-002',
  authority: 'EU MDR 2017/745',
  itemType: 'domain',
  itemId: 'Risk',
  itemLabel: 'Risk Management File Review',
  cycle: 'semi-annual',
  nextReviewDate: isoDate(-5),   // overdue
  owner: 'Dr. Sarah Kim',
  reminderWindowDays: 21,
  notes: 'ISO 14971 risk file; includes residual risk acceptability re-assessment.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-003',
  authority: 'ISO 13485:2016',
  itemType: 'system',
  itemId: 'qms-annual',
  itemLabel: 'QMS Internal Audit',
  cycle: 'annual',
  nextReviewDate: isoDate(45),
  owner: 'QA Team',
  reminderWindowDays: 30,
  notes: 'Annual internal quality audit per clause 9.2.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-004',
  authority: 'ISO 14971:2019',
  itemType: 'domain',
  itemId: 'Risk',
  itemLabel: 'Hazard Analysis Update',
  cycle: 'quarterly',
  nextReviewDate: isoDate(7),   // due soon (within 14-day window)
  owner: 'Risk Manager',
  reminderWindowDays: 14,
  notes: 'Trigger: any new software change or post-market signal.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-005',
  authority: 'FDA Cybersecurity Guidance',
  itemType: 'domain',
  itemId: 'Cybersecurity',
  itemLabel: 'Cybersecurity Assessment',
  cycle: 'monthly',
  nextReviewDate: isoDate(3),   // due soon
  owner: 'Security Team',
  reminderWindowDays: 7,
  notes: 'Per FDA 2023 cybersecurity guidance — vulnerability monitoring.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-006',
  authority: 'EU MDR 2017/745',
  itemType: 'domain',
  itemId: 'Usability',
  itemLabel: 'Usability Study Review',
  cycle: 'semi-annual',
  nextReviewDate: isoDate(60),
  owner: 'Clinical Team',
  reminderWindowDays: 21,
  notes: 'IEC 62366 summative evaluation update.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-007',
  authority: 'FDA 21 CFR Part 820',
  itemType: 'requirement',
  itemId: 'FDA-QSR-001',
  itemLabel: 'Design Control Procedures',
  cycle: 'annual',
  nextReviewDate: isoDate(-18),  // overdue
  owner: 'Dr. Sarah Kim',
  reminderWindowDays: 30,
  notes: '§820.30 design control — update after any DHF change.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

seed({
  id: 'sched-008',
  authority: 'ISO 13485:2016',
  itemType: 'domain',
  itemId: 'QMS',
  itemLabel: 'Management Review',
  cycle: 'semi-annual',
  nextReviewDate: isoDate(90),
  owner: 'Executive Team',
  reminderWindowDays: 21,
  lastReviewDate: isoDate(-275),
  notes: 'Clause 9.3 management review including quality objectives.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
})

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveAuditSchedule(schedule: AuditSchedule): void {
  const status = computeStatus(
    schedule.nextReviewDate,
    schedule.reminderWindowDays,
    schedule.lastReviewDate,
  )
  _schedules.set(schedule.id, { ...schedule, status, updatedAt: new Date().toISOString() })
}

export function deleteAuditSchedule(id: string): boolean {
  return _schedules.delete(id)
}

/** Advance a schedule to its next cycle after a review is completed. */
export function completeReview(id: string, reviewedAt?: string): AuditSchedule | null {
  const s = _schedules.get(id)
  if (!s) return null

  const reviewDate = reviewedAt ?? new Date().toISOString().split('T')[0]
  const days       = cycleToDays(s.cycle, s.cycleDays)
  const next       = new Date(reviewDate)
  next.setDate(next.getDate() + days)
  const nextReviewDate = next.toISOString().split('T')[0]

  const updated: AuditSchedule = {
    ...s,
    lastReviewDate: reviewDate,
    nextReviewDate,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  }
  _schedules.set(id, updated)
  return updated
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Returns all schedules with freshly-computed status. */
export function listAllAuditSchedules(): AuditSchedule[] {
  return [..._schedules.values()]
    .map((s) => ({
      ...s,
      status: computeStatus(s.nextReviewDate, s.reminderWindowDays, s.lastReviewDate),
    }))
    .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime())
}

export function getAuditSchedule(id: string): AuditSchedule | null {
  const s = _schedules.get(id)
  if (!s) return null
  return {
    ...s,
    status: computeStatus(s.nextReviewDate, s.reminderWindowDays, s.lastReviewDate),
  }
}

export function getSchedulesByStatus(status: ScheduleStatus): AuditSchedule[] {
  return listAllAuditSchedules().filter((s) => s.status === status)
}

export function countByStatus(): Record<ScheduleStatus, number> {
  const counts: Record<ScheduleStatus, number> = {
    upcoming: 0, due_soon: 0, overdue: 0, completed: 0,
  }
  for (const s of listAllAuditSchedules()) counts[s.status]++
  return counts
}
