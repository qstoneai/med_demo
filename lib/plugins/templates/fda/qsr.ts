// ─── FDA: Quality System Regulation (21 CFR Part 820) ─────────────────────────
// The FDA QSR (now harmonising with ISO 13485 via QMSR rule 2024) applies to
// all Class II/III devices marketed in the United States.

import type { RequirementTemplate } from '../../types'

export const fdaQsrTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'FDA-QSR-001',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 820',
    article: '§820.30 — Design Controls',
    domain: 'QMS',
    title: 'Design Controls',
    description:
      'Each manufacturer of Class II and Class III devices (and certain Class I) shall ' +
      'establish and maintain procedures to control the design of the device. Design ' +
      'inputs, outputs, reviews, verification, validation, transfer, and changes shall ' +
      'all be documented and form the Design History File (DHF).',
    expected_evidence: [
      'Design History File (DHF) index or equivalent compilation',
      'Design input requirements document (approved)',
      'Design output documentation (drawings, specifications, software)',
      'Design review records — at least one formal design review with sign-off',
      'Design verification records (objective evidence outputs meet inputs)',
      'Design validation records (simulated or actual use testing)',
      'Design transfer records confirming production-equivalent devices were validated',
      'Design change control records for any post-release design changes',
    ],
    related_requirements: ['FDA-QSR-002', 'COMMON-SW-003', 'COMMON-UE-001'],
    priority: 'critical',
    tags: ['FDA', '21 CFR 820', 'design controls', 'DHF', 'QSR', 'Class II', 'Class III'],
  },

  {
    requirement_id: 'FDA-QSR-002',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 820',
    article: '§820.40 — Document Controls',
    domain: 'QMS',
    title: 'Document Controls',
    description:
      'The manufacturer shall establish and maintain procedures to control all documents ' +
      'required by 21 CFR Part 820. Approved documents shall be available at locations ' +
      'of use. Obsolete documents shall be promptly removed or clearly identified to ' +
      'prevent unintended use.',
    expected_evidence: [
      'Document control SOP — covers creation, review, approval, distribution, revision',
      'Document approval records with authorised signatures and dates',
      'Document revision history / change log for all controlled documents',
      'Obsolete document removal / archival procedure',
      'Distribution list or controlled-access records',
    ],
    related_requirements: ['FDA-QSR-001', 'FDA-QSR-003'],
    priority: 'major',
    tags: ['FDA', '21 CFR 820', 'document control', 'QSR', 'SOP'],
  },

  {
    requirement_id: 'FDA-QSR-003',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 820',
    article: '§820.100 — Corrective and Preventive Action (CAPA)',
    domain: 'QMS',
    title: 'CAPA — Corrective and Preventive Action',
    description:
      'The manufacturer shall establish and maintain procedures for implementing ' +
      'corrective and preventive actions. Sources of quality data (complaints, ' +
      'nonconformances, audits, MDR reports) shall be analysed to identify existing ' +
      'and potential causes of nonconformity. CAPA effectiveness shall be verified.',
    expected_evidence: [
      'CAPA SOP covering initiation, investigation, implementation, verification',
      'CAPA records with documented root cause analysis (5-Why, Fishbone, etc.)',
      'Data sources list used for CAPA input (complaints, audit findings, MDRs)',
      'CAPA effectiveness verification records (follow-up audits or data review)',
      'CAPA trend analysis report (if recurring nonconformances identified)',
      'Management review discussion of CAPA system performance',
    ],
    related_requirements: ['FDA-QSR-002', 'FDA-QSR-004'],
    priority: 'critical',
    tags: ['FDA', '21 CFR 820', 'CAPA', 'nonconformance', 'root cause', 'QSR'],
  },

  {
    requirement_id: 'FDA-QSR-004',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 820',
    article: '§820.70 — Production and Process Controls',
    domain: 'QMS',
    title: 'Production & Process Controls',
    description:
      'The manufacturer shall develop, conduct, control, and monitor production ' +
      'processes to ensure device conformance to specifications. Processes whose ' +
      'results cannot be fully verified by subsequent inspection (special processes) ' +
      'shall be validated according to established procedures.',
    expected_evidence: [
      'Manufacturing SOPs, work instructions, and travellers',
      'Process validation protocols and reports for special processes',
      'Environmental monitoring and controls documentation (cleanroom, ESD)',
      'Equipment qualification (IQ/OQ/PQ) and calibration records',
      'In-process acceptance criteria and inspection records',
      'Production batch records',
    ],
    related_requirements: ['FDA-QSR-001', 'FDA-QSR-003'],
    priority: 'major',
    tags: ['FDA', '21 CFR 820', 'manufacturing', 'process validation', 'QSR'],
  },

  {
    requirement_id: 'FDA-QSR-005',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 820',
    article: '§820.198 — Complaint Handling',
    domain: 'QMS',
    title: 'Complaint Handling',
    description:
      'The manufacturer shall maintain complaint files. All complaints shall be ' +
      'reviewed and evaluated to determine whether an MDR (medical device report) ' +
      'is required. Complaints involving the possibility of injury, death, or serious ' +
      'malfunction shall be investigated.',
    expected_evidence: [
      'Complaint handling SOP',
      'Complaint log / database',
      'MDR decision rationale for each complaint',
      'Investigation records for complaints involving injury or malfunction',
      'Trend analysis of complaint categories',
    ],
    related_requirements: ['FDA-QSR-003'],
    priority: 'major',
    tags: ['FDA', '21 CFR 820', 'complaints', 'MDR', 'post-market', 'QSR'],
  },
]
