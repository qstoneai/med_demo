'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import TopBar from '@/components/layout/TopBar'
import type { Message, Citation } from '@/lib/types'

// ChatCitation mirrors the shape returned by /api/chat
// (source = badge label, excerpt = regulation quote)
type ChatCitation = Citation & { excerpt: string }

interface IthPredicateWithLinks {
  kNumber: string
  deviceName: string
  applicant: string
  decisionDate: string
  htmlUrl: string
  pdfUrl: string
  pdfType: string
  notes: string
}

const SUGGESTED_QUESTIONS = [
  'What are the key requirements for 510(k) submission?',
  'Explain EU MDR Annex II technical documentation.',
  'What does ISO 14971 require for risk management?',
  'How does FDA define substantial equivalence?',
]

function CitationCard({ citation, isActive }: { citation: Citation; isActive: boolean }) {
  return (
    <div
      id={`chat-cit-${citation.id}`}
      className="citation-card"
      style={isActive ? {
        borderLeft: '3px solid var(--accent)',
        background: 'rgba(79,142,247,0.07)',
        outline: '1px solid rgba(79,142,247,0.3)',
      } : undefined}
    >
      <div className="citation-source" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {citation.source}
        {isActive && (
          <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>
            active
          </span>
        )}
      </div>
      <div className="citation-title">{citation.title}</div>
      <div className="citation-section">§ {citation.section}</div>
      {citation.excerpt && (
        <div className="citation-excerpt">&ldquo;{citation.excerpt}&rdquo;</div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="chat-message">
      <div className="msg-avatar ai">AI</div>
      <div className="msg-bubble ai">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I\'m MedReg AI, your medical device regulatory assistant. I can help you navigate FDA 21 CFR, EU MDR 2017/745, ISO 13485, ISO 14971, and more.\n\nWhat regulatory question can I help you with today?',
      citations: [],
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [allCitations, setAllCitations] = useState<Citation[]>([])
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null)
  const [predicates, setPredicates] = useState<IthPredicateWithLinks[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const citationsPanelRef = useRef<HTMLDivElement>(null)

  // Fetch predicate links once on mount
  useEffect(() => {
    fetch('/api/predicates')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.predicates)) setPredicates(data.predicates)
      })
      .catch(() => {/* non-critical — silently ignore */})
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, loading, scrollToBottom])

  // Scroll to and highlight the active citation in the sidebar
  useEffect(() => {
    if (!activeCitationId) return
    const el = document.getElementById(`chat-cit-${activeCitationId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeCitationId])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setActiveCitationId(null)

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.content ?? 'I encountered an error. Please try again.',
        citations: data.citations ?? [],
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiMsg])
      if (data.citations?.length) {
        setAllCitations((prev) => [...data.citations, ...prev].slice(0, 20))
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: '⚠️ Connection error. Please check your API key and try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      <TopBar
        title="Regulatory Chat"
        subtitle="Ask questions about medical device regulations"
        actions={
          <button
            id="clear-chat-btn"
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={() => {
              setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: 'Chat cleared. How can I help you with medical device regulations?',
                citations: [],
                timestamp: new Date().toISOString(),
              }])
              setAllCitations([])
              setActiveCitationId(null)
            }}
          >
            Clear Chat
          </button>
        }
      />
      <main className="page-body" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden', padding: 20 }}>
        <div className="chat-layout">
          {/* Chat window */}
          <div className="chat-window">
            <div className="chat-messages" id="chat-messages-container">
              {/* Suggested questions if only welcome message */}
              {messages.length === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>
                    Suggested questions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        className="btn btn-secondary"
                        style={{ fontSize: 11.5, padding: '6px 12px' }}
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className={`msg-avatar ${msg.role === 'assistant' ? 'ai' : 'user'}`}>
                    {msg.role === 'assistant' ? 'AI' : 'SK'}
                  </div>
                  <div>
                    <div className={`msg-bubble ${msg.role === 'assistant' ? 'ai' : 'user'}`}>
                      {msg.content.split('\n').map((line, i) => (
                        <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
                      ))}
                    </div>
                    <div className="msg-time" style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                      {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                    {msg.citations && msg.citations.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {msg.citations.map((c) => {
                          const isActive = activeCitationId === c.id
                          return (
                            <button
                              key={c.id}
                              title={`${c.title}\n§ ${c.section}\n\n${c.excerpt}`}
                              onClick={() => {
                                setActiveCitationId(isActive ? null : c.id)
                                // Ensure sidebar panel is visible
                                citationsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '2px 8px', borderRadius: 4,
                                fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                                border: isActive ? '1px solid var(--accent)' : '1px solid rgba(79,142,247,0.25)',
                                background: isActive ? 'rgba(79,142,247,0.22)' : 'rgba(79,142,247,0.1)',
                                color: 'var(--accent)',
                                transition: 'background 0.15s, border-color 0.15s',
                              }}
                            >
                              📎 {c.source}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <div className="chat-input-row">
                <textarea
                  ref={textareaRef}
                  id="chat-input"
                  className="chat-textarea"
                  placeholder="Ask about FDA regulations, EU MDR, ISO standards…  (Enter to send, Shift+Enter for newline)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={loading}
                />
                <button
                  id="chat-send-btn"
                  className="btn btn-primary"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  style={{ height: 44, paddingInline: 18, flexShrink: 0 }}
                >
                  {loading ? '⏳' : '➤'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Powered by GPT-4o-mini · Citations pulled from FDA, EU MDR, ISO standards
              </div>
            </div>
          </div>

          {/* Right sidebar: citations + predicate links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>

            {/* Citations panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} ref={citationsPanelRef}>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📎 Citations {allCitations.length > 0 ? `(${allCitations.length})` : ''}</span>
                {activeCitationId && (
                  <button
                    onClick={() => setActiveCitationId(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}
                  >
                    ✕ clear
                  </button>
                )}
              </div>
              <div className="citations-panel">
                {allCitations.length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <div className="empty-state-icon">📎</div>
                    <div className="empty-state-text">Click a citation badge on any AI reply to see the source here</div>
                  </div>
                ) : (
                  allCitations.map((c) => (
                    <CitationCard key={c.id} citation={c} isActive={activeCitationId === c.id} />
                  ))
                )}
              </div>
              {allCitations.length > 0 && (
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Click a <strong style={{ color: 'var(--accent)' }}>📎 badge</strong> on any reply to highlight the source citation.
                </div>
              )}
            </div>

            {/* Related FDA Predicate Links */}
            {predicates.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="card-title">🔎 Related FDA Predicate Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 320 }}>
                  {predicates.map((p) => (
                    <div
                      key={p.kNumber}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {/* Device name + K-number */}
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                        {p.deviceName}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {p.kNumber}
                        {p.decisionDate ? ` · Cleared ${p.decisionDate}` : ''}
                        {p.applicant ? ` · ${p.applicant}` : ''}
                      </div>

                      {/* Links */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {p.htmlUrl && (
                          <a
                            href={p.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11,
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            🌐 FDA Page
                          </a>
                        )}
                        {p.pdfUrl && (
                          <a
                            href={p.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11,
                              color: 'var(--accent)',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            📄 PDF
                          </a>
                        )}
                      </div>

                      {/* Analyst note */}
                      {p.notes && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 10.5, lineHeight: 1.4, marginTop: 2 }}>
                          {p.notes}
                        </div>
                      )}
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
