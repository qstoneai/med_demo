'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { IngestedDocument } from '@/lib/types/documents'
import type { RequirementTemplate } from '@/lib/plugins/types'
import type { GapReport, GapItem, GapStatus, DomainReadiness } from '@/lib/types/gap'

// ─── Style helpers ─────────────────────────────────────────────────────────────

const GAP_CFG: Record<GapStatus, { label: string; icon: string; bg: string; color: string; border: string }> = {
  sufficient: {
    label: 'Sufficient',
    icon:  '✓',
    bg:    'rgba(34,197,94,0.12)',
    color: '#4ade80',
    border:'1px solid rgba(34,197,94,0.3)',
  },
  partial: {
    label: 'Partial',
    icon:  '△',
    bg:    'rgba(245,158,11,0.12)',
    color: '#fbbf24',
    border:'1px solid rgba(245,158,11,0.3)',
  },
  missing: {
    label: 'Missing',
    icon:  '✗',
    bg:    'rgba(239,68,68,0.12)',
    color: '#f87171',
    border:'1px solid rgba(239,68,68,0.3)',
  },
}

const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
  critical:      { color: '#f87171', bg: 'rgba(239,68,68,0.15)' },
  major:         { color: '#fb923c', bg: 'rgba(249,115,22,0.15)' },
  minor:         { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
  informational: { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

const DOMAIN_COLORS: Record<string, string> = {
  Risk:          '#f87171',
  Cybersecurity: '#fb923c',
  SWValidation:  '#60a5fa',
  Usability:     '#a78bfa',
  Clinical:      '#34d399',
  QMS:           '#fbbf24',
  Labeling:      '#94a3b8',
  PMS:           '#f472b6',
  General:       '#6b7280',
}

const READINESS_CFG: Record<string, { color: string; label: string }> = {
  high:     { color: '#4ade80', label: 'High Readiness' },
  medium:   { color: '#fbbf24', label: 'Medium Readiness' },
  low:      { color: '#fb923c', label: 'Low Readiness' },
  critical: { color: '#f87171', label: 'Critical Gaps' },
}

function fileIcon(t: string) {
  if (t === 'pdf')  return '📄'
  if (t === 'docx') return '📝'
  if (t === 'xlsx') return '📊'
  return '📎'
}

// ─── Readiness gauge ──────────────────────────────────────────────────────────

function ReadinessGauge({ score, level }: { score: number; level: string }) {
  const cfg = READINESS_CFG[level] ?? READINESS_CFG.low
  const circumference = 2 * Math.PI * 52
  const dash = (score / 100) * circumference

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        {/* track */}
        <circle cx={64} cy={64} r={52} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        {/* progress */}
        <circle
          cx={64} cy={64} r={52}
          fill="none"
          stroke={cfg.color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={64} y={60} textAnchor="middle" fill={cfg.color} fontSize={28} fontWeight={700}>
          {score}
        </text>
        <text x={64} y={78} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>
          / 100
        </text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
    </div>
  )
}

// ─── Domain bar ───────────────────────────────────────────────────────────────

function DomainBar({ d }: { d: DomainReadiness }) {
  const color = DOMAIN_COLORS[d.domain] ?? '#6b7280'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ width: 100, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>{d.domain}</span>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${d.score}%`,
            background: color,
            borderRadius: 4,
            opacity: 0.85,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span style={{ width: 36, textAlign: 'right', color, fontWeight: 600 }}>{d.score}%</span>
      <span style={{ width: 60, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
        {d.sufficient}✓ {d.partial}△ {d.missing}✗
      </span>
    </div>
  )
}

// ─── Gap item card ────────────────────────────────────────────────────────────

function GapItemCard({ item }: { item: GapItem }) {
  const [open, setOpen] = useState(false)
  const [citOpen, setCitOpen] = useState(false)
  const cfg    = GAP_CFG[item.status]
  const pcfg   = PRIORITY_CFG[item.requirement.priority] ?? PRIORITY_CFG.informational
  const domain = item.requirement.domain
  const dcolor = DOMAIN_COLORS[domain] ?? '#6b7280'

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* ── Header row ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '13px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Status badge */}
        <span
          style={{
            padding: '2px 9px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: cfg.bg,
            color: cfg.color,
            border: cfg.border,
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}
        >
          {cfg.icon} {cfg.label}
        </span>

        {/* Priority badge */}
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600,
            background: pcfg.bg,
            color: pcfg.color,
            flexShrink: 0,
            textTransform: 'capitalize',
          }}
        >
          {item.requirement.priority}
        </span>

        {/* Domain dot */}
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: dcolor,
            flexShrink: 0,
          }}
        />

        {/* Title */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {item.requirement.title}
        </span>

        {/* Regulation */}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
          {item.requirement.regulation} · {item.requirement.article}
        </span>

        {/* Score */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: item.overallScore >= 0.6 ? '#4ade80' : item.overallScore >= 0.3 ? '#fbbf24' : '#f87171',
            width: 42,
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {Math.round(item.overallScore * 100)}%
        </span>

        {/* Chevron */}
        <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4, fontSize: 12, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          {/* Requirement ID + domain */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {item.requirementId}
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '1px 7px',
                borderRadius: 10,
                background: `${dcolor}20`,
                color: dcolor,
                border: `1px solid ${dcolor}40`,
              }}
            >
              {domain}
            </span>
          </div>

          {/* Gap explanation */}
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 16,
              lineHeight: 1.6,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 6,
            }}
          >
            {item.gapExplanation}
          </p>

          {/* Missing points */}
          {item.missingPoints.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#f87171',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Missing Evidence
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {item.missingPoints.map((pt, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.65)',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: '#f87171', fontWeight: 700, flexShrink: 0 }}>✗</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended actions */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#60a5fa',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Recommended Actions
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.recommendedActions.map((action, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.75)',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    padding: '7px 10px',
                    background: 'rgba(96,165,250,0.06)',
                    borderRadius: 6,
                    border: '1px solid rgba(96,165,250,0.12)',
                  }}
                >
                  <span style={{ color: '#60a5fa', fontWeight: 700, flexShrink: 0 }}>→</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Citations */}
          {item.citations.length > 0 && (
            <div>
              <button
                onClick={() => setCitOpen((v) => !v)}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: citOpen ? 8 : 0,
                }}
              >
                📎 Supporting Citations ({item.citations.length}) {citOpen ? '▲' : '▼'}
              </button>
              {citOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {item.citations.map((cit, i) => {
                    const loc = cit.pageNumber
                      ? `p.${cit.pageNumber}`
                      : cit.sheetName
                        ? `Sheet: ${cit.sheetName}`
                        : ''
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          padding: '7px 10px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.55)',
                        }}
                      >
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginRight: 6 }}>
                          REF-{String(i + 1).padStart(3, '0')}
                        </span>
                        {cit.fileName}{loc ? ` · ${loc}` : ''}
                        {cit.sectionHeading && (
                          <span style={{ color: 'rgba(255,255,255,0.35)' }}> § {cit.sectionHeading}</span>
                        )}
                        {cit.snippet && (
                          <p
                            style={{
                              margin: '4px 0 0',
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.35)',
                              fontStyle: 'italic',
                            }}
                          >
                            &ldquo;{cit.snippet.slice(0, 120)}&hellip;&rdquo;
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {item.citations.length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', margin: 0 }}>
              No document evidence found for this requirement.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterTab = 'all' | GapStatus | 'critical'

export default function GapPage() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [documents,    setDocuments]    = useState<IngestedDocument[]>([])
  const [templates,    setTemplates]    = useState<RequirementTemplate[]>([])
  const [selectedDoc,  setSelectedDoc]  = useState<string>('')
  const [selReqs,      setSelReqs]      = useState<Set<string>>(new Set())
  const [report,       setReport]       = useState<GapReport | null>(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [filterTab,    setFilterTab]    = useState<FilterTab>('all')
  const [search,       setSearch]       = useState('')
  const [expandAll,    setExpandAll]    = useState(false)

  // ── Load documents ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((d) => {
        const docs: IngestedDocument[] = d.documents ?? []
        setDocuments(docs)
        const ready = docs.filter((d) => d.status === 'complete')
        if (ready.length > 0) setSelectedDoc(ready[0].id)
      })
      .catch(() => {})
  }, [])

  // ── Load templates ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => {
        const tmpl: RequirementTemplate[] = d.templates ?? []
        setTemplates(tmpl)
        setSelReqs(new Set(tmpl.map((t) => t.requirement_id)))
      })
      .catch(() => {})
  }, [])

  const readyDocs = documents.filter((d) => d.status === 'complete')

  // ── Run gap analysis ───────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!selectedDoc || selReqs.size === 0) return
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId:     selectedDoc,
          requirementIds: [...selReqs],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Gap analysis failed.')
      setReport(data.report as GapReport)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [selectedDoc, selReqs])

  // ── Filtered items ─────────────────────────────────────────────────────────
  const filteredItems = report?.items.filter((item) => {
    if (filterTab === 'critical') {
      return item.requirement.priority === 'critical' && item.status === 'missing'
    }
    if (filterTab !== 'all' && item.status !== filterTab) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        item.requirement.title.toLowerCase().includes(q) ||
        item.requirementId.toLowerCase().includes(q) ||
        item.requirement.domain.toLowerCase().includes(q) ||
        item.requirement.regulation.toLowerCase().includes(q)
      )
    }
    return true
  }) ?? []

  // ── Select all / none ──────────────────────────────────────────────────────
  const toggleAll = () => {
    if (selReqs.size === templates.length) {
      setSelReqs(new Set())
    } else {
      setSelReqs(new Set(templates.map((t) => t.requirement_id)))
    }
  }

  const toggleReq = (id: string) => {
    setSelReqs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportReport = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `gap-report-${report.documentName}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Gap Analysis" subtitle="Document readiness against regulatory requirements" />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>

        {/* ── Left panel ── */}
        <aside
          style={{
            width: 300,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Document selector */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Document
            </div>
            {readyDocs.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>No documents uploaded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {readyDocs.map((doc) => (
                  <label
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '9px 11px',
                      borderRadius: 8,
                      border: `1px solid ${selectedDoc === doc.id ? 'rgba(79,142,247,0.5)' : 'var(--border)'}`,
                      background: selectedDoc === doc.id ? 'rgba(79,142,247,0.08)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="doc"
                      value={doc.id}
                      checked={selectedDoc === doc.id}
                      onChange={() => setSelectedDoc(doc.id)}
                      style={{ marginTop: 1, accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fileIcon(doc.fileType)} {doc.fileName}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {doc.chunkCount} chunks
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Requirements selector */}
          <section style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Requirements
              </div>
              <button
                onClick={toggleAll}
                style={{
                  fontSize: 11,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {selReqs.size === templates.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {selReqs.size} / {templates.length} selected
            </div>

            {templates.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Loading templates…</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 340, overflowY: 'auto' }}>
                {templates.map((t) => {
                  const pcfg = PRIORITY_CFG[t.priority]
                  const dc   = DOMAIN_COLORS[t.domain] ?? '#6b7280'
                  return (
                    <label
                      key={t.requirement_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        background: selReqs.has(t.requirement_id) ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selReqs.has(t.requirement_id)}
                        onChange={() => toggleReq(t.requirement_id)}
                        style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                      />
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: pcfg.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: dc,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
                        {t.title}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </section>

          {/* Run button */}
          <button
            onClick={runAnalysis}
            disabled={loading || !selectedDoc || selReqs.size === 0}
            style={{
              padding: '11px 16px',
              borderRadius: 8,
              background: loading ? 'rgba(79,142,247,0.3)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              cursor: loading || !selectedDoc || selReqs.size === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 13,
              opacity: !selectedDoc || selReqs.size === 0 ? 0.5 : 1,
            }}
          >
            {loading ? '⏳ Analysing…' : '▶ Run Gap Analysis'}
          </button>
        </aside>

        {/* ── Main panel ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Empty state */}
          {!loading && !report && !error && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 16,
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              <div style={{ fontSize: 48 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                No analysis yet
              </div>
              <div style={{ fontSize: 13 }}>
                Select a document and requirements, then click Run Gap Analysis.
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 16,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <div style={{ fontSize: 40 }}>⏳</div>
              <div style={{ fontSize: 14 }}>Running gap analysis…</div>
              <div style={{ fontSize: 12 }}>Mapping {selReqs.size} requirements against document chunks</div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div
              style={{
                padding: '16px 20px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10,
                color: '#f87171',
                fontSize: 13,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Results */}
          {report && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* ── Summary row ── */}
              <div
                style={{
                  display: 'flex',
                  gap: 20,
                  padding: '20px 24px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {/* Gauge */}
                <ReadinessGauge
                  score={report.summary.readinessScore}
                  level={report.summary.readinessLevel}
                />

                {/* Stat chips */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {report.documentName} · {report.summary.total} requirements · method: {report.method}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {(
                      [
                        { status: 'sufficient' as GapStatus, count: report.summary.sufficient },
                        { status: 'partial'    as GapStatus, count: report.summary.partial    },
                        { status: 'missing'    as GapStatus, count: report.summary.missing    },
                      ] as { status: GapStatus; count: number }[]
                    ).map(({ status, count }) => {
                      const cfg = GAP_CFG[status]
                      return (
                        <div
                          key={status}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 14px',
                            borderRadius: 8,
                            background: cfg.bg,
                            border: cfg.border,
                          }}
                        >
                          <span style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{count}</span>
                          <span style={{ fontSize: 12, color: cfg.color }}>{cfg.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Critical gaps warning */}
                  {report.summary.criticalGaps.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 7,
                        fontSize: 12,
                        color: '#f87171',
                      }}
                    >
                      ⚠ {report.summary.criticalGaps.length} critical requirement(s) missing —
                      submission may be blocked without addressing these gaps.
                    </div>
                  )}
                </div>

                {/* Export button */}
                <button
                  onClick={exportReport}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 12,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                  }}
                >
                  ↓ Export JSON
                </button>
              </div>

              {/* ── Domain breakdown ── */}
              {report.summary.domainBreakdown.length > 0 && (
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 14,
                    }}
                  >
                    Readiness by Domain
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {report.summary.domainBreakdown.map((d) => (
                      <DomainBar key={d.domain} d={d} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Filter bar ── */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {(
                  [
                    { key: 'all',       label: `All (${report.items.length})` },
                    { key: 'missing',   label: `Missing (${report.summary.missing})` },
                    { key: 'partial',   label: `Partial (${report.summary.partial})` },
                    { key: 'sufficient',label: `Sufficient (${report.summary.sufficient})` },
                    { key: 'critical',  label: `Critical Gaps (${report.summary.criticalGaps.length})` },
                  ] as { key: FilterTab; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterTab(key)}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 20,
                      border: filterTab === key ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: filterTab === key ? 'rgba(79,142,247,0.15)' : 'transparent',
                      color: filterTab === key ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: filterTab === key ? 700 : 400,
                    }}
                  >
                    {label}
                  </button>
                ))}

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requirements…"
                  style={{
                    marginLeft: 'auto',
                    padding: '6px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    width: 200,
                    outline: 'none',
                  }}
                />

                <button
                  onClick={() => setExpandAll((v) => !v)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {expandAll ? '▲ Collapse all' : '▼ Expand all'}
                </button>
              </div>

              {/* ── Requirement cards ── */}
              {filteredItems.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
                  No requirements match the current filter.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} key={`${filterTab}-${expandAll}`}>
                  {filteredItems.map((item) => (
                    <GapItemCard key={item.requirementId} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
