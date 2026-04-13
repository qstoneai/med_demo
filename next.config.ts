import type { NextConfig } from 'next'

// ── Security headers ──────────────────────────────────────────────────────────
// Applied to every response served by Next.js.
// These are defence-in-depth headers — they do NOT replace authentication or
// authorisation.  See middleware.ts for route-level protection stubs.
//
// TODO (Phase 2 hardening):
//   • Tighten CSP script-src once inline styles are removed
//   • Add Report-To / NEL for CSP violation reporting
//   • Enable HSTS preload once domain is stable

const SECURITY_HEADERS = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer leakage
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not needed by this app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Force HTTPS for 1 year (enable preload when domain is confirmed)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // Content Security Policy
  // 'unsafe-inline' for styles is acceptable short-term (inline JSX styles).
  // Remove once CSS-in-JS is replaced with a stylesheet.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // TODO: remove unsafe-eval in prod
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.openai.com",  // only external fetch target
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling these Node.js-native packages.
  // They must be loaded via native require() at runtime.
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
