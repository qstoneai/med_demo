// ─── GET /api/documents/[id] ──────────────────────────────────────────────────
// Returns the document metadata and all its chunks (with citations).
// Response 200: { document: IngestedDocument, chunks: DocumentChunk[] }
// Response 404: { error: 'Document not found' }

import { NextRequest, NextResponse } from 'next/server'
import { getDocument, getChunks } from '@/lib/store/documentStore'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const document = getDocument(id)

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const chunks = getChunks(id)
  return NextResponse.json({ document, chunks })
}
