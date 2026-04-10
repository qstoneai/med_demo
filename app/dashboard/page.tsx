import TopBar from '@/components/layout/TopBar'
import Link from 'next/link'
import { getKpiData, getAuditLog } from '@/lib/audit'

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

export default function DashboardPage() {
  const kpi = getKpiData()
  const recentActivity = getAuditLog().slice(0, 6)

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

          {/* Quick actions */}
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
              <Link href="/audit" className="quick-action-btn" id="qa-audit">
                <span className="qa-icon">📋</span>
                <span className="qa-label">Audit Log</span>
                <span className="qa-sub">Review all actions</span>
              </Link>
              <Link href="/upload" className="quick-action-btn" id="qa-review">
                <span className="qa-icon">🔍</span>
                <span className="qa-label">Review Doc</span>
                <span className="qa-sub">Compliance analysis</span>
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
        </div>
      </main>
    </>
  )
}
