// ─── EU MDR: Post-Market Surveillance ────────────────────────────────────────
// Applies to all CE-marked devices under EU MDR 2017/745.
// PMS obligations are continuous — reports are required at defined intervals.

import type { RequirementTemplate } from '../../types'

export const mdrPmsTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'MDR-PMS-001',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Article 84 — Post-Market Surveillance System',
    domain: 'PMS',
    title: 'Post-Market Surveillance (PMS) Plan',
    description:
      'Manufacturers shall plan, establish, document, implement, maintain, and update ' +
      'a PMS system appropriate to the device risk class. The PMS Plan shall describe ' +
      'the data sources and methods for proactive collection of safety and performance ' +
      'data from the field throughout the device lifetime.',
    expected_evidence: [
      'PMS Plan document — risk-class appropriate (Class I: basic; Class IIb/III: enhanced)',
      'Data collection methods: MDR registries, complaint system, literature, EUDAMED alerts',
      'PSUR (Class IIb/III) or PMS Report (Class I/IIa) schedule and template',
      'Vigilance reporting procedure — serious incident criteria and timelines',
      'Field Safety Corrective Action (FSCA) initiation criteria and process',
      'Thresholds for triggering reactive clinical evaluation update',
    ],
    related_requirements: ['MDR-PMS-002', 'MDR-PMS-003', 'COMMON-RISK-005'],
    priority: 'critical',
    tags: ['EU MDR', 'PMS', 'post-market', 'Article 84', 'PSUR', 'vigilance'],
  },

  {
    requirement_id: 'MDR-PMS-002',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Annex XIV Part B — Post-Market Clinical Follow-Up (PMCF)',
    domain: 'Clinical',
    title: 'Post-Market Clinical Follow-Up (PMCF) Plan',
    description:
      'The manufacturer shall plan and conduct PMCF to proactively collect clinical ' +
      'data on the device after market approval to confirm ongoing safety and ' +
      'performance and identify emerging risks. A detailed PMCF plan shall justify the ' +
      'methods chosen and frequency of activities.',
    expected_evidence: [
      'PMCF Plan document addressing Annex XIV Part B requirements',
      'PMCF objectives and rationale (safety, performance, state-of-art)',
      'PMCF methods: patient registries, literature surveillance, post-market follow-up study',
      'Justification for chosen methods, or justification if PMCF is assessed not applicable',
      'PMCF Evaluation Report schedule and template',
      'Notified Body review confirmation for Class IIa/IIb/III devices',
    ],
    related_requirements: ['MDR-PMS-001', 'MDR-TECH-005'],
    priority: 'critical',
    tags: ['EU MDR', 'PMCF', 'clinical', 'post-market', 'Annex XIV'],
  },

  {
    requirement_id: 'MDR-PMS-003',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Article 32 — Summary of Safety and Clinical Performance (SSCP)',
    domain: 'PMS',
    title: 'Summary of Safety and Clinical Performance (SSCP)',
    description:
      'Manufacturers of implantable Class III and active implantable devices (and ' +
      'optionally Class IIb) shall prepare an SSCP to be made publicly available via ' +
      'EUDAMED. The SSCP shall present safety and clinical performance data in a ' +
      'language accessible to patients and lay users.',
    expected_evidence: [
      'SSCP document in at least one EU Member State official language',
      'Clinical data summary in language accessible to intended users (lay language)',
      'Residual risks and their mitigations described for patients',
      'Notified Body review and validation of SSCP (mandatory for Class III)',
      'EUDAMED submission confirmation and registration number',
      'Annual SSCP update schedule and update records',
    ],
    related_requirements: ['MDR-PMS-001', 'MDR-TECH-001'],
    priority: 'major',
    tags: ['EU MDR', 'SSCP', 'EUDAMED', 'Article 32', 'Class III', 'Class IIb'],
  },

  {
    requirement_id: 'MDR-PMS-004',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Article 87 — Reporting of Serious Incidents & FSCAs',
    domain: 'PMS',
    title: 'Vigilance Reporting — Serious Incidents & FSCAs',
    description:
      'The manufacturer shall report serious incidents and field safety corrective actions ' +
      '(FSCAs) to the competent authority where the incident occurred. Reporting timelines: ' +
      '15 days for serious incidents, 2 days for death / serious deterioration with public ' +
      'health threat.',
    expected_evidence: [
      'Vigilance SOP defining serious incident classification criteria',
      'Reportable incident decision tree / flowchart',
      'Sample serious incident report (MEDDEV 2.12/1 or EUDAMED electronic form)',
      'Competent authority notification records (for historical incidents if applicable)',
      'FSCA initiation procedure and Field Safety Notice (FSN) template',
      'Trend reporting procedure for non-serious incidents',
    ],
    related_requirements: ['MDR-PMS-001'],
    priority: 'critical',
    tags: ['EU MDR', 'vigilance', 'serious incident', 'FSCA', 'Article 87'],
  },
]
