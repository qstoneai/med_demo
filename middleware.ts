// ─── Next.js Middleware — Route Protection Stub ────────────────────────────────
// This file runs on every request before it reaches a route handler or page.
//
// CURRENT STATE (MVP / Demo):
//   All routes are currently public.  The stubs below are intentional
//   placeholders — they show WHERE auth checks belong so that adding a real
//   auth provider (NextAuth.js, Clerk, Auth.js) requires only local changes
//   here, not changes across every API route.
//
// TODO (Phase 2 — Auth):
//   1. Install an auth provider:
//        npm install next-auth  (or)  npm install @clerk/nextjs
//   2. Replace the placeholder below with the provider's middleware:
//        — NextAuth:  export { auth as middleware } from './auth'
//        — Clerk:     export default clerkMiddleware(...)
//   3. Set JWT_SECRET / NEXTAUTH_SECRET in Vercel environment variables.
//   4. Map roles to route prefixes in PROTECTED_PREFIXES below.
//
// TODO (Phase 2 — Rate Limiting):
//   Use Vercel's built-in rate limiting (Enterprise) or add:
//     import { Ratelimit } from '@upstash/ratelimit'
//     import { Redis }     from '@upstash/redis'
//   Apply per-IP limits on LLM-triggering endpoints (/api/mapping, /api/upload).

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Route taxonomy ────────────────────────────────────────────────────────────

/** Prefixes that require an authenticated session. */
const PROTECTED_PREFIXES = [
  '/api/chat',
  '/api/ingest',
  '/api/upload',
  '/api/mapping',
  '/api/gap',
  '/api/reuse',
  '/api/trace',
  '/api/history',
  '/api/audit',
  '/api/audit-schedule',
  '/api/documents',
  '/dashboard',
  '/chat',
  '/upload',
  '/mapping',
  '/gap',
  '/reuse',
  '/trace',
  '/audit',
  '/audit-readiness',
]

/** Routes that must always be accessible without a session. */
const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon',
  '/api/health',
  '/api/predicates',  // regulatory template data — non-sensitive
  '/api/templates',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

function requiresAuth(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // ── Phase 2: replace this block with real auth check ──────────────────────
  // Example with NextAuth:
  //   const token = await getToken({ req: request, secret: process.env.JWT_SECRET })
  //   const isAuthed = !!token
  //
  // Example with Clerk:
  //   const { userId } = getAuth(request)
  //   const isAuthed = !!userId

  const isAuthed = true  // TODO: replace with real session check

  if (!isPublic(pathname) && requiresAuth(pathname) && !isAuthed) {
    // Redirect browsers to login; return 401 for API clients
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      )
    }
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Phase 2: per-route rate limiting ──────────────────────────────────────
  // High-cost LLM endpoints need IP-based throttling.
  // Example with Upstash Redis:
  //   const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1m') })
  //   const ip = request.ip ?? '127.0.0.1'
  //   const { success } = await ratelimit.limit(ip)
  //   if (!success) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 })
  //
  // Suggested limits per endpoint (requests / minute / IP):
  //   /api/mapping  →  5  (expensive: multi-requirement LLM batch)
  //   /api/upload   →  10
  //   /api/chat     →  20
  //   /api/ingest   →  10
  //   /api/gap      →  10

  return NextResponse.next()
}

export const config = {
  // Run middleware on every route except Next.js internals and static files.
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:ico|png|svg|jpg|jpeg|webp|woff2?|css|js)$).*)'],
}
