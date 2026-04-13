// ─── Common: Risk Management (ISO 14971:2019) ─────────────────────────────────
// Required by: FDA submissions, EU MDR technical file, ISO 13485 QMS.
// These requirements apply regardless of market — all risk management evidence
// should be traceable back to ISO 14971.

import type { RequirementTemplate } from '../../types'

export const commonRiskTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'COMMON-RISK-001',
    authority: 'ISO',
    regulation: 'ISO 14971:2019',
    article: 'Clause 4 — Risk Management Planning',
    domain: 'Risk',
    title: 'Risk Management Plan',
    description:
      'The manufacturer shall establish and document a risk management plan that covers the ' +
      'entire lifecycle of the device. The plan shall define the scope, responsibilities, ' +
      'risk acceptability criteria (probability × severity thresholds), and the methods to ' +
      'be used for risk analysis.',
    expected_evidence: [
      'Risk Management Plan (documented, dated, and approved)',
      'Risk acceptability criteria matrix (probability × severity thresholds)',
      'Identification of responsible personnel and their qualifications',
      'Device lifecycle scope statement (concept through decommission)',
      'Reference to applicable regulations and standards (ISO 14971, MDR, FDA)',
    ],
    related_requirements: [
      'COMMON-RISK-002',
      'COMMON-RISK-003',
      'COMMON-RISK-004',
      'COMMON-RISK-005',
    ],
    priority: 'critical',
    tags: ['ISO 14971', 'risk', 'planning', 'lifecycle', 'RMP'],
  },

  {
    requirement_id: 'COMMON-RISK-002',
    authority: 'ISO',
    regulation: 'ISO 14971:2019',
    article: 'Clause 5 — Risk Analysis',
    domain: 'Risk',
    title: 'Risk Analysis (Hazard Identification & Estimation)',
    description:
      'The manufacturer shall identify all known and foreseeable hazards associated with ' +
      'the device in both normal and fault conditions. For each hazardous situation the ' +
      'probability of occurrence and severity of harm shall be estimated. Appropriate ' +
      'methods (FMEA, FTA, HAZOP, PHA, or equivalent) shall be used and documented.',
    expected_evidence: [
      'Hazard identification records (all foreseeable hazards listed by category)',
      'Risk estimation records for each hazardous situation (P × S)',
      'FMEA, FTA, or equivalent risk analysis document',
      'Severity classification scheme with clinical rationale',
      'Probability estimation rationale (field data, literature, or expert judgement)',
      'Intended use and reasonably foreseeable misuse documentation',
    ],
    related_requirements: ['COMMON-RISK-001', 'COMMON-RISK-003', 'COMMON-CYBER-004'],
    priority: 'critical',
    tags: ['ISO 14971', 'hazard', 'FMEA', 'FTA', 'risk analysis', 'probability'],
  },

  {
    requirement_id: 'COMMON-RISK-003',
    authority: 'ISO',
    regulation: 'ISO 14971:2019',
    article: 'Clause 6 — Risk Evaluation',
    domain: 'Risk',
    title: 'Risk Evaluation',
    description:
      'For each identified hazardous situation the manufacturer shall compare the estimated ' +
      'risk to the risk acceptability criteria defined in the Risk Management Plan and ' +
      'decide whether risk reduction is required. Risks that are not broadly acceptable ' +
      'shall proceed to risk control.',
    expected_evidence: [
      'Risk evaluation records comparing each estimated risk to acceptability criteria',
      'List of hazardous situations requiring risk control vs. those accepted as-is',
      'Documented rationale for each accept/control decision',
      'ALARP (As Low As Reasonably Practicable) consideration records where applicable',
    ],
    related_requirements: ['COMMON-RISK-002', 'COMMON-RISK-004'],
    priority: 'critical',
    tags: ['ISO 14971', 'risk evaluation', 'ALARP', 'acceptability', 'decision'],
  },

  {
    requirement_id: 'COMMON-RISK-004',
    authority: 'ISO',
    regulation: 'ISO 14971:2019',
    article: 'Clause 7 — Risk Control',
    domain: 'Risk',
    title: 'Risk Control Measures',
    description:
      'The manufacturer shall select and implement risk control measures following the ' +
      'prescribed priority order: (1) inherent safety by design, (2) protective measures ' +
      'in the device or manufacturing process, (3) information for safety. Each measure ' +
      'shall be verified for implementation and effectiveness, and shall not introduce ' +
      'new hazards.',
    expected_evidence: [
      'Risk control measures list with implementation status for each hazardous situation',
      'Rationale for chosen control type (design / protective / informational)',
      'Verification records confirming each measure was implemented and effective',
      'Evidence confirming control measures do not introduce new hazards',
      'Design change records or labelling change records tied to risk controls',
      'Residual risk estimate after each control measure applied',
    ],
    related_requirements: ['COMMON-RISK-003', 'COMMON-RISK-005', 'COMMON-UE-004'],
    priority: 'critical',
    tags: ['ISO 14971', 'risk control', 'mitigation', 'verification', 'hierarchy'],
  },

  {
    requirement_id: 'COMMON-RISK-005',
    authority: 'ISO',
    regulation: 'ISO 14971:2019',
    article: 'Clause 8 — Residual Risk Evaluation & Clause 9 — Review',
    domain: 'Risk',
    title: 'Residual Risk Evaluation & Risk Management Report',
    description:
      'After applying all risk control measures the manufacturer shall evaluate the overall ' +
      'residual risk against the risk acceptability criteria. If not acceptable, a formal ' +
      'benefit-risk determination shall be documented. The Risk Management Report (RMR) ' +
      'shall confirm the plan was implemented and all risks are acceptable.',
    expected_evidence: [
      'Residual risk evaluation record for each hazardous situation post-control',
      'Overall residual risk assessment (aggregate of all residual risks)',
      'Benefit-risk determination document (required if residual risk is not negligible)',
      'Risk Management Report (RMR) signed by authorised person',
      'RMR statement confirming the Risk Management Plan was fully implemented',
      'Statement that all identified risks are evaluated and addressed',
    ],
    related_requirements: ['COMMON-RISK-004', 'MDR-TECH-004', 'FDA-510K-003'],
    priority: 'critical',
    tags: ['ISO 14971', 'residual risk', 'benefit-risk', 'RMR', 'report'],
  },
]
