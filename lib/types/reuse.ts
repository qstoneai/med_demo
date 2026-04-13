// ─── Evidence Re-use Recommendation Types ────────────────────────────────────
// A ReuseReport identifies document chunks that already matched one requirement
// and could also satisfy a related requirement — enabling cross-domain evidence
// reuse without re-uploading or re-analysing documents.
//
// All recommendations are SUGGESTED only — never auto-applied.
// Citations are always preserved from the original chunk.

import type { DocumentChunk, ChunkCitation } from './documents'
import type { RequirementTemplate } from '../plugins/types'
import type { GapStatus } from './gap'

// ── Candidate ─────────────────────────────────────────────────────────────────

/**
 * How the reuse link was discovered:
 *   related  — explicit related_requirements link between source and target
 *   keyword  — keyword overlap between chunk and target requirement (no explicit link)
 *   both     — explicit link confirmed by keyword overlap
 */
export type ReuseLinkType = 'related' | 'keyword' | 'both'

/** A single chunk recommended for reuse from one requirement to another. */
export interface ReuseCandidate {
  chunkId: string
  /** Full chunk — text, citation, and location. */
  chunk: DocumentChunk

  /** The requirement where this chunk was originally matched and scored well. */
  sourceRequirementId: string
  sourceRequirement: RequirementTemplate

  /** The requirement that could benefit from this chunk. */
  targetRequirementId: string
  targetRequirement: RequirementTemplate

  /**
   * Estimated relevance of this chunk to the TARGET requirement (0–1).
   * Computed by re-running keyword scoring against the target.
   */
  suggestedRelevance: number

  /** How this reuse link was discovered. */
  linkType: ReuseLinkType

  /** One-sentence explanation of why this chunk may be useful for the target. */
  explanation: string

  /** Always 'suggested' — user must review before applying. */
  status: 'suggested'

  /** Citation from the original chunk — location in the source document. */
  citation: ChunkCitation
}

// ── Group (per target requirement) ───────────────────────────────────────────

/**
 * All reuse candidates for a single target requirement.
 * Grouped this way so the UI can show "requirement X could be improved by N chunks".
 */
export interface RequirementReuseGroup {
  targetRequirementId: string
  targetRequirement: RequirementTemplate

  /** Current gap status of the target requirement in the source session. */
  currentGapStatus: GapStatus

  /**
   * Optimistic estimate of what the gap status COULD become if all candidates
   * are accepted.  null = status would remain the same.
   *   missing → partial   (at least one useful chunk found)
   *   partial → sufficient (strong chunk(s) with suggestedRelevance >= 0.35 found)
   */
  potentialImprovement: GapStatus | null

  /** Candidates sorted by suggestedRelevance descending. */
  candidates: ReuseCandidate[]
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface ReuseSummary {
  /** Number of target requirements with at least one reuse candidate. */
  requirementsWithCandidates: number

  /** Total number of (chunk, target) candidate pairs. */
  totalCandidates: number

  /**
   * Candidates targeting requirements where priority = 'critical'
   * AND currentGapStatus = 'missing'.
   */
  criticalCoverageCount: number

  /** Distinct cross-domain source→target domain pairs represented. */
  crossDomainPairs: Array<{ sourceDomain: string; targetDomain: string; count: number }>

  /**
   * Requirements where the gap status could potentially improve from
   * 'missing' to 'partial' or 'partial' to 'sufficient'.
   */
  improvableRequirements: number
}

// ── Full report ───────────────────────────────────────────────────────────────

export interface ReuseReport {
  id: string
  /** Source MappingSession this report was derived from. */
  sessionId: string
  documentId: string
  documentName: string
  /** ISO 8601 */
  createdAt: string

  /**
   * Groups sorted by: priority desc, then status severity desc (missing first).
   * Ensures the most impactful reuse opportunities appear first.
   */
  groups: RequirementReuseGroup[]

  summary: ReuseSummary
}

// ── API shapes ────────────────────────────────────────────────────────────────

export type ReuseRequest =
  | { sessionId: string }
  | { documentId: string; requirementIds: string[] }

export interface ReuseResponse {
  report: ReuseReport
}
