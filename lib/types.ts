// ─── Shared TypeScript types ──────────────────────────────────────────────────

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: string
}

export interface Citation {
  id: string
  title: string
  source: string
  section: string
  excerpt: string
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  status: 'pending' | 'analyzing' | 'complete' | 'error'
}

export interface ReviewResult {
  fileId: string
  fileName: string
  overallScore: number
  gaps: ComplianceGap[]
  recommendations: string[]
  analyzedAt: string
}

export interface ComplianceGap {
  id: string
  severity: 'critical' | 'major' | 'minor'
  regulation: string
  section: string
  description: string
  recommendation: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  user: string
  action: 'chat_query' | 'file_upload' | 'file_review' | 'export'
  document?: string
  details: string
  status: 'success' | 'failed' | 'pending'
}

export interface KpiData {
  documentsReviewed: number
  chatsToday: number
  pendingReviews: number
  auditEvents: number
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  systemContext?: string
}

export interface ChatResponse {
  content: string
  citations: Citation[]
}
