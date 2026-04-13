// ─── Shared AI Analysis Response Types ────────────────────────────────────────
// Used by: /api/upload (compliance review), /api/gap-analysis (future),
//          /api/semantic-map (future). Import these instead of defining local
//          shapes so the entire evidence/citation structure stays in sync.

// ── Citation ─────────────────────────────────────────────────────────────────

/**
 * One citable source — either a regulatory reference (AI-generated) or a
 * document chunk extracted from an ingested file.
 *
 * The two variants share the same interface so the UI can render them
 * uniformly; populate whichever fields are relevant.
 */
export interface AnalysisCitation {
  /** Unique within a single response. E.g. "c1", "REG-001", "CHUNK-003". */
  id: string

  // ── Regulatory source (from AI knowledge / static regulatory data) ─────────
  /** Full regulation name.  E.g. "EU MDR 2017/745" */
  regulationName?: string
  /** Article / section / clause.  E.g. "Annex II, §1" or "Clause 7.1" */
  section?: string
  /** Near-verbatim excerpt from the regulatory text. */
  quote?: string

  // ── Document chunk source (from an ingested PDF / DOCX / XLSX) ────────────
  /** DocumentChunk.id from the store */
  chunkId?: string
  /** Original file name */
  fileName?: string
  /** 1-based page number (PDF) */
  pageNumber?: number
  /** Sheet / tab name (XLSX) */
  sheetName?: string
  /** Detected section heading */
  sectionHeading?: string
  /** First 200 characters of chunk text */
  snippet?: string
}

// ── Evidence ──────────────────────────────────────────────────────────────────

/**
 * Links one AI claim / finding to a specific citation.
 * `citationId` must match an `AnalysisCitation.id` in the same response.
 */
export interface EvidenceLink {
  /** Must match AnalysisCitation.id in the same response */
  citationId: string
  /** One sentence explaining why this citation is evidence for the claim */
  relevance: string
}

// ── Finding ───────────────────────────────────────────────────────────────────

export type FindingStatus = 'covered' | 'partial' | 'missing' | 'human_review'

/**
 * A single compliance finding with its backing evidence.
 * Every finding must carry at least one EvidenceLink so the reviewer can
 * trace each AI assessment back to its regulatory basis.
 */
export interface CitedFinding {
  /** Stable identifier within the response, e.g. "f-001" */
  id: string
  /** Regulation name + section label.  E.g. "EU MDR Annex II §1 — Device Description" */
  requirement: string
  status: FindingStatus
  /** One-sentence assessment. */
  detail: string
  /** Which citations back this finding — should never be empty. */
  evidence: EvidenceLink[]
  /** Model-estimated confidence in this classification (0–1, optional). */
  confidence?: number
}

// ── Response envelope ─────────────────────────────────────────────────────────

/**
 * Universal AI compliance-analysis response.
 * Returned by /api/upload today; will also be returned by /api/gap-analysis
 * and /api/semantic-map so that all AI outputs share the same evidence
 * structure.
 */
export interface AnalysisResponse {
  /** 2–3 sentence executive summary of the document and its compliance posture. */
  summary: string
  /** All findings — each linked to one or more citations. */
  findings: CitedFinding[]
  /** Complete list of citations referenced by findings in this response. */
  citations: AnalysisCitation[]
  /** Critical issues that must be resolved before regulatory submission. */
  riskFlags: string[]
  /** Overall model confidence (0–1, optional). */
  confidence?: number
}
