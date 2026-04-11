export type ItemStatus = "complete" | "in_progress" | "gap" | "na" | "";

export interface WorkbookCheckItem {
  id: string;
  standard: string;
  requirement: string;
  ahfAction: string;
  evidence: string;
}

export interface InterviewQA {
  id: string;
  question: string;
  answer: string;
  audience: string;
}

export interface WorkbookSection {
  id: string;
  sectionNumber: string;
  title: string;
  description: string;
  items: WorkbookCheckItem[];
}

// ── Document vault types ─────────────────────────────────────────────────────

/** A foundation-wide AHF document that maps to one DRX workbook item.
 *  The `url` is blank until CPO/RPD pastes in the actual link.
 *  `itemId` corresponds to `drxItemId` in the task specification. */
export interface FoundationDocTemplate {
  id: string;
  /** DRX workbook row identifier (same field as `drxItemId` in spec terminology). */
  itemId: string;
  label: string;
  description: string;
}

/** A store-specific document attached by a Pharmacy Director for their site. */
export interface StoreDoc {
  id: string;
  siteId: string;
  itemId: string;
  label: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

/** Pre-populated list of all 24 foundation-wide documents mapped to their DRX item IDs. */
export const FOUNDATION_DOC_TEMPLATES: FoundationDocTemplate[] = [
  // Section 1 — Org & Administration
  { id: "fd-01", itemId: "s1-1", label: "Articles of Incorporation", description: "AHF legal authority to operate" },
  { id: "fd-02", itemId: "s1-2", label: "Governing Body Bylaws / Ownership Documentation", description: "AHF governing body authority and duties" },
  { id: "fd-03", itemId: "s1-3", label: "AHF Conflict of Interest (COI) Policy & Procedures", description: "Foundation-wide COI policy" },
  { id: "fd-04", itemId: "s1-4", label: "AHF Organizational Chart (Jan 2025)", description: "Current org chart — post in every pharmacy location" },
  { id: "fd-05", itemId: "s1-6", label: "Pharmacy Policy & Procedure (P&P) Manual", description: "Current P&P manual with last review date" },
  { id: "fd-06", itemId: "s1-7", label: "Patient Welcome Booklet — English", description: "Covers DMEPOS (pg. 7-10) and Patient Rights (pg. 14-16)" },
  { id: "fd-07", itemId: "s1-7", label: "Patient Welcome Booklet — Spanish", description: "Spanish-language version for distribution" },
  { id: "fd-08", itemId: "s1-7", label: "Initial Assessment Form Template", description: "Template with 'provided' checkbox for Welcome Booklet" },
  // Section 2 — Program / Service Operations
  { id: "fd-09", itemId: "s2-5", label: "AHF Abuse / Mistreatment Reporting P&P", description: "Policy for reporting neglect, abuse, misappropriation" },
  { id: "fd-10", itemId: "s2-8", label: "Customer Care Line (CCL) Poster — 855-894-MEDS", description: "Post in public/patient waiting area" },
  { id: "fd-11", itemId: "s2-9", label: "AHF HIPAA Policy & Procedures", description: "PHI/ePHI securing and release policy" },
  { id: "fd-12", itemId: "s2-9", label: "Notice of Privacy Practices", description: "Patient-facing NPP — post and distribute" },
  { id: "fd-13", itemId: "s2-10", label: "Business Associate Agreement (BAA) Template", description: "Executed with all vendors having PHI access" },
  { id: "fd-14", itemId: "s2-11", label: "AHF Ethics P&P", description: "Policy on ethical issues identification and resolution" },
  { id: "fd-15", itemId: "s2-12", label: "Language Line Instructions / Poster", description: "Posted instructions — never contact patients directly" },
  { id: "fd-16", itemId: "s2-13", label: "Cultural Competency P&P", description: "Policy for serving diverse patient populations" },
  { id: "fd-17", itemId: "s2-14", label: "AHF Compliance Program P&P", description: "Fraud and abuse prevention; Hotline 1-800-243-7448" },
  { id: "fd-18", itemId: "s2-15", label: "CCL After-Hours Call Routing Policy", description: "24/7 CCL coverage; forwarded to CRC-West" },
  // Section 3 — Fiscal Management
  { id: "fd-19", itemId: "s3-1", label: "Annual Budget Documentation", description: "Budget with pharmacy leadership participation records" },
  // Section 4 — Human Resources
  { id: "fd-20", itemId: "s4-3", label: "Job Descriptions — All Pharmacy Positions", description: "Current JDs matching org chart roles" },
  { id: "fd-21", itemId: "s4-5", label: "AHF Employee Handbook", description: "Accessible via AHF Connect Home Page" },
  { id: "fd-22", itemId: "s4-11", label: "CCL Operational Documentation (24/7 Pharmacist Access)", description: "After-hours pharmacist coverage via CRC-West" },
  { id: "fd-23", itemId: "s4-12", label: "Pharmacist Supervision P&P", description: "State BOP pharmacist-to-tech ratio requirements" },
  { id: "fd-24", itemId: "s4-14", label: "UpToDate & Facts & Comparison Subscription Confirmation", description: "Reference library access for all pharmacists/staff" },
];

export const ACHC_WORKBOOK_SECTIONS: WorkbookSection[] = [
  {
    id: "sec1-org-admin",
    sectionNumber: "1",
    title: "Organization & Administration",
    description: "Legal authority, licensing, governance, and organizational structure requirements per ACHC DRX 1 standards.",
    items: [
      {
        id: "s1-1",
        standard: "DRX 1-1A/B",
        requirement: "Legal authority to operate; valid licensure, Articles of Incorporation on file",
        ahfAction: "Confirm federal, state, and local pharmacy licenses are current and accessible",
        evidence: "Current pharmacy licenses (state BOP, DEA, NPI); Articles of Incorporation",
      },
      {
        id: "s1-2",
        standard: "DRX 1-2A",
        requirement: "Governing body/owner assumes full legal authority; duties clearly defined",
        ahfAction: "AHF governing body documentation reviewed and available",
        evidence: "Governing body bylaws or ownership documentation",
      },
      {
        id: "s1-3",
        standard: "DRX 1-3A",
        requirement: "Written conflict-of-interest policy established and implemented",
        ahfAction: "Staff can identify where COI policy is located",
        evidence: "AHF COI Policy & Procedures; signed disclosures on file",
      },
      {
        id: "s1-4",
        standard: "DRX 1-5A",
        requirement: "Org chart shows lines of authority for all positions; posted or easily retrievable at each site",
        ahfAction: "Post current Jan-2025 org chart in every pharmacy location",
        evidence: "Org chart posted on wall; URL: Dropbox link per Module 1 slide 13",
      },
      {
        id: "s1-5",
        standard: "DRX 1-7A",
        requirement: "Compliance with all applicable federal, state, and local laws and regulations",
        ahfAction: "Pharmacy Director aware of all active regulatory requirements",
        evidence: "State BOP inspection records; DMEPOS supplier standards compliance docs",
      },
      {
        id: "s1-6",
        standard: "DRX 1-8A",
        requirement: "Organization complies with accepted professional standards of practice",
        ahfAction: "P&Ps align with current pharmacy practice standards",
        evidence: "Current P&P manual; date of last review",
      },
      {
        id: "s1-7",
        standard: "DRX 1-9A",
        requirement: "CMS DMEPOS Supplier and Quality Standards compliance (Medicare/Medicaid billers)",
        ahfAction: "Patient Welcome Booklet provided to all new patients (pg. 7-10); marked in Initial Assessment",
        evidence: "Patient Welcome Booklet (English & Spanish); Initial Assessment form w/ checkbox",
      },
      {
        id: "s1-8",
        standard: "DRX 1-10A",
        requirement: "Negative outcomes, sanctions, regulatory inspections reported to ACHC/CMS within 30 days",
        ahfAction: "Share all audit/inspection results with Pharmacy Regional → escalate to leadership",
        evidence: "Documentation of any regulatory findings; correspondence to ACHC/CMS",
      },
    ],
  },
  {
    id: "sec2-program-ops",
    sectionNumber: "2",
    title: "Program / Service Operations",
    description: "Patient rights, privacy, grievance procedures, DMEPOS standards, and service operations per ACHC DRX 2 standards.",
    items: [
      {
        id: "s2-1",
        standard: "DRX 2-1B",
        requirement: "Written P&P on description of care/services; patients informed of geographic area, pharmacist contact, Rx status, claims info, network status",
        ahfAction: "Ensure patients receive service description info at onboarding",
        evidence: "Patient Welcome Booklet; AHF Pharmacy website resources",
      },
      {
        id: "s2-2",
        standard: "DRX 2-2A / 2-2A.01",
        requirement: "Written P&P on Client/Patient Rights & Responsibilities distributed to all patients",
        ahfAction: "Provide Welcome Booklet to all new specialty patients; document in Initial Assessment",
        evidence: "Welcome Booklet pg. 14-16; Initial Assessment with 'provided' checkbox marked",
      },
      {
        id: "s2-3",
        standard: "DRX 2-2B",
        requirement: "Organization actively protects and promotes patient rights",
        ahfAction: "Staff can describe how patient rights are upheld in practice",
        evidence: "P&P on patient rights; staff training documentation",
      },
      {
        id: "s2-4",
        standard: "DRX 2-2C",
        requirement: "DMEPOS Supplier Standards distributed to each Medicare recipient",
        ahfAction: "Welcome Booklet provided; pg. 7-10 covers DMEPOS standards",
        evidence: "Welcome Booklet pg. 7-10; delivery/receipt documentation",
      },
      {
        id: "s2-5",
        standard: "DRX 2-3A",
        requirement: "P&P for reporting/investigating mistreatment, neglect, verbal/sexual/physical abuse, misappropriation of patient property",
        ahfAction: "Staff know how to report abuse incidents; policy accessible",
        evidence: "AHF abuse reporting P&P; incident log; staff training records",
      },
      {
        id: "s2-6",
        standard: "DRX 2-4A",
        requirement: "At initiation of care, patient informed how to report grievances/complaints and investigation process",
        ahfAction: "Communicate complaint process at patient intake; document in chart",
        evidence: "Welcome Booklet pg. 18; Initial Assessment documentation",
      },
      {
        id: "s2-7",
        standard: "DRX 2-4B",
        requirement: "Medicare patients notified within 5 calendar days of receiving complaint (oral, phone, email, fax, or letter)",
        ahfAction: "If unable to resolve in-store, refer to Customer Care Line; document in SalesForce/RLDatix",
        evidence: "SalesForce/RLDatix complaint records; CCL referral documentation",
      },
      {
        id: "s2-8",
        standard: "DRX 2-4C",
        requirement: "Patients have written info with phone number, contact person, and complaint resolution process",
        ahfAction: "Customer Care Line poster posted in public/waiting area (visible to patients)",
        evidence: "CCL poster on wall (855-894-MEDS); AHF Compliance Hotline 1-800-243-7448",
      },
      {
        id: "s2-9",
        standard: "DRX 2-5A",
        requirement: "Written P&P on securing and releasing PHI and ePHI; Notice of Privacy Practices",
        ahfAction: "Staff trained on PHI handling; Notice of Privacy Practices available to patients",
        evidence: "HIPAA P&P; Notice of Privacy Practices (posted/distributed); BAA for business associates",
      },
      {
        id: "s2-10",
        standard: "DRX 2-5C",
        requirement: "Business Associate Agreements (BAAs) in place for all vendors with PHI access",
        ahfAction: "Confirm BAAs executed for all third-party vendors accessing patient data",
        evidence: "BAA log; executed BAA documents on file",
      },
      {
        id: "s2-11",
        standard: "DRX 2-7A/B",
        requirement: "Written P&P on identification, evaluation, and discussion of ethical issues",
        ahfAction: "Staff aware of ethics policy; ethics training completed",
        evidence: "Ethics P&P; AHF U training completion records (annual)",
      },
      {
        id: "s2-12",
        standard: "DRX 2-8A",
        requirement: "Written P&P for serving patients with communication or language barriers",
        ahfAction: "Language Line posted with instructions; staff know process; ScripTalk Reader available",
        evidence: "Language Line poster and instructions; ScripTalk Reader documentation",
      },
      {
        id: "s2-13",
        standard: "DRX 2-8B",
        requirement: "Written P&P for serving patients from diverse cultural backgrounds, beliefs, and religions",
        ahfAction: "Staff trained on cultural competency; resources available",
        evidence: "Cultural competency P&P; training records",
      },
      {
        id: "s2-14",
        standard: "DRX 2-9A",
        requirement: "Written Compliance Program P&P aimed at preventing fraud and abuse",
        ahfAction: "Staff aware of AHF Compliance Program; AHF Compliance Hotline known",
        evidence: "Compliance Program P&P; AHF Compliance Hotline (1-800-243-7448)",
      },
      {
        id: "s2-15",
        standard: "DRX 2-10C",
        requirement: "Appropriate personnel available during posted hours; after-hours answering system in place",
        ahfAction: "Customer Care Line (CCL) active 24/7 with pharmacist access; after-hours forwarded to CRC-West",
        evidence: "CCL contact info; after-hours call routing documentation",
      },
      {
        id: "s2-16",
        standard: "DRX 2-10F",
        requirement: "Toll-free number; phone system tracks call wait times, time to speak to clinician, abandonment rate",
        ahfAction: "Call metrics monitored monthly: ≤30 sec avg speed, ≤5% abandonment, ≥85% answered in 30 sec",
        evidence: "Monthly store stats report; Cisco call metrics dashboard",
      },
    ],
  },
  {
    id: "sec3-fiscal",
    sectionNumber: "3",
    title: "Fiscal Management",
    description: "Budget processes, accurate billing, patient financial counseling, and payor compliance per ACHC DRX 3 standards.",
    items: [
      {
        id: "s3-1",
        standard: "DRX 3-1A",
        requirement: "Annual budget developed collaboratively with management/personnel under governing body direction",
        ahfAction: "AHF budget process documented; pharmacy leadership involved in budget development",
        evidence: "Annual budget documentation; meeting minutes showing pharmacy leadership participation",
      },
      {
        id: "s3-2",
        standard: "DRX 3-2A",
        requirement: "Financial practices ensure accurate accounting and billing",
        ahfAction: "Accurate billing records maintained; coding and documentation align with dispensed services",
        evidence: "Billing records; pharmacy financial reconciliation reports",
      },
      {
        id: "s3-3",
        standard: "DRX 3-4A",
        requirement: "Care/service rates established; charges communicated to patients, public, and referral sources",
        ahfAction: "Inform patients of co-pays, OOP costs, and deductibles PRIOR to processing any prescription",
        evidence: "Documentation of patient cost counseling in McKesson/Athena clinical notes",
      },
      {
        id: "s3-4",
        standard: "DRX 3-4B",
        requirement: "Patient advised of financial responsibility before or at time of service; notified of changes within 30 days",
        ahfAction: "Inform patients of cost changes as soon as known; document Medication Access/Cost Consultation note in patient profile",
        evidence: "Medication Access/Cost Consultation clinical care notes in patient charts",
      },
      {
        id: "s3-5",
        standard: "DRX 3-4C",
        requirement: "Mail-order patients advised of financial responsibility prior to receipt of service",
        ahfAction: "Patients notified of costs before processing mail-order prescriptions",
        evidence: "Pre-processing notification documentation; patient acknowledgment records",
      },
      {
        id: "s3-6",
        standard: "DRX 3-5A",
        requirement: "Financial hardship forms completed for patients unable to pay",
        ahfAction: "Refer patient unable to pay to Pharmacy Director; work with HCC Benefits Counselor, Rx Sales Teams, PCM",
        evidence: "Completed financial hardship forms; referral documentation to benefits counselors",
      },
      {
        id: "s3-7",
        standard: "DRX 3-6A",
        requirement: "Proper billing procedures followed including all prescription and documentation requirements specified by payor",
        ahfAction: "Ensure billing documentation matches dispensed medications; payor-specific requirements met",
        evidence: "Claims documentation; payor-specific billing requirement checklists",
      },
    ],
  },
  {
    id: "sec4-hr",
    sectionNumber: "4",
    title: "Human Resources Management",
    description: "Staff health requirements, job descriptions, performance evaluations, competency assessments, and ongoing education per ACHC DRX 4 standards.",
    items: [
      {
        id: "s4-1",
        standard: "DRX 4-2C",
        requirement: "All direct care staff have baseline TB test; annual symptom evaluation completed prior to patient contact",
        ahfAction: "Confirm TB test on file for all patient-facing staff upon hire; annual follow-up documented",
        evidence: "TB test results in HR personnel file; annual TB symptom evaluation records",
      },
      {
        id: "s4-2",
        standard: "DRX 4-2D",
        requirement: "Direct care staff have access to Hepatitis B vaccine; offered per CDC/OSHA standards",
        ahfAction: "All patient-facing AHF staff offered Hep B vaccine; acceptance or declination documented",
        evidence: "Hep B vaccination records or signed declination forms in HR files",
      },
      {
        id: "s4-3",
        standard: "DRX 4-2E",
        requirement: "Job description for each position consistent with org chart function and reporting structure",
        ahfAction: "Current job descriptions on file for all positions; match org chart",
        evidence: "Current job descriptions; org chart alignment documentation",
      },
      {
        id: "s4-4",
        standard: "DRX 4-2F",
        requirement: "Motor vehicle records (MVR) checked at hire and annually for CDL-required drivers",
        ahfAction: "PSL drivers: copy of driver license in pharmacy Regulatory Binder and/or with PSL Hub Manager",
        evidence: "MVR check records; PSL driver license copies in Regulatory Binder",
      },
      {
        id: "s4-5",
        standard: "DRX 4-2I",
        requirement: "Written personnel policies/employee handbook established; accessible to all staff",
        ahfAction: "All staff familiar with AHF Employee Handbook; accessible via AHF Connect Home Page",
        evidence: "AHF Employee Handbook; AHF Connect access documentation",
      },
      {
        id: "s4-6",
        standard: "DRX 4-2J",
        requirement: "Written annual performance evaluations completed for all staff based on job description; results shared with employee",
        ahfAction: "Complete annual evaluations for all staff; review with employee and document",
        evidence: "Completed annual performance evaluation forms; signed acknowledgment by employee",
      },
      {
        id: "s4-7",
        standard: "DRX 4-6A/B",
        requirement: "Written orientation process documented; all personnel documentation reflects orientation completed",
        ahfAction: "New hires complete AHF U New Hire Orientation within 30 days of hire; AHF Pharmacy Orientation course completed",
        evidence: "AHF U completion records; on-boarding checklist signed (kept in pharmacy and/or HR file)",
      },
      {
        id: "s4-8",
        standard: "DRX 4-7A",
        requirement: "Competency assessment program designed for all personnel handling medications, equipment, and supplies",
        ahfAction: "Pharmacy Director conducts routine and random competency verifications; initial and annual assessments",
        evidence: "Completed competency assessment forms (hire + annual); Pharmacy Director documentation",
      },
      {
        id: "s4-9",
        standard: "DRX 4-8A/B",
        requirement: "Written education plan defines content, frequency, and ongoing in-service training by staff classification",
        ahfAction: "All AHF U courses completed by due date; 30-60-90 day evaluations completed for new hires",
        evidence: "AHF U training completion records; 30-60-90 day evaluation forms on file",
      },
      {
        id: "s4-10",
        standard: "DRX 4-9C",
        requirement: "Supervision available during all hours care/service is provided",
        ahfAction: "Pharmacist always present in pharmacy; emergency: contact Pharmacy Leadership immediately",
        evidence: "Schedule documentation; CCL after-hours coverage records",
      },
      {
        id: "s4-11",
        standard: "DRX 4-9D",
        requirement: "Registered Pharmacist available 24/7 per patient plan of care",
        ahfAction: "After-hours calls forwarded to CRC-West Pharmacists; CCL provides 24/7 access",
        evidence: "CCL operational documentation; after-hours call routing policy",
      },
      {
        id: "s4-12",
        standard: "DRX 4-14C",
        requirement: "Written P&P: Registered Pharmacist supervises pharmacy technicians per state BOP rules",
        ahfAction: "Ensure pharmacist supervision documented per state-specific requirements",
        evidence: "Supervision P&P; state BOP pharmacist-to-tech ratio documentation",
      },
      {
        id: "s4-13",
        standard: "DRX 4-14F",
        requirement: "Personnel trained to perform routine cleaning and maintenance of equipment",
        ahfAction: "Daily Cleaning Log completed for all equipment (counting trays, spatulas, Kirby Lester, etc.)",
        evidence: "Daily Counter Tray & Spatula Cleaning Log (AHF Connect); equipment maintenance records",
      },
      {
        id: "s4-14",
        standard: "DRX 4-15B",
        requirement: "Mail-order/specialty pharmacy has access to reference library and/or internet",
        ahfAction: "All pharmacists and staff have access to Facts & Comparison + UpToDate",
        evidence: "UpToDate and Facts & Comparison access credentials/subscriptions confirmed",
      },
    ],
  },
];

export const STAFF_INTERVIEW_QA: InterviewQA[] = [
  {
    id: "qa-1",
    question: "Did you complete on-boarding training/orientation?",
    answer: "Yes. Completed HR New Hire Orientation (Zoom) + Dept. Orientation AHF U course + hands-on training with supervisor. On-Boarding Checklist is on file in the pharmacy and/or HR.",
    audience: "All Staff",
  },
  {
    id: "qa-2",
    question: "Can you describe the Chain of Command?",
    answer: "I don't need to memorize it — the Org Chart is posted [point to it]. It shows who to report to if my immediate supervisor is unavailable.",
    audience: "All Staff",
  },
  {
    id: "qa-3",
    question: "Who is your Compliance Officer?",
    answer: "Brandon Patchett, PharmD — Senior Director of Clinical Services and Pharmacy Compliance.",
    audience: "All Staff",
  },
  {
    id: "qa-4",
    question: "How do you report concerns or complaints from a patient?",
    answer: "I communicate any concern to my immediate supervisor immediately. All communications must be documented. If unresolved, refer to Customer Care Line (855-894-MEDS). Pharmacy Director ensures patient safety follow-up.",
    audience: "All Staff",
  },
  {
    id: "qa-5",
    question: "How do you handle patients with communication or language barriers?",
    answer: "Use Language Line (instructions are posted — I never have Language Line contact patients directly). For patients who can't read labels, I request a ScripTalk Reader. Contact supervisor or Regional Director if more support is needed.",
    audience: "All Staff",
  },
  {
    id: "qa-6",
    question: "What infection control procedures do you follow?",
    answer: "Wash hands with soap and water whenever possible. Clean all equipment (counting trays, spatulas, counters) daily and document in the Daily Cleaning Log. Follow all P&P infection control precautions. Pharmacy Director completes daily Infection Control Tracking Form.",
    audience: "All Staff",
  },
  {
    id: "qa-7",
    question: "Are patients notified before prescriptions are processed?",
    answer: "Yes. All patients must be notified prior to any prescription processing — most insurance companies require this, and the patient is financially responsible for any Rx processed. PSL contacts patient before every delivery.",
    audience: "All Staff",
  },
  {
    id: "qa-8",
    question: "Have you received a competency assessment?",
    answer: "Yes, upon hire. Pharmacy Directors conduct routine and random competency verifications. Annual competency assessments are required.",
    audience: "All Staff",
  },
  {
    id: "qa-9",
    question: "What safety-related training have you received?",
    answer: "I complete all AHF U courses assigned to me by the due date, including DME and Hazardous Drugs training annually. Various regulatory/compliance courses assigned at hire and then annually.",
    audience: "All Staff",
  },
  {
    id: "qa-10",
    question: "How does AHF meet patient needs during a disaster?",
    answer: "Notify leadership at AHFRXEmergencyNotification@ahf.org immediately. Work with unaffected pharmacies to process 10-day refills and distribute. Notify patients. Within 24 hours of reopening, follow up to confirm receipt.",
    audience: "All Staff",
  },
  {
    id: "qa-11",
    question: "Where are Patient Rights and DMEPOS Supplier Standards found?",
    answer: "In the Patient Welcome Booklet (pg. 7-10 for DMEPOS, pg. 14-16 for Rights). Provided to all new patients and marked in the Initial Assessment. Available on AHF Pharmacy website in English and Spanish.",
    audience: "All Staff",
  },
  {
    id: "qa-12",
    question: "How are after-hours calls handled?",
    answer: "Customer Care Line (CCL) handles overflow and after-hours calls 24/7 with 24/7 pharmacist access. After-hours calls forwarded to CRC-West Pharmacists.",
    audience: "All Staff",
  },
  {
    id: "qa-13",
    question: "How do you review a patient's medication list?",
    answer: "Pharmacist reviews McKesson, patient charts in Athena, and speaks with patient. Duplicate/discontinued medications are cleared. Changes documented in McKesson; Care Plan updated.",
    audience: "Pharmacist",
  },
  {
    id: "qa-14",
    question: "How are you involved in the PI/CQI program?",
    answer: "All sites conduct CQI Meetings at least quarterly. All staff must be familiar with topics discussed. Meeting uses CQI template; attendance recorded. Staff who miss receive meeting minutes from Pharmacy Director.",
    audience: "Pharmacist / Director",
  },
  {
    id: "qa-15",
    question: "How do you know if a storage temperature is out of range?",
    answer: "Pharmacy Director receives notification from Dickson temperature monitoring system. Cold-chain shipments include a temp dot with instructions for patients.",
    audience: "Director / Pharmacist",
  },
  {
    id: "qa-16",
    question: "How are expired or recalled items handled?",
    answer: "Recalled items: remove from shelves immediately upon notice; place in Drug Recall bin. Expired: placed in Expired Medication Bin. Staff conduct monthly checks.",
    audience: "All Staff",
  },
  {
    id: "qa-17",
    question: "Where and how are hazardous drugs stored?",
    answer: "HDs are stored in a separate area from non-hazardous drugs. Area is clearly labeled 'Hazardous.' Chemo Spill Kit and gloves is kept near the HD storage area.",
    audience: "All Staff",
  },
  {
    id: "qa-18",
    question: "How do you clean prescription preparation equipment?",
    answer: "All equipment cleaned daily: counting trays, spatulas, counters, computers. Cleaning agent: Alcohol/Hypo-Chloride spray. HD deactivating agent: sodium Hypochlorite 5.25%. Documented in Daily Cleaning Log.",
    audience: "All Staff",
  },
  {
    id: "qa-19",
    question: "Do you receive ongoing education beyond required CEs?",
    answer: "Yes. Pharmacists and techs complete 2 Mini-Learning Sessions (MLS) per quarter (8/year). Topics focus on HIV clinical management, PrEP, PEP, Hep-C. Created by AHF Clinical Support team.",
    audience: "Pharmacist / Tech",
  },
  {
    id: "qa-20",
    question: "How do patients pay and how are financial hardships handled?",
    answer: "Patients are informed of co-pays, OOP costs, and deductibles PRIOR to processing. If unable to pay, refer to Pharmacy Director. Work with HCC Benefits Counselor and other AHF teams. Financial hardship forms are completed.",
    audience: "All Staff",
  },
];
