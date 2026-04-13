'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { IngestedDocument } from '@/lib/types/documents'
import type { RequirementTemplate } from '@/lib/plugins/types'
import type {
  MappingSession,
  RequirementMapping,
  ChunkMatch,
  MappingGapStatus,
} from '@/lib/types/mapping'

// ─── Style helpers ────────────────────────────────────────────────────────────

const GAP_CFG: Record<MappingGapStatus, { label: string; bg: string; color: string; border: string }> = {
  covered: {
    label: 'Covered',
    bg: 'rgba(34,197,94,0.12)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  partial: {
    label: 'Partial',
    bg: 'rgba(245,158,11,0.12)',
    color: '#fbbf24',
    border: '1px solid rgba(245,158,11,0.3)',
  },
  missing: {
    label: 'Missing',
    bg: 'rgba(239,68,68,0.12)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.3)',
  },
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

function scoreColor(s: number): string {
  if (s >= 0.6) return '#4ade80'
  if (s >= 0.3) return '#fbbf24'
  return '#f87171'
}

function formatScore(s: number): string {
  return `${(s * 100).toFixed(0)}%`
}

function fileIcon(t: string) {
  if (t === 'pdf')  return '📄'
  if (t === 'docx') return '📝'
  if (t === 'xlsx') return '📊'
  return '📎'
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ─── Chunk match card ─────────────────────────────────────────────────────────

function ChunkMatchCard({ match, index }: { match: ChunkMatch; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const c = match.chunk.citation
  const preview = match.chunk.text.replace(/\s+/g, ' ').slice(0, 240)
  const hasMore  = match.chunk.text.length > 240

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      fontSize: '0.8rem',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        padding: '0.5rem 0.875rem',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.12)',
      }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700,
          background: 'rgba(79,142,247,0.15)', color: 'var(--accent)',
          border: '1px solid rgba(79,142,247,0.3)',
          borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap',
        }}>
          REF-{String(index + 1).padStart(3, '0')}
        </span>

        {c.pageNumber && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            Page {c.pageNumber}
          </span>
        )}
        {c.sheetName && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            Sheet: {c.sheetName}
          </span>
        )}
        {c.sectionHeading && (
          <span style={{
            color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.75rem',
            maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            § {c.sectionHeading}
          </span>
        )}

        {/* Relevance score */}
        <span style={{
          marginLeft: 'auto', fontWeight: 700, fontSize: '0.75rem',
          color: scoreColor(match.relevanceScore),
        }}>
          {formatScore(match.relevanceScore)}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '0.5rem 0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Chunk text */}
        <p style={{
          margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6,
          fontStyle: 'italic', fontSize: '0.8rem',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          &ldquo;{expanded ? match.chunk.text : preview}
          {!expanded && hasMore ? '…' : ''}&rdquo;
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              alignSelf: 'flex-start', background: 'none', border: 'none',
              color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0,
            }}
          >
            {expanded ? '▲ Show less' : '▼ Show full text'}
          </button>
        )}

        {/* AI explanation */}
        <div style={{
          display: 'flex', gap: 6, alignItems: 'flex-start',
          background: 'rgba(79,142,247,0.06)',
          border: '1px solid rgba(79,142,247,0.15)',
          borderRadius: 6, padding: '0.375rem 0.625rem',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>↳</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {match.explanation}
          </span>
        </div>

        {/* Matched keywords */}
        {match.matchedKeywords.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {match.matchedKeywords.slice(0, 8).map((kw) => (
              <span key={kw} style={{
                fontSize: '0.67rem', padding: '1px 5px', borderRadius: 3,
                background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}>
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Requirement mapping card ─────────────────────────────────────────────────

function MappingCard({
  mapping,
  defaultExpanded,
}: {
  mapping: RequirementMapping
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const cfg = GAP_CFG[mapping.gapStatus]
  const domainColor = DOMAIN_COLORS[mapping.requirement.domain] ?? '#6b7280'

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.875rem 1rem', textAlign: 'left',
          display: 'flex', gap: 10, alignItems: 'flex-start',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        {/* Gap status badge */}
        <span style={{
          flexShrink: 0, marginTop: 2,
          padding: '0.15rem 0.55rem', borderRadius: 999,
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
          background: cfg.bg, color: cfg.color, border: cfg.border, whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </span>

        {/* Title & meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {mapping.requirement.title}
            </span>
            <span style={{
              fontSize: '0.67rem', fontWeight: 600, padding: '1px 6px', borderRadius: 4,
              background: `${domainColor}20`, color: domainColor,
              border: `1px solid ${domainColor}40`,
            }}>
              {mapping.requirement.domain}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {mapping.requirement.regulation} · {mapping.requirement.article}
          </div>
        </div>

        {/* Score + expand */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: scoreColor(mapping.overallScore) }}>
            {formatScore(mapping.overallScore)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

          {/* Gap explanation */}
          <div style={{
            background: 'rgba(0,0,0,0.15)', borderRadius: 8,
            padding: '0.625rem 0.875rem',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>
              {mapping.gapStatus === 'covered' ? '✅' : mapping.gapStatus === 'partial' ? '⚠️' : '❌'}
            </span>
            <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              {mapping.gapExplanation}
            </p>
          </div>

          {/* Missing evidence */}
          {mapping.missingEvidence.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', marginBottom: 6, letterSpacing: '0.04em' }}>
                MISSING EVIDENCE ({mapping.missingEvidence.length})
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {mapping.missingEvidence.map((e, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: 6, alignItems: 'flex-start',
                    fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                  }}>
                    <span style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }}>✗</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Matched chunks */}
          {mapping.matchedChunks.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.04em' }}>
                MATCHED CHUNKS ({mapping.matchedChunks.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mapping.matchedChunks.map((m, i) => (
                  <ChunkMatchCard key={m.chunkId} match={m} index={i} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '1rem',
              color: 'var(--text-muted)', fontSize: '0.8125rem',
            }}>
              No matching content found in the document for this requirement.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Template selector ────────────────────────────────────────────────────────

function TemplateSelector({
  templates,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  templates: RequirementTemplate[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
}) {
  // Group by authority → domain
  const groups: Record<string, Record<string, RequirementTemplate[]>> = {}
  for (const t of templates) {
    if (!groups[t.authority])               groups[t.authority] = {}
    if (!groups[t.authority][t.domain])     groups[t.authority][t.domain] = []
    groups[t.authority][t.domain].push(t)
  }

  const PRIORITY_COLOR: Record<string, string> = {
    critical: '#f87171',
    major:    '#fbbf24',
    minor:    '#94a3b8',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flex: 1 }}>
          {selected.size} / {templates.length} selected
        </span>
        <button onClick={onSelectAll}  style={chipBtn}>Select all</button>
        <button onClick={onClearAll}   style={chipBtn}>Clear</button>
      </div>

      {/* Tree */}
      {Object.entries(groups).map(([authority, domains]) => (
        <div key={authority}>
          <div style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em',
            color: 'var(--accent)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            {authority.replace('_', ' ')}
          </div>
          {Object.entries(domains).map(([domain, reqs]) => {
            const domColor = DOMAIN_COLORS[domain] ?? '#6b7280'
            return (
              <div key={domain} style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: '0.7rem', fontWeight: 600, color: domColor,
                  marginBottom: 4, paddingLeft: 8,
                  borderLeft: `2px solid ${domColor}`,
                }}>
                  {domain}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 12 }}>
                  {reqs.map((r) => (
                    <label key={r.requirement_id} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer',
                      padding: '4px 6px', borderRadius: 6,
                      background: selected.has(r.requirement_id)
                        ? 'rgba(79,142,247,0.08)'
                        : 'transparent',
                      border: selected.has(r.requirement_id)
                        ? '1px solid rgba(79,142,247,0.2)'
                        : '1px solid transparent',
                    }}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.requirement_id)}
                        onChange={() => onToggle(r.requirement_id)}
                        style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {r.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                          {r.requirement_id}
                          <span style={{ marginLeft: 6, color: PRIORITY_COLOR[r.priority] ?? '#94a3b8' }}>
                            ● {r.priority}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const chipBtn: React.CSSProperties = {
  padding: '2px 8px', background: 'none', cursor: 'pointer',
  border: '1px solid var(--border)', borderRadius: 4,
  fontSize: '0.75rem', color: 'var(--text-secondary)',
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MappingPage() {
  // ── Config state ─────────────────────────────────────────────────────────────
  const [documents,     setDocuments]     = useState<IngestedDocument[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [templates,     setTemplates]     = useState<RequirementTemplate[]>([])
  const [selected,      setSelected]      = useState<Set<string>>(new Set())

  // ── Filter state ──────────────────────────────────────────────────────────────
  const [filterAuthority, setFilterAuthority] = useState<string>('')
  const [filterDomain,    setFilterDomain]    = useState<string>('')
  const [filterQ,         setFilterQ]         = useState<string>('')

  // ── Run state ─────────────────────────────────────────────────────────────────
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [session,  setSession]  = useState<MappingSession | null>(null)

  // ── Results filter ────────────────────────────────────────────────────────────
  const [resultFilter, setResultFilter] = useState<MappingGapStatus | 'all'>('all')

  // ── Load documents on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then((d: { documents: IngestedDocument[] }) => {
        const docs = (d.documents ?? []).filter(doc => doc.status === 'complete')
        setDocuments(docs)
        if (docs.length > 0 && !selectedDocId) setSelectedDocId(docs[0].id)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load templates on mount ───────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then((d: { templates: RequirementTemplate[] }) => {
        setTemplates(d.templates ?? [])
      })
      .catch(() => {})
  }, [])

  // ── Filtered templates ────────────────────────────────────────────────────────
  const filteredTemplates = templates.filter(t => {
    if (filterAuthority && t.authority !== filterAuthority) return false
    if (filterDomain    && t.domain    !== filterDomain)    return false
    if (filterQ) {
      const q = filterQ.toLowerCase()
      if (
        !t.title.toLowerCase().includes(q) &&
        !t.requirement_id.toLowerCase().includes(q) &&
        !t.regulation.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const allAuthorities = [...new Set(templates.map(t => t.authority))].sort()
  const allDomains     = [...new Set(templates.map(t => t.domain))].sort()

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const toggleReq = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(filteredTemplates.map(t => t.requirement_id)))
  }, [filteredTemplates])

  const clearAll = useCallback(() => setSelected(new Set()), [])

  // ── Run mapping ───────────────────────────────────────────────────────────────
  async function handleRun() {
    if (!selectedDocId)   { setRunError('Please select a document.'); return }
    if (selected.size === 0) { setRunError('Please select at least one requirement.'); return }

    setRunError(null)
    setSession(null)
    setRunning(true)

    try {
      const res  = await fetch('/api/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId:     selectedDocId,
          requirementIds: [...selected],
        }),
      })
      const data = await res.json() as { session?: MappingSession; error?: string }
      if (!res.ok) { setRunError(data.error ?? `Request failed (${res.status})`); return }
      setSession(data.session!)
      setResultFilter('all')
    } catch {
      setRunError('Network error — please try again.')
    } finally {
      setRunning(false)
    }
  }

  // ── Export session ────────────────────────────────────────────────────────────
  function exportSession() {
    if (!session) return
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `mapping_${session.documentName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedDoc = documents.find(d => d.id === selectedDocId)

  const visibleMappings = session
    ? (resultFilter === 'all'
        ? session.mappings
        : session.mappings.filter(m => m.gapStatus === resultFilter))
    : []

  const statusCounts = session
    ? {
        covered: session.mappings.filter(m => m.gapStatus === 'covered').length,
        partial: session.mappings.filter(m => m.gapStatus === 'partial').length,
        missing: session.mappings.filter(m => m.gapStatus === 'missing').length,
      }
    : null

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar
        title="Semantic Mapping"
        subtitle="Map document chunks to regulatory requirements"
        actions={
          session ? (
            <button
              onClick={exportSession}
              style={{
                padding: '0.3rem 0.875rem', background: 'none', cursor: 'pointer',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: '0.8rem', color: 'var(--text-secondary)',
              }}
            >
              ↓ Export JSON
            </button>
          ) : undefined
        }
      />

      <main style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '1.25rem',
        height: 'calc(100vh - 60px)',
        overflow: 'hidden',
        padding: '1.25rem',
      }}>

        {/* ══════════════════════════════════════════════════════════════════════
            LEFT PANEL — Config
            ══════════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '1rem',
          overflowY: 'auto', paddingRight: 4,
        }}>

          {/* Document selector */}
          <section style={sectionStyle}>
            <div style={sectionTitle}>1. Select Document</div>
            {documents.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No parsed documents found. Upload a file on the Upload & Review page first.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {documents.map(doc => (
                  <label key={doc.id} style={{
                    display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer',
                    padding: '0.5rem 0.625rem', borderRadius: 8,
                    background: selectedDocId === doc.id ? 'rgba(79,142,247,0.1)' : 'var(--bg-surface)',
                    border: selectedDocId === doc.id ? '1px solid rgba(79,142,247,0.3)' : '1px solid var(--border)',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}>
                    <input
                      type="radio"
                      name="doc"
                      checked={selectedDocId === doc.id}
                      onChange={() => { setSelectedDocId(doc.id); setSession(null) }}
                      style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.85rem' }}>{fileIcon(doc.fileType)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {doc.fileName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {doc.chunkCount} chunks · {timeAgo(doc.uploadedAt)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Requirement selector */}
          <section style={sectionStyle}>
            <div style={sectionTitle}>2. Select Requirements</div>

            {/* Quick filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Search requirements…"
                value={filterQ}
                onChange={e => setFilterQ(e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={filterAuthority}
                  onChange={e => setFilterAuthority(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">All authorities</option>
                  {allAuthorities.map(a => (
                    <option key={a} value={a}>{a.replace('_', ' ')}</option>
                  ))}
                </select>
                <select
                  value={filterDomain}
                  onChange={e => setFilterDomain(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">All domains</option>
                  {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {templates.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading templates…</p>
            ) : (
              <TemplateSelector
                templates={filteredTemplates}
                selected={selected}
                onToggle={toggleReq}
                onSelectAll={selectAll}
                onClearAll={clearAll}
              />
            )}
          </section>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={running || !selectedDocId || selected.size === 0}
            style={{
              padding: '0.65rem 1.25rem',
              background: (running || !selectedDocId || selected.size === 0) ? 'var(--bg-hover)' : 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 700, cursor:
                (running || !selectedDocId || selected.size === 0) ? 'not-allowed' : 'pointer',
              opacity: (running || !selectedDocId || selected.size === 0) ? 0.55 : 1,
              transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {running ? (
              <>⏳ Running mapping…</>
            ) : (
              <>🔗 Run Semantic Mapping ({selected.size})</>
            )}
          </button>

          {runError && (
            <p role="alert" style={{
              fontSize: '0.8125rem', color: '#f87171',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '0.5rem 0.75rem', margin: 0,
            }}>
              ⚠️ {runError}
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT PANEL — Results
            ══════════════════════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '1rem',
          overflowY: 'auto', paddingLeft: 4,
        }}>
          {!session && !running && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', gap: 10,
            }}>
              <div style={{ fontSize: '2.5rem' }}>🔗</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                No mapping session yet
              </div>
              <div style={{ fontSize: '0.8125rem', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
                Select a document and one or more requirements,<br />
                then click <strong>Run Semantic Mapping</strong>.
              </div>
            </div>
          )}

          {running && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', gap: 10,
            }}>
              <div style={{ fontSize: '2rem' }}>⏳</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                Mapping in progress…
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                {process.env.NEXT_PUBLIC_HAS_OPENAI_KEY === 'true'
                  ? 'Running hybrid keyword + LLM scoring.'
                  : 'Running keyword scoring (demo mode).'}
              </div>
            </div>
          )}

          {session && (
            <>
              {/* Session header */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderLeft: '4px solid var(--accent)',
                borderRadius: 10, padding: '0.875rem 1.125rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      Mapping Session
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                      {fileIcon(selectedDoc?.fileType ?? '')} {session.documentName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {session.mappings.length} requirements · method: {session.method} · {timeAgo(session.createdAt)}
                    </div>
                  </div>
                  {statusCounts && (
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                      {(['covered', 'partial', 'missing'] as MappingGapStatus[]).map(s => (
                        <div key={s} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.375rem', fontWeight: 800, color: GAP_CFG[s].color }}>
                            {statusCounts[s]}
                          </div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: GAP_CFG[s].color, opacity: 0.85, textTransform: 'uppercase' }}>
                            {s}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Result filter bar */}
              <div style={{ display: 'flex', gap: 6 }}>
                {(['all', 'covered', 'partial', 'missing'] as const).map(f => {
                  const isActive = resultFilter === f
                  const count = f === 'all'
                    ? session.mappings.length
                    : session.mappings.filter(m => m.gapStatus === f).length
                  return (
                    <button
                      key={f}
                      onClick={() => setResultFilter(f)}
                      style={{
                        padding: '0.25rem 0.75rem', borderRadius: 999, cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600, border: 'none',
                        background: isActive
                          ? (f === 'all' ? 'var(--accent)' : GAP_CFG[f as MappingGapStatus].bg)
                          : 'var(--bg-surface)',
                        color: isActive
                          ? (f === 'all' ? '#fff' : GAP_CFG[f as MappingGapStatus].color)
                          : 'var(--text-muted)',
                        outline: isActive && f !== 'all' ? GAP_CFG[f as MappingGapStatus].border : 'none',
                      }}
                    >
                      {f === 'all' ? 'All' : GAP_CFG[f as MappingGapStatus].label} {count}
                    </button>
                  )
                })}
              </div>

              {/* Mapping cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {visibleMappings.map((m, i) => (
                  <MappingCard
                    key={m.requirementId}
                    mapping={m}
                    defaultExpanded={i === 0}
                  />
                ))}
                {visibleMappings.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem' }}>
                    No {resultFilter} requirements in this session.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}

// ─── Shared inline styles ─────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '0.875rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--accent)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.625rem',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: '0.8125rem',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}
