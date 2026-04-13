// ─── Common: Cybersecurity ────────────────────────────────────────────────────
// Covers FDA Cybersecurity Guidance (2023), IEC 81001-5-1:2021, and NIST.
// Apply to any networked or software-enabled medical device.

import type { RequirementTemplate } from '../../types'

export const commonCybersecurityTemplates: RequirementTemplate[] = [
  {
    requirement_id: 'COMMON-CYBER-001',
    authority: 'FDA',
    regulation: 'FDA Cybersecurity in Medical Devices Guidance (2023)',
    article: 'Section IV.A — Threat Modeling',
    domain: 'Cybersecurity',
    title: 'Threat Modeling',
    description:
      'Manufacturers shall conduct and document a structured threat model identifying ' +
      'all assets (data, functions, communications), entry points, applicable threats, ' +
      'threat likelihood, and mitigations. The threat model shall be maintained ' +
      'throughout the product lifecycle and updated whenever the attack surface changes.',
    expected_evidence: [
      'Threat model document (STRIDE, PASTA, MITRE ATT&CK for ICS, or equivalent methodology)',
      'Asset inventory with sensitivity classification (PHI, device configuration, firmware)',
      'Entry point and attack surface documentation (ports, interfaces, protocols)',
      'Threat-to-mitigation mapping table',
      'Threat model review records and change history',
      'Threat model scope statement tying to device architecture diagram',
    ],
    related_requirements: ['COMMON-CYBER-002', 'COMMON-CYBER-004', 'COMMON-RISK-002'],
    priority: 'critical',
    tags: ['cybersecurity', 'threat modeling', 'STRIDE', 'attack surface', 'FDA 2023'],
  },

  {
    requirement_id: 'COMMON-CYBER-002',
    authority: 'FDA',
    regulation: 'FDA Cybersecurity in Medical Devices Guidance (2023)',
    article: 'Section IV.B — Software Bill of Materials (SBOM)',
    domain: 'Cybersecurity',
    title: 'Software Bill of Materials (SBOM)',
    description:
      'Manufacturers shall provide a complete, machine-readable SBOM listing every ' +
      'commercial, open-source, and off-the-shelf software component included in the ' +
      'device, including version numbers. The SBOM enables post-market vulnerability ' +
      'identification and must be updated with each software release.',
    expected_evidence: [
      'SBOM in a machine-readable format (SPDX, CycloneDX, or SWID Tags)',
      'All third-party and open-source components listed with version and license',
      'Component version change tracking process documentation',
      'SBOM update procedure tied to software change control and release process',
      'Vulnerability monitoring process referencing SBOM (e.g. NVD/CVE monitoring)',
    ],
    related_requirements: ['COMMON-CYBER-001', 'COMMON-CYBER-003', 'COMMON-SW-001'],
    priority: 'critical',
    tags: ['cybersecurity', 'SBOM', 'software components', 'open source', 'FDA 2023'],
  },

  {
    requirement_id: 'COMMON-CYBER-003',
    authority: 'FDA',
    regulation: 'FDA Cybersecurity in Medical Devices Guidance (2023)',
    article: 'Section IV.C — Vulnerability & Patch Management',
    domain: 'Cybersecurity',
    title: 'Patch & Vulnerability Management Plan',
    description:
      'Manufacturers shall establish and document a plan for identifying, assessing, and ' +
      'deploying security patches and updates throughout the device\'s supported lifetime. ' +
      'The plan shall define response timelines by severity (CVSS score), include a ' +
      'coordinated vulnerability disclosure policy, and ensure the device can receive ' +
      'out-of-band updates.',
    expected_evidence: [
      'Patch management plan with response timelines by severity tier',
      'Coordinated vulnerability disclosure (CVD) policy',
      'Vulnerability severity rating criteria (CVSS 3.1 or higher)',
      'Out-of-band patch deployment capability evidence (test records)',
      'Post-market vulnerability monitoring SOP',
      'Communication plan for notifying customers of security updates',
    ],
    related_requirements: ['COMMON-CYBER-002', 'MDR-PMS-001'],
    priority: 'major',
    tags: ['cybersecurity', 'patch management', 'vulnerability', 'CVSS', 'post-market'],
  },

  {
    requirement_id: 'COMMON-CYBER-004',
    authority: 'IEC',
    regulation: 'IEC 81001-5-1:2021',
    article: 'Clause 5 — Security Risk Management',
    domain: 'Cybersecurity',
    title: 'Cybersecurity Risk Management Integration with ISO 14971',
    description:
      'Cybersecurity threats that can affect patient safety shall be identified, ' +
      'assessed, and controlled as part of the overall safety risk management process ' +
      'per ISO 14971. Security risks to safety shall appear in the Risk Management File ' +
      'alongside functional hazards.',
    expected_evidence: [
      'Cybersecurity risk entries in the ISO 14971 Risk Management File',
      'Security-specific hazard analysis referencing IEC 81001-5-1',
      'Security controls mapped to ISO 14971 risk control measures',
      'Combined safety-and-security risk review meeting records',
      'Residual cybersecurity risk acceptability determination',
    ],
    related_requirements: ['COMMON-RISK-002', 'COMMON-RISK-004', 'COMMON-CYBER-001'],
    priority: 'major',
    tags: [
      'cybersecurity',
      'IEC 81001-5-1',
      'ISO 14971',
      'safety integration',
      'security risk',
    ],
  },
]
