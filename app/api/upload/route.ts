import { NextRequest, NextResponse } from 'next/server'

// ── Response shape ─────────────────────────────────────────────────────────────
interface Finding {
  requirement: string
  status: 'covered' | 'partial' | 'missing' | 'human_review'
  detail: string
}

interface CitationRef {
  title: string
  section: string
  quote: string
}

interface UploadAnalysisResponse {
  summary: string
  findings: Finding[]
  citations: CitationRef[]
  riskFlags: string[]
}

// ── Deterministic demo response ────────────────────────────────────────────────
function getDemoAnalysis(fileName: string): UploadAnalysisResponse {
  return {
    summary:
      `Demo analysis of "${fileName}". ` +
      'This document appears to be a medical device technical file. ' +
      'Several key regulatory requirements are addressed, but gaps were identified in ' +
      'post-market surveillance planning and clinical evaluation traceability. ' +
      'Add ANTHROPIC_API_KEY to .env.local for a live Claude-powered review.',
    findings: [
      {
        requirement: 'Device Description & Intended Use (EU MDR Annex II §1)',
        status: 'covered',
        detail: 'Document contains a clear device description with intended purpose and patient population.',
      },
      {
        requirement: 'Design & Manufacturing Information (EU MDR Annex II §2)',
        status: 'partial',
        detail: 'Manufacturing sites are listed but process validation records are not referenced.',
      },
      {
        requirement: 'General Safety & Performance Requirements (EU MDR Annex I)',
        status: 'missing',
        detail: 'No GSPR checklist or conformity evidence found in the submitted text.',
      },
      {
        requirement: 'Risk Management per ISO 14971:2019',
        status: 'partial',
        detail: 'A risk management plan is referenced but residual risk acceptability criteria are absent.',
      },
      {
        requirement: 'Clinical Evaluation (EU MDR Article 61)',
        status: 'human_review',
        detail: 'Clinical claims are present. A qualified clinical evaluator should verify the evidence base.',
      },
      {
        requirement: 'Post-Market Surveillance Plan (EU MDR Article 84)',
        status: 'missing',
        detail: 'No PMS or PMCF plan is referenced in the document.',
      },
      {
        requirement: 'Labeling & IFU (EU MDR Annex I §23)',
        status: 'covered',
        detail: 'Labeling content and IFU language requirements appear to be addressed.',
      },
      {
        requirement: 'UDI Assignment (EU MDR Article 27)',
        status: 'partial',
        detail: 'UDI is mentioned but EUDAMED registration status is not confirmed.',
      },
      {
        requirement: 'Software Lifecycle (IEC 62304)',
        status: 'human_review',
        detail: 'Software is mentioned. IEC 62304 classification and lifecycle documentation should be verified separately.',
      },
      {
        requirement: 'Biocompatibility (ISO 10993)',
        status: 'covered',
        detail: 'Biocompatibility evaluation is referenced with appropriate ISO 10993 material testing.',
      },
    ],
    citations: [
      {
        title: 'EU MDR 2017/745 — Annex II Technical Documentation',
        section: 'Annex II, §1',
        quote:
          'The technical documentation shall be drawn up in such a way that allows the conformity ' +
          'assessment of the device with the requirements of this Regulation to be carried out.',
      },
      {
        title: 'EU MDR 2017/745 — General Safety and Performance Requirements',
        section: 'Annex I',
        quote:
          'Devices shall achieve the performance intended by their manufacturer and shall be designed ' +
          'and manufactured in such a way that, during normal conditions of use, they are suitable ' +
          'for their intended purpose.',
      },
      {
        title: 'ISO 14971:2019 — Risk Management for Medical Devices',
        section: 'Clause 7.1',
        quote:
          'The manufacturer shall use one or more of the following options in the priority order listed: ' +
          'a) inherent safety by design; b) protective measures in the medical device or manufacturing process; ' +
          'c) information for safety.',
      },
      {
        title: 'EU MDR 2017/745 — Post-Market Surveillance',
        section: 'Article 84',
        quote:
          'Manufacturers shall plan, establish, document, implement, maintain and update a post-market ' +
          'surveillance system that is appropriate for the risk class and the type of device.',
      },
    ],
    riskFlags: [
      'GSPR conformity evidence is absent — CE marking cannot proceed without it.',
      'No PMS / PMCF plan: high-risk for MDR compliance.',
      'Residual risk acceptability criteria missing from risk management section.',
      'EUDAMED UDI registration status unconfirmed.',
    ],
  }
}

// ── System prompt for Claude ───────────────────────────────────────────────────
const UPLOAD_SYSTEM_PROMPT = `You are MedReg AI, an expert medical device regulatory reviewer.
Analyze the provided technical document text and return a structured JSON compliance review.

You MUST respond with ONLY valid JSON in exactly this shape (no markdown fences, no extra commentary):
{
  "summary": "<2-3 sentence executive summary of the document and its compliance posture>",
  "findings": [
    {
      "requirement": "<regulation name and section>",
      "status": "<covered|partial|missing|human_review>",
      "detail": "<one-sentence explanation>"
    }
  ],
  "citations": [
    {
      "title": "<regulation full name>",
      "section": "<section number or article>",
      "quote": "<verbatim or near-verbatim excerpt>"
    }
  ],
  "riskFlags": ["<critical issue 1>", "<critical issue 2>"]
}

Coverage rules:
- "covered"      → clear evidence in the text
- "partial"      → mentioned but incomplete
- "missing"      → required but absent
- "human_review" → present but needs expert judgement

Always check for: EU MDR Annex I (GSPR), Annex II, ISO 14971 risk management, ISO 13485,
IEC 62304 (if software), clinical evaluation (Article 61), PMS plan (Article 84), UDI, biocompatibility.`

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // 1. Parse and validate body
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
      { status: 400 }
    )
  }

  const resolvedFileName =
    typeof fileName === 'string' && fileName.trim().length > 0
      ? fileName.trim()
      : 'Untitled Document'

  // 2. Demo mode — no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(getDemoAnalysis(resolvedFileName))
  }

  // 3. Live mode — call Claude via lib/anthropic
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const userPrompt =
      `File: ${resolvedFileName}\n\n` +
      `Document text (truncated to 8000 chars):\n${docText.slice(0, 8000)}`

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: UPLOAD_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('')

    // Strip optional markdown fences Claude sometimes adds
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let parsed: UploadAnalysisResponse
    try {
      parsed = JSON.parse(jsonText) as UploadAnalysisResponse
    } catch {
      // Claude returned non-JSON — fall back to demo so the UI never breaks
      console.error('[/api/upload] Claude returned non-JSON:', rawText.slice(0, 200))
      return NextResponse.json(getDemoAnalysis(resolvedFileName))
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[/api/upload] error:', error)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}
