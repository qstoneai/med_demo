import { NextRequest, NextResponse } from 'next/server'
import type { AnalysisResponse, CitedFinding, AnalysisCitation } from '@/lib/types/analysis'

// ── Demo response ─────────────────────────────────────────────────────────────
function getDemoAnalysis(fileName: string): AnalysisResponse {
  // All citation objects — findings reference these by id
  const citations: AnalysisCitation[] = [
    {
      id: 'c1',
      regulationName: 'EU MDR 2017/745',
      section: 'Annex II, §1',
      quote:
        'The technical documentation shall be drawn up in such a way that allows the conformity ' +
        'assessment of the device with the requirements of this Regulation to be carried out.',
    },
    {
      id: 'c2',
      regulationName: 'EU MDR 2017/745',
      section: 'Annex I (GSPR)',
      quote:
        'Devices shall achieve the performance intended by their manufacturer and shall be designed ' +
        'and manufactured in such a way that, during normal conditions of use, they are suitable ' +
        'for their intended purpose.',
    },
    {
      id: 'c3',
      regulationName: 'ISO 14971:2019',
      section: 'Clause 7.1 — Risk Control',
      quote:
        'The manufacturer shall use one or more of the following options in the priority order listed: ' +
        'a) inherent safety by design; b) protective measures; c) information for safety.',
    },
    {
      id: 'c4',
      regulationName: 'EU MDR 2017/745',
      section: 'Article 84 — Post-Market Surveillance',
      quote:
        'Manufacturers shall plan, establish, document, implement, maintain and update a post-market ' +
        'surveillance system that is appropriate for the risk class and the type of device.',
    },
    {
      id: 'c5',
      regulationName: 'EU MDR 2017/745',
      section: 'Article 61 — Clinical Evaluation',
      quote:
        'Manufacturers shall plan, conduct, assess, report and update clinical evaluation in accordance ' +
        'with this Annex throughout the lifecycle of the device concerned.',
    },
    {
      id: 'c6',
      regulationName: 'EU MDR 2017/745',
      section: 'Annex I, §23 — Labelling & IFU',
      quote:
        'Devices shall be labelled in an official Union language or languages. The language may be ' +
        'determined by the Member State in which the device is made available.',
    },
    {
      id: 'c7',
      regulationName: 'EU MDR 2017/745',
      section: 'Article 27 — UDI System',
      quote:
        'The manufacturer shall assign to the device and, if applicable, to all higher levels of ' +
        'packaging, a UDI allowing the identification and facilitated traceability of devices.',
    },
    {
      id: 'c8',
      regulationName: 'IEC 62304:2006+AMD1:2015',
      section: '§4.3 — Software Safety Classification',
      quote:
        'The manufacturer shall assign a software safety class to the medical device software. ' +
        'The software safety class shall be A, B, or C based on the severity of hazardous situations.',
    },
    {
      id: 'c9',
      regulationName: 'ISO 10993-1:2018',
      section: '§4 — Biological Evaluation',
      quote:
        'The manufacturer shall establish and document a biological evaluation plan as part of the ' +
        'overall risk management process for a medical device.',
    },
    {
      id: 'c10',
      regulationName: 'EU MDR 2017/745',
      section: 'Annex II, §2 — Design & Manufacturing',
      quote:
        'Information shall be provided to allow an understanding of the design stages applied to the ' +
        'device; complete information and specifications shall describe manufacturing processes.',
    },
  ]

  const findings: CitedFinding[] = [
    {
      id: 'f-001',
      requirement: 'Device Description & Intended Use (EU MDR Annex II §1)',
      status: 'covered',
      detail: 'Document contains a clear device description with intended purpose and patient population.',
      evidence: [
        { citationId: 'c1', relevance: 'Annex II §1 requires the technical file to describe the device with its intended purpose.' },
      ],
      confidence: 0.90,
    },
    {
      id: 'f-002',
      requirement: 'Design & Manufacturing Information (EU MDR Annex II §2)',
      status: 'partial',
      detail: 'Manufacturing sites are listed but process validation records are not referenced.',
      evidence: [
        { citationId: 'c10', relevance: 'Annex II §2 requires complete manufacturing process specifications — validation records are part of this.' },
      ],
      confidence: 0.75,
    },
    {
      id: 'f-003',
      requirement: 'General Safety & Performance Requirements (EU MDR Annex I)',
      status: 'missing',
      detail: 'No GSPR checklist or conformity evidence found in the submitted text.',
      evidence: [
        { citationId: 'c2', relevance: 'Annex I (GSPR) compliance must be demonstrated before CE marking can be granted.' },
      ],
      confidence: 0.92,
    },
    {
      id: 'f-004',
      requirement: 'Risk Management per ISO 14971:2019',
      status: 'partial',
      detail: 'A risk management plan is referenced but residual risk acceptability criteria are absent.',
      evidence: [
        { citationId: 'c3', relevance: 'ISO 14971 Clause 7.1 mandates explicit risk control options and acceptability criteria in the Risk Management File.' },
      ],
      confidence: 0.80,
    },
    {
      id: 'f-005',
      requirement: 'Clinical Evaluation (EU MDR Article 61)',
      status: 'human_review',
      detail: 'Clinical claims are present. A qualified clinical evaluator should verify the evidence base.',
      evidence: [
        { citationId: 'c5', relevance: 'Article 61 requires clinical evaluation to be conducted and documented throughout the device lifecycle.' },
      ],
      confidence: 0.65,
    },
    {
      id: 'f-006',
      requirement: 'Post-Market Surveillance Plan (EU MDR Article 84)',
      status: 'missing',
      detail: 'No PMS or PMCF plan is referenced in the document.',
      evidence: [
        { citationId: 'c4', relevance: 'Article 84 requires a documented PMS system appropriate to the device risk class — absence is a critical gap.' },
      ],
      confidence: 0.95,
    },
    {
      id: 'f-007',
      requirement: 'Labeling & IFU (EU MDR Annex I §23)',
      status: 'covered',
      detail: 'Labeling content and IFU language requirements appear to be addressed.',
      evidence: [
        { citationId: 'c6', relevance: 'Annex I §23 labelling requirements including language and mandatory symbol content appear satisfied.' },
      ],
      confidence: 0.82,
    },
    {
      id: 'f-008',
      requirement: 'UDI Assignment (EU MDR Article 27)',
      status: 'partial',
      detail: 'UDI is mentioned but EUDAMED registration status is not confirmed.',
      evidence: [
        { citationId: 'c7', relevance: 'Article 27 requires UDI assignment at all packaging levels and EUDAMED registration for traceability.' },
      ],
      confidence: 0.78,
    },
    {
      id: 'f-009',
      requirement: 'Software Lifecycle (IEC 62304)',
      status: 'human_review',
      detail: 'Software is mentioned. IEC 62304 classification and lifecycle documentation should be verified separately.',
      evidence: [
        { citationId: 'c8', relevance: 'IEC 62304 §4.3 requires software safety classification (A/B/C) and lifecycle documentation for embedded software.' },
      ],
      confidence: 0.60,
    },
    {
      id: 'f-010',
      requirement: 'Biocompatibility (ISO 10993)',
      status: 'covered',
      detail: 'Biocompatibility evaluation is referenced with appropriate ISO 10993 material testing.',
      evidence: [
        { citationId: 'c9', relevance: 'ISO 10993-1 §4 biological evaluation plan is required; document references appropriate test data.' },
      ],
      confidence: 0.88,
    },
  ]

  return {
    summary:
      `Demo analysis of "${fileName}". ` +
      'This document appears to be a medical device technical file. ' +
      'Several key regulatory requirements are addressed, but gaps were identified in ' +
      'post-market surveillance planning and clinical evaluation traceability. ' +
      'Add OPENAI_API_KEY to .env.local for a live GPT-4o-mini review.',
    findings,
    citations,
    riskFlags: [
      'GSPR (Annex I) conformity evidence is absent — CE marking cannot proceed without it [→ c2].',
      'No PMS / PMCF plan — high-risk gap per Article 84 [→ c4].',
      'Residual risk acceptability criteria missing from risk management section [→ c3].',
      'EUDAMED UDI registration status unconfirmed [→ c7].',
    ],
    confidence: 0.81,
  }
}

// ── System prompt ──────────────────────────────────────────────────────────────
const UPLOAD_SYSTEM_PROMPT = `You are MedReg AI, an expert medical device regulatory reviewer.
Analyze the provided technical document text and return a structured JSON compliance review.

CRITICAL RULE: Every finding MUST include at least one evidence item linking it to a specific
regulatory citation. AI assessments without traceable regulatory basis are not acceptable in
medical device compliance.

You MUST respond with ONLY valid JSON matching this exact schema (no markdown fences):
{
  "summary": "<2-3 sentence executive summary of compliance posture>",
  "confidence": <0.0-1.0 overall confidence>,
  "findings": [
    {
      "id": "f-001",
      "requirement": "<Regulation name + section, e.g. EU MDR Annex II §1 — Device Description>",
      "status": "<covered|partial|missing|human_review>",
      "detail": "<one-sentence assessment referencing specific evidence found or absent>",
      "confidence": <0.0-1.0>,
      "evidence": [
        {
          "citationId": "<must match a citation id in the citations array>",
          "relevance": "<one sentence: why this citation supports the finding>"
        }
      ]
    }
  ],
  "citations": [
    {
      "id": "c1",
      "regulationName": "<full regulation name>",
      "section": "<article / annex / clause>",
      "quote": "<verbatim or near-verbatim regulatory text excerpt>"
    }
  ],
  "riskFlags": ["<critical gap 1 with citation reference>", "<critical gap 2>"]
}

Status definitions:
- "covered"      → clear documentary evidence present in the submitted text
- "partial"      → mentioned but incomplete; specify what is missing in detail
- "missing"      → required by regulation but entirely absent
- "human_review" → present but requires expert judgement; state why

Always check for: EU MDR Annex I (GSPR), Annex II, Annex II §2 design/manufacturing,
ISO 14971 risk management, ISO 13485, IEC 62304 (if software mentioned),
Article 61 clinical evaluation, Article 84 PMS plan, Article 27 UDI, ISO 10993 biocompatibility.

Each citation id must be referenced by at least one finding's evidence array.
Never add a citation that is not referenced, and never add a finding without evidence.`

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const { docText, fileName } = body as Record<string, unknown>

  if (typeof docText !== 'string' || docText.trim().length === 0) {
    return NextResponse.json(
      { error: 'docText is required and must be a non-empty string' },
      { status: 400 },
    )
  }

  const resolvedFileName =
    typeof fileName === 'string' && fileName.trim().length > 0
      ? fileName.trim()
      : 'Untitled Document'

  // Demo mode
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(getDemoAnalysis(resolvedFileName))
  }

  // Live GPT-4o-mini
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const userPrompt =
      `File: ${resolvedFileName}\n\n` +
      `Document text (truncated to 8000 chars):\n${docText.slice(0, 8000)}`

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      instructions: UPLOAD_SYSTEM_PROMPT,
      input: userPrompt,
    })

    const rawText = response.output_text ?? ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let parsed: AnalysisResponse
    try {
      parsed = JSON.parse(jsonText) as AnalysisResponse
    } catch {
      console.error('[/api/upload] model returned non-JSON:', rawText.slice(0, 200))
      return NextResponse.json(getDemoAnalysis(resolvedFileName))
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[/api/upload] error:', error)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 },
    )
  }
}
