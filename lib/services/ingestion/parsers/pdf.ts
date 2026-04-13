// ─── PDF Parser ───────────────────────────────────────────────────────────────
// Extracts per-page text using pdf-parse's pagerender hook.
// Dynamic import keeps this out of the client bundle and avoids
// pdf-parse's test-file side-effect during Next.js module analysis.

import type { IngestedDocument, DocumentChunk } from '@/lib/types/documents'

export interface PdfParseResult {
  chunks: DocumentChunk[]
  pageCount: number
}

export async function parsePdf(
  buffer: Buffer,
  doc: IngestedDocument,
): Promise<PdfParseResult> {
  // pdf-parse is a CJS module — .default may not exist under ESM interop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await import('pdf-parse')) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse: (buf: Buffer, opts?: any) => Promise<any> = mod.default ?? mod

  const pageTexts: string[] = []

  // pagerender is called once per page; we collect the text in order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pdfParse(buffer, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pagerender(pageData: any): Promise<string> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return pageData.getTextContent().then((tc: any) => {
        let text = ''
        let lastY = -9999

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const item of tc.items as any[]) {
          const y: number = item.transform?.[5] ?? 0
          // New line when vertical position changes noticeably
          if (lastY !== -9999 && Math.abs(lastY - y) > 3) text += '\n'
          text += item.str ?? ''
          lastY = y
        }

        pageTexts.push(text.trim())
        return text
      })
    },
  })

  const chunks: DocumentChunk[] = []
  let chunkIndex = 0

  for (let i = 0; i < pageTexts.length; i++) {
    const text = pageTexts[i]
    if (!text || text.length < 20) continue

    // Detect a section heading: first non-empty line that is short enough
    const firstLine = text.split('\n').find(l => l.trim().length > 0)?.trim()
    const sectionHeading =
      firstLine && firstLine.length < 120 ? firstLine : undefined

    chunks.push({
      id: `${doc.id}-chunk-${chunkIndex}`,
      documentId: doc.id,
      chunkIndex,
      text,
      citation: {
        fileName: doc.fileName,
        fileType: 'pdf',
        pageNumber: i + 1,
        sectionHeading,
        snippet: text.replace(/\s+/g, ' ').slice(0, 200).trim(),
        chunkId: `${doc.id}-chunk-${chunkIndex}`,
      },
    })
    chunkIndex++
  }

  return { chunks, pageCount: pageTexts.length }
}
