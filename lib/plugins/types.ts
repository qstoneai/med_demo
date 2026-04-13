// ─── Plugin System: Requirement Template Types ────────────────────────────────
// Defines the schema for all regulatory requirement templates.
// All templates MUST conform to RequirementTemplate.
//
// Design principle: templates are pure data — no business logic.
// The loader (loader.ts) owns filtering; the API route owns HTTP transport.

// ── Taxonomies ────────────────────────────────────────────────────────────────

/**
 * The regulatory body or standards organisation that issued the requirement.
 * Used for filtering and UI grouping.
 */
export type Authority =
  | 'FDA'      // US Food and Drug Administration
  | 'EU_MDR'   // EU Medical Device Regulation 2017/745
  | 'EU_IVDR'  // EU In Vitro Diagnostic Regulation 2017/746
  | 'ISO'      // International Organization for Standardization
  | 'IEC'      // International Electrotechnical Commission
  | 'KFDA'     // Korean Ministry of Food and Drug Safety
  | 'Custom'   // Organisation-specific custom requirements

/**
 * Regulatory / engineering domain the requirement belongs to.
 * A single requirement may cover multiple domains in practice, but
 * we assign the *primary* domain for filtering.
 */
export type Domain =
  | 'Risk'           // ISO 14971 risk management
  | 'Cybersecurity'  // FDA cybersecurity guidance, IEC 81001-5-1
  | 'SWValidation'   // IEC 62304 software lifecycle
  | 'Usability'      // IEC 62366 usability engineering
  | 'Clinical'       // Clinical evaluation, PMCF
  | 'QMS'            // Quality management system
  | 'Labeling'       // Labelling and IFU
  | 'PMS'            // Post-market surveillance
  | 'General'        // Cross-cutting (device description, classification, etc.)

/**
 * Submission / review priority of this requirement.
 * Drives visual severity indicators in the UI.
 */
export type Priority = 'critical' | 'major' | 'minor' | 'informational'

// ── Core template schema ──────────────────────────────────────────────────────

/**
 * A single regulatory requirement template.
 *
 * Each template represents one auditable requirement — a leaf node in the
 * regulatory tree.  The `expected_evidence` list is what the AI gap analyser
 * will look for in an uploaded document.
 */
export interface RequirementTemplate {
  /** Stable, unique ID.  Naming convention: {SCOPE}-{DOMAIN}-{NNN}
   *  Examples: "COMMON-RISK-001", "FDA-QSR-001", "MDR-TECH-003"
   */
  requirement_id: string

  /** Issuing body — used for authority-based filtering. */
  authority: Authority

  /** Full name of the regulation or standard.
   *  E.g. "ISO 14971:2019", "EU MDR 2017/745", "FDA 21 CFR Part 820"
   */
  regulation: string

  /** Specific article, clause, annex, or section within the regulation.
   *  E.g. "Clause 4", "Annex II §1", "§820.30"
   */
  article: string

  /** Primary regulatory domain. */
  domain: Domain

  /** Short human-readable title for lists and headings. */
  title: string

  /**
   * Full description of what the requirement mandates.
   * Should be written in auditor-facing language — what must exist.
   */
  description: string

  /**
   * Specific artifacts, documents, or records that constitute compliance
   * evidence for this requirement.  The AI gap analyser checks for these.
   */
  expected_evidence: string[]

  /**
   * IDs of requirements that are closely related, dependent, or complementary.
   * Allows the UI to navigate between related requirements.
   */
  related_requirements: string[]

  /** Submission / review priority. */
  priority: Priority

  /** Optional free-form tags for search. */
  tags?: string[]
}

// ── Loader / API types ────────────────────────────────────────────────────────

/** Options accepted by filterTemplates(). All fields are optional. */
export interface TemplateFilterOptions {
  /** Filter by one or more authorities. */
  authority?: Authority | Authority[]
  /** Filter by one or more domains. */
  domain?: Domain | Domain[]
  /** Filter by one or more priority levels. */
  priority?: Priority | Priority[]
  /**
   * Full-text search across title, description, tags, and requirement_id.
   * Case-insensitive.
   */
  q?: string
}

/** Summary statistics returned by getTemplateStats(). */
export interface TemplateStats {
  total: number
  authorities: Authority[]
  domains: Domain[]
  byAuthority: Record<string, number>
  byDomain: Record<string, number>
}
