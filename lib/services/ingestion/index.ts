// ─── Document Ingestion Service ───────────────────────────────────────────────
// Orchestrates: validate → save pending → parse → chunk → persist → audit.
//
// Designed to run inside a Next.js Route Handler today.
// When processing time exceeds Vercel's 60-second limit, move this function
// to a separate worker (Inngest / Vercel Queue) without changing the call site —
// just replace the direct call in /api/ingest/route.ts with a job dispatch.

import type { IngestedDocument, DocumentChunk, FileType } from '@/lib/types/documents'
import {
  saveDocument,
  updateDocument,
  saveChunks,
} from '@/lib/store/documentStore'
import { addAuditEntry } from '@/lib/audit'

// ── Constants ─────────────────────────────────────────────────────────────────
/** 4 MB — stays within Vercel's 4.5 MB serverless request body limit */
const MAX_FILE_BYTES = 4 * 1024 * 1024

const SUPPORTED_EXTENSIONS: Record<string, FileType> = {
  pdf: 'pdf',
  docx: 'docx',
  doc: 'docx',
  xlsx: 'xlsx',
  xls: 'xlsx',
}

// ── Public result type ────────────────────────────────────────────────────────
export interface IngestionResult {
  document: IngestedDocument
  chunks: DocumentChunk[]
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function ingestDocument(file: File): Promise<IngestionResult> {
  // ── 1. Validate ─────────────────────────────────────────────────────────────
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const fileType = SUPPORTED_EXTENSIONS[ext]

  if (!fileType) {
    throw new Error(
      `"${file.name}" is not supported. Please upload a PDF, DOCX, or XLSX file.`,
    )
  }

  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(
      `"${file.name}" is ${mb} MB — exceeds the 4 MB limit. ` +
      `Please reduce file size or contact support for large-file handling.`,
    )
  }

  // ── 2. Create pending record ─────────────────────────────────────────────────
  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const doc: IngestedDocument = {
    id,
    fileName: file.name,
    fileType,
    fileSize: file.size,
    status: 'processing',
    uploadedAt: new Date().toISOString(),
    chunkCount: 0,
  }
  saveDocument(doc)

  // ── 3. Parse + chunk ─────────────────────────────────────────────────────────
  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    let chunks: DocumentChunk[] = []
    let pageCount: number | undefined
    let sheetNames: string[] | undefined

    if (fileType === 'pdf') {
      const { parsePdf } = await import('./parsers/pdf')
      const result = await parsePdf(buffer, doc)
      chunks = result.chunks
      pageCount = result.pageCount
    } else if (fileType === 'docx') {
      const { parseDocx } = await import('./parsers/docx')
      chunks = await parseDocx(buffer, doc)
    } else {
      const { parseXlsx } = await import('./parsers/xlsx')
      const result = await parseXlsx(buffer, doc)
      chunks = result.chunks
      sheetNames = result.sheetNames
    }

    // Drop near-empty chunks that add no value
    chunks = chunks.filter(c => c.text.trim().length > 20)

    // ── 4. Persist ─────────────────────────────────────────────────────────────
    saveChunks(id, chunks)

    const completed: IngestedDocument = {
      ...doc,
      status: 'complete',
      processedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      pageCount,
      sheetNames,
    }
    updateDocument(id, completed)

    addAuditEntry({
      user: 'Dr. Sarah Kim',
      action: 'file_upload',
      document: file.name,
      details: `Ingested "${file.name}" — ${chunks.length} chunk${chunks.length !== 1 ? 's' : ''} (${fileType.toUpperCase()})`,
      status: 'success',
    })

    return { document: completed, chunks }

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown parsing error'

    updateDocument(id, { status: 'error', errorMessage: msg })

    addAuditEntry({
      user: 'Dr. Sarah Kim',
      action: 'file_upload',
      document: file.name,
      details: `Failed to ingest "${file.name}": ${msg}`,
      status: 'failed',
    })

    // Re-throw so the route handler can return the right HTTP status
    throw error
  }
}
