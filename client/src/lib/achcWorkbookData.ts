export interface WorkbookCheckItem {
  id: string;
  text: string;
}

export interface WorkbookSection {
  id: string;
  title: string;
  description: string;
  items: WorkbookCheckItem[];
}

export const ACHC_WORKBOOK_SECTIONS: WorkbookSection[] = [
  {
    id: "patient-rights",
    title: "Patient Rights & Education",
    description: "Verify patient rights documentation is current, accessible, and actively communicated to patients.",
    items: [
      { id: "pr-1", text: "Patient rights and responsibilities document is current and posted/available" },
      { id: "pr-2", text: "Patients are verbally informed of their rights at intake and annually" },
      { id: "pr-3", text: "Grievance/complaint procedure is documented and communicated to patients" },
      { id: "pr-4", text: "Patient education materials are available in appropriate languages for patient population" },
      { id: "pr-5", text: "Informed consent process is documented for applicable services" },
      { id: "pr-6", text: "Patient privacy practices (HIPAA Notice) are distributed and acknowledged" },
    ],
  },
  {
    id: "policies-procedures",
    title: "Policies & Procedures",
    description: "Confirm all policies are current, accessible to staff, and reflect actual practice.",
    items: [
      { id: "pp-1", text: "All P&P documents are reviewed and updated within required timeframe (annually or as needed)" },
      { id: "pp-2", text: "Staff have acknowledged receipt and review of updated policies" },
      { id: "pp-3", text: "Pharmacy operations manual is accessible to all staff at point of care" },
      { id: "pp-4", text: "High-alert medication policies are current and staff-trained" },
      { id: "pp-5", text: "Adverse drug event reporting policy is in place and followed" },
    ],
  },
  {
    id: "medication-management",
    title: "Medication Management",
    description: "Assess medication storage, handling, dispensing, and reconciliation practices.",
    items: [
      { id: "mm-1", text: "Temperature logs are complete and all excursions are documented with corrective action" },
      { id: "mm-2", text: "Controlled substance records are accurate and match physical inventory" },
      { id: "mm-3", text: "Medication storage areas are clean, organized, and secure" },
      { id: "mm-4", text: "Expired medications are removed and waste properly documented" },
      { id: "mm-5", text: "Medication error reporting process is active; errors documented this quarter are reviewed" },
      { id: "mm-6", text: "Prior authorization and dispensing workflow compliance is verified" },
    ],
  },
  {
    id: "quality-management",
    title: "Quality Management / CQI",
    description: "Review quality improvement activities, incident tracking, and corrective action plans.",
    items: [
      { id: "qm-1", text: "CQI meeting was held this quarter; minutes and attendees documented" },
      { id: "qm-2", text: "All adverse events and near-misses from the quarter are reviewed and documented" },
      { id: "qm-3", text: "Corrective action plans from prior quarter findings are on track or closed" },
      { id: "qm-4", text: "Patient complaint log is reviewed; trends identified and addressed" },
      { id: "qm-5", text: "Key performance indicators (adherence, refill rates, error rates) reviewed and benchmarked" },
    ],
  },
  {
    id: "staff-competency",
    title: "Staff Competency & Training",
    description: "Confirm all staff training, licensing, and competency documentation is current.",
    items: [
      { id: "sc-1", text: "All pharmacist and technician licenses are active and on file" },
      { id: "sc-2", text: "Competency assessments completed for all staff this quarter" },
      { id: "sc-3", text: "Orientation records are on file for any new staff hired this quarter" },
      { id: "sc-4", text: "HIPAA training is current for all staff (annual requirement)" },
      { id: "sc-5", text: "Continuing education tracking is up to date for all licensed staff" },
    ],
  },
  {
    id: "infection-control",
    title: "Infection Control",
    description: "Verify infection prevention practices meet accreditation and regulatory standards.",
    items: [
      { id: "ic-1", text: "Hand hygiene supplies are available and staff adherence is monitored" },
      { id: "ic-2", text: "Cleaning and disinfection logs for compounding/dispensing areas are complete" },
      { id: "ic-3", text: "Sharps disposal and biohazard waste procedures are followed and documented" },
      { id: "ic-4", text: "Staff flu vaccinations or declination documentation is on file for current season" },
      { id: "ic-5", text: "Bloodborne pathogen training is current for applicable staff" },
    ],
  },
  {
    id: "emergency-preparedness",
    title: "Emergency Preparedness",
    description: "Ensure continuity of care plans and emergency procedures are current and staff-trained.",
    items: [
      { id: "ep-1", text: "Emergency operations/continuity of care plan is current and accessible" },
      { id: "ep-2", text: "Staff are trained on emergency procedures (fire, evacuation, power failure)" },
      { id: "ep-3", text: "Emergency contact list for patients, suppliers, and oversight bodies is up to date" },
      { id: "ep-4", text: "Backup dispensing procedures for system outages are documented and tested" },
      { id: "ep-5", text: "Emergency medication supply and access protocols are in place" },
    ],
  },
];
