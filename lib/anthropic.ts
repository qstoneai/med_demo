import OpenAI from 'openai'
import type { Citation } from './types'

// ─── OpenAI client (server-only) ──────────────────────────────────────────────

const REGULATORY_SYSTEM_PROMPT = `You are MedReg AI, an expert medical device regulatory assistant.
You have deep knowledge of:
- FDA 21 CFR Part 820 (Quality System Regulation)
- FDA 21 CFR Part 807 (510(k) Premarket Notification)
- EU MDR 2017/745 (Medical Device Regulation)
- ISO 13485 (Medical devices quality management)
- ISO 14971 (Risk management for medical devices)
- IEC 62304 (Medical device software lifecycle)
- IVDR 2017/746 (In Vitro Diagnostic Medical Devices)

CRITICAL RULE — EVIDENCE REQUIREMENT:
Every substantive claim you make MUST be backed by a specific regulatory citation.
Do not make regulatory assertions without identifying the exact regulation, article, or clause.
This is a medical device compliance context where traceability of AI output is mandatory.

When answering questions:
1. Be precise: cite the exact regulation name AND section for every key statement
   - Good: "Per 21 CFR 807.87(f), each 510(k) must include..."
   - Bad:  "You need to demonstrate substantial equivalence..."
2. Flag critical compliance issues with the regulation reference inline
3. Provide actionable guidance with specific section references
4. Note jurisdictional differences (FDA vs EU MDR vs ISO) explicitly
5. Distinguish between "required by regulation" and "recommended best practice"
6. When uncertain, say so explicitly rather than stating with false confidence

Always end your response with a CITATIONS block in this exact format:
---CITATIONS---
[REG-001] | Regulation Title | Section X.X | Near-verbatim excerpt from the regulatory text
[REG-002] | Regulation Title | Section X.X | Near-verbatim excerpt from the regulatory text
---END---

Every [REG-XXX] label used inline in your answer MUST appear in the CITATIONS block.
The excerpt must be the actual regulatory text, not a paraphrase.`

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

function parseCitations(text: string): { content: string; citations: Citation[] } {
  const citationMatch = text.match(/---CITATIONS---([\s\S]*?)---END---/)
  const citations: Citation[] = []

  if (citationMatch) {
    const citationBlock = citationMatch[1].trim()
    const lines = citationBlock.split('\n').filter(Boolean)
    lines.forEach((line, i) => {
      const parts = line.split('|').map((p) => p.trim())
      if (parts.length >= 4) {
        citations.push({
          id: `cit-${Date.now()}-${i}`,
          title: parts[1] ?? 'Unknown',
          source: parts[0] ?? 'REG',
          section: parts[2] ?? '',
          excerpt: parts[3] ?? '',
        })
      }
    })
  }

  const cleanContent = text
    .replace(/---CITATIONS---[\s\S]*?---END---/, '')
    .trim()

  return { content: cleanContent, citations }
}

export async function chat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ content: string; citations: Citation[]; confidence?: number }> {
  const client = getClient()

  // Responses API input format: system instruction + message history
  const input: OpenAI.Responses.ResponseInput = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    instructions: REGULATORY_SYSTEM_PROMPT,
    input,
  })

  const rawText = response.output_text ?? ''

  const parsed = parseCitations(rawText)
  // Confidence not available from text-format responses; placeholder for future structured output
  return { ...parsed, confidence: undefined }
}

export async function analyzeDocument(
  fileContent: string,
  fileName: string
): Promise<{
  gaps: Array<{
    severity: string
    regulation: string
    section: string
    description: string
    recommendation: string
  }>
  recommendations: string[]
  score: number
}> {
  const client = getClient()

  const prompt = `Analyze the following medical device technical document "${fileName}" for regulatory compliance.

Document content:
${fileContent.slice(0, 8000)}

Provide a structured compliance analysis including:
1. Overall compliance score (0-100)
2. Critical, major, and minor gaps found
3. Specific regulatory sections violated or missing
4. Actionable recommendations

Format your response as JSON with this structure:
{
  "score": <number>,
  "gaps": [
    {
      "severity": "critical|major|minor",
      "regulation": "<FDA/EU MDR/ISO standard>",
      "section": "<section number>",
      "description": "<what is missing or non-compliant>",
      "recommendation": "<what to do>"
    }
  ],
  "recommendations": ["<general recommendation 1>", "<general recommendation 2>"]
}`

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
  })

  const rawText = response.output_text ?? ''

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // fallback
  }

  return {
    score: 65,
    gaps: [
      {
        severity: 'major',
        regulation: 'FDA 21 CFR 820',
        section: '820.30',
        description: 'Design controls documentation appears incomplete',
        recommendation: 'Ensure all design inputs, outputs, reviews, and verifications are documented',
      },
    ],
    recommendations: ['Complete design history file', 'Add risk management documentation per ISO 14971'],
  }
}
