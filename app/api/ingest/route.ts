// ─── POST /api/ingest ─────────────────────────────────────────────────────────
// Accepts a multipart/form-data upload, runs the ingestion pipeline, and
// returns the parsed document with all chunks and citations.
//
// Body (FormData):
//   file  — required  PDF / DOCX / XLSX, max 4 MB
//
// Response 200: { document: IngestedDocument, chunks: DocumentChunk[] }
// Response 400: { error: string }  — validation failure
// Response 500: { error: string }  — parse / internal failure

import { NextRequest, NextResponse } from 'next/server'
import { ingestDocument } from '@/lib/services/ingestion'
import { recordDocumentUploaded } from '@/lib/services/history'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // ── Parse multipart body ───────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request — expected multipart/form-data body.' },
      { status: 400 },
    )
  }

  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file provided. Include a "file" field in the form data.' },
      { status: 400 },
    )
  }

  // ── Run ingestion pipeline ─────────────────────────────────────────────────
  try {
    const result = await ingestDocument(file)
    recordDocumentUploaded({
      documentId:   result.document.id,
      documentName: result.document.fileName,
      fileType:     result.document.fileType,
      chunkCount:   result.document.chunkCount,
      pageCount:    result.document.pageCount,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document ingestion failed.'
    // Distinguish validation errors (4xx) from parse errors (5xx)
    const isValidation = message.includes('not supported') || message.includes('exceeds the')
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 },
    )
  }
}
