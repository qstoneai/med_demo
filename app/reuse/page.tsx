'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { IngestedDocument } from '@/lib/types/documents'
import type { RequirementTemplate } from '@/lib/plugins/types'
import type {
  ReuseReport,
  ReuseCandidate,
  RequirementReuseGroup,
  ReuseLinkType,
} from '@/lib/types/reuse'
import type { GapStatus } from '@/lib/types/gap'

// ─── Style helpers ─────────────────────────────────────────────────────────────

const GAP_CFG: Record<GapStatus, { label: string; icon: string; color: string; bg: string; border: string }> = {
  sufficient: { label: 'Sufficient', icon: '✓', color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: '1px solid rgba(34,197,94,0.3)'  },
  partial:    { label: 'Partial',    icon: '△', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' },
  missing:    { label: 'Missing',    icon: '✗', color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: '1px solid rgba(239,68,68,0.3)'  },
}

const LINK_TYPE_CFG: Record<ReuseLinkType, { label: string; color: string; bg: string }> = {
  both:    { label: '🔗 Linked + Match', color: '#4ade80', bg: 'rgba(34,197,94,0.12)'  },
  related: { label: '🔗 Linked',         color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  keyword: { label: '🔤 Keyword match',  color: '#fbbf24', bg: 'rgba(245,158,11,0.10)' },
}

const PRIORITY_CFG: Record<string, { color: string; bg: string }> = {
  critical:      { color: '#f87171', bg: 'rgba(239,68,68,0.15)'    },
  major:         { color: '#fb923c', bg: 'rgba(249,115,22,0.15)'   },
  minor:         { color: '#fbbf24', bg: 'rgba(245,158,11,0.15)'   },
  informational: { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)'  },
}

const DOMAIN_COLORS: Record<string, string> = {
  Risk: '#f87171', Cybersecurity: '#fb923c', SWValidation: '#60a5fa',
  Usability: '#a78bfa', Clinical: '#34d399', QMS: '#fbbf24',
  Labeling: '#94a3b8', PMS: '#f472b6', General: '#6b7280',
}

function fileIcon(t: string) {
  return t === 'pdf' ? '📄' : t === 'docx' ? '📝' : t === 'xlsx' ? '📊' : '📎'
}

function relevanceBar(score: number) {
  const pct   = Math.round(score * 100)
  const color = score >= 0.35 ? '#4ade80' : score >= 0.15 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 80,
          height: 5,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{pct}%</span>
    </div>
  )
}

// ─── Candidate card ────────────────────────────────────────────────────────────

function CandidateCard({ c }: { c: ReuseCandidate }) {
  const [expanded, setExpanded] = useState(false)
  const lc  = LINK_TYPE_CFG[c.linkType]
  const cit = c.citation
  const loc = cit.pageNumber
    ? `p.${cit.pageNumber}`
    : cit.sheetName
      ? `Sheet: ${cit.sheetName}`
      : ''
  const preview = c.chunk.text.replace(/\s+/g, ' ')

  const sourceDomainColor = DOMAIN_COLORS[c.sourceRequirement.domain] ?? '#6b7280'

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Link type badge */}
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            background: lc.bg,
            color: lc.color,
            fontWeight: 600,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {lc.label}
        </span>

        {/* Source requirement badge */}
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            background: `${sourceDomainColor}18`,
            color: sourceDomainColor,
            border: `1px solid ${sourceDomainColor}30`,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          From: {c.sourceRequirement.title}
        </span>

        {/* Relevance */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {relevanceBar(c.suggestedRelevance)}
        </div>
      </div>

      {/* Explanation */}
      <div
        style={{
          padding: '0 14px 10px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.55,
        }}
      >
        {c.explanation}
      </div>

      {/* Citation + chunk expand */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
          📎 {cit.fileName}{loc ? ` · ${loc}` : ''}
          {cit.sectionHeading && <span style={{ color: 'rgba(255,255,255,0.25)' }}> § {cit.sectionHeading.slice(0, 50)}</span>}
        </span>

        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {expanded ? '▲ Hide text' : '▼ Show chunk text'}
        </button>
      </div>

      {/* Expanded chunk text */}
      {expanded && (
        <div
          style={{
            padding: '10px 14px 12px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
            fontStyle: 'italic',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          &ldquo;{preview.slice(0, 400)}{preview.length > 400 ? '…' : ''}&rdquo;
        </div>
      )}
    </div>
  )
}

// ─── Group card (per target requirement) ──────────────────────────────────────

function GroupCard({ group }: { group: RequirementReuseGroup }) {
  const [open, setOpen] = useState(false)
  const { targetRequirement: req, currentGapStatus, potentialImprovement, candidates } = group

  const currentCfg   = GAP_CFG[currentGapStatus]
  const improvedCfg  = potentialImprovement ? GAP_CFG[potentialImprovement] : null
  const pcfg         = PRIORITY_CFG[req.priority] ?? PRIORITY_CFG.informational
  const dcolor       = DOMAIN_COLORS[req.domain] ?? '#6b7280'

  // Unique source domains in this group
  const sourceDomains = [...new Set(candidates.map((c) => c.sourceRequirement.domain))]

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${dcolor}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
        {/* Current status */}
        <span
          style={{
            padding: '2px 9px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: currentCfg.bg,
            color: currentCfg.color,
            border: currentCfg.border,
            flexShrink: 0,
          }}
        >
          {currentCfg.icon} {currentCfg.label}
        </span>

        {/* Potential improvement arrow */}
        {improvedCfg && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, flexShrink: 0 }}>→</span>
            <span
              style={{
                padding: '2px 9px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                background: improvedCfg.bg,
                color: improvedCfg.color,
                border: improvedCfg.border,
                flexShrink: 0,
              }}
            >
              {improvedCfg.icon} {improvedCfg.label}
            </span>
          </>
        )}

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
          {req.priority}
        </span>

        {/* Domain dot */}
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: dcolor, flexShrink: 0 }} />

        {/* Title */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {req.title}
        </span>

        {/* Source domains */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {sourceDomains.map((d) => (
            <span
              key={d}
              title={`Evidence from ${d}`}
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 8,
                background: `${DOMAIN_COLORS[d] ?? '#6b7280'}20`,
                color: DOMAIN_COLORS[d] ?? '#6b7280',
                border: `1px solid ${DOMAIN_COLORS[d] ?? '#6b7280'}30`,
              }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Candidate count */}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
        </span>

        {/* Chevron */}
        <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 4, fontSize: 12, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          {/* Regulation + ID */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {req.requirement_id}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {req.regulation} · {req.article}
            </span>
          </div>

          {/* Improvement tip */}
          {potentialImprovement && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '9px 12px',
                background: 'rgba(96,165,250,0.06)',
                border: '1px solid rgba(96,165,250,0.15)',
                borderRadius: 7,
                fontSize: 12,
                color: 'rgba(255,255,255,0.65)',
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              <span style={{ flexShrink: 0, fontSize: 14 }}>💡</span>
              <span>
                If the {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} below are
                accepted, this requirement&apos;s status could improve from{' '}
                <strong style={{ color: currentCfg.color }}>{currentCfg.label}</strong> to{' '}
                <strong style={{ color: improvedCfg!.color }}>{improvedCfg!.label}</strong>.{' '}
                Review each and confirm whether the evidence applies.
              </span>
            </div>
          )}

          {/* Candidate cards */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Reusable Evidence Candidates
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidates.map((c, i) => (
              <CandidateCard key={`${c.chunkId}-${i}`} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Summary banner ───────────────────────────────────────────────────────────

function SummaryBanner({ report }: { report: ReuseReport }) {
  const s = report.summary
  return (
    <div
      style={{
        padding: '20px 24px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        display: 'flex',
        gap: 28,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      {/* Primary stat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
          {s.requirementsWithCandidates}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>requirements with reuse candidates</span>
      </div>

      <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{s.totalCandidates}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>total candidates</div>
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>{s.improvableRequirements}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>improvable requirements</div>
        </div>
        {s.criticalCoverageCount > 0 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f87171' }}>{s.criticalCoverageCount}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>critical gaps with candidates</div>
          </div>
        )}

        {/* Cross-domain pairs */}
        {s.crossDomainPairs.length > 0 && (
          <div style={{ marginLeft: 'auto' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Cross-domain reuse
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {s.crossDomainPairs.slice(0, 6).map((p, i) => {
                const sc = DOMAIN_COLORS[p.sourceDomain] ?? '#6b7280'
                const tc = DOMAIN_COLORS[p.targetDomain] ?? '#6b7280'
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 9px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: sc, fontWeight: 600 }}>{p.sourceDomain}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
                    <span style={{ color: tc, fontWeight: 600 }}>{p.targetDomain}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{p.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notice */}
      <div
        style={{
          width: '100%',
          padding: '9px 12px',
          background: 'rgba(251,191,36,0.06)',
          border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 7,
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
        }}
      >
        ⚠ All recommendations below are <strong style={{ color: '#fbbf24' }}>suggested only</strong> and
        require human review. Do not apply evidence to a requirement without confirming it genuinely addresses that requirement&apos;s expected evidence.
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'missing' | 'partial' | 'critical'

export default function ReusePage() {
  const [documents,   setDocuments]   = useState<IngestedDocument[]>([])
  const [templates,   setTemplates]   = useState<RequirementTemplate[]>([])
  const [selectedDoc, setSelectedDoc] = useState<string>('')
  const [selReqs,     setSelReqs]     = useState<Set<string>>(new Set())
  const [report,      setReport]      = useState<ReuseReport | null>(null)

  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [filterTab,   setFilterTab]   = useState<FilterStatus>('all')
  const [search,      setSearch]      = useState('')

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

  const runAnalysis = useCallback(async () => {
    if (!selectedDoc || selReqs.size === 0) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch('/api/reuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDoc, requirementIds: [...selReqs] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed.')
      setReport(data.report as ReuseReport)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [selectedDoc, selReqs])

  const toggleAll = () => {
    if (selReqs.size === templates.length) {
      setSelReqs(new Set())
    } else {
      setSelReqs(new Set(templates.map((t) => t.requirement_id)))
    }
  }

  // Filtered groups
  const filteredGroups = report?.groups.filter((g) => {
    if (filterTab === 'critical') {
      return g.targetRequirement.priority === 'critical' && g.currentGapStatus === 'missing'
    }
    if (filterTab === 'missing' && g.currentGapStatus !== 'missing') return false
    if (filterTab === 'partial' && g.currentGapStatus !== 'partial') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        g.targetRequirement.title.toLowerCase().includes(q) ||
        g.targetRequirementId.toLowerCase().includes(q) ||
        g.targetRequirement.domain.toLowerCase().includes(q) ||
        g.candidates.some((c) => c.sourceRequirement.domain.toLowerCase().includes(q))
      )
    }
    return true
  }) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Evidence Re-use" subtitle="Cross-domain recommendations to reduce duplicate documentation effort" />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

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
          {/* How it works */}
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(96,165,250,0.06)',
              border: '1px solid rgba(96,165,250,0.15)',
              borderRadius: 8,
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#60a5fa', display: 'block', marginBottom: 4 }}>
              How it works
            </strong>
            Evidence chunks already mapped to one requirement are checked against
            related requirements in other domains. Reuse candidates are shown as
            suggestions — human review required.
          </div>

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Scope
              </div>
              <button
                onClick={toggleAll}
                style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {selReqs.size === templates.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              {selReqs.size} / {templates.length} requirements
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflowY: 'auto' }}>
              {templates.map((t) => {
                const pc  = PRIORITY_CFG[t.priority]
                const dc  = DOMAIN_COLORS[t.domain] ?? '#6b7280'
                return (
                  <label
                    key={t.requirement_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '5px 7px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selReqs.has(t.requirement_id)}
                      onChange={() => {
                        setSelReqs((prev) => {
                          const next = new Set(prev)
                          if (next.has(t.requirement_id)) next.delete(t.requirement_id)
                          else next.add(t.requirement_id)
                          return next
                        })
                      }}
                      style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: pc.color, flexShrink: 0 }} />
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: dc, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.65)', lineHeight: 1.3, fontSize: 11 }}>
                      {t.title}
                    </span>
                  </label>
                )
              })}
            </div>
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
            {loading ? '⏳ Analysing…' : '♻ Find Reuse Opportunities'}
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
              <div style={{ fontSize: 48 }}>♻</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                No analysis yet
              </div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
                Select a document and requirements, then click{' '}
                <strong>Find Reuse Opportunities</strong> to identify evidence that can
                be applied across multiple regulatory domains.
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
              <div style={{ fontSize: 14 }}>Mapping {selReqs.size} requirements…</div>
              <div style={{ fontSize: 12 }}>Then scanning for cross-domain reuse opportunities</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              <SummaryBanner report={report} />

              {/* No candidates found */}
              {report.groups.length === 0 && (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 13,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>No significant reuse candidates found</div>
                  <div>
                    All requirement gaps are either already covered, or the existing evidence
                    does not overlap meaningfully with related requirements. Consider uploading
                    more comprehensive documentation.
                  </div>
                </div>
              )}

              {/* Filter bar */}
              {report.groups.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(
                      [
                        { key: 'all',      label: `All (${report.groups.length})` },
                        { key: 'missing',  label: `From Missing (${report.groups.filter((g) => g.currentGapStatus === 'missing').length})` },
                        { key: 'partial',  label: `From Partial (${report.groups.filter((g) => g.currentGapStatus === 'partial').length})` },
                        { key: 'critical', label: `Critical Gaps (${report.summary.criticalCoverageCount})` },
                      ] as { key: FilterStatus; label: string }[]
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
                      placeholder="Search requirements or domains…"
                      style={{
                        marginLeft: 'auto',
                        padding: '6px 12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        width: 220,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {filteredGroups.length === 0 ? (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                      No requirements match the current filter.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {filteredGroups.map((g) => (
                        <GroupCard key={g.targetRequirementId} group={g} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
