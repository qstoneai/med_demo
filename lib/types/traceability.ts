// ─── Dynamic Traceability Types ───────────────────────────────────────────────
// Models the network of connections between regulatory requirements, document
// chunks, and regulatory domains.  Designed for "what is connected and what
// would a change affect" — NOT for automated compliance decisions.
//
// Design principles:
//   • All AI-derived links start as 'suggested' — human review required
//   • Template-sourced links start as 'active' (they are authoritative)
//   • Status transitions always generate a ChangeEvent
//   • ImpactAnalysis is derived, never persisted — always recomputed on demand

// ── Entity taxonomy ───────────────────────────────────────────────────────────

export type TraceEntityType = 'requirement' | 'chunk' | 'domain'

export type TraceLinkKind =
  | 'req-chunk'      // a requirement is evidenced by a document chunk
  | 'req-req'        // two requirements are related / dependent
  | 'chunk-chunk'    // two chunks share a section or are semantically adjacent
  | 'domain-domain'  // a cross-domain regulatory dependency

// ── Link status lifecycle ─────────────────────────────────────────────────────
//
//  template / mapping ──► active ──► review_needed  (after a change event)
//  reuse / ai_suggestion ──► suggested ──► active (approved) or rejected

export type TraceLinkStatus =
  | 'active'          // confirmed, no action needed
  | 'suggested'       // AI-proposed, awaiting human review
  | 'review_needed'   // was active; a change event flagged it for re-verification
  | 'rejected'        // reviewed and determined not applicable

export type TraceLinkOrigin =
  | 'template'          // from related_requirements in plugin data (authoritative)
  | 'mapping'           // established by a mapping session score
  | 'reuse_suggestion'  // proposed by the reuse service
  | 'manual'            // created explicitly by a user

// ── TraceLink ─────────────────────────────────────────────────────────────────

export interface TraceLink {
  id: string
  kind: TraceLinkKind

  // Source entity
  sourceType:  TraceEntityType
  sourceId:    string
  sourceLabel: string  // human-readable — requirement title, chunk location, domain name

  // Target entity
  targetType:  TraceEntityType
  targetId:    string
  targetLabel: string

  // Provenance
  status:     TraceLinkStatus
  origin:     TraceLinkOrigin
  /** 0–1.  Derived from mapping relevanceScore or confidence assertion.  1 = certain. */
  confidence: number

  // Optional context
  documentId?: string  // document this link was established within
  sessionId?:  string  // mapping session that produced this link
  notes?:      string  // reviewer notes

  // Timestamps
  createdAt:    string
  updatedAt:    string
  reviewedAt?:  string
  reviewedBy?:  string
}

// ── ChangeEvent ───────────────────────────────────────────────────────────────

export type ChangeEventType =
  | 'created'   // a new link or entity was added
  | 'updated'   // content of an entity changed (e.g. document re-uploaded)
  | 'approved'  // a suggested / review_needed link was accepted by a reviewer
  | 'reviewed'  // a reviewer acknowledged without formally approving
  | 'rejected'  // a link was marked not applicable
  | 'deleted'   // a link was removed

export interface ChangeEvent {
  id: string
  eventType: ChangeEventType

  // What changed
  entityType:  'link' | 'document' | 'session'
  entityId:    string
  entityLabel: string

  // Who/what caused it
  actor: 'user' | 'ai' | 'system'

  // Context
  documentId?: string
  sessionId?:  string

  /**
   * Link IDs whose status transitioned to 'review_needed' as a result of
   * this event.  Empty for 'created' / 'approved' / 'reviewed' events.
   */
  rippleEffectLinkIds: string[]

  description: string
  /** Before/after values or other structured context. */
  details?: Record<string, unknown>

  timestamp: string
}

// ── ImpactAnalysis ────────────────────────────────────────────────────────────

export interface ImpactNode {
  entityType:  TraceEntityType
  entityId:    string
  entityLabel: string
  /** How severe the likely impact is if the trigger entity changes. */
  impactSeverity: 'high' | 'medium' | 'low'
  /** Why this node is affected. */
  reason:       string
  /** True if the reviewer should action this node. */
  requiresReview: boolean
  /** TraceLink IDs that create this dependency. */
  linkIds: string[]
}

export interface ImpactAnalysis {
  /** The entity whose hypothetical change triggered this analysis. */
  triggerEntityId:    string
  triggerEntityLabel: string
  triggerEntityType:  TraceEntityType

  affectedNodes: ImpactNode[]

  // Quick summary
  totalAffected:      number
  reviewNeededCount:  number
  highImpactCount:    number

  /** Suggested remediation steps, human-readable. */
  suggestedActions: string[]

  computedAt: string
}

// ── Store query shapes ────────────────────────────────────────────────────────

export interface TraceLinkQuery {
  entityId?:   string   // filter by source OR target
  kind?:       TraceLinkKind
  status?:     TraceLinkStatus
  documentId?: string
}

export interface TraceOverview {
  totalLinks:        number
  activeLinks:       number
  suggestedLinks:    number
  reviewNeededLinks: number
  rejectedLinks:     number
  recentEvents:      ChangeEvent[]
  linksByKind:       Record<TraceLinkKind, number>
}
