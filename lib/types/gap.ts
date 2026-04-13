// ─── Gap Analysis Types ───────────────────────────────────────────────────────
// A GapReport is a human-readable compliance readiness view derived from a
// MappingSession.  It adds:
//   • GapStatus ('sufficient' | 'partial' | 'missing') — renamed from mapping's
//     MappingGapStatus for public-facing language
//   • recommendedActions  — concrete next steps per requirement
//   • Domain-level readiness breakdown
//   • Priority-weighted overall readiness score
//
// GapReports reference their source MappingSession but are stored independently,
// allowing downstream re-use (traceability matrix, audit log, export).

import type { ChunkCitation } from './documents'
import type { RequirementTemplate } from '../plugins/types'
import type { MappingMethod } from './mapping'

// ── Per-requirement gap item ───────────────────────────────────────────────────

/**
 * Public-facing compliance status label.
 * Maps from MappingGapStatus:  covered → sufficient, others are identical.
 */
export type GapStatus = 'sufficient' | 'partial' | 'missing'

/** Full gap analysis result for one requirement against one document. */
export interface GapItem {
  requirementId: string
  /** Full requirement template — authoritative source. */
  requirement: RequirementTemplate

  /** Compliance coverage status. */
  status: GapStatus

  /** Aggregate relevance score (0–1) from matched chunks. */
  overallScore: number

  /**
   * Specific expected_evidence items that were NOT found in the document.
   * Empty array = all expected evidence present.
   */
  missingPoints: string[]

  /**
   * Actionable next steps to close the gap.
   * Generated from: status + priority + domain + missingPoints.
   * 1–4 items.
   */
  recommendedActions: string[]

  /**
   * Source citations from matched chunks — anchors findings to document locations.
   * Empty if no relevant chunks found.
   */
  citations: ChunkCitation[]

  /** Number of document chunks matched to this requirement. */
  matchedChunkCount: number

  /** 1–2 sentence explanation of the gap status (from mapping layer). */
  gapExplanation: string
}

// ── Domain-level summary ───────────────────────────────────────────────────────

/** Readiness breakdown for one regulatory domain (e.g. Risk, Cybersecurity). */
export interface DomainReadiness {
  domain: string
  total: number
  sufficient: number
  partial: number
  missing: number
  /** Simple (sufficient + 0.4×partial) / total × 100 score, 0–100. */
  score: number
}

// ── Session-level summary ──────────────────────────────────────────────────────

export interface GapSummary {
  /** Total number of requirements analysed. */
  total: number
  sufficient: number
  partial: number
  missing: number

  /**
   * Priority-weighted readiness score, 0–100.
   * Weights: critical=4, major=3, minor=2, informational=1.
   * Status scores: sufficient=1.0, partial=0.4, missing=0.0.
   */
  readinessScore: number

  /**
   * Human-readable level derived from readinessScore:
   *   ≥ 80 → high | 60–79 → medium | 40–59 → low | < 40 → critical
   */
  readinessLevel: 'high' | 'medium' | 'low' | 'critical'

  /** requirement_ids where priority = 'critical' AND status = 'missing'. */
  criticalGaps: string[]

  /** Per-domain breakdown — sorted by score ascending (worst first). */
  domainBreakdown: DomainReadiness[]
}

// ── Full gap report ────────────────────────────────────────────────────────────

export interface GapReport {
  /** Unique report ID. */
  id: string

  /** The MappingSession this report was derived from. */
  sessionId: string

  documentId: string
  documentName: string

  /** ISO 8601 timestamp of report creation. */
  createdAt: string

  /** Scoring method used in the source mapping session. */
  method: MappingMethod

  /** Per-requirement gap items, sorted by: priority desc, then status severity desc. */
  items: GapItem[]

  /** Aggregate summary for dashboard / overview views. */
  summary: GapSummary
}

// ── API shapes ────────────────────────────────────────────────────────────────

/**
 * POST /api/gap
 * Variant A: derive from existing session.
 * Variant B: run mapping + gap analysis in one step.
 */
export type GapRequest =
  | { sessionId: string }
  | { documentId: string; requirementIds: string[] }

export interface GapResponse {
  report: GapReport
}

export interface GapListResponse {
  reports: GapReport[]
}
