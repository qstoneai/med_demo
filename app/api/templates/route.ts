// ─── GET /api/templates ───────────────────────────────────────────────────────
// Returns requirement templates from the plugin registry.
//
// Query parameters (all optional, can be comma-separated for multi-select):
//   authority  — e.g. "FDA"  or "FDA,ISO,IEC"
//   domain     — e.g. "Risk" or "Risk,Cybersecurity"
//   priority   — e.g. "critical" or "critical,major"
//   q          — free-text search (title, description, tags, id)
//   id         — fetch a single template by requirement_id
//   grouped    — "true" → return tree grouped by authority → domain
//
// Response 200:
//   { templates: RequirementTemplate[], meta: TemplateStats & { returned: number } }
//   (or { template: RequirementTemplate } when id= is used)
//
// Response 404: { error: 'Template not found' }

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllTemplates,
  getTemplateById,
  filterTemplates,
  getTemplateStats,
  groupTemplatesByAuthorityAndDomain,
} from '@/lib/plugins/loader'
import type { Authority, Domain, Priority } from '@/lib/plugins/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // ── Single template lookup ──────────────────────────────────────────────────
  const id = searchParams.get('id')
  if (id) {
    const template = getTemplateById(id)
    if (!template) {
      return NextResponse.json({ error: `Template not found: ${id}` }, { status: 404 })
    }
    return NextResponse.json({ template })
  }

  // ── Parse filter params ─────────────────────────────────────────────────────
  const authorityParam = searchParams.get('authority')
  const domainParam    = searchParams.get('domain')
  const priorityParam  = searchParams.get('priority')
  const q              = searchParams.get('q') ?? undefined
  const grouped        = searchParams.get('grouped') === 'true'

  const authority = authorityParam
    ? (authorityParam.split(',').map((s) => s.trim()).filter(Boolean) as Authority[])
    : undefined

  const domain = domainParam
    ? (domainParam.split(',').map((s) => s.trim()).filter(Boolean) as Domain[])
    : undefined

  const priority = priorityParam
    ? (priorityParam.split(',').map((s) => s.trim()).filter(Boolean) as Priority[])
    : undefined

  // ── Filter ──────────────────────────────────────────────────────────────────
  const hasFilters = authority || domain || priority || q
  const templates  = hasFilters
    ? filterTemplates({ authority, domain, priority, q })
    : getAllTemplates()

  // ── Stats (always over the full registry, not the filtered subset) ──────────
  const stats = getTemplateStats()

  // ── Optional tree grouping ──────────────────────────────────────────────────
  if (grouped) {
    const tree = groupTemplatesByAuthorityAndDomain(templates)
    return NextResponse.json({
      grouped: tree,
      meta: { ...stats, returned: templates.length },
    })
  }

  return NextResponse.json({
    templates,
    meta: { ...stats, returned: templates.length },
  })
}
