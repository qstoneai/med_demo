'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { IngestedDocument, DocumentChunk, ChunkCitation } from '@/lib/types/documents'
import type {
  AnalysisResponse,
  CitedFinding,
  AnalysisCitation,
  FindingStatus,
} from '@/lib/types/analysis'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}
function fileIcon(t: string) {
  if (t === 'pdf')  return '📄'
  if (t === 'docx') return '📝'
  if (t === 'xlsx') return '📊'
  return '📎'
}
function statusColor(s: string) {
  if (s === 'complete')   return '#4ade80'
  if (s === 'error')      return '#f87171'
  if (s === 'processing') return '#fbbf24'
  return 'var(--text-muted)'
}
function statusLabel(s: string) {
  if (s === 'complete')   return '✓ Complete'
  if (s === 'error')      return '✗ Error'
  if (s === 'processing') return '⏳ Processing…'
  return 'Pending'
}

// ─── Status badge config (text-analysis tab) ─────────────────────────────────
const STATUS_CFG: Record<FindingStatus, { label: string; bg: string; color: string; border: string }> = {
  covered:      { label: 'Covered',      bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)'  },
  partial:      { label: 'Partial',      bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' },
  missing:      { label: 'Missing',      bg: 'rgba(239,68,68,0.15)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'  },
  human_review: { label: 'Human Review', bg: 'rgba(124,91,220,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,91,220,0.3)' },
}

// ─── Citation card ─────────────────────────────────────────────────────────────
function CitationCard({ cit, index }: { cit: ChunkCitation; index: number }) {
  const location = [
    cit.pageNumber  ? `Page ${cit.pageNumber}`   : null,
    cit.sheetName   ? `Sheet: ${cit.sheetName}`  : null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 8,
      padding: '0.75rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
          background: 'rgba(79,142,247,0.15)', color: 'var(--accent)',
          border: '1px solid rgba(79,142,247,0.3)', borderRadius: 4,
          padding: '1px 6px', whiteSpace: 'nowrap',
        }}>
          REF-{String(index + 1).padStart(3, '0')}
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {cit.fileName}
        </span>
        {location && (
          <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{location}</span>
        )}
        {cit.sectionHeading && (
          <span style={{
            fontSize: '0.75rem', color: 'var(--text-secondary)',
            fontStyle: 'italic', maxWidth: 300,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            §&nbsp;{cit.sectionHeading}
          </span>
        )}
      </div>
      {/* Snippet */}
      <p style={{
        margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)',
        lineHeight: 1.55, fontStyle: 'italic',
      }}>
        &ldquo;{cit.snippet}{cit.snippet.length >= 200 ? '…' : ''}&rdquo;
      </p>
    </div>
  )
}

// ─── Chunk row ─────────────────────────────────────────────────────────────────
function ChunkRow({ chunk, index }: { chunk: DocumentChunk; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const preview = chunk.text.replace(/\s+/g, ' ').slice(0, 300)
  const hasMore = chunk.text.length > 300

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Citation header */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        padding: '0.625rem 1rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
      }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
          background: 'rgba(79,142,247,0.15)', color: 'var(--accent)',
          border: '1px solid rgba(79,142,247,0.3)', borderRadius: 4,
          padding: '1px 6px',
        }}>
          REF-{String(index + 1).padStart(3, '0')}
        </span>
        {chunk.citation.pageNumber && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Page {chunk.citation.pageNumber}
          </span>
        )}
        {chunk.citation.sheetName && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Sheet: {chunk.citation.sheetName}
          </span>
        )}
        {chunk.citation.sectionHeading && (
          <span style={{
            fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340,
          }}>
            § {chunk.citation.sectionHeading}
          </span>
        )}
      </div>
      {/* Text body */}
      <div style={{ padding: '0.625rem 1rem' }}>
        <p style={{
          margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)',
          lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {expanded ? chunk.text : preview}
          {!expanded && hasMore && '…'}
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              marginTop: 6, background: 'none', border: 'none',
              color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', padding: 0,
            }}
          >
            {expanded ? '▲ Show less' : '▼ Show full text'}
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function UploadPage() {
  // ── Tab ─────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file')

  // ── File-upload tab state ────────────────────────────────────────────────────
  const fileInputRef                          = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver]               = useState(false)
  const [selectedFile, setSelectedFile]       = useState<File | null>(null)
  const [fileError, setFileError]             = useState<string | null>(null)
  const [uploading, setUploading]             = useState(false)
  const [uploadError, setUploadError]         = useState<string | null>(null)
  const [uploadResult, setUploadResult]       = useState<{ document: IngestedDocument; chunks: DocumentChunk[] } | null>(null)
  const [showAllChunks, setShowAllChunks]     = useState(false)
  const [recentDocs, setRecentDocs]           = useState<IngestedDocument[]>([])
  const PREVIEW_LIMIT = 5

  // ── Text-analysis tab state ──────────────────────────────────────────────────
  const [docText, setDocText]   = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [textError, setTextError] = useState<string | null>(null)
  const [result, setResult]     = useState<AnalysisResponse | null>(null)
  const [findingDecisions, setFindingDecisions] = useState<Record<number, 'accepted' | 'flagged' | null>>({})
  // Active citation — set when user clicks an evidence badge; clears on new analysis
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null)
  const citationsPanelRef = useRef<HTMLDivElement>(null)

  // ── Load recent documents on mount ──────────────────────────────────────────
  const refreshDocs = useCallback(() => {
    fetch('/api/documents')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => setRecentDocs((data as { documents: IngestedDocument[] }).documents ?? []))
      .catch(() => {/* silently ignore — store may be empty on cold start */})
  }, [])

  useEffect(() => { refreshDocs() }, [refreshDocs])

  // ── File validation ──────────────────────────────────────────────────────────
  const ALLOWED_EXT = ['pdf', 'docx', 'doc', 'xlsx', 'xls']
  const MAX_BYTES   = 4 * 1024 * 1024

  function validateAndSetFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    setFileError(null)
    setUploadError(null)
    setUploadResult(null)

    if (!ALLOWED_EXT.includes(ext)) {
      setFileError(`".${ext}" is not supported. Please choose a PDF, DOCX, or XLSX file.`)
      return
    }
    if (file.size > MAX_BYTES) {
      setFileError(`File is ${formatBytes(file.size)} — exceeds the 4 MB limit.`)
      return
    }
    setSelectedFile(file)
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSetFile(file)
  }

  // ── Submit: file ingestion ───────────────────────────────────────────────────
  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    setUploadError(null)
    setUploadResult(null)
    setShowAllChunks(false)
    setUploading(true)

    try {
      const body = new FormData()
      body.append('file', selectedFile)

      const res  = await fetch('/api/ingest', { method: 'POST', body })
      const data = await res.json() as { document?: IngestedDocument; chunks?: DocumentChunk[]; error?: string }

      if (!res.ok) {
        setUploadError(data.error ?? `Upload failed (HTTP ${res.status})`)
        return
      }

      setUploadResult({ document: data.document!, chunks: data.chunks! })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      refreshDocs()
    } catch {
      setUploadError('Network error — please check your connection and try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Submit: text analysis (existing flow) ────────────────────────────────────
  async function handleTextAnalysis(e: React.FormEvent) {
    e.preventDefault()
    setTextError(null)
    setResult(null)
    setFindingDecisions({})
    setActiveCitationId(null)

    if (!docText.trim()) { setTextError('Document text is required.'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docText, fileName: fileName.trim() || undefined }),
      })
      const data = await res.json() as AnalysisResponse & { error?: string }
      if (!res.ok) { setTextError(data.error ?? `Request failed (${res.status})`); return }
      setResult(data)
    } catch {
      setTextError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Finding review (text-analysis tab) ───────────────────────────────────────
  function handleFindingDecision(idx: number, decision: 'accepted' | 'flagged') {
    setFindingDecisions(prev => ({
      ...prev,
      [idx]: prev[idx] === decision ? null : decision,
    }))
  }

  function exportReviewSummary() {
    if (!result) return
    const summary = {
      analyzedAt: new Date().toISOString(),
      fileName: fileName || 'untitled',
      confidence: result.confidence,
      executiveSummary: result.summary,
      riskFlags: result.riskFlags,
      findings: result.findings.map((f, i) => ({
        id: f.id,
        requirement: f.requirement,
        aiStatus: f.status,
        aiDetail: f.detail,
        confidence: f.confidence,
        evidence: f.evidence,
        reviewDecision: findingDecisions[i] ?? 'pending',
      })),
      citations: result.citations,
    }
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `review_summary_${Date.now()}.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const visibleChunks = uploadResult
    ? (showAllChunks ? uploadResult.chunks : uploadResult.chunks.slice(0, PREVIEW_LIMIT))
    : []

  const textCounts = result ? {
    covered:      result.findings.filter(f => f.status === 'covered').length,
    partial:      result.findings.filter(f => f.status === 'partial').length,
    missing:      result.findings.filter(f => f.status === 'missing').length,
    human_review: result.findings.filter(f => f.status === 'human_review').length,
  } : null

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem', color: 'var(--text-primary)' }}>

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Document Upload &amp; Review
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Upload regulatory documents (PDF / DOCX / XLSX) for structured ingestion with
          citation tracking, or paste text for immediate AI compliance analysis.
        </p>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 2, marginBottom: '1.75rem', borderBottom: '1px solid var(--border)' }}>
        {(['file', 'text'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1.125rem',
              fontSize: '0.875rem', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              marginBottom: -1,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab === 'file' ? '📂  File Upload' : '📋  Text Analysis'}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          FILE UPLOAD TAB
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'file' && (
        <div>
          <form onSubmit={handleFileUpload}>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : selectedFile ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(79,142,247,0.05)' : 'var(--bg-card)',
                transition: 'border-color 0.15s, background 0.15s',
                userSelect: 'none',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f) }}
              />

              {selectedFile ? (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                    {fileIcon(selectedFile.name.split('.').pop()?.toLowerCase() ?? '')}
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {formatBytes(selectedFile.size)} · click or drag to replace
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Drag &amp; drop or click to browse
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    PDF · DOCX · XLSX &nbsp;·&nbsp; Max 4 MB
                  </div>
                </>
              )}
            </div>

            {/* File validation error */}
            {fileError && (
              <p role="alert" style={{
                marginTop: 10, fontSize: '0.875rem', color: '#f87171',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, padding: '0.5rem 0.875rem',
              }}>
                ⚠️ {fileError}
              </p>
            )}

            {/* Upload button */}
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              style={{
                marginTop: '1rem',
                padding: '0.6rem 1.5rem',
                background: !selectedFile || uploading ? 'var(--bg-hover)' : 'var(--accent)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: '0.875rem', fontWeight: 600,
                cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                opacity: !selectedFile || uploading ? 0.6 : 1,
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              {uploading ? '⏳ Parsing document…' : '🔍 Upload &amp; Parse'}
            </button>
          </form>

          {/* Upload error */}
          {uploadError && (
            <div role="alert" style={{
              marginTop: '1rem', fontSize: '0.875rem', color: '#f87171',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '0.75rem 1rem',
            }}>
              ⚠️ {uploadError}
            </div>
          )}

          {/* ── Upload result ───────────────────────────────────────────────── */}
          {uploadResult && (
            <section aria-label="Ingestion result" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Document summary card */}
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderLeft: '4px solid #4ade80', borderRadius: 10,
                padding: '1rem 1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                      Document Ingested
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {fileIcon(uploadResult.document.fileType)}&nbsp; {uploadResult.document.fileName}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    background: 'rgba(74,222,128,0.15)', color: '#4ade80',
                    border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20,
                    padding: '2px 10px',
                  }}>
                    ✓ Complete
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Chunks',  value: uploadResult.document.chunkCount },
                    uploadResult.document.pageCount   ? { label: 'Pages',   value: uploadResult.document.pageCount   } : null,
                    uploadResult.document.sheetNames  ? { label: 'Sheets',  value: uploadResult.document.sheetNames.length } : null,
                    { label: 'Size',    value: formatBytes(uploadResult.document.fileSize) },
                  ].filter(Boolean).map(stat => (
                    <div key={stat!.label}>
                      <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--accent)' }}>{stat!.value}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat!.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chunks + citations */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                    Extracted Chunks &amp; Citations ({uploadResult.document.chunkCount})
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Each chunk is independently citable
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {visibleChunks.map((chunk, i) => (
                    <ChunkRow key={chunk.id} chunk={chunk} index={i} />
                  ))}
                </div>

                {uploadResult.chunks.length > PREVIEW_LIMIT && (
                  <button
                    onClick={() => setShowAllChunks(v => !v)}
                    style={{
                      marginTop: 10, background: 'none',
                      border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text-secondary)', fontSize: '0.8125rem',
                      padding: '0.4rem 1rem', cursor: 'pointer', width: '100%',
                    }}
                  >
                    {showAllChunks
                      ? `▲ Show fewer chunks`
                      : `▼ Show all ${uploadResult.chunks.length} chunks`}
                  </button>
                )}
              </div>

              {/* Citation quick-reference */}
              <div>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  📎 Citation Reference ({uploadResult.chunks.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {uploadResult.chunks.map((chunk, i) => (
                    <CitationCard key={chunk.id} cit={chunk.citation} index={i} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Recent documents ────────────────────────────────────────────── */}
          {recentDocs.length > 0 && (
            <section aria-label="Recent documents" style={{ marginTop: '2.5rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Recent Documents
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentDocs.map(doc => (
                  <div key={doc.id} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '0.625rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: '1.125rem' }}>{fileIcon(doc.fileType)}</span>
                    <span style={{
                      flex: 1, fontSize: '0.875rem', fontWeight: 600,
                      color: 'var(--text-primary)', minWidth: 120,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {doc.fileName}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''}
                    </span>
                    {doc.pageCount && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {doc.pageCount} pages
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700,
                      color: statusColor(doc.status), whiteSpace: 'nowrap',
                    }}>
                      {statusLabel(doc.status)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(doc.uploadedAt)}
                    </span>
                    {doc.errorMessage && (
                      <span style={{
                        fontSize: '0.75rem', color: '#f87171',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 4, padding: '1px 6px',
                      }}>
                        {doc.errorMessage.slice(0, 80)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TEXT ANALYSIS TAB  (existing functionality — unchanged logic)
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'text' && (
        <div>
          <form onSubmit={handleTextAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

            {/* File name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="fileName" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                File Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="fileName" type="text"
                placeholder="e.g. risk_management_file_v2.pdf"
                value={fileName} onChange={e => setFileName(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: '0.875rem', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>

            {/* Document text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="docText" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                Document Text <span style={{ color: 'var(--danger)', fontWeight: 700 }}>*</span>
              </label>
              <textarea
                id="docText" rows={14}
                placeholder="Paste your technical document content here…"
                value={docText} onChange={e => setDocText(e.target.value)}
                style={{
                  padding: '0.625rem 0.75rem', background: 'var(--bg-card)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: '0.875rem', color: 'var(--text-primary)',
                  resize: 'vertical', outline: 'none', lineHeight: 1.65, fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Up to 8 000 characters will be analysed.
              </div>
            </div>

            {textError && (
              <p role="alert" style={{
                color: '#f87171', fontSize: '0.875rem',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '0.625rem 0.875rem', margin: 0,
              }}>
                ⚠️ {textError}
              </p>
            )}

            <button
              type="submit" id="upload-submit-btn" disabled={loading}
              style={{
                alignSelf: 'flex-start', padding: '0.6rem 1.5rem',
                background: loading ? 'var(--bg-hover)' : 'var(--accent)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: '0.875rem', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '⏳ Analysing…' : '🔍 Analyse Document'}
            </button>
          </form>

          {/* ── Text analysis results ────────────────────────────────────────── */}
          {result && (
            <section aria-label="Analysis results" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Summary */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Summary
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65 }}>{result.summary}</p>
              </div>

              {/* Status counts */}
              {textCounts && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  {(Object.entries(STATUS_CFG) as [FindingStatus, typeof STATUS_CFG[FindingStatus]][]).map(([key, cfg]) => (
                    <div key={key} style={{ background: cfg.bg, border: cfg.border, borderRadius: 8, padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{textCounts[key]}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: cfg.color, marginTop: 4, opacity: 0.85 }}>{cfg.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Findings with review buttons */}
              {result.findings.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                      Findings ({result.findings.length})
                    </h2>
                    <button
                      onClick={exportReviewSummary}
                      style={{
                        background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                        color: 'var(--text-secondary)', fontSize: '0.8rem',
                        padding: '0.3rem 0.875rem', cursor: 'pointer',
                      }}
                    >
                      ↓ Export Review Summary
                    </button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {result.findings.map((f: CitedFinding, i: number) => {
                      const cfg      = STATUS_CFG[f.status]
                      const decision = findingDecisions[i]
                      // Build a lookup label for each evidence badge
                      const citMap   = Object.fromEntries(result.citations.map((c: AnalysisCitation) => [c.id, c]))
                      return (
                        <li key={f.id ?? i} style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 8, padding: '0.75rem 1rem',
                        }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <span style={{
                              flexShrink: 0, marginTop: 2,
                              padding: '0.15rem 0.55rem', borderRadius: 999,
                              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
                              background: cfg.bg, color: cfg.color, border: cfg.border, whiteSpace: 'nowrap',
                            }}>
                              {cfg.label}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                {f.requirement}
                                {f.confidence !== undefined && (
                                  <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                    {Math.round(f.confidence * 100)}% conf.
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{f.detail}</div>

                              {/* ── Evidence badges ─────────────────────────── */}
                              {f.evidence.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: '0.5rem' }}>
                                  {f.evidence.map((ev, ei) => {
                                    const cit = citMap[ev.citationId]
                                    const isActive = activeCitationId === ev.citationId
                                    return (
                                      <button
                                        key={ei}
                                        title={ev.relevance}
                                        onClick={() => {
                                          setActiveCitationId(isActive ? null : ev.citationId)
                                          setTimeout(() => {
                                            citationsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                                          }, 50)
                                        }}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 4,
                                          padding: '2px 8px', borderRadius: 4, cursor: 'pointer', border: 'none',
                                          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
                                          background: isActive ? 'rgba(79,142,247,0.25)' : 'rgba(79,142,247,0.1)',
                                          color: 'var(--accent)',
                                          outline: isActive ? '1px solid var(--accent)' : '1px solid rgba(79,142,247,0.25)',
                                          transition: 'background 0.15s, outline 0.15s',
                                        }}
                                      >
                                        📎 [{ev.citationId}]
                                        {cit?.section && (
                                          <span style={{ fontWeight: 400, opacity: 0.85 }}>{cit.section}</span>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Review buttons ──────────────────────────────── */}
                          <div style={{ display: 'flex', gap: 8, marginTop: '0.625rem', paddingLeft: '0.25rem' }}>
                            <button
                              onClick={() => handleFindingDecision(i, 'accepted')}
                              style={{
                                padding: '0.25rem 0.75rem', borderRadius: 6,
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                                background: decision === 'accepted' ? 'rgba(34,197,94,0.2)' : 'var(--bg-surface)',
                                color:      decision === 'accepted' ? '#4ade80' : 'var(--text-muted)',
                                outline:    decision === 'accepted' ? '1px solid #4ade80' : '1px solid var(--border)',
                              }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => handleFindingDecision(i, 'flagged')}
                              style={{
                                padding: '0.25rem 0.75rem', borderRadius: 6,
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                                background: decision === 'flagged' ? 'rgba(239,68,68,0.15)' : 'var(--bg-surface)',
                                color:      decision === 'flagged' ? '#f87171' : 'var(--text-muted)',
                                outline:    decision === 'flagged' ? '1px solid #f87171' : '1px solid var(--border)',
                              }}
                            >
                              ⚑ Flag for Review
                            </button>
                            {decision && (
                              <span style={{ fontSize: '0.72rem', color: decision === 'accepted' ? '#4ade80' : '#f87171', alignSelf: 'center' }}>
                                {decision === 'accepted' ? 'Accepted by reviewer' : 'Flagged for follow-up'}
                              </span>
                            )}
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
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    ⚠️ Risk Flags ({result.riskFlags.length})
                  </h2>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.riskFlags.map((flag: string, i: number) => (
                      <li key={i} style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8, padding: '0.625rem 0.875rem',
                        fontSize: '0.8125rem', color: '#f87171', lineHeight: 1.55,
                      }}>
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Regulatory citations ─────────────────────────────────────── */}
              {result.citations.length > 0 && (
                <div ref={citationsPanelRef}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                      📎 Regulatory Citations ({result.citations.length})
                    </h2>
                    {activeCitationId && (
                      <button
                        onClick={() => setActiveCitationId(null)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '0.75rem', color: 'var(--text-muted)',
                        }}
                      >
                        ✕ Clear highlight
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                    Click an evidence badge on any finding to highlight the source citation.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {result.citations.map((c: AnalysisCitation) => {
                      const isActive = activeCitationId === c.id
                      return (
                        <div
                          key={c.id}
                          id={`citation-${c.id}`}
                          style={{
                            background: isActive ? 'rgba(79,142,247,0.08)' : 'var(--bg-card)',
                            border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                            borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'rgba(79,142,247,0.35)'}`,
                            borderRadius: 8, padding: '0.75rem 1rem',
                            transition: 'background 0.2s, border-color 0.2s',
                          }}
                        >
                          {/* Header row */}
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                              background: isActive ? 'rgba(79,142,247,0.2)' : 'rgba(79,142,247,0.12)',
                              color: 'var(--accent)', border: '1px solid rgba(79,142,247,0.3)',
                              borderRadius: 4, padding: '1px 7px', whiteSpace: 'nowrap',
                            }}>
                              [{c.id}]
                            </span>
                            {c.regulationName && (
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {c.regulationName}
                              </span>
                            )}
                            {c.section && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }}>
                                {c.section}
                              </span>
                            )}
                          </div>
                          {/* Quote */}
                          {c.quote && (
                            <p style={{
                              margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)',
                              lineHeight: 1.6, fontStyle: 'italic',
                            }}>
                              &ldquo;{c.quote}&rdquo;
                            </p>
                          )}
                          {/* Document chunk fields (future: gap analysis against uploaded file) */}
                          {c.fileName && (
                            <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {c.fileName}
                              {c.pageNumber ? ` · Page ${c.pageNumber}` : ''}
                              {c.sheetName  ? ` · Sheet: ${c.sheetName}` : ''}
                              {c.sectionHeading ? ` · § ${c.sectionHeading}` : ''}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </section>
          )}
        </div>
      )}
    </main>
  )
}
