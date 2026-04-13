// ─── Plugin Loader Service ────────────────────────────────────────────────────
// Aggregates all requirement template files into a single in-memory registry
// and exposes filter / lookup functions.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  HOW TO ADD A NEW TEMPLATE PLUGIN                                       │
// │  1. Create your template file under lib/plugins/templates/<scope>/      │
// │  2. Export a RequirementTemplate[] from that file                       │
// │  3. Import it here and add it to ALL_TEMPLATES below                    │
// │  That is the ONLY change required — no conditional logic, no switch     │
// └─────────────────────────────────────────────────────────────────────────┘

import type {
  RequirementTemplate,
  TemplateFilterOptions,
  TemplateStats,
  Authority,
  Domain,
} from './types'

// ── Template imports — add new plugins here ───────────────────────────────────
import { commonRiskTemplates }          from './templates/common/risk'
import { commonCybersecurityTemplates } from './templates/common/cybersecurity'
import { commonSwValidationTemplates }  from './templates/common/sw-validation'
import { commonUsabilityTemplates }     from './templates/common/usability'
import { fdaQsrTemplates }             from './templates/fda/qsr'
import { fda510kTemplates }            from './templates/fda/submission'
import { mdrTechnicalFileTemplates }   from './templates/mdr/technical-file'
import { mdrPmsTemplates }             from './templates/mdr/pms'
import { customTemplates }             from './templates/custom/index'

// ── Registry ──────────────────────────────────────────────────────────────────
// Flat array of all templates — order defines default sort for API responses.
const ALL_TEMPLATES: RequirementTemplate[] = [
  // Common cross-framework standards
  ...commonRiskTemplates,
  ...commonCybersecurityTemplates,
  ...commonSwValidationTemplates,
  ...commonUsabilityTemplates,
  // FDA
  ...fdaQsrTemplates,
  ...fda510kTemplates,
  // EU MDR
  ...mdrTechnicalFileTemplates,
  ...mdrPmsTemplates,
  // Custom / organisation-specific
  ...customTemplates,
]

// Verify no duplicate IDs at module load time (dev-time guard)
if (process.env.NODE_ENV !== 'production') {
  const ids = ALL_TEMPLATES.map((t) => t.requirement_id)
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length) {
    console.warn('[plugins/loader] Duplicate requirement_id(s) detected:', dupes)
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns all registered templates in registration order. */
export function getAllTemplates(): RequirementTemplate[] {
  return ALL_TEMPLATES
}

/** Looks up a single template by its unique ID. Returns undefined if not found. */
export function getTemplateById(id: string): RequirementTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.requirement_id === id)
}

/**
 * Returns templates that match ALL provided filter criteria.
 * Omit any option to skip that filter.
 *
 * @example
 * // All critical FDA requirements in the Risk domain
 * filterTemplates({ authority: 'FDA', domain: 'Risk', priority: 'critical' })
 *
 * @example
 * // Free-text search across title / description / tags
 * filterTemplates({ q: 'SBOM' })
 *
 * @example
 * // Multiple authorities for an FDA submission that also needs ISO standards
 * filterTemplates({ authority: ['FDA', 'ISO', 'IEC'] })
 */
export function filterTemplates(opts: TemplateFilterOptions): RequirementTemplate[] {
  let result = ALL_TEMPLATES

  if (opts.authority !== undefined) {
    const authorities = Array.isArray(opts.authority) ? opts.authority : [opts.authority]
    if (authorities.length > 0) {
      result = result.filter((t) => authorities.includes(t.authority))
    }
  }

  if (opts.domain !== undefined) {
    const domains = Array.isArray(opts.domain) ? opts.domain : [opts.domain]
    if (domains.length > 0) {
      result = result.filter((t) => domains.includes(t.domain))
    }
  }

  if (opts.priority !== undefined) {
    const priorities = Array.isArray(opts.priority) ? opts.priority : [opts.priority]
    if (priorities.length > 0) {
      result = result.filter((t) => priorities.includes(t.priority))
    }
  }

  if (opts.q) {
    const q = opts.q.toLowerCase().trim()
    if (q.length > 0) {
      result = result.filter(
        (t) =>
          t.requirement_id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.regulation.toLowerCase().includes(q) ||
          t.article.toLowerCase().includes(q) ||
          (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
      )
    }
  }

  return result
}

/**
 * Returns aggregate statistics about the template registry.
 * Used by the API route to populate UI filter dropdowns.
 */
export function getTemplateStats(): TemplateStats {
  const byAuthority: Record<string, number> = {}
  const byDomain: Record<string, number> = {}

  for (const t of ALL_TEMPLATES) {
    byAuthority[t.authority] = (byAuthority[t.authority] ?? 0) + 1
    byDomain[t.domain]       = (byDomain[t.domain]       ?? 0) + 1
  }

  return {
    total:       ALL_TEMPLATES.length,
    authorities: (Object.keys(byAuthority) as Authority[]).sort(),
    domains:     (Object.keys(byDomain)    as Domain[]).sort(),
    byAuthority,
    byDomain,
  }
}

/**
 * Groups templates by authority → domain for tree-view rendering in the UI.
 *
 * @example
 * // Returns: { FDA: { QMS: [...], General: [...] }, EU_MDR: { ... }, ... }
 */
export function groupTemplatesByAuthorityAndDomain(
  templates: RequirementTemplate[] = ALL_TEMPLATES,
): Record<string, Record<string, RequirementTemplate[]>> {
  const tree: Record<string, Record<string, RequirementTemplate[]>> = {}

  for (const t of templates) {
    if (!tree[t.authority]) tree[t.authority] = {}
    if (!tree[t.authority][t.domain]) tree[t.authority][t.domain] = []
    tree[t.authority][t.domain].push(t)
  }

  return tree
}
