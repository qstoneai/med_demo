// ─── History Service ──────────────────────────────────────────────────────────
// recordHistory() is the single entry point for writing audit entries.
// All other modules import this function — nothing writes directly to the store.
//
// This module intentionally has NO external side-effects and NO async I/O:
// recording is synchronous and never blocks the response path.

import { randomUUID } from 'crypto'
import type { HistoryEntry, HistoryActor, HistoryAction, HistoryTargetType } from '@/lib/types/history'
import { appendHistoryEntry, queryHistory, getHistoryForEntity, countEntries } from '@/lib/store/historyStore'

// ── Record ────────────────────────────────────────────────────────────────────

/** Minimal shape required to record an entry. */
export type RecordHistoryInput = Omit<HistoryEntry, 'id' | 'timestamp'>

/**
 * Appends a history entry to the audit log.
 * Never throws — silently ignores errors to avoid disrupting the caller.
 * Returns the completed HistoryEntry.
 */
export function recordHistory(input: RecordHistoryInput): HistoryEntry {
  try {
    const entry: HistoryEntry = {
      id:        randomUUID(),
      timestamp: new Date().toISOString(),
      ...input,
    }
    appendHistoryEntry(entry)
    return entry
  } catch {
    // History recording must never crash the calling operation
    return {
      id:            'error',
      timestamp:     new Date().toISOString(),
      actor:         input.actor,
      action:        input.action,
      targetType:    input.targetType,
      targetId:      input.targetId,
      targetLabel:   input.targetLabel,
      changeSummary: input.changeSummary,
    }
  }
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export { queryHistory, getHistoryForEntity, countEntries }

// ── Typed convenience recorders ───────────────────────────────────────────────
// These wrap recordHistory() with domain-specific defaults so call sites
// stay concise and consistent.

import {
  ACTOR_AI,
  ACTOR_USER,
  ACTOR_SYSTEM,
} from '@/lib/types/history'

export function recordDocumentUploaded(opts: {
  documentId:   string
  documentName: string
  fileType:     string
  chunkCount:   number
  pageCount?:   number
}) {
  return recordHistory({
    actor:         ACTOR_SYSTEM,
    action:        'uploaded',
    targetType:    'document',
    targetId:      opts.documentId,
    targetLabel:   opts.documentName,
    changeSummary: `Document "${opts.documentName}" ingested — ${opts.chunkCount} chunks extracted${opts.pageCount ? ` across ${opts.pageCount} pages` : ''}.`,
    context: {
      documentId: opts.documentId,
      method:     opts.fileType,
      itemCount:  opts.chunkCount,
    },
    tags: ['ingest', opts.fileType],
  })
}

export function recordMappingRun(opts: {
  sessionId:      string
  documentId:     string
  documentName:   string
  requirementCount: number
  method:         string
}) {
  return recordHistory({
    actor:         ACTOR_AI,
    action:        'mapping_run',
    targetType:    'mapping_session',
    targetId:      opts.sessionId,
    targetLabel:   opts.documentName,
    changeSummary: `Semantic mapping completed: ${opts.requirementCount} requirement(s) mapped against "${opts.documentName}" using ${opts.method} scoring.`,
    context: {
      documentId: opts.documentId,
      sessionId:  opts.sessionId,
      method:     opts.method,
      itemCount:  opts.requirementCount,
    },
    tags: ['mapping', opts.method],
  })
}

export function recordGapAnalysisRun(opts: {
  reportId:       string
  sessionId:      string
  documentId:     string
  documentName:   string
  sufficient:     number
  partial:        number
  missing:        number
  readinessScore: number
}) {
  const { sufficient, partial, missing, readinessScore } = opts
  return recordHistory({
    actor:         ACTOR_AI,
    action:        'gap_analysis_run',
    targetType:    'gap_report',
    targetId:      opts.reportId,
    targetLabel:   opts.documentName,
    changeSummary: `Gap analysis: ${sufficient} sufficient · ${partial} partial · ${missing} missing. Overall readiness: ${readinessScore}%.`,
    context: {
      documentId: opts.documentId,
      sessionId:  opts.sessionId,
      reportId:   opts.reportId,
      score:      readinessScore,
      itemCount:  sufficient + partial + missing,
    },
    tags: ['gap-analysis'],
    diff: {
      after: { sufficient, partial, missing, readinessScore },
    },
  })
}

export function recordReuseAnalysisRun(opts: {
  reportId:       string
  sessionId:      string
  documentId:     string
  documentName:   string
  candidateCount: number
  groupCount:     number
}) {
  return recordHistory({
    actor:         ACTOR_AI,
    action:        'reuse_analysis_run',
    targetType:    'reuse_report',
    targetId:      opts.reportId,
    targetLabel:   opts.documentName,
    changeSummary: `Reuse analysis: ${opts.candidateCount} cross-domain candidates found across ${opts.groupCount} requirement(s).`,
    context: {
      documentId: opts.documentId,
      sessionId:  opts.sessionId,
      reportId:   opts.reportId,
      itemCount:  opts.candidateCount,
    },
    tags: ['reuse', 'cross-domain'],
  })
}

export function recordTraceLinkSeeded(count: number) {
  return recordHistory({
    actor:         ACTOR_SYSTEM,
    action:        'link_seeded',
    targetType:    'system',
    targetId:      'template-seed',
    targetLabel:   'Template registry',
    changeSummary: `${count} requirement-to-requirement trace link(s) seeded from regulatory template graph.`,
    context: { itemCount: count },
    tags:    ['traceability', 'template'],
  })
}

export function recordTraceLinkSynced(opts: {
  sessionId:    string
  documentName: string
  reqChunk:     number
  reqReq:       number
}) {
  return recordHistory({
    actor:         ACTOR_AI,
    action:        'created',
    targetType:    'mapping_session',
    targetId:      opts.sessionId,
    targetLabel:   opts.documentName,
    changeSummary: `Trace links synced from mapping session: ${opts.reqChunk} evidence link(s) and ${opts.reqReq} requirement link(s) created.`,
    context: { sessionId: opts.sessionId, itemCount: opts.reqChunk + opts.reqReq },
    tags:    ['traceability', 'sync'],
  })
}

export function recordLinkReviewed(opts: {
  linkId:     string
  linkLabel:  string
  review:     'approve' | 'reject' | 'reviewed'
  reviewedBy: string
  notes?:     string
}) {
  const actionMap: Record<string, HistoryAction> = {
    approve:  'approved',
    reject:   'rejected',
    reviewed: 'reviewed',
  }
  const summaryMap: Record<string, string> = {
    approve:  `Link approved by ${opts.reviewedBy} — marked as active.`,
    reject:   `Link rejected by ${opts.reviewedBy} — marked as not applicable.`,
    reviewed: `Link acknowledged by ${opts.reviewedBy} without formal approval.`,
  }
  return recordHistory({
    actor:         ACTOR_USER,
    action:        actionMap[opts.review] as HistoryAction,
    targetType:    'trace_link',
    targetId:      opts.linkId,
    targetLabel:   opts.linkLabel,
    changeSummary: summaryMap[opts.review],
    context:       { linkId: opts.linkId },
    tags:          ['traceability', 'review'],
    diff:          opts.notes ? { after: { notes: opts.notes } } : undefined,
  })
}
