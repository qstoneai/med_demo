'use client'

import { useState } from 'react'

// ─── Types (mirrors analyzeDocument return shape) ──────────────────────────────

interface Gap {
  severity: 'critical' | 'major' | 'minor'
  regulation: string
  section: string
  description: string
  recommendation: string
}

interface AnalysisResult {
  score: number
  gaps: Gap[]
  recommendations: string[]
}

// ─── Severity badge colours ────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<Gap['severity'], string> = {
  critical: 'background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5',
  major:    'background:#fff7ed;color:#c2410c;border:1px solid #fdba74',
  minor:    'background:#f0fdf4;color:#15803d;border:1px solid #86efac',
}

// ─── Score colour ──────────────────────────────────────────────────────────────

function scoreColour(score: number): string {
  if (score >= 80) return '#15803d'
  if (score >= 60) return '#b45309'
  return '#b91c1c'
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [docText, setDocText]     = useState('')
  const [fileName, setFileName]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [result, setResult]       = useState<AnalysisResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!docText.trim()) {
      setError('Document text is required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docText,
          fileName: fileName.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error ?? `Request failed (${res.status})`)
        return
      }

      setResult(data as AnalysisResult)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* ── Header ── */}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Technical Document Review
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
        Paste your document text below to receive an AI-powered regulatory compliance analysis.
      </p>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="fileName" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            File Name <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="fileName"
            type="text"
            placeholder="e.g. risk_management_file_v2.pdf"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="docText" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Document Text <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="docText"
            rows={14}
            placeholder="Paste your technical document content here…"
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            style={{
              padding: '0.625rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: '0.875rem',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: '#b91c1c', fontSize: '0.875rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.625rem 0.875rem', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            alignSelf: 'flex-start',
            padding: '0.6rem 1.5rem',
            background: loading ? '#6b7280' : '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Analysing…' : 'Analyse Document'}
        </button>
      </form>

      {/* ── Results ── */}
      {result && (
        <section aria-label="Analysis results" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: scoreColour(result.score), lineHeight: 1 }}>
              {result.score}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Compliance Score</div>
              <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>out of 100</div>
            </div>
          </div>

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Compliance Gaps ({result.gaps.length})
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {result.gaps.map((gap, i) => (
                  <li key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.875rem 1rem', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ ...Object.fromEntries(SEVERITY_STYLES[gap.severity as Gap['severity']]?.split(';').map(s => s.split(':')) ?? []), fontSize: '0.72rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties}>
                        {gap.severity}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gap.regulation}</span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>§{gap.section}</span>
                    </div>
                    <p style={{ margin: '0 0 0.375rem', fontSize: '0.875rem', color: '#374151' }}>{gap.description}</p>
                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#6b7280' }}>
                      <strong style={{ color: '#374151' }}>Recommendation: </strong>{gap.recommendation}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                General Recommendations
              </h2>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {result.recommendations.map((rec, i) => (
                  <li key={i} style={{ fontSize: '0.875rem', color: '#374151' }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

        </section>
      )}
    </main>
  )
}
