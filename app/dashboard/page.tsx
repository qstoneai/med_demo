import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'
import { getKpiData, getAuditLog } from '@/lib/audit'
import { computeReadiness } from '@/lib/services/auditReadiness'
import { countByStatus }    from '@/lib/store/auditStore'

const KPI_CONFIG = [
  { key: 'documentsReviewed', label: 'Documents Reviewed', icon: '📄', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
  { key: 'chatsToday',        label: 'Chats Today',        icon: '💬', color: '#7c5bdc', bg: 'rgba(124,91,220,0.12)' },
  { key: 'pendingReviews',    label: 'Pending Reviews',    icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { key: 'auditEvents',       label: 'Audit Events',       icon: '📋', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
] as const

const ACTION_ICON: Record<string, string> = {
  chat_query:  '💬',
  file_upload: '📤',
  file_review: '🔍',
  export:      '📥',
}

const LEVEL_COLOR: Record<string, string> = {
  ready:     '#22c55e',
  at_risk:   '#f59e0b',
  not_ready: '#ef4444',
}
const LEVEL_LABEL: Record<string, string> = {
  ready:     'Ready',
  at_risk:   'At Risk',
  not_ready: 'Not Ready',
}

const PRIORITY_COLOR: Record<string, string> = {
  critical:      '#ef4444',
  major:         '#f59e0b',
  minor:         '#4f8ef7',
  informational: '#8b8fa8',
}

export default function DashboardPage() {
  const kpi           = getKpiData()
  const recentActivity = getAuditLog().slice(0, 6)
  const readiness     = computeReadiness()
  const schedCounts   = countByStatus()

  const overdueCount  = schedCounts.overdue  ?? 0
  const dueSoonCount  = schedCounts.due_soon ?? 0
  const levelColor    = LEVEL_COLOR[readiness.level] ?? '#4f8ef7'

  return (
    <>
      <TopBar
        title="Dashboard"
        subtitle="Regulatory compliance overview"
      />
      <main className="page-body">
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Good morning, Dr. Kim 👋
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Here&apos;s your regulatory compliance summary for today.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          {KPI_CONFIG.map((cfg) => (
            <div key={cfg.key} className="kpi-card">
              <div className="kpi-icon" style={{ background: cfg.bg }}>
                <span>{cfg.icon}</span>
              </div>
              <div>
                <div className="kpi-label">{cfg.label}</div>
                <div className="kpi-value" style={{ color: cfg.color }}>
                  {kpi[cfg.key]}
                </div>
                <div className="kpi-change">↑ Updated now</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Audit Readiness Banner ── */}
        <div style={{
          marginBottom: 20,
          padding: '16px 20px',
          borderRadius: 12,
          background: `${levelColor}0d`,
          border: `1px solid ${levelColor}33`,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 20,
        }}>
          {/* Score pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              border: `3px solid ${levelColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
              background: `${levelColor}12`,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: levelColor, lineHeight: 1 }}>
                {readiness.score}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.2 }}>/100</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Audit Readiness</div>
              <div style={{
                display: 'inline-block',
                marginTop: 3,
                padding: '2px 8px',
                borderRadius: 6,
                background: `${levelColor}22`,
                color: levelColor,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {LEVEL_LABEL[readiness.level] ?? readiness.level}
              </div>
            </div>
          </div>

          {/* Status chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {overdueCount > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 5px #ef4444' }} />
                {overdueCount} overdue
              </div>
            )}
            {dueSoonCount > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                {dueSoonCount} due soon
              </div>
            )}
            {readiness.factors.missingItemsCount > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(239,68,68,0.08)', color: 'var(--text-muted)',
                fontSize: 12, fontWeight: 600,
              }}>
                {readiness.factors.missingItemsCount} missing requirements
              </div>
            )}
            {readiness.factors.brokenLinksCount > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(245,158,11,0.08)', color: 'var(--text-muted)',
                fontSize: 12, fontWeight: 600,
              }}>
                {readiness.factors.brokenLinksCount} links need review
              </div>
            )}
            {overdueCount === 0 && dueSoonCount === 0 && readiness.factors.missingItemsCount === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                All schedules on track · no critical gaps detected
              </div>
            )}
          </div>

          {/* CTA */}
          <Link
            href="/audit-readiness"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: levelColor,
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            View Details →
          </Link>
        </div>

        {/* Dashboard grid */}
        <div className="dashboard-grid">
          {/* Recent activity */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Activity</div>
                <div className="card-subtitle">Latest regulatory actions</div>
              </div>
              <Link href="/audit" className="btn btn-ghost" style={{ fontSize: 12 }}>
                View all →
              </Link>
            </div>
            <div className="activity-feed">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="activity-item">
                  <div
                    className="activity-dot"
                    style={{
                      background:
                        entry.status === 'success' ? 'var(--success)' :
                        entry.status === 'failed'  ? 'var(--danger)'  : 'var(--warning)',
                    }}
                  />
                  <div>
                    <div className="activity-detail">
                      {ACTION_ICON[entry.action]} {entry.details}
                    </div>
                    <div className="activity-meta">
                      {entry.user} · {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: Quick actions + upcoming audits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Quick Actions</div>
                  <div className="card-subtitle">Jump to common tasks</div>
                </div>
              </div>
              <div className="quick-actions">
                <Link href="/chat" className="quick-action-btn" id="qa-chat">
                  <span className="qa-icon">💬</span>
                  <span className="qa-label">New Chat</span>
                  <span className="qa-sub">Ask a regulation question</span>
                </Link>
                <Link href="/upload" className="quick-action-btn" id="qa-upload">
                  <span className="qa-icon">📤</span>
                  <span className="qa-label">Upload File</span>
                  <span className="qa-sub">Submit a technical doc</span>
                </Link>
                <Link href="/audit-readiness" className="quick-action-btn" id="qa-readiness">
                  <span className="qa-icon">✅</span>
                  <span className="qa-label">Audit Readiness</span>
                  <span className="qa-sub">Review schedules & gaps</span>
                </Link>
                <Link href="/gap" className="quick-action-btn" id="qa-gap">
                  <span className="qa-icon">📊</span>
                  <span className="qa-label">Gap Analysis</span>
                  <span className="qa-sub">Check coverage</span>
                </Link>
              </div>

              <div className="divider" />

              {/* Compliance snapshot */}
              <div className="card-title" style={{ marginBottom: 12 }}>Compliance Health</div>
              {[
                { label: 'FDA 21 CFR 820', score: 88 },
                { label: 'EU MDR 2017/745', score: 74 },
                { label: 'ISO 13485', score: 92 },
                { label: 'ISO 14971', score: 65 },
              ].map((item) => (
                <div key={item.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{
                      color: item.score >= 85 ? 'var(--success)' : item.score >= 70 ? 'var(--warning)' : 'var(--danger)',
                      fontWeight: 600,
                    }}>{item.score}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${item.score}%`,
                        background: item.score >= 85
                          ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                          : item.score >= 70
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #ef4444, #f87171)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming reviews mini-panel */}
            {readiness.upcomingAudits.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Upcoming Reviews</div>
                    <div className="card-subtitle">Next 30 days</div>
                  </div>
                  <Link href="/audit-readiness" className="btn btn-ghost" style={{ fontSize: 12 }}>
                    Manage →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {readiness.upcomingAudits.slice(0, 4).map((s) => {
                    const days = Math.round(
                      (new Date(s.nextReviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                    )
                    const statusColor =
                      s.status === 'overdue'  ? '#ef4444' :
                      s.status === 'due_soon' ? '#f59e0b' : '#4f8ef7'
                    return (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${statusColor}30`,
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: `${statusColor}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'column', flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: statusColor, lineHeight: 1 }}>
                            {Math.abs(days)}
                          </span>
                          <span style={{ fontSize: 8, color: statusColor, lineHeight: 1.4 }}>
                            {days < 0 ? 'OVR' : 'DAYS'}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.itemLabel}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.owner}</div>
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 6px', borderRadius: 4,
                          background: `${statusColor}20`, color: statusColor,
                          textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>
                          {s.status === 'overdue' ? 'Overdue' : s.status === 'due_soon' ? 'Due Soon' : 'Upcoming'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top missing items mini-panel */}
            {readiness.topMissingItems.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Top Missing Items</div>
                    <div className="card-subtitle">Critical gaps to address</div>
                  </div>
                  <Link href="/gap" className="btn btn-ghost" style={{ fontSize: 12 }}>
                    Full analysis →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {readiness.topMissingItems.slice(0, 3).map((item) => (
                    <div key={item.requirementId} style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      background: 'rgba(239,68,68,0.04)',
                      border: '1px solid rgba(239,68,68,0.18)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '1px 5px', borderRadius: 4,
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
