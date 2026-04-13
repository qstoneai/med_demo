// ─── Document Ingestion Domain Types ─────────────────────────────────────────
// Pure TypeScript interfaces — no server/client dependencies.
// Safe to import in both Server Components and Client Components.

export type FileType = 'pdf' | 'docx' | 'xlsx'

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'error'

// ── Ingested document record ───────────────────────────────────────────────────
export interface IngestedDocument {
  id: string
  fileName: string
  fileType: FileType
  fileSize: number          // bytes
  status: ProcessingStatus
  errorMessage?: string
  uploadedAt: string        // ISO 8601
  processedAt?: string      // ISO 8601
  chunkCount: number
  pageCount?: number        // PDF only
  sheetNames?: string[]     // XLSX only
}

// ── Document chunk (one indexable unit of text) ────────────────────────────────
export interface DocumentChunk {
  id: string
  documentId: string
  chunkIndex: number        // 0-based
  text: string
  citation: ChunkCitation
}

// ── Citation — anchors a chunk back to its source location ────────────────────
export interface ChunkCitation {
  /** Original file name */
  fileName: string
  /** File format */
  fileType: FileType
  /** PDF: 1-based page number */
  pageNumber?: number
  /** XLSX: sheet/tab name */
  sheetName?: string
  /** DOCX heading or PDF first-line heading, if detectable */
  sectionHeading?: string
  /** First 200 characters of extracted text */
  snippet: string
  /** Back-reference to the owning chunk */
  chunkId: string
}

// ── API response shapes ────────────────────────────────────────────────────────
export interface IngestResponse {
  document: IngestedDocument
  chunks: DocumentChunk[]
}

export interface DocumentListResponse {
  documents: IngestedDocument[]
}

export interface DocumentDetailResponse {
  document: IngestedDocument
  chunks: DocumentChunk[]
}
