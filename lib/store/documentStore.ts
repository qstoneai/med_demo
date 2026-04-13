// ─── In-memory document store (server-side only) ──────────────────────────────
// Persists for the lifetime of the Node.js process.
// Resets on Vercel cold start or server restart — acceptable for demo/MVP.
// TODO (Phase 2): replace with Vercel KV or Supabase for durable storage.

import type { IngestedDocument, DocumentChunk } from '@/lib/types/documents'

// Module-level maps — one instance per process
const _documents = new Map<string, IngestedDocument>()
const _chunks    = new Map<string, DocumentChunk[]>()   // documentId → chunks[]

// ── Documents ─────────────────────────────────────────────────────────────────

export function saveDocument(doc: IngestedDocument): void {
  _documents.set(doc.id, { ...doc })
}

export function updateDocument(id: string, updates: Partial<IngestedDocument>): void {
  const existing = _documents.get(id)
  if (existing) _documents.set(id, { ...existing, ...updates })
}

export function getDocument(id: string): IngestedDocument | null {
  return _documents.get(id) ?? null
}

export function listDocuments(): IngestedDocument[] {
  return [..._documents.values()].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )
}

// ── Chunks ────────────────────────────────────────────────────────────────────

export function saveChunks(documentId: string, chunks: DocumentChunk[]): void {
  _chunks.set(documentId, chunks)
}

export function getChunks(documentId: string): DocumentChunk[] {
  return _chunks.get(documentId) ?? []
}
