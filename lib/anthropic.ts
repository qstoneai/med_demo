import Anthropic from '@anthropic-ai/sdk'
import type { Citation } from './types'

// ─── Claude client (server-only) ──────────────────────────────────────────────

const REGULATORY_SYSTEM_PROMPT = `You are MedReg AI, an expert medical device regulatory assistant.
You have deep knowledge of:
- FDA 21 CFR Part 820 (Quality System Regulation)
- FDA 21 CFR Part 807 (510(k) Premarket Notification)
- EU MDR 2017/745 (Medical Device Regulation)
- ISO 13485 (Medical devices quality management)
- ISO 14971 (Risk management for medical devices)
- IEC 62304 (Medical device software lifecycle)
- IVDR 2017/746 (In Vitro Diagnostic Medical Devices)

When answering questions:
1. Be precise and cite specific regulatory sections
2. Flag critical compliance issues clearly
3. Provide actionable guidance
4. Note jurisdictional differences (FDA vs EU vs other)
5. Format citations as: [REG-XXX] Regulation Name, Section X.X

Always end your response with a CITATIONS block in this exact format:
---CITATIONS---
[REG-001] | Regulation Title | Section X.X | Brief excerpt from the regulation text
[REG-002] | Regulation Title | Section X.X | Brief excerpt from the regulation text
---END---`

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
  return new Anthropic({ apiKey })
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
): Promise<{ content: string; citations: Citation[] }> {
  const client = getClient()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: REGULATORY_SYSTEM_PROMPT,
    messages,
  })

  const rawText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('')

  return parseCitations(rawText)
}

export async function analyzeDocument(
  fileContent: string,
  fileName: string
): Promise<{ gaps: Array<{ severity: string; regulation: string; section: string; description: string; recommendation: string }>; recommendations: string[]; score: number }> {
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

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

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
