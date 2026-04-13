// ─── History / Audit Log Types ────────────────────────────────────────────────
// Universal change-tracking types covering all entity types in the system.
//
// Design for enterprise extensibility:
//   • HistoryActor is a struct — supports future auth/RBAC integration
//     (replace placeholder ids with real user/session tokens)
//   • HistoryEntry.metadata is open — store any structured context
//   • HistoryEntry.diff supports before/after state snapshots
//   • tags array enables future faceted search / compliance tagging
//   • The store index design allows per-entity, per-actor, and full-log queries
//     without a database today — swap historyStore for a DB-backed version later

// ── Actor ─────────────────────────────────────────────────────────────────────

export interface HistoryActor {
  /** 'user' = human reviewer; 'ai' = model or automated engine; 'system' = infrastructure */
  type: 'user' | 'ai' | 'system'
  /** Stable ID.  Currently a placeholder; replace with real userId from auth provider. */
  id:   string
  /** Human-readable display name for UI rendering. */
  name: string
  // Future: role, orgId, sessionId, ipAddress
}

// Placeholder actors — replace with real auth once available
export const ACTOR_USER: HistoryActor    = { type: 'user',   id: 'user-001',   name: 'Dr. Sarah Kim'   }
export const ACTOR_AI: HistoryActor      = { type: 'ai',     id: 'ai-engine',  name: 'AI Engine'       }
export const ACTOR_SYSTEM: HistoryActor  = { type: 'system', id: 'system',     name: 'System'          }

// ── Action vocabulary ─────────────────────────────────────────────────────────

export type HistoryAction =
  // Generic CRUD
  | 'created'
  | 'updated'
  | 'deleted'
  // Review lifecycle
  | 'reviewed'
  | 'approved'
  | 'rejected'
  // Domain-specific operations
  | 'uploaded'          // document file uploaded + ingested
  | 'mapping_run'       // semantic mapping session executed
  | 'gap_analysis_run'  // gap report generated
  | 'reuse_analysis_run' // reuse report generated
  | 'link_seeded'       // trace links created from template graph
  | 'link_reviewed'     // a trace link was approved/rejected/reviewed
  | 'change_propagated' // a change flagged downstream links for review
  | 'exported'          // user exported a report or log

// ── Target taxonomy ───────────────────────────────────────────────────────────

export type HistoryTargetType =
  | 'document'         // IngestedDocument
  | 'mapping_session'  // MappingSession
  | 'gap_report'       // GapReport
  | 'reuse_report'     // ReuseReport
  | 'trace_link'       // TraceLink
  | 'requirement'      // RequirementTemplate (read-only; tracked for completeness)
  | 'system'           // System-level operations (seed, config change)

// ── Core entry ────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  /** Unique, stable identifier. */
  id: string

  // ── Required fields (per spec) ─────────────────────────────────────────────
  actor:         HistoryActor
  action:        HistoryAction
  timestamp:     string           // ISO 8601
  targetType:    HistoryTargetType
  targetId:      string           // ID of the entity that changed
  changeSummary: string           // 1–2 human-readable sentences describing what changed

  // ── Display helpers ───────────────────────────────────────────────────────
  /** Human-readable label for the target (document filename, session name, etc.) */
  targetLabel: string

  // ── Optional context ──────────────────────────────────────────────────────
  context?: {
    documentId?: string
    sessionId?:  string
    reportId?:   string
    linkId?:     string
    /** e.g. 'hybrid', 'keyword' for mapping; gap status for gap reports */
    method?:     string
    score?:      number
    status?:     string
    itemCount?:  number
  }

  // ── Enterprise extensibility ──────────────────────────────────────────────
  /** Arbitrary structured data for future integrations (SIEM, LIMS, etc.). */
  metadata?: Record<string, unknown>
  /** Free-form tags for compliance categorisation (e.g. 'ISO 14971', 'MDR', 'CAPA'). */
  tags?: string[]

  // ── Change tracking ───────────────────────────────────────────────────────
  /** State before the change — populated when meaningful (e.g. status transitions). */
  diff?: {
    before?: Record<string, unknown>
    after?:  Record<string, unknown>
  }
}

// ── Query / API shapes ────────────────────────────────────────────────────────

export interface HistoryQuery {
  targetId?:   string
  targetType?: HistoryTargetType
  actorId?:    string
  action?:     HistoryAction
  since?:      string   // ISO 8601 — filter entries after this timestamp
  limit?:      number
  offset?:     number
}

export interface HistoryListResponse {
  entries: HistoryEntry[]
  total:   number
  hasMore: boolean
}
