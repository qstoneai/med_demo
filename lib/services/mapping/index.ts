// ─── Semantic Mapping Service ─────────────────────────────────────────────────
// Orchestrates mapping a document's chunks against requirement templates.
//
// Pipeline:
//   1. Load document chunks from store
//   2. Load requirement templates from plugin registry
//   3. Keyword pre-filter → candidate chunks per requirement
//   4a. Demo mode  → keyword scores + rule-based gap status
//   4b. Live mode  → one LLM batch call for semantic scoring
//   5. Build MappingSession + persist to mappingStore
//
// The service is server-side only.  The API route (app/api/mapping/route.ts)
// is the only entry point from the client.

import { randomUUID } from 'crypto'
import { getDocument, getChunks } from '@/lib/store/documentStore'
import { getTemplateById } from '@/lib/plugins/loader'
import { saveMappingSession } from '@/lib/store/mappingStore'
import type { DocumentChunk, ChunkCitation } from '@/lib/types/documents'
import type { RequirementTemplate } from '@/lib/plugins/types'
import type {
  MappingSession,
  MappingMethod,
  RequirementMapping,
  ChunkMatch,
  MappingGapStatus,
} from '@/lib/types/mapping'
import {
  topChunksForRequirement,
  keywordGapStatus,
  keywordGapExplanation,
  keywordExplanation,
  findMissingEvidence,
  type ScoredChunk,
} from './scorer'

// ── Config ────────────────────────────────────────────────────────────────────

const TOP_N_KEYWORD    = 8    // max chunks per requirement from keyword pass
const TOP_N_LLM        = 6    // max chunks per requirement sent to LLM
const MIN_KEYWORD_SCORE = 0.05 // below this = not a candidate
const MIN_LLM_SCORE    = 0.15  // below this = LLM chunk excluded from result
const MAX_CANDIDATES   = 30   // max unique candidate chunks sent to LLM
const CHUNK_PREVIEW    = 280  // chars of chunk text sent in LLM prompt

// ── LLM scoring ───────────────────────────────────────────────────────────────

interface LlmChunkScore {
  chunkId: string
  relevance: number
  explanation: string
}

interface LlmRequirementResult {
  requirementId: string
  chunkScores: LlmChunkScore[]
  gapStatus: MappingGapStatus
  gapExplanation: string
  missingEvidence: string[]
}

/**
 * Sends all candidate chunks and all requirements to GPT-4o-mini in a single
 * batch call.  Returns a map of requirementId → scoring result.
 *
 * Falls back to an empty map on any error (caller will use keyword scores).
 */
async function batchLlmScore(
  candidateChunks: DocumentChunk[],
  requirements: RequirementTemplate[],
  documentName: string,
): Promise<Map<string, LlmRequirementResult>> {
  const results = new Map<string, LlmRequirementResult>()
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // ── Build chunk block ──────────────────────────────────────────────────────
    const chunkBlock = candidateChunks
      .map((c) => {
        const loc = c.citation.pageNumber
          ? `Page ${c.citation.pageNumber}`
          : c.citation.sheetName
            ? `Sheet:${c.citation.sheetName}`
            : ''
        const heading = c.citation.sectionHeading
          ? ` § ${c.citation.sectionHeading.slice(0, 60)}`
          : ''
        const preview = c.text.replace(/\s+/g, ' ').slice(0, CHUNK_PREVIEW)
        return `[${c.id}] (${loc}${heading})\n"${preview}${c.text.length > CHUNK_PREVIEW ? '…' : ''}"`
      })
      .join('\n\n')

    // ── Build requirements block ───────────────────────────────────────────────
    const reqBlock = requirements
      .map((r) => {
        const evid = r.expected_evidence
          .map((e, i) => `  ${i + 1}. ${e}`)
          .join('\n')
        return (
          `[${r.requirement_id}] ${r.title}\n` +
          `Regulation: ${r.regulation} — ${r.article}\n` +
          `Description: ${r.description.slice(0, 200)}\n` +
          `Expected evidence:\n${evid}`
        )
      })
      .join('\n\n---\n\n')

    const systemPrompt = `You are a medical device regulatory document analyst.
Your task: determine which document chunks contain evidence for each regulatory requirement.

RULES:
- relevance 0.0–1.0: 0 = irrelevant, 0.5 = partially relevant, 1.0 = directly satisfies requirement
- gapStatus "covered": strong evidence found, most expected_evidence items present
- gapStatus "partial": some relevant content but key evidence items absent
- gapStatus "missing": no relevant content found
- Only include chunkScores with relevance >= 0.15
- missingEvidence: list specific expected_evidence items NOT found in the document
- gapExplanation: 1-2 sentences — what was found AND what is absent

Respond with ONLY valid JSON, no markdown fences:`

    const userPrompt =
      `DOCUMENT: ${documentName}\n\n` +
      `CHUNKS:\n${chunkBlock}\n\n` +
      `===\n\nREQUIREMENTS:\n${reqBlock}\n\n` +
      `Return JSON:\n` +
      `{\n  "mappings": [\n    {\n      "requirementId": "...",\n` +
      `      "chunkScores": [{ "chunkId": "...", "relevance": 0.0, "explanation": "..." }],\n` +
      `      "gapStatus": "covered|partial|missing",\n` +
      `      "gapExplanation": "...",\n` +
      `      "missingEvidence": ["..."]\n    }\n  ]\n}`

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      instructions: systemPrompt,
      input: userPrompt,
    })

    const raw   = response.output_text ?? ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(clean) as { mappings: LlmRequirementResult[] }

    for (const m of parsed.mappings) {
      results.set(m.requirementId, m)
    }
  } catch (err) {
    console.error('[mapping/llm] batch scoring failed, falling back to keyword:', err)
  }
  return results
}

// ── Session builder ───────────────────────────────────────────────────────────

function buildRequirementMapping(
  requirement: RequirementTemplate,
  documentId: string,
  keywordCandidates: ScoredChunk[],
  llmResult: LlmRequirementResult | undefined,
): RequirementMapping {
  let matchedChunks: ChunkMatch[]
  let gapStatus: MappingGapStatus
  let gapExplanation: string
  let missingEvidence: string[]

  if (llmResult) {
    // ── LLM mode ──────────────────────────────────────────────────────────────
    const llmById = new Map(llmResult.chunkScores.map((s) => [s.chunkId, s]))

    // Merge: prefer LLM score, fall back to keyword score for pre-filter candidates
    matchedChunks = keywordCandidates
      .map((kc): ChunkMatch => {
        const llm = llmById.get(kc.chunk.id)
        if (llm && llm.relevance >= MIN_LLM_SCORE) {
          return {
            chunkId:        kc.chunk.id,
            chunk:          kc.chunk,
            relevanceScore: llm.relevance,
            explanation:    llm.explanation,
            matchedKeywords: kc.matchedKeywords,
          }
        }
        // Chunk was pre-filtered but LLM scored it below threshold — include
        // only if keyword score was decent
        if (kc.score >= 0.15) {
          return {
            chunkId:        kc.chunk.id,
            chunk:          kc.chunk,
            relevanceScore: kc.score * 0.6,  // downscale keyword score in LLM mode
            explanation:    keywordExplanation(kc.chunk, kc.matchedKeywords, kc.score) +
                            ' (semantic score below threshold.)',
            matchedKeywords: kc.matchedKeywords,
          }
        }
        return null as unknown as ChunkMatch
      })
      .filter(Boolean)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, TOP_N_LLM)

    gapStatus      = llmResult.gapStatus
    gapExplanation = llmResult.gapExplanation
    missingEvidence = llmResult.missingEvidence ?? []

  } else {
    // ── Keyword-only mode ──────────────────────────────────────────────────────
    const topK = keywordCandidates.slice(0, TOP_N_KEYWORD)

    matchedChunks = topK.map((kc): ChunkMatch => ({
      chunkId:        kc.chunk.id,
      chunk:          kc.chunk,
      relevanceScore: kc.score,
      explanation:    keywordExplanation(kc.chunk, kc.matchedKeywords, kc.score),
      matchedKeywords: kc.matchedKeywords,
    }))

    const scores   = matchedChunks.map((m) => m.relevanceScore)
    gapStatus      = keywordGapStatus(scores)
    missingEvidence = findMissingEvidence(requirement.expected_evidence, topK)
    gapExplanation  = keywordGapExplanation(requirement, gapStatus, topK, missingEvidence)
  }

  // ── Overall score ──────────────────────────────────────────────────────────
  const top3     = matchedChunks.slice(0, 3).map((m) => m.relevanceScore)
  const overallScore = top3.length === 0
    ? 0
    : top3.reduce((a, b) => a + b, 0) / top3.length

  // ── Citations ──────────────────────────────────────────────────────────────
  const citations: ChunkCitation[] = matchedChunks.map((m) => m.chunk.citation)

  return {
    requirementId: requirement.requirement_id,
    requirement,
    documentId,
    matchedChunks,
    overallScore,
    gapStatus,
    gapExplanation,
    missingEvidence,
    citations,
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Runs a mapping session synchronously:
 *   document chunks × selected requirement templates
 *
 * Returns the completed MappingSession (already persisted to mappingStore).
 * Throws if documentId does not exist or requirementIds are all invalid.
 */
export async function runMapping(
  documentId: string,
  requirementIds: string[],
): Promise<MappingSession> {
  // ── 1. Load document ───────────────────────────────────────────────────────
  const document = getDocument(documentId)
  if (!document) throw new Error(`Document not found: ${documentId}`)

  const chunks = getChunks(documentId)
  if (chunks.length === 0) {
    throw new Error(`Document "${document.fileName}" has no parsed chunks. Re-upload to ingest.`)
  }

  // ── 2. Load requirements ───────────────────────────────────────────────────
  const requirements = requirementIds
    .map((id) => getTemplateById(id))
    .filter((r): r is RequirementTemplate => r !== undefined)

  if (requirements.length === 0) {
    throw new Error('None of the provided requirement IDs were found in the registry.')
  }

  // ── 3. Keyword pre-filter per requirement ──────────────────────────────────
  const candidatesByReq = new Map<string, ScoredChunk[]>()
  for (const req of requirements) {
    candidatesByReq.set(
      req.requirement_id,
      topChunksForRequirement(chunks, req, TOP_N_KEYWORD, MIN_KEYWORD_SCORE),
    )
  }

  // ── 4. Determine scoring method ────────────────────────────────────────────
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY)
  let method: MappingMethod = 'keyword'
  let llmResults = new Map<string, LlmRequirementResult>()

  if (hasApiKey) {
    method = 'hybrid'

    // Collect unique candidate chunks across all requirements
    const seenIds = new Set<string>()
    const allCandidates: DocumentChunk[] = []
    for (const candidates of candidatesByReq.values()) {
      for (const c of candidates) {
        if (!seenIds.has(c.chunk.id)) {
          seenIds.add(c.chunk.id)
          allCandidates.push(c.chunk)
          if (allCandidates.length >= MAX_CANDIDATES) break
        }
      }
      if (allCandidates.length >= MAX_CANDIDATES) break
    }

    if (allCandidates.length > 0) {
      llmResults = await batchLlmScore(allCandidates, requirements, document.fileName)
    }

    // If LLM returned nothing, fall back to keyword
    if (llmResults.size === 0) method = 'keyword'
  }

  // ── 5. Build per-requirement mappings ──────────────────────────────────────
  const mappings: RequirementMapping[] = requirements.map((req) =>
    buildRequirementMapping(
      req,
      documentId,
      candidatesByReq.get(req.requirement_id) ?? [],
      llmResults.get(req.requirement_id),
    ),
  )

  // ── 6. Assemble and persist session ───────────────────────────────────────
  const session: MappingSession = {
    id:             randomUUID(),
    documentId,
    documentName:   document.fileName,
    requirementIds: requirements.map((r) => r.requirement_id),
    mappings,
    createdAt:      new Date().toISOString(),
    method,
  }

  saveMappingSession(session)
  return session
}
