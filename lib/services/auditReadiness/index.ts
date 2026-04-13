// ─── Audit Readiness Service ──────────────────────────────────────────────────
// Derives AuditReadinessSummary by combining live data from:
//   • Gap reports        — requirement coverage, missing items, citation gaps
//   • Trace store        — broken / review-needed links
//   • Audit schedule store — upcoming and overdue review deadlines
//   • Document store     — stale document detection (>90 days without a report)
//
// IMPORTANT: This function is DERIVED — never persisted.  Call it fresh each
// time the dashboard or audit-readiness page loads.
//
// Composite score formula (0–100):
//   base = requirementCoverageScore                   (0–100, from gap data)
//   − deduct 5 per missing requirement               (capped at 30)
//   − deduct 2 per broken trace link                 (capped at 20)
//   − deduct 3 per overdue schedule                  (capped at 15)
//   − deduct 1 per stale document                    (capped at 10)
//   clamp to [0, 100]
//
// These weights are intentionally conservative and non-regulatory.
// Replace with domain-specific scoring when integrating real standards data.

import { listAllGapReports }    from '@/lib/store/gapStore'
import { getTraceOverview }     from '@/lib/store/traceStore'
import { listAllAuditSchedules } from '@/lib/store/auditStore'
import { listDocuments }        from '@/lib/store/documentStore'
import type {
  AuditReadinessSummary,
  ReadinessFactors,
  ReadinessLevel,
  TopMissingItem,
  AuditSchedule,
} from '@/lib/types/auditSchedule'

// ── Constants ─────────────────────────────────────────────────────────────────

const STALE_DOC_DAYS       = 90   // no gap report within this window → stale
const UPCOMING_WINDOW_DAYS = 30   // schedules within this many days count as "upcoming"

const DEDUCT_PER_MISSING   = 5    // score deduction per missing requirement
const CAP_MISSING          = 30   // max deduction from missing requirements
const DEDUCT_PER_BROKEN    = 2    // per review_needed trace link
const CAP_BROKEN           = 20
const DEDUCT_PER_OVERDUE   = 3    // per overdue schedule
const CAP_OVERDUE          = 15
const DEDUCT_PER_STALE     = 1    // per stale document
const CAP_STALE            = 10

// ── Score helpers ─────────────────────────────────────────────────────────────

function deduct(value: number, perUnit: number, cap: number): number {
  return Math.min(value * perUnit, cap)
}

function computeCompositeScore(factors: ReadinessFactors, overdueCount: number): number {
  const base = factors.requirementCoverageScore

  const score =
    base
    - deduct(factors.missingItemsCount,    DEDUCT_PER_MISSING,  CAP_MISSING)
    - deduct(factors.brokenLinksCount,     DEDUCT_PER_BROKEN,   CAP_BROKEN)
    - deduct(overdueCount,                 DEDUCT_PER_OVERDUE,  CAP_OVERDUE)
    - deduct(factors.staleDocumentsCount,  DEDUCT_PER_STALE,    CAP_STALE)

  return Math.max(0, Math.min(100, Math.round(score)))
}

function toLevel(score: number): ReadinessLevel {
  if (score >= 75) return 'ready'
  if (score >= 50) return 'at_risk'
  return 'not_ready'
}

// ── Stale document detection ──────────────────────────────────────────────────

function countStaleDocuments(): number {
  const allDocs       = listDocuments()
  const allReports    = listAllGapReports()
  const nowMs         = Date.now()
  const thresholdMs   = STALE_DOC_DAYS * 24 * 60 * 60 * 1000

  // Build a set of documentIds that have a recent gap report
  const coveredDocIds = new Set<string>()
  for (const r of allReports) {
    const ageMs = nowMs - new Date(r.createdAt).getTime()
    if (ageMs <= thresholdMs) coveredDocIds.add(r.documentId)
  }

  // Count documents that have NO recent gap report
  return allDocs.filter((d) => !coveredDocIds.has(d.id)).length
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Computes a fresh AuditReadinessSummary.
 * Safe to call from a server component or API route — never throws.
 */
export function computeReadiness(): AuditReadinessSummary {
  const now         = new Date()
  const in30DaysMs  = now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000

  // ── Gap analysis signals ───────────────────────────────────────────────────
  const gapReports = listAllGapReports()

  let totalRequirements   = 0
  let sufficientCount     = 0
  let partialCount        = 0
  let missingCount        = 0
  let missingCitationsCount = 0

  const missingItems: TopMissingItem[] = []

  for (const report of gapReports) {
    for (const item of report.items) {
      totalRequirements++
      if (item.status === 'sufficient') {
        sufficientCount++
      } else if (item.status === 'partial') {
        partialCount++
        missingCitationsCount += item.missingPoints.length
      } else {
        // missing
        missingCount++
        missingCitationsCount += item.missingPoints.length

        missingItems.push({
          requirementId:    item.requirementId,
          requirementLabel: item.requirement.title,
          domain:           item.requirement.domain,
          priority:         item.requirement.priority,
          missingPoints:    item.missingPoints.slice(0, 3),
          recommendedActions: item.recommendedActions.slice(0, 2),
        })
      }
    }
  }

  // Coverage score: (sufficient + 0.4×partial) / total × 100
  const requirementCoverageScore =
    totalRequirements === 0
      ? 100  // no reports yet → no known gaps
      : Math.round(((sufficientCount + partialCount * 0.4) / totalRequirements) * 100)

  // ── Trace signals ──────────────────────────────────────────────────────────
  const traceOverview  = getTraceOverview()
  const brokenLinksCount = traceOverview.reviewNeededLinks

  // ── Stale documents ────────────────────────────────────────────────────────
  const staleDocumentsCount = countStaleDocuments()

  const factors: ReadinessFactors = {
    requirementCoverageScore,
    missingItemsCount:    missingCount,
    missingCitationsCount,
    staleDocumentsCount,
    brokenLinksCount,
  }

  // ── Schedules ──────────────────────────────────────────────────────────────
  const allSchedules = listAllAuditSchedules()

  const upcomingAudits: AuditSchedule[] = allSchedules.filter((s) => {
    if (s.status === 'completed') return false
    const d = new Date(s.nextReviewDate)
    return d.getTime() >= now.getTime() && d.getTime() <= in30DaysMs
  })

  const overdueSchedules: AuditSchedule[] = allSchedules.filter(
    (s) => s.status === 'overdue',
  )

  // ── Composite score ────────────────────────────────────────────────────────
  const score = computeCompositeScore(factors, overdueSchedules.length)
  const level = toLevel(score)

  // ── Top missing items — critical first, then major ─────────────────────────
  const PRIORITY_ORDER: Record<string, number> = {
    critical: 0, major: 1, minor: 2, informational: 3,
  }
  const topMissingItems = missingItems
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
    .slice(0, 5)

  return {
    score,
    level,
    factors,
    upcomingAudits,
    overdueSchedules,
    topMissingItems,
    generatedAt: now.toISOString(),
  }
}
