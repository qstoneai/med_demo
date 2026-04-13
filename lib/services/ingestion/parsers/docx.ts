// ─── DOCX Parser ──────────────────────────────────────────────────────────────
// Uses mammoth to convert DOCX to HTML, then splits on heading tags to produce
// one chunk per section.  Falls back to paragraph-level splitting when no
// headings are found.

import type { IngestedDocument, DocumentChunk } from '@/lib/types/documents'

interface Section {
  heading?: string
  text: string
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Split mammoth HTML output into heading-delimited sections. */
function htmlToSections(html: string): Section[] {
  const sections: Section[] = []
  let currentHeading: string | undefined
  let currentTexts: string[] = []

  // Split on h1-h3 tags; keep the delimiters so we can extract heading text
  const tokens = html.split(/(<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>)/gi)

  for (const token of tokens) {
    const headingMatch = token.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)
    if (headingMatch) {
      // Flush previous section
      const accumulated = currentTexts.join('\n').trim()
      if (accumulated.length > 20) {
        sections.push({ heading: currentHeading, text: accumulated })
      }
      currentHeading = stripHtml(headingMatch[1]).slice(0, 150)
      currentTexts = []
    } else {
      const cleaned = stripHtml(token)
      if (cleaned.length > 5) currentTexts.push(cleaned)
    }
  }

  // Final section
  const tail = currentTexts.join('\n').trim()
  if (tail.length > 20) sections.push({ heading: currentHeading, text: tail })

  return sections
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function parseDocx(
  buffer: Buffer,
  doc: IngestedDocument,
): Promise<DocumentChunk[]> {
  const mammoth = await import('mammoth')

  // Convert to HTML so we can detect headings via the style map
  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='heading 1'] => h1:fresh",
        "p[style-name='heading 2'] => h2:fresh",
        "p[style-name='heading 3'] => h3:fresh",
        // Korean / CJK heading style names
        "p[style-name='제목 1'] => h1:fresh",
        "p[style-name='제목 2'] => h2:fresh",
        "p[style-name='제목 3'] => h3:fresh",
      ],
    },
  )

  let sections = htmlToSections(html)

  // Fallback: no heading structure found — split raw text by blank lines
  if (sections.length === 0) {
    const { value: rawText } = await mammoth.extractRawText({ buffer })
    const paragraphs = rawText
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 20)

    sections = paragraphs.map(text => ({ text }))
  }

  return sections.map((section, chunkIndex) => ({
    id: `${doc.id}-chunk-${chunkIndex}`,
    documentId: doc.id,
    chunkIndex,
    text: section.text,
    citation: {
      fileName: doc.fileName,
      fileType: 'docx',
      sectionHeading: section.heading,
      snippet: section.text.replace(/\s+/g, ' ').slice(0, 200).trim(),
      chunkId: `${doc.id}-chunk-${chunkIndex}`,
    },
  }))
}
