import { NextResponse } from 'next/server'
import { getIthPredicatesWithLinks } from '@/lib/regulatory-data'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const predicates = getIthPredicatesWithLinks()
    return NextResponse.json({ predicates })
  } catch (err) {
    console.error('[predicates/route] error', err)
    return NextResponse.json({ error: 'Failed to load predicate data' }, { status: 500 })
  }
}
