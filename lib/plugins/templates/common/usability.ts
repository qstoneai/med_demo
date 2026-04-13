// ─── Common: Usability Engineering / Human Factors (IEC 62366-1) ──────────────
// Required by EU MDR (Annex I §5), FDA Human Factors Guidance (2016).
// Applies to any device with a user interface or patient interaction.

import type { RequirementTemplate } from '../../types'

export const commonUsabilityTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'COMMON-UE-001',
    authority: 'IEC',
    regulation: 'IEC 62366-1:2015+AMD1:2020',
    article: 'Clause 4 — Usability Engineering Process',
    domain: 'Usability',
    title: 'Usability Engineering Process',
    description:
      'The manufacturer shall establish and document a usability engineering (UE) process ' +
      'integrated with design and development activities. The process shall identify ' +
      'intended users, use environments, and user interactions that could result in ' +
      'harm through use error or design-induced difficulty.',
    expected_evidence: [
      'Usability Engineering Plan (or equivalent process description)',
      'Integration of UE process into overall design control procedure',
      'Intended user groups identification (clinicians, patients, lay users)',
      'Use environment characterisation (clinical setting, home, emergency)',
      'Known use problems from predicate devices, complaints, or literature review',
    ],
    related_requirements: ['COMMON-UE-002', 'COMMON-UE-003', 'COMMON-UE-004', 'FDA-QSR-001'],
    priority: 'critical',
    tags: ['IEC 62366', 'usability', 'human factors', 'use error', 'UE process'],
  },

  {
    requirement_id: 'COMMON-UE-002',
    authority: 'IEC',
    regulation: 'IEC 62366-1:2015+AMD1:2020',
    article: 'Clause 5.1 — Use Specification',
    domain: 'Usability',
    title: 'Use Specification',
    description:
      'The manufacturer shall document the use specification, identifying intended user ' +
      'profiles (training level, physical limitations, language), use environments, ' +
      'intended use, user interactions with the device, and potential use errors that ' +
      'could lead to harm.',
    expected_evidence: [
      'Use specification document — approved and version-controlled',
      'Intended user profile(s): training, experience, physical/cognitive limitations',
      'Use environment description: clinical setting, lighting, noise, time pressure',
      'User task list (critical and non-critical tasks)',
      'Foreseeable use errors list (misuse, omission, substitution errors)',
      'User interface characteristics relevant to safety',
    ],
    related_requirements: ['COMMON-UE-001', 'COMMON-UE-003', 'COMMON-SW-003'],
    priority: 'critical',
    tags: ['IEC 62366', 'usability', 'use specification', 'user profile', 'task analysis'],
  },

  {
    requirement_id: 'COMMON-UE-003',
    authority: 'IEC',
    regulation: 'IEC 62366-1:2015+AMD1:2020',
    article: 'Clause 5.7 — Formative Usability Evaluation',
    domain: 'Usability',
    title: 'Formative Usability Evaluation',
    description:
      'The manufacturer shall conduct formative usability evaluations during the design ' +
      'process to identify and resolve usability problems before finalising the user ' +
      'interface. Evaluations shall focus on safety-critical interactions and tasks ' +
      'identified in the use specification.',
    expected_evidence: [
      'Formative evaluation plan(s)',
      'Formative evaluation reports identifying usability issues and severity',
      'Design changes traceable to formative evaluation findings',
      'Heuristic evaluation or cognitive walkthrough records',
      'Simulated use study or user observation records (if conducted)',
      'Log of open vs. resolved usability issues',
    ],
    related_requirements: ['COMMON-UE-002', 'COMMON-UE-004'],
    priority: 'major',
    tags: ['IEC 62366', 'usability', 'formative evaluation', 'design iteration', 'usability testing'],
  },

  {
    requirement_id: 'COMMON-UE-004',
    authority: 'IEC',
    regulation: 'IEC 62366-1:2015+AMD1:2020',
    article: 'Clause 5.9 — Summative Usability Evaluation',
    domain: 'Usability',
    title: 'Summative Evaluation (Human Factors Validation)',
    description:
      'The manufacturer shall conduct a summative usability evaluation with representative ' +
      'users performing critical tasks in a simulated or actual use environment to ' +
      'demonstrate that the device can be used safely and effectively. Use errors and ' +
      'close calls shall be root-cause analysed and residual risks assessed.',
    expected_evidence: [
      'Summative evaluation protocol with participant selection rationale',
      'Representative user participants (correct role, training level)',
      'Critical tasks list with pass/fail/close-call criteria',
      'Summative evaluation report — all observed use errors documented',
      'Root cause analysis for each observed use error and close call',
      'Risk assessment for residual use errors (linked to ISO 14971 risk file)',
      'Conclusion statement that device can be used safely by intended users',
    ],
    related_requirements: ['COMMON-UE-003', 'COMMON-RISK-004', 'FDA-QSR-001'],
    priority: 'critical',
    tags: [
      'IEC 62366',
      'human factors',
      'summative evaluation',
      'FDA HFE',
      'validation',
      'use error',
    ],
  },
]
