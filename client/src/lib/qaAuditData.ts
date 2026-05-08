// QA Audit Readiness — yearly self-audit catalog (~70 items in 7 sections)
// Source: AHF QA AUDIT walkthrough checklist (attached_assets/QA_AUDIT_*.docx)

export interface QaAuditItem {
  id: string;
  title: string;
  detail?: string;
}

export interface QaAuditSection {
  id: string;
  number: string;
  title: string;
  description: string;
  items: QaAuditItem[];
}

export const QA_AUDIT_SECTIONS: QaAuditSection[] = [
  {
    id: "postings-licenses",
    number: "1",
    title: "Postings & Licenses",
    description:
      "Required public-facing postings, pharmacy licenses, and credentials displayed in the pharmacy.",
    items: [
      { id: "pl-1", title: "OSHA poster is current and posted" },
      { id: "pl-2", title: "All pharmacy licenses current and accessible (state BOP, DEA, NPI)" },
      { id: "pl-3", title: "Medicare DMEPOS Supplier Standards Poster posted" },
      { id: "pl-4", title: "Customer Care Line Poster posted (855-894-MEDS)" },
      { id: "pl-5", title: "DMEPOS Certificate posted / on file", detail: "Confirm location" },
      { id: "pl-6", title: "Patient Bill of Rights / Welcome Booklet on display" },
      { id: "pl-7", title: "Emergency drill / Evacuation Route Poster / Emergency Procedure book posted" },
      { id: "pl-8", title: "Visitor log present and being utilized (sign-in on arrival)" },
      { id: "pl-9", title: "Mission Statement & Core Values posted and staff can articulate them" },
      { id: "pl-10", title: "Notice of Privacy Practices posted in patient area" },
    ],
  },
  {
    id: "hazardous-safety",
    number: "2",
    title: "Hazardous & Safety",
    description: "Hazardous drug handling, waste, spills, environmental monitoring, and safety controls.",
    items: [
      { id: "hs-1", title: "Hazardous Medication Area is properly designated and signed" },
      { id: "hs-2", title: "No Hazardous Drugs are stored outside the Hazardous Drugs Area" },
      { id: "hs-3", title: "Hazardous Waste Bins / Disposal Log present and current" },
      { id: "hs-4", title: "Chemical Spill Kit location known and stocked" },
      { id: "hs-5", title: "NIOSH Med List maintained (clipboard or current reference)" },
      { id: "hs-6", title: "Eyewash station accessible — staff know how to use it (run for 15 minutes)" },
      { id: "hs-7", title: "Cleaning supplies stored separately and labeled as Hazardous Materials" },
      { id: "hs-8", title: "Expired Bin, Hazardous Expired Bin, and Recall Bin all present and labeled" },
      { id: "hs-9", title: "StatTemp access confirmed; out-of-range alert emails are being received" },
      { id: "hs-10", title: "Drug Recall Notices are being received and reviewed" },
      { id: "hs-11", title: "Random expiration-date check on shelf and refrigerator stock — no expired drugs found" },
    ],
  },
  {
    id: "controlled-substances",
    number: "3",
    title: "Controlled Substances",
    description: "C-II–C-V controls, perpetual inventory, CSOS, and DEA-related processes.",
    items: [
      { id: "cs-1", title: "C2 Safe access verified; contents reviewed (C2 stock, pharmacy keys, etc.)" },
      { id: "cs-2", title: "Spot-count of 2 different C-II drugs matches the book and McKesson counts" },
      { id: "cs-3", title: "CSOS access (Cardinal) confirmed for ordering controls" },
      { id: "cs-4", title: "Pharmacy Keys & Key Log maintained; key storage location known" },
      { id: "cs-5", title: "DEA / BOP audit contact known: PharmacyLeadership@ahfrx.org" },
      { id: "cs-6", title: "Insurance Audit contact known: ahfpharmacyaudits@aidshealth.org" },
      { id: "cs-7", title: "Prescription RTS dates checked in Will Call area — no overdue items" },
      { id: "cs-8", title: "Inventory Adjustment process documented and followed" },
    ],
  },
  {
    id: "systems-access",
    number: "4",
    title: "Systems & Access",
    description: "Required system logins, vendor portals, and reference tools used day-to-day.",
    items: [
      { id: "sa-1", title: "Access to Dynamedex & Clinical Pharmacology verified" },
      { id: "sa-2", title: "Pitney Bowes — login, scale, and history accessible" },
      { id: "sa-3", title: "Tracking Number lookup process known (PitneyBowes & McKesson / CRC)" },
      { id: "sa-4", title: "Outcomes MTM login works and pharmacist can run a case" },
      { id: "sa-5", title: "REMS Drugs list maintained and known by staff" },
      { id: "sa-6", title: "RLDatix access verified for all required users" },
      { id: "sa-7", title: "PT ID lookup to link Eagle with McKesson is documented" },
      { id: "sa-8", title: "MSDS access (Cardinal) verified" },
      { id: "sa-9", title: "Drug Monograph print process verified (McKesson + QR Code on label)" },
      { id: "sa-10", title: "Domo access verified — staff know what reports they work on" },
      { id: "sa-11", title: "ClerkChat is functioning and used per workflow" },
      { id: "sa-12", title: "ServiceNow used for new equipment / IT requests" },
    ],
  },
  {
    id: "records-policies",
    number: "5",
    title: "Records & Policies",
    description: "Personnel files, retention, complaint handling, and policy/procedure access.",
    items: [
      { id: "rp-1", title: "New hire paperwork location identified and completed for current staff" },
      { id: "rp-2", title: "Expired Medication Pulling Log present and process is followed" },
      { id: "rp-3", title: "Self-Assessment completed (due 7/1 each year)" },
      { id: "rp-4", title: "Records retention policy followed (10 years)" },
      { id: "rp-5", title: "Medicare Forms accessible on AHFConnect" },
      { id: "rp-6", title: "Contribution Profile on AHFConnect reviewed" },
      { id: "rp-7", title: "Employee Handbook accessible on AHFConnect" },
      { id: "rp-8", title: "Policy & Procedures manual accessible on AHFConnect" },
      { id: "rp-9", title: "Patient Complaint handling process documented and known" },
      { id: "rp-10", title: "Most recent CQI/CQI-QRE Meeting reviewed; topic and action items documented" },
      { id: "rp-11", title: "Medicare Complaint Log maintained" },
      { id: "rp-12", title: "Chain of command on AHFConnect — staff can locate it" },
    ],
  },
  {
    id: "operations-workflow",
    number: "6",
    title: "Operations & Workflow",
    description: "Day-to-day pharmacy operations, communications, and patient-facing standards.",
    items: [
      { id: "ow-1", title: "Delivery receipt signatures stored and retrievable" },
      { id: "ow-2", title: "Language Line — printed instructions posted at each station" },
      { id: "ow-3", title: "PSL Driver communication list / phone numbers posted" },
      { id: "ow-4", title: "Cold-chain shipping process documented; staff can describe it" },
      { id: "ow-5", title: "Shredder boxes locked, key controlled, and emptied on schedule" },
      { id: "ow-6", title: "Technicians know when to bring a pharmacist over for counseling" },
      { id: "ow-7", title: "Cleaning Log up to date — separate trays/solutions for hazardous vs non-hazardous" },
      { id: "ow-8", title: "Phone answering & patient interaction observed — no screening at pickup window" },
      { id: "ow-9", title: "All staff wearing visible AHF badge" },
      { id: "ow-10", title: "Dress code observed — scrubs, no open-toed shoes" },
    ],
  },
  {
    id: "training-credentials",
    number: "7",
    title: "Training & Credentials",
    description: "Required training, certifications, and continuing education for pharmacy staff.",
    items: [
      { id: "tc-1", title: "Pharmacist AAHIVP Certificate(s) on file and current" },
      { id: "tc-2", title: "Continuing Education credits current for all pharmacists" },
      { id: "tc-3", title: "HIPAA training completed by all staff this year" },
      { id: "tc-4", title: "Sexual Harassment / mandatory state training completed by all staff" },
      { id: "tc-5", title: "California Violence in the Workplace training completed (CA stores)" },
      { id: "tc-6", title: "New hire orientation completed for all staff hired this year" },
      { id: "tc-7", title: "Annual competency assessments completed for technicians" },
      { id: "tc-8", title: "BLS/CPR certifications current where applicable" },
    ],
  },
];

export function getAllQaAuditItems(): QaAuditItem[] {
  return QA_AUDIT_SECTIONS.flatMap((s) => s.items);
}

export function findQaAuditItem(itemId: string): { section: QaAuditSection; item: QaAuditItem } | null {
  for (const section of QA_AUDIT_SECTIONS) {
    const item = section.items.find((i) => i.id === itemId);
    if (item) return { section, item };
  }
  return null;
}

export function getCurrentAuditYear(): string {
  return String(new Date().getFullYear());
}

export const QA_AUDIT_TOTAL_ITEMS = getAllQaAuditItems().length;
