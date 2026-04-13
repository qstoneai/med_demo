'use client'

// ─── Audit Readiness Page ─────────────────────────────────────────────────────
// Shows the current audit-readiness state: composite score, breakdown by
// readiness factor, upcoming / overdue schedule list, and top missing items.
// The schedule table supports CRUD via /api/audit-schedule.
//
// Notifications are UI-level only (badges, colour-coded status chips).
// TODO: wire CronCreate / external webhook for real reminder delivery.

import { useState, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { AuditSchedule, AuditReadinessSummary, ScheduleStatus } from '@/lib/types/auditSchedule'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  ready:     '#22c55e',
  at_risk:   '#f59e0b',
  not_ready: '#ef4444',
}

const LEVEL_BG: Record<string, string> = {
  ready:     'rgba(34,197,94,0.12)',
  at_risk:   'rgba(245,158,11,0.12)',
  not_ready: 'rgba(239,68,68,0.12)',
}

const LEVEL_LABEL: Record<string, string> = {
  ready:     'Ready',
  at_risk:   'At Risk',
  not_ready: 'Not Ready',
}

const STATUS_COLOR: Record<ScheduleStatus, string> = {
  upcoming:  '#4f8ef7',
  due_soon:  '#f59e0b',
  overdue:   '#ef4444',
  completed: '#22c55e',
}

const STATUS_BG: Record<ScheduleStatus, string> = {
  upcoming:  'rgba(79,142,247,0.12)',
  due_soon:  'rgba(245,158,11,0.12)',
  overdue:   'rgba(239,68,68,0.12)',
  completed: 'rgba(34,197,94,0.12)',
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  upcoming:  'Upcoming',
  due_soon:  'Due Soon',
  overdue:   'Overdue',
  completed: 'Completed',
}

const PRIORITY_COLOR: Record<string, string> = {
  critical:      '#ef4444',
  major:         '#f59e0b',
  minor:         '#4f8ef7',
  informational: '#8b8fa8',
}

const CYCLE_LABELS: Record<string, string> = {
  monthly:      'Monthly',
  quarterly:    'Quarterly',
  'semi-annual': 'Semi-annual',
  annual:       'Annual',
  custom:       'Custom',
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReadinessGauge({ score, level }: { score: number; level: string }) {
  const color    = LEVEL_COLOR[level]  ?? '#4f8ef7'
  const R        = 52
  const CIRCUM   = 2 * Math.PI * R
  const dash     = (score / 100) * CIRCUM

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        {/* Track */}
        <circle cx={65} cy={65} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
        {/* Progress */}
        <circle
          cx={65} cy={65} r={R}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUM}`}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={65} y={60} textAnchor="middle" fill={color} fontSize={24} fontWeight={800}>{score}</text>
        <text x={65} y={76} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={11}>/100</text>
      </svg>
      <div style={{
        padding: '4px 14px',
        borderRadius: 12,
        background: LEVEL_BG[level],
        color,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {LEVEL_LABEL[level] ?? level}
      </div>
    </div>
  )
}

function FactorBar({
  label, value, max, unit, color,
}: { label: string; value: number; max: number; unit?: string; color?: string }) {
  const pct   = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const fill  = color ?? (pct > 66 ? '#ef4444' : pct > 33 ? '#f59e0b' : '#22c55e')
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: fill }}>
          {value}{unit ?? ''}{max !== value && max !== 100 ? ` / ${max}` : ''}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: fill, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ScheduleStatus }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 6,
      background: STATUS_BG[status],
      color: STATUS_COLOR[status],
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function NotificationDot({ status }: { status: ScheduleStatus }) {
  if (status === 'completed' || status === 'upcoming') return null
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: STATUS_COLOR[status],
      marginRight: 6,
      boxShadow: `0 0 6px ${STATUS_COLOR[status]}`,
      flexShrink: 0,
    }} />
  )
}

// ── Schedule row ──────────────────────────────────────────────────────────────

function ScheduleRow({
  schedule,
  onComplete,
  onDelete,
}: {
  schedule: AuditSchedule
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}) {
  const days = daysUntil(schedule.nextReviewDate)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 130px 90px 90px 110px 100px',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      fontSize: 13,
    }}>
      {/* Label + authority */}
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          <NotificationDot status={schedule.status} />
          {schedule.itemLabel}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {schedule.authority} · {schedule.owner}
        </div>
      </div>
      {/* Cycle */}
      <div style={{ color: 'var(--text-secondary)' }}>{CYCLE_LABELS[schedule.cycle]}</div>
      {/* Next review */}
      <div>
        <div style={{ color: 'var(--text-primary)' }}>{formatDate(schedule.nextReviewDate)}</div>
        <div style={{ fontSize: 11, color: days < 0 ? '#ef4444' : 'var(--text-muted)' }}>
          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`}
        </div>
      </div>
      {/* Last review */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {schedule.lastReviewDate ? formatDate(schedule.lastReviewDate) : '—'}
      </div>
      {/* Status badge */}
      <StatusBadge status={schedule.status} />
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        {schedule.status !== 'completed' && (
          <button
            onClick={() => onComplete(schedule.id)}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(34,197,94,0.3)',
              background: 'rgba(34,197,94,0.08)',
              color: '#22c55e',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✓ Done
          </button>
        )}
        <button
          onClick={() => onDelete(schedule.id)}
          style={{
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid rgba(239,68,68,0.25)',
            background: 'transparent',
            color: '#ef4444',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Add-schedule form ─────────────────────────────────────────────────────────

const BLANK_FORM = {
  authority: '', itemType: 'domain', itemId: '', itemLabel: '',
  cycle: 'quarterly', nextReviewDate: '', owner: '', reminderWindowDays: '14', notes: '',
}

function AddScheduleForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const field = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      const res = await fetch('/api/audit-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, reminderWindowDays: Number(form.reminderWindowDays) }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Save failed'); setSaving(false); return }
      setForm(BLANK_FORM)
      onSaved()
    } catch {
      setErr('Network error')
    }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    padding: '7px 10px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
      <div>
        <label style={labelStyle}>Authority</label>
        <input style={inputStyle} value={form.authority} onChange={field('authority')}
          placeholder="e.g. FDA 21 CFR Part 820" required />
      </div>
      <div>
        <label style={labelStyle}>Item Label</label>
        <input style={inputStyle} value={form.itemLabel} onChange={field('itemLabel')}
          placeholder="e.g. Risk Management Review" required />
      </div>
      <div>
        <label style={labelStyle}>Item Type</label>
        <select style={inputStyle} value={form.itemType} onChange={field('itemType')}>
          <option value="requirement">Requirement</option>
          <option value="document">Document</option>
          <option value="domain">Domain</option>
          <option value="system">System</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Item ID</label>
        <input style={inputStyle} value={form.itemId} onChange={field('itemId')}
          placeholder="e.g. Risk, COMMON-RISK-001" required />
      </div>
      <div>
        <label style={labelStyle}>Review Cycle</label>
        <select style={inputStyle} value={form.cycle} onChange={field('cycle')}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="semi-annual">Semi-annual</option>
          <option value="annual">Annual</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Next Review Date</label>
        <input style={inputStyle} type="date" value={form.nextReviewDate} onChange={field('nextReviewDate')} required />
      </div>
      <div>
        <label style={labelStyle}>Owner</label>
        <input style={inputStyle} value={form.owner} onChange={field('owner')}
          placeholder="e.g. Dr. Sarah Kim" required />
      </div>
      <div>
        <label style={labelStyle}>Reminder Window (days)</label>
        <input style={inputStyle} type="number" min={1} max={90} value={form.reminderWindowDays}
          onChange={field('reminderWindowDays')} required />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={labelStyle}>Notes</label>
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
          value={form.notes} onChange={field('notes')} placeholder="Optional context…" />
      </div>
      {err && (
        <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: 12 }}>{err}</div>
      )}
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Add Schedule'}
        </button>
      </div>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'overdue' | 'due_soon' | 'upcoming' | 'completed'

export default function AuditReadinessPage() {
  const [summary, setSummary]     = useState<AuditReadinessSummary | null>(null)
  const [schedules, setSchedules] = useState<AuditSchedule[]>([])
  const [counts, setCounts]       = useState<Record<string, number>>({})
  const [tab, setTab]             = useState<FilterTab>('all')
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [readRes, schedRes] = await Promise.all([
      fetch('/api/audit-schedule?readiness=true'),
      fetch('/api/audit-schedule'),
    ])
    const readData  = await readRes.json()
    const schedData = await schedRes.json()

    if (readData.summary)  setSummary(readData.summary)
    if (schedData.schedules) setSchedules(schedData.schedules)
    if (schedData.counts)    setCounts(schedData.counts)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleComplete(id: string) {
    await fetch('/api/audit-schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/audit-schedule?id=${id}`, { method: 'DELETE' })
    load()
  }

  const visibleSchedules = tab === 'all'
    ? schedules
    : schedules.filter((s) => s.status === tab)

  const overdueCount  = counts.overdue  ?? 0
  const dueSoonCount  = counts.due_soon ?? 0

  const TAB_ITEMS: Array<{ key: FilterTab; label: string; count?: number }> = [
    { key: 'all',       label: 'All',       count: schedules.length },
    { key: 'overdue',   label: 'Overdue',   count: overdueCount },
    { key: 'due_soon',  label: 'Due Soon',  count: dueSoonCount },
    { key: 'upcoming',  label: 'Upcoming',  count: counts.upcoming ?? 0 },
    { key: 'completed', label: 'Completed', count: counts.completed ?? 0 },
  ]

  if (loading) {
    return (
      <>
        <TopBar title="Audit Readiness" subtitle="Loading…" />
        <main className="page-body">
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 40, textAlign: 'center' }}>
            Computing readiness…
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar
        title="Audit Readiness"
        subtitle="Schedule management and compliance readiness overview"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {overdueCount > 0 && (
              <div style={{
                padding: '4px 12px',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                {overdueCount} overdue
              </div>
            )}
            {dueSoonCount > 0 && (
              <div style={{
                padding: '4px 12px',
                borderRadius: 8,
                background: 'rgba(245,158,11,0.15)',
                color: '#f59e0b',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                {dueSoonCount} due soon
              </div>
            )}
          </div>
        }
      />

      <main className="page-body">

        {/* ── Readiness summary row ── */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 20, marginBottom: 24 }}>

            {/* Gauge */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 32px' }}>
              <ReadinessGauge score={summary.score} level={summary.level} />
            </div>

            {/* Factors */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Readiness Factors</div>
              <FactorBar
                label="Requirement Coverage"
                value={summary.factors.requirementCoverageScore}
                max={100}
                unit="%"
                color={summary.factors.requirementCoverageScore >= 75 ? '#22c55e' : summary.factors.requirementCoverageScore >= 50 ? '#f59e0b' : '#ef4444'}
              />
              <FactorBar
                label="Missing Requirements"
                value={summary.factors.missingItemsCount}
                max={Math.max(summary.factors.missingItemsCount, 10)}
              />
              <FactorBar
                label="Missing Citations"
                value={summary.factors.missingCitationsCount}
                max={Math.max(summary.factors.missingCitationsCount, 20)}
              />
              <FactorBar
                label="Broken Trace Links"
                value={summary.factors.brokenLinksCount}
                max={Math.max(summary.factors.brokenLinksCount, 10)}
              />
              <FactorBar
                label="Stale Documents"
                value={summary.factors.staleDocumentsCount}
                max={Math.max(summary.factors.staleDocumentsCount, 5)}
              />
            </div>

            {/* Top missing items */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 4 }}>Top Missing Items</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                Requirements with no sufficient evidence
              </div>
              {summary.topMissingItems.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
                  No missing requirements — all covered ✓
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {summary.topMissingItems.map((item) => (
                    <div key={item.requirementId} style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: `${PRIORITY_COLOR[item.priority]}20`,
                          color: PRIORITY_COLOR[item.priority],
                          textTransform: 'uppercase',
                        }}>{item.priority}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.requirementLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {item.domain} · {item.requirementId}
                      </div>
                      {item.missingPoints.slice(0, 1).map((pt, i) => (
                        <div key={i} style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                          ✗ {pt}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Upcoming audit callouts ── */}
        {summary && summary.upcomingAudits.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Upcoming (next 30 days)
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {summary.upcomingAudits.map((s) => {
                const days = daysUntil(s.nextReviewDate)
                return (
                  <div key={s.id} style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(79,142,247,0.08)',
                    border: `1px solid ${STATUS_COLOR[s.status]}40`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 200,
                  }}>
                    <NotificationDot status={s.status} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{s.itemLabel}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.authority}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <StatusBadge status={s.status} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                        {days === 0 ? 'today' : `${days}d`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Overdue callout banner ── */}
        {summary && summary.overdueSchedules.length > 0 && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 13, marginBottom: 4 }}>
                {summary.overdueSchedules.length} overdue review{summary.overdueSchedules.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {summary.overdueSchedules.map((s) => s.itemLabel).join(', ')}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {/* TODO: add notification hook */}
              Reminders: UI only
            </div>
          </div>
        )}

        {/* ── Schedule table ── */}
        <div className="card" style={{ padding: 0 }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div className="card-title">Review Schedules</div>
              <div className="card-subtitle">Manage periodic audit and review obligations</div>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                background: showForm ? 'rgba(255,255,255,0.08)' : 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {showForm ? '✕ Cancel' : '+ Add Schedule'}
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <AddScheduleForm onSaved={() => { setShowForm(false); load() }} />
            </div>
          )}

          {/* Filter tabs */}
          <div style={{
            display: 'flex',
            gap: 4,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {TAB_ITEMS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: tab === t.key ? 'var(--accent)' : 'transparent',
                  color: tab === t.key ? '#fff' : 'var(--text-muted)',
                  fontWeight: tab === t.key ? 700 : 400,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span style={{
                    padding: '1px 5px',
                    borderRadius: 8,
                    background: t.key === 'overdue' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)',
                    color:      t.key === 'overdue' ? '#ef4444' : 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px 90px 90px 110px 100px',
            gap: 12,
            padding: '8px 16px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div>Item</div>
            <div>Cycle</div>
            <div>Next Review</div>
            <div>Last Review</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {/* Rows */}
          {visibleSchedules.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No schedules in this category.
            </div>
          ) : (
            visibleSchedules.map((s) => (
              <ScheduleRow key={s.id} schedule={s} onComplete={handleComplete} onDelete={handleDelete} />
            ))
          )}
        </div>

        {/* TODO notice */}
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
          fontSize: 12,
          color: 'var(--text-muted)',
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>TODO:</strong> Reminder delivery is UI-only (badge + status colour).
          To enable real notifications, wire a cron job or webhook to <code style={{ fontSize: 11 }}>/api/audit-schedule?status=overdue</code> and
          send alerts via email / Slack.
        </div>

        {summary && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
            Readiness computed {timeAgo(summary.generatedAt)}
          </div>
        )}

      </main>
    </>
  )
}
