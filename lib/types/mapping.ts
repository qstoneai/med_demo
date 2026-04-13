// ─── Semantic Mapping Types ───────────────────────────────────────────────────
// Describes a mapping session: one document × N requirement templates.
// Designed to be re-used by gap analysis, traceability, and re-use engine.

import type { DocumentChunk, ChunkCitation } from './documents'
import type { RequirementTemplate } from '../plugins/types'

// ── Per-chunk match ────────────────────────────────────────────────────────────

/** One document chunk scored against a requirement. */
export interface ChunkMatch {
  /** DocumentChunk.id — stable reference for traceability */
  chunkId: string
  /** Full chunk (text + citation) */
  chunk: DocumentChunk
  /** 0–1.  0 = irrelevant, 1 = directly addresses the requirement. */
  relevanceScore: number
  /** One sentence: what in this chunk addresses the requirement. */
  explanation: string
  /** Keywords that drove the match (populated in keyword/hybrid modes). */
  matchedKeywords: string[]
}

// ── Per-requirement mapping ───────────────────────────────────────────────────

export type MappingGapStatus = 'covered' | 'partial' | 'missing'

/**
 * Result of mapping one requirement to the uploaded document.
 * This is the atomic unit for gap analysis and traceability.
 */
export interface RequirementMapping {
  requirementId: string
  /** Full template (authoritative source) */
  requirement: RequirementTemplate
  documentId: string

  /** Chunks found to be relevant, sorted by relevanceScore descending. */
  matchedChunks: ChunkMatch[]

  /**
   * Aggregate score derived from matchedChunks.
   * Computed as the average of the top-3 chunk scores (or fewer if < 3 found).
   * 0 means no relevant content found.
   */
  overallScore: number

  /** Compliance coverage assessment for this requirement. */
  gapStatus: MappingGapStatus

  /**
   * 1-2 sentence explanation of the gap status.
   * Describes what evidence was found and what is absent.
   */
  gapExplanation: string

  /**
   * Subset of requirement.expected_evidence items that were NOT found.
   * Empty = requirement fully evidenced.
   */
  missingEvidence: string[]

  /**
   * Citations derived from matchedChunks — one per matched chunk.
   * Ready to render as source references in the UI and export.
   */
  citations: ChunkCitation[]
}

// ── Session ───────────────────────────────────────────────────────────────────

/** The scoring method used to produce this session. */
export type MappingMethod = 'keyword' | 'llm' | 'hybrid'

/**
 * One complete mapping run: a document mapped against a set of requirements.
 * Sessions are persisted in mappingStore and can be referenced by gap analysis
 * and the traceability matrix.
 */
export interface MappingSession {
  id: string
  documentId: string
  documentName: string
  /** All requirement IDs that were mapped (including unmatched ones). */
  requirementIds: string[]
  /** Mapping results — one entry per requirement, in requirementIds order. */
  mappings: RequirementMapping[]
  /** ISO 8601 timestamp */
  createdAt: string
  /** How relevance scores were computed. */
  method: MappingMethod
}

// ── API shapes ─────────────────────────────────────────────────────────────────

export interface MappingRequest {
  documentId: string
  requirementIds: string[]
}

export interface MappingResponse {
  session: MappingSession
}

export interface MappingListResponse {
  sessions: MappingSession[]
}
