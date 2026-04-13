// ─── EU MDR: Technical Documentation (Annex I / II) ──────────────────────────
// Applies to all CE-marked medical devices under EU MDR 2017/745.
// Class I self-declaration; Class IIa/IIb/III require Notified Body review.

import type { RequirementTemplate } from '../../types'

export const mdrTechnicalFileTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'MDR-TECH-001',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Annex I — General Safety & Performance Requirements (GSPR)',
    domain: 'General',
    title: 'GSPR Conformity Checklist',
    description:
      'The manufacturer shall demonstrate conformity with all applicable General Safety ' +
      'and Performance Requirements (GSPR) of Annex I. A GSPR checklist with documented ' +
      'evidence or justification of non-applicability for each item shall be included ' +
      'in the technical documentation. CE marking cannot proceed without this.',
    expected_evidence: [
      'GSPR checklist — each Annex I requirement mapped to evidence or N/A justification',
      'Conformity statements referencing the evidence used per GSPR item',
      'List of harmonised standards applied (EN ISO, EN IEC) with version and dates',
      'Common Specifications (CS) applied where harmonised standards are absent',
      'Justification for non-applicability of any GSPR items',
    ],
    related_requirements: ['MDR-TECH-002', 'MDR-TECH-004', 'COMMON-RISK-005'],
    priority: 'critical',
    tags: ['EU MDR', 'GSPR', 'Annex I', 'CE marking', 'harmonised standards'],
  },

  {
    requirement_id: 'MDR-TECH-002',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Annex II, §1 — Device Description & Specification',
    domain: 'General',
    title: 'Technical File: Device Description',
    description:
      'The technical documentation shall include a full device description specifying: ' +
      'intended purpose, patient and user populations, indications for use, ' +
      'contraindications, variants, accessories, reference to previous and similar ' +
      'device generations, and the UDI-DI.',
    expected_evidence: [
      'Device description document — intended purpose and indications for use',
      'Patient and user population description',
      'Contraindications and warnings',
      'Device variants and accessories list',
      'UDI-DI and UDI-PI assignment and EUDAMED registration records',
      'Reference to previous device generations or similar devices on market',
      'Device classification rationale under MDR Annex VIII',
    ],
    related_requirements: ['MDR-TECH-001', 'MDR-TECH-003'],
    priority: 'critical',
    tags: ['EU MDR', 'Annex II', 'technical file', 'UDI', 'device description'],
  },

  {
    requirement_id: 'MDR-TECH-003',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Annex II, §2 — Design & Manufacturing Information',
    domain: 'QMS',
    title: 'Technical File: Design & Manufacturing',
    description:
      'The technical documentation shall include complete design and manufacturing ' +
      'information sufficient to understand the design, manufacturing process, and ' +
      'how compliance with GSPR requirements has been ensured. Sites and suppliers ' +
      'performing critical manufacturing steps shall be identified.',
    expected_evidence: [
      'Design drawings, schematics, and specifications',
      'Manufacturing site list (own facilities and critical sub-contractors)',
      'Manufacturing process flowchart',
      'Process validation records (sterilisation, forming, coating, welding)',
      'Material specifications and biocompatibility data',
      'Critical component and supply chain qualification records',
      'Quality Agreement references for critical suppliers',
    ],
    related_requirements: ['MDR-TECH-002', 'MDR-TECH-004'],
    priority: 'critical',
    tags: ['EU MDR', 'Annex II', 'manufacturing', 'design', 'supply chain'],
  },

  {
    requirement_id: 'MDR-TECH-004',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Annex II, §4 — Benefit-Risk Analysis & Risk Management',
    domain: 'Risk',
    title: 'Technical File: Benefit-Risk Analysis',
    description:
      'The technical documentation shall include a benefit-risk analysis and a summary ' +
      'of the risk management activities conducted per ISO 14971. The analysis shall ' +
      'demonstrate that the clinical benefits of the device outweigh the residual risks ' +
      'in normal conditions of use.',
    expected_evidence: [
      'Benefit-risk analysis summary document',
      'Risk management summary referencing the full Risk Management File',
      'ISO 14971:2019 conformity statement',
      'Residual risk acceptability conclusion signed by responsible person',
      'List of risk control measures cross-referenced to GSPR conformity evidence',
    ],
    related_requirements: ['COMMON-RISK-005', 'MDR-TECH-001'],
    priority: 'critical',
    tags: ['EU MDR', 'Annex II', 'benefit-risk', 'risk management', 'ISO 14971'],
  },

  {
    requirement_id: 'MDR-TECH-005',
    authority: 'EU_MDR',
    regulation: 'EU MDR 2017/745',
    article: 'Article 61 / Annex XIV — Clinical Evaluation',
    domain: 'Clinical',
    title: 'Clinical Evaluation Report (CER)',
    description:
      'Manufacturers shall plan, conduct, assess, report, and continuously update a ' +
      'clinical evaluation demonstrating conformity with the relevant GSPR in Annex I. ' +
      'The CER shall include a systematic literature review, analysis of own clinical ' +
      'data, equivalence claims (if any), and a clinical benefit-risk determination.',
    expected_evidence: [
      'Clinical Evaluation Plan (CEP)',
      'Clinical Evaluation Report (CER) — systematic literature review included',
      'MEDDEV 2.7/1 Rev 4 or MDCG 2020-6 compliance confirmation',
      'Clinical data from own studies, registries, or literature',
      'Equivalence claim justification (if applicable, with full technical comparison)',
      'CER sign-off by qualified clinical evaluator (CV required)',
    ],
    related_requirements: ['MDR-TECH-001', 'MDR-PMS-002'],
    priority: 'critical',
    tags: ['EU MDR', 'clinical evaluation', 'CER', 'Article 61', 'MEDDEV 2.7/1'],
  },
]
