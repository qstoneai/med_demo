'use client'

import { useEffect, useState } from 'react'

// ─── Types (mirrors /api/audit response) ──────────────────────────────────────

type ActionType = 'chat_query' | 'document_review' | 'file_upload' | 'export'

interface AuditEntry {
  id: string
  timestamp: string
  actionType: ActionType
  summary: string
  modelName: string
  citationsCount: number
}

// ─── Action type badge ─────────────────────────────────────────────────────────

const ACTION_LABEL: Record<ActionType, string> = {
  chat_query:      'Chat Query',
  document_review: 'Doc Review',
  file_upload:     'File Upload',
  export:          'Export',
}

const ACTION_STYLE: Record<ActionType, React.CSSProperties> = {
  chat_query:      { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  document_review: { background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' },
  file_upload:     { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  export:          { background: '#fafafa', color: '#374151', border: '1px solid #e5e7eb' },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    year:   'numeric',
    month:  'short',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function fetchAudit() {
      try {
        const res  = await fetch('/api/audit')
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error ?? `Request failed (${res.status})`)
          return
        }
        setEntries(data.entries ?? [])
        setTotal(data.total ?? 0)
      } catch {
        setError('Network error — could not load audit log.')
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [])

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif', color: '#111' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Audit Log</h1>
        {!loading && !error && (
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
            {total} {total === 1 ? 'entry' : 'entries'} — newest first
          </p>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading…</p>
      )}

      {/* ── Error ── */}
      {error && (
        <p role="alert" style={{ color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.625rem 0.875rem', fontSize: '0.875rem' }}>
          {error}
        </p>
      )}

      {/* ── Table ── */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Timestamp', 'Action', 'Summary', 'Model', 'Citations'].map((h) => (
                  <th
                    key={h}
                    style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}
                >
                  <td style={{ padding: '0.625rem 0.875rem', whiteSpace: 'nowrap', color: '#6b7280' }}>
                    {formatTimestamp(entry.timestamp)}
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', whiteSpace: 'nowrap' }}>
                    <span style={{
                      ...ACTION_STYLE[entry.actionType] ?? ACTION_STYLE.export,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.55rem',
                      borderRadius: 999,
                    }}>
                      {ACTION_LABEL[entry.actionType] ?? entry.actionType}
                    </span>
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', color: '#374151', maxWidth: 420 }}>
                    {entry.summary}
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', whiteSpace: 'nowrap', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {entry.modelName}
                  </td>
                  <td style={{ padding: '0.625rem 0.875rem', textAlign: 'center', color: entry.citationsCount > 0 ? '#1d4ed8' : '#9ca3af', fontWeight: entry.citationsCount > 0 ? 600 : 400 }}>
                    {entry.citationsCount > 0 ? entry.citationsCount : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && entries.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No audit entries found.</p>
      )}

    </main>
  )
}
