import { NextRequest, NextResponse } from 'next/server'
import { addAuditEntry } from '@/lib/audit'
import {
  getFdaClassification,
  getPowerTractionRegulation,
  getIthPredicates,
  getIthPredicatesWithLinks,
  getPowerTractionRegulationChunks,
} from '@/lib/regulatory-data'

// ── Regulatory source data (loaded once at module init) ────────────────────────
const _classification       = getFdaClassification()[0]
const _regulation           = getPowerTractionRegulation()[0]
const _predicates           = getIthPredicates()
const _predicatesWithLinks  = getIthPredicatesWithLinks()
const _chunks               = getPowerTractionRegulationChunks()

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Citation {
  id: string
  title: string
  source: string
  section: string
  excerpt: string
}

// ── Demo responses (no API key needed) ───────────────────────────────────────
function getDemoResponse(query: string): { content: string; citations: Citation[] } {
  const q = query.toLowerCase()

  if (q.includes('510') || q.includes('premarket notification')) {
    const predicateRows = _predicates
      .map((p) => `| [${p.kNumber}](${p.sourceUrl}) | ${p.deviceName} | ${p.applicant} | ${p.decisionDate} | ${p.thirdPartyReviewed ? 'Yes' : 'No'} |`)
      .join('\n')

    return {
      content: `A **510(k) Premarket Notification** must demonstrate that your device is **substantially equivalent** to a legally marketed predicate device (21 CFR §807.87).

**Key submission elements:**

1. **Device Description** — Intended use, technological characteristics, labeling
2. **Substantial Equivalence Comparison** — Same intended use + same/different technology as predicate
3. **Performance Testing** — Bench, animal, and/or clinical data as appropriate
4. **Biocompatibility** — ISO 10993 evaluation if the device contacts patients
5. **Software Documentation** — If device contains software, follow FDA Software Guidance

The FDA review clock is typically **90 days**. eStar (electronic) submissions are now preferred.

⚠️ If your device has no predicate or raises novel safety questions, a **PMA** may be required instead.

---
**📋 Demo Device — FDA Classification #${_classification.classificationId}**

| Field | Value |
|---|---|
| Device | ${_classification.deviceName} |
| Product Code | ${_classification.productCode} |
| Class | ${_classification.deviceClass} |
| Submission | ${_classification.submissionType} |
| Regulation | ${_classification.regulationNumber} |
| Specialty | ${_classification.medicalSpecialty} |
| Third-Party Review | ${_classification.thirdPartyReviewEligible ? 'Eligible' : 'Not eligible'} |
| GMP Exempt | ${_classification.gmpExempt ? 'Yes' : 'No'} |
| Last Updated | ${_classification.pageLastUpdated} |

**📖 ${_regulation.regulationNumber} — ${_regulation.title}**

*Identification:* ${_regulation.identification}

*Classification:* ${_regulation.classification} — [View eCFR ↗](${_regulation.sourceUrl})

**🔎 Known ITH Predicate Devices (${_predicates.length})**

| K-Number | Device | Applicant | Decision Date | 3rd Party |
|---|---|---|---|---|
${predicateRows}`,
      citations: [
        { id: 'c1', source: '[REG-001]', title: 'Premarket Notification Requirements', section: '21 CFR 807.87', excerpt: 'Each 510(k) shall contain information required to demonstrate substantial equivalence to a legally marketed device.' },
        { id: 'c2', source: '[REG-002]', title: 'Classification of Medical Devices', section: '21 CFR 862-892', excerpt: 'Class II devices generally require a 510(k) unless specifically exempted by regulation.' },
        { id: 'c3', source: '[REG-003]', title: 'Substantial Equivalence Decision-Making Process', section: 'FDA Guidance 2014', excerpt: 'A device is substantially equivalent if it has the same intended use and the same technological characteristics as the predicate.' },
        { id: 'c4', source: '[REG-012]', title: _regulation.title, section: _regulation.regulationNumber, excerpt: _regulation.identification },
      ],
    }
  }

  if (q.includes('ith') || q.includes('traction') || q.includes('890.5900') || q.includes('powered traction')) {
    const predicateRows = _predicates
      .map((p) => `| [${p.kNumber}](${p.sourceUrl}) | ${p.deviceName} | ${p.applicant} | ${p.decisionDate} |`)
      .join('\n')

    const chunkBlock = _chunks
      .filter((c) => c.sourceType === 'regulation')
      .map((c) => `**${c.section}** — ${c.text}`)
      .join('\n\n')

    return {
      content: `**FDA Product Code ITH** covers *${_classification.deviceName}* under **${_classification.regulationNumber}**.

**Regulatory Profile**

| Field | Value |
|---|---|
| Classification ID | ${_classification.classificationId} |
| Device Class | ${_classification.deviceClass} |
| Submission Type | ${_classification.submissionType} |
| Specialty | ${_classification.medicalSpecialty} |
| Review Office | ${_classification.premarketReview} |
| GMP Exempt | ${_classification.gmpExempt ? 'Yes' : 'No'} |
| Implanted | ${_classification.implantedDevice ? 'Yes' : 'No'} |
| Life Support | ${_classification.lifeSupportDevice ? 'Yes' : 'No'} |
| 3rd-Party Review | ${_classification.thirdPartyReviewEligible ? 'Eligible' : 'Not eligible'} |
| Summary MR Eligible | ${_classification.summaryMalfunctionReportingEligible ? 'Yes' : 'No'} |

**📖 ${_regulation.regulationNumber} — ${_regulation.title}**

${chunkBlock}

*Source last updated: ${_chunks[0]?.lastUpdated ?? 'unknown'} — [View eCFR ↗](${_regulation.sourceUrl})*

**🔎 Known Predicate Devices (${_predicates.length}, newest first)**

| K-Number | Device | Applicant | Decision Date |
|---|---|---|---|
${predicateRows}

[View FDA classification ↗](${_classification.sourceUrl})`,
      citations: [
        { id: 'c1', source: '[REG-012]', title: _regulation.title, section: _regulation.regulationNumber, excerpt: _regulation.identification },
        { id: 'c2', source: '[REG-001]', title: 'Premarket Notification Requirements', section: '21 CFR 807.87', excerpt: 'Each 510(k) shall contain information required to demonstrate substantial equivalence to a legally marketed device.' },
      ],
    }
  }

  if (q.includes('eu mdr') || q.includes('annex ii') || q.includes('mdr 2017')) {
    return {
      content: `**EU MDR 2017/745** requires comprehensive **Technical Documentation** before CE marking. Annex II defines the required content.

**Annex II Technical File Structure:**

1. **Device Description & Specification** (§1) — Intended purpose, variants, UDI, accessories
2. **Design & Manufacturing Information** (§2) — Complete design history, manufacturing sites, processes
3. **General Safety & Performance Requirements** (§3) — Evidence of conformity with Annex I (GSPR)
4. **Benefit-Risk Analysis & Risk Management** (§4) — Per ISO 14971:2019
5. **Product Verification & Validation** (§6) — Pre-clinical and clinical data summary
6. **Post-Market Surveillance** (§6.7) — PMS plan, PMCF plan, SSCP (Class IIb/III)

🔑 **Key change from MDD**: MDR requires significantly more clinical evidence and ongoing post-market clinical follow-up (PMCF). Equivalence claims are much harder to substantiate.`,
      citations: [
        { id: 'c1', source: '[REG-004]', title: 'EU MDR Technical Documentation', section: 'Annex II, §1', excerpt: 'The technical documentation shall be drawn up in such a way that allows the conformity assessment to be carried out.' },
        { id: 'c2', source: '[REG-005]', title: 'General Safety and Performance Requirements', section: 'Annex I', excerpt: 'Devices shall achieve the performance intended by their manufacturer and shall be designed and manufactured such that they do not compromise clinical condition or safety.' },
        { id: 'c3', source: '[REG-006]', title: 'Clinical Evaluation', section: 'Article 61 / Annex XIV', excerpt: 'Manufacturers shall plan, conduct, assess, report and update clinical evaluation in accordance with this Annex.' },
      ],
    }
  }

  if (q.includes('iso 14971') || q.includes('risk management')) {
    return {
      content: `**ISO 14971:2019** specifies a risk management process for medical devices across the full product lifecycle.

**Process Steps:**

1. **Risk Management Planning** *(Clause 4)* — Scope, responsibilities, risk acceptability criteria (ALARP)
2. **Risk Analysis** *(Clause 5)* — Identify hazards and estimate probability × severity for each hazardous situation
3. **Risk Evaluation** *(Clause 6)* — Compare to acceptability criteria; decide if control is needed
4. **Risk Control** *(Clause 7)* — Apply hierarchy: inherent safety → protective measures → information for safety
5. **Residual Risk Evaluation** *(Clause 8)* — Evaluate remaining risk; overall benefit-risk determination
6. **Review of Risk Management** *(Clause 9)* — Confirm plan was applied; all risks addressed
7. **Production/Post-Production** *(Clause 10)* — Monitor field experience; update Risk Management File

**Required Documents:**
- Risk Management Plan
- Risk Analysis records (FMEA, FTA, HAZOP, etc.)
- Risk Management Report`,
      citations: [
        { id: 'c1', source: '[REG-007]', title: 'ISO 14971 Risk Management', section: 'Clause 4.1', excerpt: 'The manufacturer shall establish, document, implement, and maintain an ongoing process for identifying hazards associated with a medical device.' },
        { id: 'c2', source: '[REG-008]', title: 'Risk Control Options', section: 'Clause 7.1', excerpt: 'The manufacturer shall use one or more of the following options in the priority order listed: a) inherent safety by design; b) protective measures; c) information for safety.' },
        { id: 'c3', source: '[REG-009]', title: 'Overall Residual Risk Evaluation', section: 'Clause 8', excerpt: 'The manufacturer shall evaluate the overall residual risk using the criteria established in the risk management plan.' },
      ],
    }
  }

  if (q.includes('iso 13485') || q.includes('quality management') || q.includes('qms')) {
    return {
      content: `**ISO 13485:2016** specifies requirements for a Quality Management System (QMS) for organizations in the medical device supply chain.

**Key Clauses:**

- **4. Quality Management System** — QMS scope, documentation hierarchy (Quality Manual → SOPs → Work Instructions → Records)
- **5. Management Responsibility** — Management review, quality policy, planning
- **6. Resource Management** — Human resources, infrastructure, work environment
- **7. Product Realization** — Design controls (7.3), purchasing (7.4), production controls (7.5), measurement devices (7.6)
- **8. Measurement, Analysis, Improvement** — Internal audits, CAPA (8.5), complaint handling (8.2.1)

**Design Controls (§7.3) Key Requirements:**
- Design planning → inputs → outputs → review → verification → validation → transfer → changes

Almost identical structure to FDA 21 CFR Part 820 — companies certified to ISO 13485 are well-positioned for FDA QSR compliance.`,
      citations: [
        { id: 'c1', source: '[REG-010]', title: 'ISO 13485 Scope', section: 'Clause 1', excerpt: 'This International Standard specifies requirements for a QMS where an organization needs to demonstrate its ability to provide medical devices that consistently meet applicable regulatory requirements.' },
        { id: 'c2', source: '[REG-011]', title: 'Design and Development', section: 'Clause 7.3', excerpt: 'The organization shall document procedures for design and development. The organization shall plan and control the design and development of product.' },
      ],
    }
  }

  // Generic fallback
  const predicateRows = _predicates
    .slice(0, 3)
    .map((p) => `| [${p.kNumber}](${p.sourceUrl}) | ${p.deviceName} | ${p.decisionDate} |`)
    .join('\n')

  return {
    content: `Thank you for your question about **"${query.slice(0, 80)}${query.length > 80 ? '…' : ''}"**.

> ℹ️ **Demo Mode** — No API key configured. Add \`OPENAI_API_KEY\` to \`.env.local\` for live GPT responses.

**I can assist with these regulatory topics:**

| Topic | Regulations |
|---|---|
| US Premarket | FDA 21 CFR 807 (510k), 814 (PMA) |
| US Quality | FDA 21 CFR 820 (QSR) |
| EU Devices | MDR 2017/745, IVDR 2017/746 |
| Quality Systems | ISO 13485:2016 |
| Risk Management | ISO 14971:2019 |
| Software | IEC 62304, IEC 62366 |
| Clinical | MEDDEV 2.7/1 Rev 4, ISO 14155 |

Try asking about: *510(k) requirements*, *EU MDR Annex II*, *ISO 14971 risk management*, *ISO 13485 design controls*, or *ITH traction device*.

---
**📋 Loaded Regulatory Source Data**

**FDA Classification #${_classification.classificationId} — ${_classification.deviceName}**

| Field | Value |
|---|---|
| Product Code | ${_classification.productCode} |
| Class | ${_classification.deviceClass} (${_classification.submissionType}) |
| Regulation | ${_classification.regulationNumber} |
| Specialty | ${_classification.medicalSpecialty} |
| Implanted | ${_classification.implantedDevice ? 'Yes' : 'No'} |
| Life Support | ${_classification.lifeSupportDevice ? 'Yes' : 'No'} |

[View FDA record ↗](${_classification.sourceUrl})

**${_regulation.regulationNumber} — ${_regulation.title}**

${_chunks.filter((c) => c.sourceType === 'regulation').map((c) => `*${c.section}:* ${c.text}`).join('  \n')}

[View eCFR ↗](${_regulation.sourceUrl})

**Recent ITH Predicates (top 3 of ${_predicates.length})**

| K-Number | Device | Decision Date |
|---|---|---|
${predicateRows}`,
    citations: [],
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages }: { messages: ApiMessage[] } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''

    let result: { content: string; citations: Citation[] }

    if (!process.env.OPENAI_API_KEY) {
      // Demo mode
      result = getDemoResponse(lastUserMsg)
    } else {
      // Live GPT — import dynamically to avoid issues in demo mode
      const { chat } = await import('@/lib/anthropic')
      result = await chat(messages)
    }

    // Audit log
    addAuditEntry({
      user: 'Dr. Sarah Kim',
      action: 'chat_query',
      details: `Query: ${lastUserMsg.slice(0, 120)}${lastUserMsg.length > 120 ? '…' : ''}`,
      status: 'success',
    })

    return NextResponse.json({ ...result, relatedPredicates: _predicatesWithLinks })
  } catch (error) {
    console.error('[/api/chat] error:', error)
    return NextResponse.json(
      { content: '⚠️ An error occurred processing your request. Please try again.', citations: [], relatedPredicates: [] },
      { status: 500 }
    )
  }
}
