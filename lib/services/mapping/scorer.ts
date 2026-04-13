// ─── Keyword Scorer ───────────────────────────────────────────────────────────
// Pure functions — no side effects, no I/O.
// Used as the fast pre-filter step and as the sole scorer in demo (no-API) mode.

import type { DocumentChunk } from '@/lib/types/documents'
import type { RequirementTemplate } from '@/lib/plugins/types'
import type { MappingGapStatus } from '@/lib/types/mapping'

// ── Stop words to exclude from token comparison ───────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'not', 'no',
  'its', 'it', 'this', 'that', 'these', 'those', 'each', 'all', 'any',
  'per', 'as', 'if', 'than', 'so', 'such', 'also', 'more', 'most',
])

// ── Tokenizer ─────────────────────────────────────────────────────────────────

/** Converts text → lowercase tokens, removing stop words and short tokens. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')   // keep hyphens (e.g. "risk-management")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
}

/** Builds a token frequency map (bag-of-words). */
function bagOfWords(tokens: string[]): Map<string, number> {
  const bag = new Map<string, number>()
  for (const t of tokens) bag.set(t, (bag.get(t) ?? 0) + 1)
  return bag
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Computes a soft Jaccard-like similarity between a chunk and a requirement.
 * Applies a 2× boost to exact matches from requirement tags and title tokens.
 *
 * Returns a score in [0, 1] and the list of matched tokens.
 */
export function scoreChunk(
  chunk: DocumentChunk,
  requirement: RequirementTemplate,
): { score: number; matchedKeywords: string[] } {
  // Build requirement token set — weight title + tags higher
  const titleTokens   = new Set(tokenize(requirement.title))
  const tagTokens     = new Set((requirement.tags ?? []).flatMap(tokenize))
  const descTokens    = tokenize(requirement.description)
  const evidTokens    = tokenize(requirement.expected_evidence.join(' '))
  const articleTokens = tokenize(requirement.article)

  const reqBag = bagOfWords([
    ...titleTokens,         // 1×
    ...titleTokens,         // 2× boost for title
    ...tagTokens,           // 1×
    ...tagTokens,           // 2× boost for tags
    ...descTokens,
    ...evidTokens,
    ...articleTokens,
  ])

  const chunkTokens = tokenize(chunk.text)
  const chunkBag    = bagOfWords(chunkTokens)

  // Intersection (weighted)
  let intersectionWeight = 0
  const matched: string[] = []
  for (const [token, reqCount] of reqBag) {
    if (chunkBag.has(token)) {
      intersectionWeight += Math.min(reqCount, chunkBag.get(token)!)
      matched.push(token)
    }
  }

  // Union (sum of both bags, subtract intersection)
  const reqSum   = [...reqBag.values()].reduce((a, b) => a + b, 0)
  const chunkSum = [...chunkBag.values()].reduce((a, b) => a + b, 0)
  const union    = reqSum + chunkSum - intersectionWeight

  const score = union === 0 ? 0 : intersectionWeight / union

  // Deduplicate matched keywords, sort by frequency in chunk
  const deduped = [...new Set(matched)].sort(
    (a, b) => (chunkBag.get(b) ?? 0) - (chunkBag.get(a) ?? 0),
  )

  return { score: Math.min(score, 1), matchedKeywords: deduped.slice(0, 10) }
}

// ── Candidate selection ───────────────────────────────────────────────────────

export interface ScoredChunk {
  chunk: DocumentChunk
  score: number
  matchedKeywords: string[]
}

/**
 * Returns the top-N chunks for a requirement, sorted by keyword score.
 * Filters out chunks with score < minScore.
 */
export function topChunksForRequirement(
  chunks: DocumentChunk[],
  requirement: RequirementTemplate,
  topN = 8,
  minScore = 0.05,
): ScoredChunk[] {
  return chunks
    .map((chunk) => {
      const { score, matchedKeywords } = scoreChunk(chunk, requirement)
      return { chunk, score, matchedKeywords }
    })
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

// ── Gap status (keyword mode) ─────────────────────────────────────────────────

/**
 * Derives a gap status from an array of chunk relevance scores.
 * Used in demo mode when no LLM is available.
 */
export function keywordGapStatus(scores: number[]): MappingGapStatus {
  if (scores.length === 0) return 'missing'
  const max = Math.max(...scores)
  const highCount = scores.filter((s) => s >= 0.25).length
  if (max >= 0.35 && highCount >= 2) return 'covered'
  if (max >= 0.15 || scores.length >= 1) return 'partial'
  return 'missing'
}

// ── Missing evidence detection ────────────────────────────────────────────────

/**
 * Checks which expected_evidence items from the requirement are NOT found
 * in any of the matched chunks.
 *
 * Strategy: for each evidence item, check if there is meaningful keyword
 * overlap between the evidence text and any matched chunk. If the overlap
 * is below threshold, flag the item as missing.
 */
export function findMissingEvidence(
  expectedEvidence: string[],
  matchedChunks: ScoredChunk[],
): string[] {
  if (matchedChunks.length === 0) return expectedEvidence

  const allChunkText = matchedChunks.map((c) => c.chunk.text).join(' ')
  const chunkTokens  = new Set(tokenize(allChunkText))

  return expectedEvidence.filter((evidItem) => {
    const evidTokens = tokenize(evidItem)
    if (evidTokens.length === 0) return false
    const overlap = evidTokens.filter((t) => chunkTokens.has(t)).length
    // Flag as missing if less than 30% of evidence tokens appear in chunks
    return overlap / evidTokens.length < 0.3
  })
}

// ── Keyword-mode explanation ──────────────────────────────────────────────────

/**
 * Generates a human-readable explanation for a keyword-scored chunk match.
 */
export function keywordExplanation(
  chunk: DocumentChunk,
  matchedKeywords: string[],
  score: number,
): string {
  const loc = chunk.citation.pageNumber
    ? `page ${chunk.citation.pageNumber}`
    : chunk.citation.sheetName
      ? `sheet "${chunk.citation.sheetName}"`
      : 'this section'

  if (matchedKeywords.length === 0) {
    return `Low-confidence match on ${loc} (score ${(score * 100).toFixed(0)}%).`
  }

  const topKw = matchedKeywords.slice(0, 5).join(', ')
  return `Keyword match on ${loc} (score ${(score * 100).toFixed(0)}%): shared terms [${topKw}].`
}

/**
 * Generates a gap-level explanation for keyword-mode results.
 */
export function keywordGapExplanation(
  requirement: RequirementTemplate,
  status: MappingGapStatus,
  topChunks: ScoredChunk[],
  missingEvidence: string[],
): string {
  if (status === 'missing') {
    return (
      `No content related to "${requirement.title}" was found in the document. ` +
      `This requirement may not be addressed in the submitted text.`
    )
  }
  if (status === 'covered') {
    return (
      `The document contains relevant content for "${requirement.title}" ` +
      `across ${topChunks.length} section(s). ` +
      (missingEvidence.length === 0
        ? 'All expected evidence items appear to be present.'
        : `Some evidence items may still need verification: ${missingEvidence.slice(0, 2).join('; ')}.`)
    )
  }
  // partial
  const topSection = topChunks[0]?.chunk.citation.sectionHeading
  return (
    `Partial evidence for "${requirement.title}" found` +
    (topSection ? ` in section "${topSection}"` : '') +
    `. ` +
    (missingEvidence.length > 0
      ? `Missing or unclear: ${missingEvidence.slice(0, 3).join('; ')}.`
      : 'Content is present but may be insufficient for full compliance.')
  )
}
