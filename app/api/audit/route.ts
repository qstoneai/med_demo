// ─── /api/audit (legacy alias → delegates to /api/history) ───────────────────
// Kept for backwards compatibility.  All new code should use /api/history.

import { NextRequest, NextResponse } from 'next/server'
import { queryHistory } from '@/lib/services/history'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const result = queryHistory({ limit, offset })

  // Maintain legacy response shape expected by existing consumers
  return NextResponse.json({
    entries: result.entries,
    total:   result.total,
  })
}
