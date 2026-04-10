// lib/regulatory-data.ts
// Server-side loaders for FDA regulatory CSV source data.
// Reads three CSV files from data/regulatory/ at import time and
// exports typed records plus named accessor functions.
//
// Files consumed:
//   data/regulatory/fda_ith_classification.csv
//   data/regulatory/fda_890_5900_regulation.csv
//   data/regulatory/fda_ith_predicates.csv

import { readFileSync } from 'fs'
import { join } from 'path'

// ─── Shared CSV parser ─────────────────────────────────────────────────────────

/** Split one CSV line respecting double-quoted fields that may contain commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // Escaped double-quote inside a quoted field ("" → ")
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

/** Read a CSV file and convert every data row into a plain object keyed by header names. */
function parseCsvFile(relativePath: string): Record<string, string>[] {
  const absPath = join(process.cwd(), ...relativePath.split('/'))
  const raw = readFileSync(absPath, 'utf-8')

  const [headerLine, ...dataLines] = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const headers = parseCsvLine(headerLine)

  return dataLines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function yesNo(value: string): boolean {
  return value.trim().toLowerCase() === 'yes'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FDA Device Classification  (fda_ith_classification.csv)
// ═══════════════════════════════════════════════════════════════════════════════

export interface FdaDeviceClassification {
  /** FDA CDRH classification database record ID */
  classificationId: number
  /** Source URL on FDA Access Data portal */
  sourceUrl: string
  /** Common device name */
  deviceName: string
  /** Plain-language regulation description */
  regulationDescription: string
  /** FDA medical specialty panel name */
  medicalSpecialty: string
  /** FDA review panel name */
  reviewPanel: string
  /** Three-letter FDA product code */
  productCode: string
  /** Office / division responsible for premarket review */
  premarketReview: string
  /** Required submission pathway (e.g. "510(k)", "PMA") */
  submissionType: string
  /** Applicable CFR regulation number (e.g. "21 CFR 890.5900") */
  regulationNumber: string
  /** Device class (1 = lowest risk, 3 = highest risk) */
  deviceClass: 1 | 2 | 3
  /** Whether the device is exempt from GMP / Quality System requirements */
  gmpExempt: boolean
  /** Eligible for the Summary Malfunction Reporting (MDR) programme */
  summaryMalfunctionReportingEligible: boolean
  /** Whether the device is designed to be implanted */
  implantedDevice: boolean
  /** Whether the device sustains or supports life */
  lifeSupportDevice: boolean
  /** Eligible for third-party 510(k) review */
  thirdPartyReviewEligible: boolean
  /** Date the FDA classification page was last updated (YYYY-MM-DD) */
  pageLastUpdated: string
}

function mapClassificationRow(row: Record<string, string>): FdaDeviceClassification {
  return {
    classificationId:                    parseInt(row['classification_id'], 10),
    sourceUrl:                           row['source_url'],
    deviceName:                          row['device_name'],
    regulationDescription:               row['regulation_description'],
    medicalSpecialty:                    row['medical_specialty'],
    reviewPanel:                         row['review_panel'],
    productCode:                         row['product_code'],
    premarketReview:                     row['premarket_review'],
    submissionType:                      row['submission_type'],
    regulationNumber:                    row['regulation_number'],
    deviceClass:                         parseInt(row['device_class'], 10) as 1 | 2 | 3,
    gmpExempt:                           yesNo(row['gmp_exempt']),
    summaryMalfunctionReportingEligible: yesNo(row['summary_malfunction_reporting_eligible']),
    implantedDevice:                     yesNo(row['implanted_device']),
    lifeSupportDevice:                   yesNo(row['life_support_device']),
    thirdPartyReviewEligible:            yesNo(row['third_party_review_eligible']),
    pageLastUpdated:                     row['page_last_updated'],
  }
}

const _classifications: FdaDeviceClassification[] = parseCsvFile(
  'data/regulatory/fda_ith_classification.csv',
).map(mapClassificationRow)

/**
 * Returns all FDA device classification records loaded from
 * fda_ith_classification.csv (currently one record: ITH / Class II).
 */
export function getFdaClassification(): FdaDeviceClassification[] {
  return _classifications
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CFR Regulation Text  (fda_890_5900_regulation.csv)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CfrRegulation {
  /** Full CFR citation, e.g. "21 CFR 890.5900" */
  regulationNumber: string
  /** Short title of the regulation section */
  title: string
  /** Identification paragraph — statutory device definition */
  identification: string
  /** Device classification with applicable standard type */
  classification: string
  /** Source URL at eCFR */
  sourceUrl: string
}

function mapRegulationRow(row: Record<string, string>): CfrRegulation {
  return {
    regulationNumber: row['regulation_number'],
    title:            row['title'],
    identification:   row['identification'],
    classification:   row['classification'],
    sourceUrl:        row['source_url'],
  }
}

const _regulations: CfrRegulation[] = parseCsvFile(
  'data/regulatory/fda_890_5900_regulation.csv',
).map(mapRegulationRow)

/**
 * Returns all regulation text records loaded from
 * fda_890_5900_regulation.csv (currently one record: 21 CFR 890.5900).
 */
export function getPowerTractionRegulation(): CfrRegulation[] {
  return _regulations
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 510(k) Predicate Devices  (fda_ith_predicates.csv)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IthPredicate {
  /** 510(k) submission number (e.g. "K243775") */
  kNumber: string
  /** Name of the predicate device */
  deviceName: string
  /** Name of the 510(k) applicant / manufacturer */
  applicant: string
  /** FDA product code */
  productCode: string
  /** Applicable CFR regulation number */
  regulationNumber: string
  /** FDA classification device name */
  deviceClassificationName: string
  /** Date the 510(k) was received by FDA (YYYY-MM-DD) */
  dateReceived: string
  /** Date of FDA decision (YYYY-MM-DD) */
  decisionDate: string
  /** FDA decision (e.g. "Substantially Equivalent (SESE)") */
  decision: string
  /** FDA review panel */
  reviewPanel: string
  /** 510(k) submission type (e.g. "Traditional") */
  submissionType: string
  /** Whether the submission was reviewed by an accredited third party */
  thirdPartyReviewed: boolean
  /** Source URL on FDA Access Data portal */
  sourceUrl: string
  /** Analyst note on why this predicate is useful */
  note: string
}

function mapPredicateRow(row: Record<string, string>): IthPredicate {
  return {
    kNumber:                  row['k_number'],
    deviceName:               row['device_name'],
    applicant:                row['applicant'],
    productCode:              row['product_code'],
    regulationNumber:         row['regulation_number'],
    deviceClassificationName: row['device_classification_name'],
    dateReceived:             row['date_received'],
    decisionDate:             row['decision_date'],
    decision:                 row['decision'],
    reviewPanel:              row['review_panel'],
    submissionType:           row['submission_type'],
    thirdPartyReviewed:       yesNo(row['third_party_reviewed']),
    sourceUrl:                row['source_url'],
    note:                     row['note'],
  }
}

const _predicates: IthPredicate[] = parseCsvFile(
  'data/regulatory/fda_ith_predicates.csv',
).map(mapPredicateRow)

/**
 * Returns all 510(k) ITH predicate device records loaded from
 * fda_ith_predicates.csv (currently 5 records, sorted newest-first).
 */
export function getIthPredicates(): IthPredicate[] {
  return [..._predicates].sort(
    (a, b) => new Date(b.decisionDate).getTime() - new Date(a.decisionDate).getTime(),
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ITH Predicates with PDF Links  (fda_ith_predicates_with_pdf_links.csv)
// ═══════════════════════════════════════════════════════════════════════════════

export interface IthPredicateWithLinks {
  /** 510(k) submission number (e.g. "K243775") */
  kNumber: string
  /** Name of the predicate device */
  deviceName: string
  /** Name of the 510(k) applicant / manufacturer */
  applicant: string
  /** FDA product code */
  productCode: string
  /** Applicable CFR regulation number */
  regulationNumber: string
  /** Date of FDA decision (YYYY-MM-DD); may be empty for older records */
  decisionDate: string
  /** 510(k) submission type (e.g. "510(k)") */
  submissionType: string
  /** Type of publicly available summary document (e.g. "Summary", "Statement") */
  summaryOrStatement: string
  /** URL to the FDA 510(k) HTML detail page */
  htmlUrl: string
  /** Direct URL to the FDA 510(k) PDF document; may be empty if not confirmed */
  pdfUrl: string
  /** Description of the PDF type / contents */
  pdfType: string
  /** Analyst notes on the predicate's usefulness */
  notes: string
}

function mapPredicateWithLinksRow(row: Record<string, string>): IthPredicateWithLinks {
  return {
    kNumber:            row['k_number'],
    deviceName:         row['device_name'],
    applicant:          row['applicant'],
    productCode:        row['product_code'],
    regulationNumber:   row['regulation_number'],
    decisionDate:       row['decision_date'],
    submissionType:     row['submission_type'],
    summaryOrStatement: row['summary_or_statement'],
    htmlUrl:            row['html_url'],
    pdfUrl:             row['pdf_url'],
    pdfType:            row['pdf_type'],
    notes:              row['notes'],
  }
}

const _predicatesWithLinks: IthPredicateWithLinks[] = parseCsvFile(
  'data/regulatory/fda_ith_predicates_with_pdf_links.csv',
).map(mapPredicateWithLinksRow)

/**
 * Returns all ITH predicate records (with html_url and pdf_url) loaded from
 * fda_ith_predicates_with_pdf_links.csv (currently 5 records, sorted newest-first).
 * Records without a decisionDate are placed at the end.
 */
export function getIthPredicatesWithLinks(): IthPredicateWithLinks[] {
  return [..._predicatesWithLinks].sort((a, b) => {
    if (!a.decisionDate && !b.decisionDate) return 0
    if (!a.decisionDate) return 1
    if (!b.decisionDate) return -1
    return new Date(b.decisionDate).getTime() - new Date(a.decisionDate).getTime()
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Regulation Text Chunks  (21_cfr_890_5900_chunks.csv)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RegulationChunk {
  /** Identifier for the parent document (e.g. "21_cfr_890_5900") */
  docId: string
  /** Unique chunk identifier (e.g. "21_cfr_890_5900_001") */
  chunkId: string
  /** Source type: "regulation" | "regulation_metadata" | etc. */
  sourceType: string
  /** Jurisdiction (e.g. "US") */
  jurisdiction: string
  /** Issuing agency (e.g. "FDA") */
  agency: string
  /** Full title of the regulation document */
  title: string
  /** CFR citation (e.g. "21 CFR 890.5900") */
  citation: string
  /** Section identifier within the regulation (e.g. "890.5900(a)") */
  section: string
  /** Ordering index within the document (1-based) */
  chunkOrder: number
  /** The verbatim regulatory text for this chunk */
  text: string
  /** Source URL at eCFR */
  sourceUrl: string
  /** Date the source was last updated (YYYY-MM-DD) */
  lastUpdated: string
  /** Analyst notes about this chunk */
  notes: string
}

function mapRegulationChunkRow(row: Record<string, string>): RegulationChunk {
  return {
    docId:       row['doc_id'],
    chunkId:     row['chunk_id'],
    sourceType:  row['source_type'],
    jurisdiction: row['jurisdiction'],
    agency:      row['agency'],
    title:       row['title'],
    citation:    row['citation'],
    section:     row['section'],
    chunkOrder:  parseInt(row['chunk_order'], 10),
    text:        row['text'],
    sourceUrl:   row['source_url'],
    lastUpdated: row['last_updated'],
    notes:       row['notes'],
  }
}

const _regulationChunks: RegulationChunk[] = parseCsvFile(
  'data/regulatory/21_cfr_890_5900_chunks.csv',
).map(mapRegulationChunkRow)

/**
 * Returns all regulation text chunks loaded from
 * 21_cfr_890_5900_chunks.csv (currently 3 rows), sorted by chunkOrder ascending.
 */
export function getPowerTractionRegulationChunks(): RegulationChunk[] {
  return [..._regulationChunks].sort((a, b) => a.chunkOrder - b.chunkOrder)
}

// ─── Convenience re-export of the primary demo device ─────────────────────────

/** The single ITH classification record — convenience alias. */
export const demoDevice: FdaDeviceClassification = _classifications[0]
