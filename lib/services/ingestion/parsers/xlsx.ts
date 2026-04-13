// ─── XLSX Parser ──────────────────────────────────────────────────────────────
// One chunk per worksheet.  Converts each sheet to a tab-delimited text block
// so the content is readable by both humans and LLMs.

import type { IngestedDocument, DocumentChunk } from '@/lib/types/documents'

export interface XlsxParseResult {
  chunks: DocumentChunk[]
  sheetNames: string[]
}

export async function parseXlsx(
  buffer: Buffer,
  doc: IngestedDocument,
): Promise<XlsxParseResult> {
  const XLSX = await import('xlsx')

  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const chunks: DocumentChunk[] = []
  let chunkIndex = 0

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]

    // header: 1 → returns rows as arrays (preserves column order)
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

    // Drop fully-empty rows
    const nonEmpty = rows.filter(row =>
      Array.isArray(row) &&
      row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''),
    )

    if (nonEmpty.length === 0) continue

    // Render as tab-separated text so structure is readable in LLM context
    const lines = nonEmpty.map(row =>
      row.map(cell => (cell !== null && cell !== undefined ? String(cell).trim() : '')).join('\t'),
    )
    const text = lines.join('\n')

    // First row often contains column headers — use as section heading if short
    const firstRow = lines[0]
    const sectionHeading =
      firstRow && firstRow.length < 200 ? firstRow : undefined

    chunks.push({
      id: `${doc.id}-chunk-${chunkIndex}`,
      documentId: doc.id,
      chunkIndex,
      text,
      citation: {
        fileName: doc.fileName,
        fileType: 'xlsx',
        sheetName,
        sectionHeading,
        snippet: text.replace(/\s+/g, ' ').slice(0, 200).trim(),
        chunkId: `${doc.id}-chunk-${chunkIndex}`,
      },
    })
    chunkIndex++
  }

  return { chunks, sheetNames: workbook.SheetNames }
}
