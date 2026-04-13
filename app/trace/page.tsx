'use client'

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { RequirementTemplate } from '@/lib/plugins/types'
import type {
  TraceLink,
  ChangeEvent,
  ImpactAnalysis,
  TraceLinkStatus,
  TraceOverview,
} from '@/lib/types/traceability'

// ─── Style config ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TraceLinkStatus, { label: string; color: string; bg: string; border: string }> = {
  active:        { label: 'Active',        color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: '1px solid rgba(34,197,94,0.3)'  },
  suggested:     { label: 'Suggested',     color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)' },
  review_needed: { label: 'Review Needed', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' },
  rejected:      { label: 'Rejected',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' },
}

const KIND_CFG: Record<string, { label: string; icon: string; color: string }> = {
  'req-chunk':     { label: 'Evidence',       icon: '📎', color: '#60a5fa' },
  'req-req':       { label: 'Requirement',    icon: '🔗', color: '#a78bfa' },
  'chunk-chunk':   { label: 'Chunk',          icon: '📄', color: '#94a3b8' },
  'domain-domain': { label: 'Cross-domain',   icon: '🌐', color: '#34d399' },
}

const ORIGIN_CFG: Record<string, { label: string; color: string }> = {
  template:         { label: 'Template',         color: '#4ade80' },
  mapping:          { label: 'AI Mapping',        color: '#60a5fa' },
  reuse_suggestion: { label: 'Reuse Suggestion',  color: '#fbbf24' },
  manual:           { label: 'Manual',            color: '#a78bfa' },
}

const IMPACT_CFG: Record<string, { color: string }> = {
  high:   { color: '#f87171' },
  medium: { color: '#fbbf24' },
  low:    { color: '#94a3b8' },
}

const EVENT_CFG: Record<string, { icon: string; color: string }> = {
  created:  { icon: '✦',  color: '#60a5fa' },
  updated:  { icon: '↺',  color: '#fbbf24' },
  approved: { icon: '✓',  color: '#4ade80' },
  reviewed: { icon: '👁',  color: '#a78bfa' },
  rejected: { icon: '✗',  color: '#94a3b8' },
  deleted:  { icon: '🗑',  color: '#f87171' },
}

const DOMAIN_COLORS: Record<string, string> = {
  Risk: '#f87171', Cybersecurity: '#fb923c', SWValidation: '#60a5fa',
  Usability: '#a78bfa', Clinical: '#34d399', QMS: '#fbbf24',
  Labeling: '#94a3b8', PMS: '#f472b6', General: '#6b7280',
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Single link row ──────────────────────────────────────────────────────────

function LinkRow({
  link,
  perspective,
  onReview,
}: {
  link: TraceLink
  perspective: string  // the entity ID we're viewing from
  onReview: (linkId: string, action: 'approve' | 'reject' | 'reviewed') => void
}) {
  const sc    = STATUS_CFG[link.status]
  const kc    = KIND_CFG[link.kind]  ?? KIND_CFG['req-chunk']
  const oc    = ORIGIN_CFG[link.origin] ?? ORIGIN_CFG.manual
  const other = link.sourceId === perspective ? link.targetLabel : link.sourceLabel
  const confPct = Math.round(link.confidence * 100)

  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        border: `1px solid ${link.status === 'review_needed' ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
        background: link.status === 'review_needed' ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.025)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {/* Kind icon */}
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{kc.icon}</span>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {other}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status badge */}
          <span
            style={{
              fontSize: 11,
              padding: '1px 7px',
              borderRadius: 10,
              background: sc.bg,
              color: sc.color,
              border: sc.border,
              fontWeight: 600,
            }}
          >
            {sc.label}
          </span>
          {/* Origin */}
          <span style={{ fontSize: 11, color: oc.color }}>{oc.label}</span>
          {/* Confidence */}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {confPct}% confidence
          </span>
          {link.reviewedBy && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              reviewed by {link.reviewedBy}
            </span>
          )}
        </div>
        {link.notes && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '5px 0 0', fontStyle: 'italic' }}>
            {link.notes}
          </p>
        )}
      </div>

      {/* Review buttons */}
      {(link.status === 'suggested' || link.status === 'review_needed') && (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button
            onClick={() => onReview(link.id, 'approve')}
            title="Approve — mark as active"
            style={{
              padding: '3px 9px',
              borderRadius: 6,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#4ade80',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => onReview(link.id, 'reviewed')}
            title="Mark reviewed — acknowledge without fully approving"
            style={{
              padding: '3px 9px',
              borderRadius: 6,
              background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.25)',
              color: '#a78bfa',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            👁
          </button>
          <button
            onClick={() => onReview(link.id, 'reject')}
            title="Reject — mark as not applicable"
            style={{
              padding: '3px 9px',
              borderRadius: 6,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            ✗
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Impact analysis panel ────────────────────────────────────────────────────

function ImpactPanel({
  entityId,
  entityLabel,
  entityType,
}: {
  entityId:    string
  entityLabel: string
  entityType:  'requirement' | 'chunk' | 'domain'
}) {
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null)
  const [loading,  setLoading]  = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/trace?impact=true&entityId=${encodeURIComponent(entityId)}&label=${encodeURIComponent(entityLabel)}&type=${entityType}`,
      )
      const data = await res.json()
      setAnalysis(data.analysis ?? null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, flex: 1, lineHeight: 1.5 }}>
          Shows which connected entities would need review if <strong style={{ color: 'var(--text-primary)' }}>{entityLabel}</strong> were to change.
        </p>
        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {loading ? '⏳ Analysing…' : '▶ Run Impact Analysis'}
        </button>
      </div>

      {analysis && (
        <>
          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Affected',     value: analysis.totalAffected,      color: 'rgba(255,255,255,0.7)' },
              { label: 'Review needed',value: analysis.reviewNeededCount,   color: '#fbbf24' },
              { label: 'High impact',  value: analysis.highImpactCount,     color: '#f87171' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Suggested actions */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Suggested Actions
            </div>
            {analysis.suggestedActions.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 6,
                  background: 'rgba(96,165,250,0.06)',
                  border: '1px solid rgba(96,165,250,0.12)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: 5,
                }}
              >
                <span style={{ color: '#60a5fa', flexShrink: 0 }}>→</span>
                {a}
              </div>
            ))}
          </div>

          {/* Affected nodes */}
          {analysis.affectedNodes.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Affected Entities
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {analysis.affectedNodes.map((node, i) => {
                  const ic = IMPACT_CFG[node.impactSeverity]
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: `1px solid ${ic.color}30`,
                        background: `${ic.color}08`,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 8,
                          background: `${ic.color}20`,
                          color: ic.color,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {node.impactSeverity}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {node.entityLabel}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                          {node.reason}
                        </div>
                      </div>
                      {node.requiresReview && (
                        <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 'auto', flexShrink: 0 }}>
                          ⚠ Review
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {analysis.affectedNodes.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              No connected entities found — this entity appears to be isolated in the current link graph.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Change event feed ────────────────────────────────────────────────────────

function EventFeed({ events }: { events: ChangeEvent[] }) {
  if (events.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
        No change events recorded yet.
      </p>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {events.map((ev) => {
        const cfg = EVENT_CFG[ev.eventType] ?? { icon: '•', color: '#6b7280' }
        return (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 7,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ color: cfg.color, fontSize: 14, flexShrink: 0, fontWeight: 700 }}>
              {cfg.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                {ev.description}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                {ev.actor} · {timeAgo(ev.timestamp)}
                {ev.rippleEffectLinkIds.length > 0 && (
                  <span style={{ color: '#fbbf24' }}>
                    {' '}· {ev.rippleEffectLinkIds.length} link(s) flagged
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type DetailTab = 'evidence' | 'related' | 'impact'

export default function TracePage() {
  const [templates,     setTemplates]     = useState<RequirementTemplate[]>([])
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [overview,      setOverview]      = useState<TraceOverview | null>(null)
  const [links,         setLinks]         = useState<TraceLink[]>([])
  const [events,        setEvents]        = useState<ChangeEvent[]>([])
  const [tab,           setTab]           = useState<DetailTab>('evidence')

  const [syncing,   setSyncing]   = useState(false)
  const [syncMsg,   setSyncMsg]   = useState<string | null>(null)
  const [searchReq, setSearchReq] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'review_needed' | 'suggested'>('all')

  // ── Load templates + overview ─────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    const [tmplRes, ovRes, evRes] = await Promise.all([
      fetch('/api/templates').then((r) => r.json()),
      fetch('/api/trace?overview=true').then((r) => r.json()),
      fetch('/api/trace?events=true&limit=30').then((r) => r.json()),
    ])
    setTemplates(tmplRes.templates ?? [])
    setOverview(ovRes)
    setEvents(evRes.events ?? [])
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  // ── Load links for selected requirement ───────────────────────────────────
  const loadLinks = useCallback(async (reqId: string) => {
    const res  = await fetch(`/api/trace?links=true&entityId=${encodeURIComponent(reqId)}`)
    const data = await res.json()
    setLinks(data.links ?? [])
  }, [])

  const selectRequirement = useCallback(
    (reqId: string) => {
      setSelectedReqId(reqId)
      setTab('evidence')
      loadLinks(reqId)
    },
    [loadLinks],
  )

  // ── Seed template links ───────────────────────────────────────────────────
  const seedTemplates = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_templates' }),
      })
      const data = await res.json()
      setSyncMsg(`Seeded ${data.created ?? 0} requirement-to-requirement links from template graph.`)
      await loadOverview()
      if (selectedReqId) loadLinks(selectedReqId)
    } finally {
      setSyncing(false)
    }
  }

  // ── Review a link ─────────────────────────────────────────────────────────
  const handleReview = async (linkId: string, action: 'approve' | 'reject' | 'reviewed') => {
    await fetch('/api/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review_link', linkId, review: action }),
    })
    if (selectedReqId) loadLinks(selectedReqId)
    loadOverview()
  }

  // ── Filtered templates for left panel ─────────────────────────────────────
  const filteredTemplates = templates.filter((t) => {
    if (searchReq) {
      const q = searchReq.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !t.domain.toLowerCase().includes(q)) return false
    }
    return true
  })

  // ── Links for current tab ─────────────────────────────────────────────────
  const evidenceLinks = links.filter((l) => l.kind === 'req-chunk')
  const relatedLinks  = links.filter((l) => l.kind === 'req-req')

  // Filter by status if active filter
  const applyStatusFilter = (ls: TraceLink[]) => {
    if (filterStatus === 'all') return ls
    return ls.filter((l) => l.status === filterStatus)
  }

  const selectedReq = templates.find((t) => t.requirement_id === selectedReqId)

  const reviewNeededCount = links.filter(
    (l) => l.status === 'review_needed' || l.status === 'suggested',
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Traceability"
        subtitle="Requirement ↔ evidence ↔ domain link network"
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ──────────── Left panel: requirement list ──────────── */}
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Overview stats strip */}
          {overview && (
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'Total links',    value: overview.totalLinks,        color: 'rgba(255,255,255,0.7)' },
                { label: 'Active',         value: overview.activeLinks,       color: '#4ade80' },
                { label: 'Review needed',  value: overview.reviewNeededLinks + overview.suggestedLinks, color: '#fbbf24' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Seed button */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={seedTemplates}
              disabled={syncing}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 7,
                background: syncing ? 'rgba(79,142,247,0.2)' : 'rgba(79,142,247,0.15)',
                border: '1px solid rgba(79,142,247,0.3)',
                color: '#60a5fa',
                fontSize: 12,
                cursor: syncing ? 'wait' : 'pointer',
                fontWeight: 600,
              }}
            >
              {syncing ? '⏳ Seeding…' : '⚡ Seed Template Links'}
            </button>
            {syncMsg && (
              <p style={{ fontSize: 11, color: '#4ade80', marginTop: 6, lineHeight: 1.4 }}>
                ✓ {syncMsg}
              </p>
            )}
          </div>

          {/* Search */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <input
              value={searchReq}
              onChange={(e) => setSearchReq(e.target.value)}
              placeholder="Search requirements…"
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Requirement list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
            {filteredTemplates.map((t) => {
              const dcolor   = DOMAIN_COLORS[t.domain] ?? '#6b7280'
              const isActive = selectedReqId === t.requirement_id
              // Count review-needed from global overview (we don't have per-req count here)
              return (
                <button
                  key={t.requirement_id}
                  onClick={() => selectRequirement(t.requirement_id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 10px',
                    borderRadius: 7,
                    border: isActive ? '1px solid rgba(79,142,247,0.4)' : '1px solid transparent',
                    background: isActive ? 'rgba(79,142,247,0.1)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: 2,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dcolor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                      {t.requirement_id}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ──────────── Center panel: detail view ──────────── */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── No requirement selected: overview cards ── */}
          {!selectedReqId && (
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Intro */}
              <div
                style={{
                  padding: '18px 22px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.65,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15, marginBottom: 8 }}>
                  Traceability Map
                </div>
                Track the connections between regulatory requirements, document evidence, and regulatory domains.
                <br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>1.</strong> Click <em>&ldquo;Seed Template Links&rdquo;</em> to populate requirement-to-requirement links from the plugin registry.
                <br />
                <strong style={{ color: 'var(--text-primary)' }}>2.</strong> Run a <em>Semantic Mapping</em> or <em>Reuse Analysis</em> first, then use <code style={{ color: '#60a5fa', fontSize: 12 }}>POST /api/trace &#123; action: &apos;sync_session&apos;, sessionId &#125;</code> to add evidence links.
                <br />
                <strong style={{ color: 'var(--text-primary)' }}>3.</strong> Select a requirement on the left to explore its evidence, related requirements, and impact analysis.
              </div>

              {/* Link kind breakdown */}
              {overview && (
                <div
                  style={{
                    padding: '18px 22px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                    Link graph overview
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {Object.entries(overview.linksByKind).map(([kind, count]) => {
                      const kc = KIND_CFG[kind]
                      return (
                        <div
                          key={kind}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 9,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border)',
                            minWidth: 110,
                          }}
                        >
                          <div style={{ fontSize: 24, fontWeight: 800, color: kc?.color ?? '#6b7280' }}>{count}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                            {kc?.icon} {kc?.label ?? kind}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent events */}
              <div
                style={{
                  padding: '18px 22px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                  Recent change events
                </div>
                <EventFeed events={events.slice(0, 8)} />
              </div>
            </div>
          )}

          {/* ── Requirement selected ── */}
          {selectedReqId && selectedReq && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

              {/* Requirement header */}
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: DOMAIN_COLORS[selectedReq.domain] ?? '#6b7280',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedReq.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    {selectedReq.requirement_id}
                  </span>
                  {reviewNeededCount > 0 && (
                    <span
                      style={{
                        padding: '2px 9px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        background: 'rgba(245,158,11,0.12)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245,158,11,0.3)',
                      }}
                    >
                      ⚠ {reviewNeededCount} review needed
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  {selectedReq.regulation} · {selectedReq.article} · {selectedReq.domain}
                </div>
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 0,
                  borderBottom: '1px solid var(--border)',
                  padding: '0 24px',
                }}
              >
                {(
                  [
                    { key: 'evidence', label: `Evidence (${evidenceLinks.length})` },
                    { key: 'related',  label: `Related Reqs (${relatedLinks.length})` },
                    { key: 'impact',   label: 'Impact Analysis' },
                  ] as { key: DetailTab; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      padding: '12px 16px',
                      border: 'none',
                      borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                      background: 'transparent',
                      color: tab === key ? 'var(--accent)' : 'rgba(255,255,255,0.45)',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontWeight: tab === key ? 700 : 400,
                      marginBottom: -1,
                    }}
                  >
                    {label}
                  </button>
                ))}

                {/* Status filter */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(['all', 'review_needed', 'suggested'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 14,
                        border: filterStatus === s ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: filterStatus === s ? 'rgba(79,142,247,0.15)' : 'transparent',
                        color: filterStatus === s ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {s === 'all' ? 'All' : s === 'review_needed' ? '⚠ Review' : '💡 Suggested'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

                {/* ── Evidence tab ── */}
                {tab === 'evidence' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {applyStatusFilter(evidenceLinks).length === 0 ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' }}>
                        {evidenceLinks.length === 0
                          ? 'No evidence links yet. Run a Semantic Mapping session and sync it via the API.'
                          : 'No links match the current status filter.'}
                      </div>
                    ) : (
                      applyStatusFilter(evidenceLinks).map((link) => (
                        <LinkRow
                          key={link.id}
                          link={link}
                          perspective={selectedReqId}
                          onReview={handleReview}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* ── Related requirements tab ── */}
                {tab === 'related' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {applyStatusFilter(relatedLinks).length === 0 ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' }}>
                        {relatedLinks.length === 0
                          ? 'No requirement links found. Click "Seed Template Links" to populate from the regulatory template graph.'
                          : 'No links match the current status filter.'}
                      </div>
                    ) : (
                      applyStatusFilter(relatedLinks).map((link) => (
                        <LinkRow
                          key={link.id}
                          link={link}
                          perspective={selectedReqId}
                          onReview={handleReview}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* ── Impact analysis tab ── */}
                {tab === 'impact' && (
                  <ImpactPanel
                    entityId={selectedReqId}
                    entityLabel={selectedReq.title}
                    entityType="requirement"
                  />
                )}
              </div>
            </div>
          )}
        </main>

        {/* ──────────── Right panel: change log ──────────── */}
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Change Log
          </div>
          <EventFeed events={events} />
        </aside>
      </div>
    </div>
  )
}
