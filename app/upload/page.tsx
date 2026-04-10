'use client'

import { useState } from 'react'

// ─── Types — mirrors /api/upload route response shape ──────────────────────────

type FindingStatus = 'covered' | 'partial' | 'missing' | 'human_review'

interface Finding {
  requirement: string
  status: FindingStatus
  detail: string
}

interface CitationRef {
  title: string
  section: string
  quote: string
}

interface AnalysisResult {
  summary: string
  findings: Finding[]
  citations: CitationRef[]
  riskFlags: string[]
}

// ─── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FindingStatus, { label: string; bg: string; color: string; border: string }> = {
  covered:      { label: 'Covered',      bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
  partial:      { label: 'Partial',      bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' },
  missing:      { label: 'Missing',      bg: 'rgba(239,68,68,0.15)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  human_review: { label: 'Human Review', bg: 'rgba(124,91,220,0.15)',  color: '#c4b5fd', border: '1px solid rgba(124,91,220,0.3)' },
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [docText, setDocText]   = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [result, setResult]     = useState<AnalysisResult | null>(null)

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
        body: JSON.stringify({ docText, fileName: fileName.trim() || undefined }),
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

  // Count findings by status
  const counts = result
    ? {
        covered:      result.findings.filter((f) => f.status === 'covered').length,
        partial:      result.findings.filter((f) => f.status === 'partial').length,
        missing:      result.findings.filter((f) => f.status === 'missing').length,
        human_review: result.findings.filter((f) => f.status === 'human_review').length,
      }
    : null

  return (
    <main style={{
      maxWidth: 820,
      margin: '0 auto',
      padding: '2rem 1.5rem',
      fontFamily: 'inherit',
      color: 'var(--text-primary)',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
        Technical Document Review
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
        Paste your document text below to receive an AI-powered regulatory compliance analysis.
      </p>

      {/* ── Form ────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

        {/* File name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="fileName" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            File Name{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="fileName"
            type="text"
            placeholder="e.g. risk_management_file_v2.pdf"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
        </div>

        {/* Document text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <label htmlFor="docText" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Document Text{' '}
            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>*</span>
          </label>
          <textarea
            id="docText"
            rows={14}
            placeholder="Paste your technical document content here…"
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            style={{
              padding: '0.625rem 0.75rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.65,
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)' }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Up to 8 000 characters will be analysed. No file upload required.
          </div>
        </div>

        {/* Error */}
        {error && (
          <p role="alert" style={{
            color: '#f87171',
            fontSize: '0.875rem',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            padding: '0.625rem 0.875rem',
            margin: 0,
          }}>
            ⚠️ {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          id="upload-submit-btn"
          disabled={loading}
          style={{
            alignSelf: 'flex-start',
            padding: '0.6rem 1.5rem',
            background: loading ? 'var(--bg-hover)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.15s, background 0.15s',
            boxShadow: loading ? 'none' : '0 0 0 0 var(--accent-glow)',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 0 14px var(--accent-glow)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
        >
          {loading ? '⏳ Analysing…' : '🔍 Analyse Document'}
        </button>
      </form>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && (
        <section aria-label="Analysis results" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Summary */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '1rem 1.25rem',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Summary
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>
              {result.summary}
            </p>
          </div>

          {/* Status counts */}
          {counts && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {(Object.entries(STATUS_CONFIG) as [FindingStatus, typeof STATUS_CONFIG[FindingStatus]][]).map(([key, cfg]) => (
                <div key={key} style={{
                  background: cfg.bg,
                  border: cfg.border,
                  borderRadius: 8,
                  padding: '0.625rem 0.75rem',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                    {counts[key]}
                  </div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: cfg.color, marginTop: 4, opacity: 0.85 }}>
                    {cfg.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Findings */}
          {result.findings.length > 0 && (
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                Findings ({result.findings.length})
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {result.findings.map((f, i) => {
                  const cfg = STATUS_CONFIG[f.status]
                  return (
                    <li key={i} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                    }}>
                      <span style={{
                        flexShrink: 0,
                        marginTop: 2,
                        padding: '0.15rem 0.55rem',
                        borderRadius: 999,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        background: cfg.bg,
                        color: cfg.color,
                        border: cfg.border,
                        whiteSpace: 'nowrap',
                      }}>
                        {cfg.label}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                          {f.requirement}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                          {f.detail}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Risk flags */}
          {result.riskFlags.length > 0 && (
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                ⚠️ Risk Flags ({result.riskFlags.length})
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.riskFlags.map((flag, i) => (
                  <li key={i} style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 8,
                    padding: '0.625rem 0.875rem',
                    fontSize: '0.8125rem',
                    color: '#f87171',
                    lineHeight: 1.55,
                  }}>
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Citations */}
          {result.citations.length > 0 && (
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                📎 Citations ({result.citations.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {result.citations.map((c, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--accent)',
                    borderRadius: 8,
                    padding: '0.75rem 1rem',
                  }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.375rem' }}>
                      {c.section}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55, fontStyle: 'italic' }}>
                      &ldquo;{c.quote}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      )}
    </main>
  )
}
