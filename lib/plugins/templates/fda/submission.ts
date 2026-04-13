// ─── FDA: 510(k) Premarket Notification Submission ────────────────────────────
// Applies to Class II devices requiring a 510(k) under 21 CFR Part 807.
// Requirements cover the mandatory content for a Traditional, Abbreviated,
// or Special 510(k) submission.

import type { RequirementTemplate } from '../../types'

export const fda510kTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'FDA-510K-001',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 807',
    article: '§807.87(a) — Device Description',
    domain: 'General',
    title: '510(k) Device Description',
    description:
      'The 510(k) submission must include a thorough description of the device, covering: ' +
      'the intended use and indications for use, the technological characteristics ' +
      '(materials, design features, energy type), contraindications, warnings, ' +
      'and a description of the device operating principles.',
    expected_evidence: [
      'Device description narrative — intended use and indications for use',
      'Technological characteristics description (materials, energy type, design)',
      'Contraindications and warnings list',
      'Principles of operation description',
      'Labeling draft including Instructions for Use (IFU)',
      'Device photographs, diagrams, or engineering drawings',
    ],
    related_requirements: ['FDA-510K-002', 'FDA-510K-003'],
    priority: 'critical',
    tags: ['FDA', '510k', 'premarket notification', 'device description', 'intended use'],
  },

  {
    requirement_id: 'FDA-510K-002',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 807',
    article: '§807.87(f) — Substantial Equivalence Comparison',
    domain: 'General',
    title: 'Substantial Equivalence Comparison',
    description:
      'The submitter must demonstrate substantial equivalence to one or more legally ' +
      'marketed predicate devices. Equivalence requires (1) same intended use, AND ' +
      '(2) same technological characteristics OR different characteristics that do not ' +
      'raise new safety or effectiveness questions and performance data shows equivalence.',
    expected_evidence: [
      'Predicate device identification (K-number and device name for each predicate)',
      'Intended use comparison table (subject device vs. each predicate)',
      'Technological characteristics comparison table (same or different)',
      'For different characteristics: performance data demonstrating equivalence',
      'Substantial equivalence determination statement',
      'Decision flowchart or narrative following FDA SE pathway',
    ],
    related_requirements: ['FDA-510K-001', 'FDA-510K-003'],
    priority: 'critical',
    tags: ['FDA', '510k', 'substantial equivalence', 'predicate', 'SE pathway'],
  },

  {
    requirement_id: 'FDA-510K-003',
    authority: 'FDA',
    regulation: 'FDA 21 CFR Part 807',
    article: '§807.87(g) — Performance Testing Summary',
    domain: 'General',
    title: '510(k) Performance Testing',
    description:
      'The submission shall include a summary or full report of performance testing ' +
      'demonstrating the device performs as intended and is substantially equivalent ' +
      'to the predicate. The scope of testing depends on device type and technological ' +
      'characteristics (bench, biocompatibility, electrical safety, EMC, sterility, etc.).',
    expected_evidence: [
      'Bench / laboratory performance test reports addressing device-specific parameters',
      'Biocompatibility evaluation per ISO 10993 series (if patient-contacting)',
      'Electrical safety testing per IEC 60601-1 / -1-2 results (if powered device)',
      'EMC testing per IEC 60601-1-2 results',
      'Sterilization validation report (if sterile device)',
      'Software documentation per FDA Software Guidance (if SiMD or SaMD)',
      'Clinical data or literature review (if required for SE determination)',
    ],
    related_requirements: ['FDA-510K-002', 'COMMON-RISK-005'],
    priority: 'critical',
    tags: ['FDA', '510k', 'performance testing', 'biocompatibility', 'bench testing'],
  },
]
