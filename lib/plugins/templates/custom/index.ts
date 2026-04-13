// ─── Custom Requirement Templates ─────────────────────────────────────────────
// Add organisation-specific or device-specific requirements here.
// All entries must conform to the RequirementTemplate interface in lib/plugins/types.ts
//
// Naming convention for custom IDs: "CUSTOM-{CATEGORY}-{NNN}"
// Examples: "CUSTOM-INTERNAL-001", "CUSTOM-KFDA-001"
//
// To add requirements for a new jurisdiction (e.g. KFDA / MFDS):
//   1. Create a new file alongside this one, e.g. kfda.ts
//   2. Export an array of RequirementTemplate from that file
//   3. Add the import + spread to lib/plugins/loader.ts

import type { RequirementTemplate } from '../../types'

export const customTemplates: RequirementTemplate[] = [
  // Uncomment and edit to add your first custom requirement:
  //
  // {
  //   requirement_id: 'CUSTOM-INTERNAL-001',
  //   authority: 'Custom',
  //   regulation: 'Internal SOP QA-PRO-001',
  //   article: 'Section 3.2 — Design Gate Review',
  //   domain: 'QMS',
  //   title: 'Internal Design Gate Review',
  //   description:
  //     'All device design changes above change category B must pass an internal ' +
  //     'gate review before proceeding to verification. The gate checklist must be ' +
  //     'signed off by QA, R&D, and Regulatory.',
  //   expected_evidence: [
  //     'Completed gate review checklist (QA-FORM-045)',
  //     'QA, R&D, and Regulatory sign-off on checklist',
  //     'Action items list with owners and due dates',
  //   ],
  //   related_requirements: ['FDA-QSR-001'],
  //   priority: 'major',
  //   tags: ['custom', 'internal', 'design gate'],
  // },
]
