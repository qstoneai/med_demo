// ─── Common: Software Lifecycle / Validation (IEC 62304) ──────────────────────
// Applies to any medical device that includes software (including SaMD).
// Safety class (A / B / C) determines which clauses are mandatory.

import type { RequirementTemplate } from '../../types'

export const commonSwValidationTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'COMMON-SW-001',
    authority: 'IEC',
    regulation: 'IEC 62304:2006+AMD1:2015',
    article: 'Clause 4.3 — Software Safety Classification',
    domain: 'SWValidation',
    title: 'Software Safety Classification',
    description:
      'The manufacturer shall assign a software safety class (A, B, or C) to each ' +
      'software item based on the severity of harm that could result from a software ' +
      'failure. Class A: no injury or damage. Class B: non-serious injury possible. ' +
      'Class C: death or serious injury possible. The classification determines which ' +
      'IEC 62304 activities are required.',
    expected_evidence: [
      'Software safety classification document with Class A / B / C assignment',
      'Classification rationale linked to hazard analysis and ISO 14971 FMEA',
      'Software items list with individual safety class assignments',
      'Justification for absence of Class C designation if software controls safety-critical functions',
      'Review and approval record for classification decision',
    ],
    related_requirements: ['COMMON-SW-002', 'COMMON-RISK-002', 'COMMON-CYBER-001'],
    priority: 'critical',
    tags: ['IEC 62304', 'software', 'safety class', 'SaMD', 'classification'],
  },

  {
    requirement_id: 'COMMON-SW-002',
    authority: 'IEC',
    regulation: 'IEC 62304:2006+AMD1:2015',
    article: 'Clause 5.1 — Software Development Planning',
    domain: 'SWValidation',
    title: 'Software Development Plan (SDP)',
    description:
      'The manufacturer shall document a Software Development Plan identifying the ' +
      'lifecycle model, deliverables, milestones, applicable standards, tools, and ' +
      'methods for each development phase. The SDP shall be consistent with the safety ' +
      'class and updated whenever scope or approach changes.',
    expected_evidence: [
      'Software Development Plan (SDP) — approved and version-controlled',
      'Development lifecycle model description (waterfall, agile, V-model)',
      'Tool qualification records (for Class B/C tools affecting safety outputs)',
      'Coding standards and guidelines reference',
      'Software configuration management (SCM) plan or procedure',
      'Problem resolution process reference',
    ],
    related_requirements: ['COMMON-SW-001', 'COMMON-SW-003', 'COMMON-CYBER-002'],
    priority: 'critical',
    tags: ['IEC 62304', 'software', 'development plan', 'SDP', 'configuration management'],
  },

  {
    requirement_id: 'COMMON-SW-003',
    authority: 'IEC',
    regulation: 'IEC 62304:2006+AMD1:2015',
    article: 'Clause 5.2 — Software Requirements Analysis',
    domain: 'SWValidation',
    title: 'Software Requirements Specification (SRS)',
    description:
      'The manufacturer shall analyse and document all software requirements derived ' +
      'from system requirements, risk management outputs, and regulatory requirements. ' +
      'Requirements shall cover: functional behaviour, inputs/outputs, interfaces, ' +
      'performance, security, and usability. Each requirement shall be uniquely ' +
      'identified for traceability.',
    expected_evidence: [
      'Software Requirements Specification (SRS) — uniquely numbered requirements',
      'Traceability from system/device requirements to software requirements',
      'Security and privacy software requirements (mandatory for Class B/C)',
      'User interface and usability software requirements',
      'Software interface requirements (hardware, OS, third-party)',
      'SRS review record with sign-off',
    ],
    related_requirements: ['COMMON-SW-002', 'COMMON-SW-004', 'COMMON-UE-002'],
    priority: 'critical',
    tags: ['IEC 62304', 'software requirements', 'SRS', 'traceability', 'specification'],
  },

  {
    requirement_id: 'COMMON-SW-004',
    authority: 'IEC',
    regulation: 'IEC 62304:2006+AMD1:2015',
    article: 'Clause 5.5 / 5.6 — Software Verification & Integration Testing',
    domain: 'SWValidation',
    title: 'Software Verification & Integration Testing',
    description:
      'The manufacturer shall perform verification at each development stage to confirm ' +
      'software units implement their specifications correctly. Integration testing shall ' +
      'verify that software items interact as intended. All anomalies shall be recorded, ' +
      'resolved, and re-tested.',
    expected_evidence: [
      'Software verification plan and test procedures',
      'Unit test records with pass/fail results and defect references',
      'Integration test protocols and results',
      'Anomaly/defect tracking records (open and resolved)',
      'Regression test records for software changes',
      'Test coverage metrics (for Class B/C: statement or branch coverage)',
      'Verification completion confirmation by responsible engineer',
    ],
    related_requirements: ['COMMON-SW-003', 'COMMON-SW-005'],
    priority: 'critical',
    tags: [
      'IEC 62304',
      'software verification',
      'integration testing',
      'unit test',
      'test coverage',
    ],
  },

  {
    requirement_id: 'COMMON-SW-005',
    authority: 'IEC',
    regulation: 'IEC 62304:2006+AMD1:2015',
    article: 'Clause 5.8 — Software Release',
    domain: 'SWValidation',
    title: 'Software Release Records',
    description:
      'The manufacturer shall document and archive the software being released with ' +
      'a unique version identifier. The release shall confirm all planned verification ' +
      'activities are complete, list known anomalies with their risk assessments, and ' +
      'be authorised by a responsible person.',
    expected_evidence: [
      'Software release record with unique version identifier (e.g. semantic version)',
      'Known anomaly list with individual risk assessments',
      'Release authorisation record (dated signature of responsible person)',
      'Software archive / baseline record in configuration management system',
      'Confirmation that all verification activities are complete',
      'Release notes for distribution',
    ],
    related_requirements: ['COMMON-SW-004', 'COMMON-CYBER-002'],
    priority: 'major',
    tags: ['IEC 62304', 'software release', 'version control', 'baseline', 'release notes'],
  },
]
