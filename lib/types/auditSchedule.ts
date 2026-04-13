// ─── Audit Schedule & Readiness Types ────────────────────────────────────────
// Models the periodic review schedule for regulatory items and derives an
// overall audit-readiness score from live gap / traceability data.
//
// Design principles:
//   • AuditSchedule is the *plan* — what must be reviewed and when
//   • AuditReadinessSummary is the *current state* — derived on demand, not stored
//   • ReadinessFactors are the raw signals; the composite score is weighted
//   • All dates are ISO 8601 strings so they serialise cleanly over JSON
//
// Extension points for enterprise:
//   • Replace ACTOR_USER placeholder with real auth in owner fields
//   • Add `notificationChannels` to AuditSchedule for Slack / email hooks
//   • Persist AuditSchedule to a database rather than in-memory store

// ── Schedule taxonomy ─────────────────────────────────────────────────────────

/**
 * How often a regulatory item must be reviewed.
 * 'custom' uses cycleDays for an arbitrary interval.
 */
export type ReviewCycle =
  | 'monthly'       // every 30 days
  | 'quarterly'     // every 90 days
  | 'semi-annual'   // every 180 days
  | 'annual'        // every 365 days
  | 'custom'        // cycleDays required

/** What type of entity the schedule covers. */
export type ScheduleItemType =
  | 'requirement'   // a single regulatory requirement (tracked by requirementId)
  | 'document'      // an uploaded technical document
  | 'domain'        // an entire regulatory domain (e.g. Risk, Cybersecurity)
  | 'system'        // a full audit / system-level review

/**
 * Computed at query time from nextReviewDate and reminderWindowDays.
 *   upcoming    → next review is more than reminderWindowDays away
 *   due_soon    → within reminderWindowDays
 *   overdue     → nextReviewDate is in the past
 *   completed   → last review was recorded; next cycle not yet due
 */
export type ScheduleStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed'

// ── Core schedule entity ──────────────────────────────────────────────────────

export interface AuditSchedule {
  id: string

  /** Regulatory authority this schedule belongs to (e.g. 'FDA 21 CFR 820'). */
  authority: string

  /** Category of the entity being scheduled. */
  itemType: ScheduleItemType

  /** ID of the entity (requirementId, documentId, domain name, etc.). */
  itemId: string

  /** Short human-readable label shown in the UI. */
  itemLabel: string

  /** Review frequency. */
  cycle: ReviewCycle

  /** Required when cycle === 'custom'. Interval in calendar days. */
  cycleDays?: number

  /**
   * ISO date string (YYYY-MM-DD) for the next scheduled review.
   * Recomputed after each completed review.
   */
  nextReviewDate: string

  /**
   * Responsible person or team for this review.
   * Free-form string for MVP; swap with a user-ID FK for enterprise.
   */
  owner: string

  /**
   * How many days before nextReviewDate to mark status as 'due_soon'
   * and show a warning badge in the UI.
   */
  reminderWindowDays: number

  /**
   * Computed status — set when the schedule is read, not persisted.
   * Stored in the record for convenience during serialisation.
   */
  status: ScheduleStatus

  /** ISO date of most recent completed review, if any. */
  lastReviewDate?: string

  /** Free-form notes / context. */
  notes?: string

  createdAt: string
  updatedAt: string
}

// ── Readiness types ───────────────────────────────────────────────────────────

/** Overall audit readiness band. */
export type ReadinessLevel =
  | 'ready'      // score ≥ 75
  | 'at_risk'    // 50 ≤ score < 75
  | 'not_ready'  // score < 50

/**
 * Raw signals used to compute the composite readiness score.
 * Each factor maps to a deduction from 100.
 */
export interface ReadinessFactors {
  /** Weighted requirement coverage score from gap analysis (0–100). */
  requirementCoverageScore: number

  /** Number of requirements with status === 'missing'. */
  missingItemsCount: number

  /**
   * Total missing expected-evidence items across all 'partial' and 'missing'
   * requirements.  Proxy for citation gap depth.
   */
  missingCitationsCount: number

  /**
   * Documents not reviewed (no gap report) in the last 90 days.
   * TODO: implement staleness check once document review timestamps are stored.
   */
  staleDocumentsCount: number

  /**
   * TraceLinks with status === 'review_needed'.
   * Indicates relationships that may have been invalidated by a change.
   */
  brokenLinksCount: number
}

/** A single requirement that contributes to the readiness deficit. */
export interface TopMissingItem {
  requirementId: string
  requirementLabel: string
  domain: string
  priority: string
  missingPoints: string[]
  recommendedActions: string[]
}

/** Derived on demand — snapshot of the current audit-readiness state. */
export interface AuditReadinessSummary {
  /** Composite score 0–100. */
  score: number

  /** Human-readable band. */
  level: ReadinessLevel

  /** Breakdown of individual signals. */
  factors: ReadinessFactors

  /** Schedules with nextReviewDate within the next 30 days (or already due). */
  upcomingAudits: AuditSchedule[]

  /** Schedules where nextReviewDate has passed and status !== 'completed'. */
  overdueSchedules: AuditSchedule[]

  /** Up to 5 critical/missing requirements sorted by priority. */
  topMissingItems: TopMissingItem[]

  /** ISO timestamp when this summary was generated. */
  generatedAt: string
}
