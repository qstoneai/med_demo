// ─── GET /api/documents ───────────────────────────────────────────────────────
// Returns the list of ingested documents (newest first).
// Response: { documents: IngestedDocument[] }

import { NextResponse } from 'next/server'
import { listDocuments } from '@/lib/store/documentStore'

export const dynamic = 'force-dynamic'

export async function GET() {
  const documents = listDocuments()
  return NextResponse.json({ documents })
}
