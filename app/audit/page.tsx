'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { HistoryEntry, HistoryTargetType, HistoryAction } from '@/lib/types/history'

// ─── Style config ──────────────────────────────────────────────────────────────

const TARGET_CFG: Record<HistoryTargetType, { icon: string; color: string; label: string }> = {
  document:        { icon: '📄', color: '#60a5fa', label: 'Document'        },
  mapping_session: { icon: '🔗', color: '#a78bfa', label: 'Mapping'         },
  gap_report:      { icon: '📊', color: '#fbbf24', label: 'Gap Report'      },
  reuse_report:    { icon: '♻',  color: '#34d399', label: 'Reuse Report'    },
  trace_link:      { icon: '🕸', color: '#fb923c', label: 'Trace Link'      },
  requirement:     { icon: '📋', color: '#94a3b8', label: 'Requirement'     },
  system:          { icon: '⚙',  color: '#6b7280', label: 'System'          },
}

const ACTION_CFG: Partial<Record<HistoryAction, { label: string; color: string; bg: string }>> = {
  created:             { label: 'Created',       color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  updated:             { label: 'Updated',       color: '#fbbf24', bg: 'rgba(245,158,11,0.12)'  },
  deleted:             { label: 'Deleted',       color: '#f87171', bg: 'rgba(239,68,68,0.12)'   },
  reviewed:            { label: 'Reviewed',      color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  approved:            { label: 'Approved',      color: '#4ade80', bg: 'rgba(34,197,94,0.12)'   },
  rejected:            { label: 'Rejected',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
  uploaded:            { label: 'Uploaded',      color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  mapping_run:         { label: 'Mapping Run',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  gap_analysis_run:    { label: 'Gap Analysis',  color: '#fbbf24', bg: 'rgba(245,158,11,0.12)'  },
  reuse_analysis_run:  { label: 'Reuse Analysis',color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  link_seeded:         { label: 'Links Seeded',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  link_reviewed:       { label: 'Link Reviewed', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  change_propagated:   { label: 'Change Flagged',color: '#fb923c', bg: 'rgba(249,115,22,0.12)'  },
  exported:            { label: 'Exported',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
}

const ACTOR_CFG: Record<string, { color: string; bg: string }> = {
  user:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  },
  ai:     { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  system: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
}

function formatTs(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }
}

function groupByDate(entries: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const groups = new Map<string, HistoryEntry[]>()
  const now    = new Date()
  const today  = now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString()

  for (const e of entries) {
    const d   = new Date(e.timestamp)
    const ds  = d.toDateString()
    const key = ds === today ? 'Today' : ds === yesterday ? 'Yesterday' : formatTs(e.timestamp).date
    const arr = groups.get(key) ?? []
    arr.push(e)
    groups.set(key, arr)
  }

  return [...groups.entries()].map(([label, entries]) => ({ label, entries }))
}

// ─── Single history entry row ─────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false)
  const tc   = TARGET_CFG[entry.targetType] ?? TARGET_CFG.system
  const ac   = ACTION_CFG[entry.action]
  const aAct = ACTOR_CFG[entry.actor.type] ?? ACTOR_CFG.system
  const { time } = formatTs(entry.timestamp)

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: open ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      {/* Main row */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '80px 28px auto 1fr 100px 32px',
          gap: 10,
          alignItems: 'center',
          padding: '10px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Time */}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
          {time}
        </span>

        {/* Target type icon */}
        <span title={tc.label} style={{ fontSize: 15 }}>{tc.icon}</span>

        {/* Action badge */}
        <span
          style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 10,
            background: ac?.bg  ?? 'rgba(255,255,255,0.08)',
            color:      ac?.color ?? 'rgba(255,255,255,0.5)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {ac?.label ?? entry.action}
        </span>

        {/* Change summary */}
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.75)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ color: tc.color, fontWeight: 600, marginRight: 6 }}>
            {entry.targetLabel}
          </span>
          {entry.changeSummary}
        </span>

        {/* Actor badge */}
        <span
          style={{
            fontSize: 10,
            padding: '2px 7px',
            borderRadius: 9,
            background: aAct.bg,
            color: aAct.color,
            fontWeight: 600,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.actor.name}
        </span>

        {/* Chevron */}
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div
          style={{
            padding: '10px 20px 16px 58px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* IDs */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>
              Entry ID: <code style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{entry.id}</code>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>
              Target ID: <code style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{entry.targetId}</code>
            </span>
            {entry.context?.sessionId && (
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                Session: <code style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{entry.context.sessionId}</code>
              </span>
            )}
          </div>

          {/* Context */}
          {entry.context && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(entry.context)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 9,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {k}: {String(v)}
                  </span>
                ))}
            </div>
          )}

          {/* Diff */}
          {entry.diff && (
            <div style={{ display: 'flex', gap: 10 }}>
              {entry.diff.before && (
                <div
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 4 }}>Before</div>
                  {JSON.stringify(entry.diff.before, null, 2)}
                </div>
              )}
              {entry.diff.after && (
                <div
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>After</div>
                  {JSON.stringify(entry.diff.after, null, 2)}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 5 }}>
              {entry.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 10,
                    padding: '1px 7px',
                    borderRadius: 8,
                    background: 'rgba(79,142,247,0.1)',
                    border: '1px solid rgba(79,142,247,0.2)',
                    color: '#60a5fa',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inner content (uses useSearchParams — must be inside Suspense) ───────────

function AuditContent() {
  const searchParams = useSearchParams()
  const initTargetId   = searchParams.get('entityId')   ?? ''
  const initTargetType = searchParams.get('type')        ?? ''

  const [entries,      setEntries]      = useState<HistoryEntry[]>([])
  const [total,        setTotal]        = useState(0)
  const [hasMore,      setHasMore]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const [filterType,   setFilterType]   = useState<string>(initTargetType)
  const [filterAction, setFilterAction] = useState<string>('')
  const [search,       setSearch]       = useState(initTargetId)
  const [offset,       setOffset]       = useState(0)
  const LIMIT = 50

  const load = useCallback(async (reset = false) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search)      params.set('targetId',   search)
      if (filterType)  params.set('targetType', filterType)
      if (filterAction) params.set('action',    filterAction)
      params.set('limit',  String(LIMIT))
      params.set('offset', String(reset ? 0 : offset))

      const res  = await fetch(`/api/history?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      const newEntries: HistoryEntry[] = data.entries ?? []
      setEntries((prev) => reset ? newEntries : [...prev, ...newEntries])
      setTotal(data.total ?? 0)
      setHasMore(data.hasMore ?? false)
      if (reset) setOffset(LIMIT)
      else       setOffset((o) => o + LIMIT)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [search, filterType, filterAction, offset])

  // Initial load + filter changes
  useEffect(() => {
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterType, filterAction])

  const groups = groupByDate(entries)

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Audit Log" subtitle="Full change history across documents, mappings, and regulatory analysis" />

      {/* Filter bar */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        {/* Entity type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="">All types</option>
          {Object.entries(TARGET_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        {/* Action filter */}
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            padding: '6px 10px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v?.label}</option>
          ))}
        </select>

        {/* Entity ID search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by entity ID…"
          style={{
            padding: '6px 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            color: 'var(--text-primary)',
            fontSize: 12,
            width: 220,
            outline: 'none',
          }}
        />

        {/* Stats */}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>

        {/* Export */}
        <button
          onClick={exportLog}
          style={{
            marginLeft: 'auto',
            padding: '6px 13px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border)',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ↓ Export JSON
        </button>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '80px 28px auto 1fr 100px 32px',
          gap: 10,
          padding: '7px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.015)',
        }}
      >
        {['Time', '', 'Action', 'Summary', 'Actor', ''].map((h, i) => (
          <span
            key={i}
            style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {loading && entries.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{ padding: '16px 20px', color: '#f87171', fontSize: 13 }}>⚠ {error}</div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div
            style={{
              padding: '60px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 13,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'rgba(255,255,255,0.45)' }}>
              No history entries yet
            </div>
            <div style={{ lineHeight: 1.6 }}>
              History is recorded automatically when you upload documents, run mappings,
              gap analyses, and reuse analyses. Entries will appear here in real time.
            </div>
          </div>
        )}

        {groups.map(({ label, entries: dayEntries }) => (
          <div key={label}>
            {/* Date group header */}
            <div
              style={{
                padding: '8px 20px',
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                position: 'sticky',
                top: 0,
                backdropFilter: 'blur(4px)',
              }}
            >
              {label} · {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
            </div>
            {dayEntries.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </div>
        ))}

        {/* Load more */}
        {hasMore && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={() => load(false)}
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid var(--border)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Loading…' : `Load more (${total - entries.length} remaining)`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function AuditPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.3)' }}>
        Loading…
      </div>
    }>
      <AuditContent />
    </Suspense>
  )
}
