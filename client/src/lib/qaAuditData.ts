// QA Audit Readiness — AHF Pharmacy Quality Outcomes Specialist Site Audit Form
// (Accreditation Ready Review), MERGED with AHF's in-house pre-audit walkthrough.
// Sections 1–7 are the official QO Site Audit Form. Sections 8–10 (Controlled
// Substances, Systems & Access, Training & Credentials) come from the in-house
// walkthrough and cover areas the official form does not. Walkthrough items that
// duplicated an official question were consolidated into that question's `detail`
// rather than repeated.
// Source: attached_assets/Pharmacy_Questions_Answers_*.pdf + prior walkthrough list.
// Scoring (per source): Yes or N/A = 1 point, No = 0 points.
// In this tool: Yes = pass, No = fail, N/A = na. If "No", record the suggested
// corrective action or action plan in the item's notes.

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
    id: "pharmacy-core",
    number: "1",
    title: "Pharmacy Core",
    description:
      "Core compliance: postings, HIPAA, quality meetings, licenses/permits, training, security, billing, and facility condition.",
    items: [
      { id: "core-1", title: `The framed Grievance poster is located in a place within the pharmacy that is easy for patients to observe.` },
      { id: "core-2", title: `The pharmacy staff knows how to access and use the Quantros reporting system.`, detail: `Quantros is now RLDatix — verify all required users can access and use it.` },
      { id: "core-3", title: `The pharmacy staff is familiar with the AHF Customer Care Line and how patients can access.`, detail: `Customer Care Line poster posted (855-894-MEDS).` },
      { id: "core-4", title: `Is the pharmacy staff aware that the PIC must try to resolve customer complaints and grievances at the store level prior to having the patient escalating the issue to the Customer Care Line?` },
      { id: "core-5", title: `The pharmacy staff is familiar with after-hours access to AHF Pharmacy services and can inform patients of how to access.` },
      { id: "core-6", title: `There is evidence that the pharmacy reports insurance audits to the Pharmacy Audit Team in a timely fashion.` },
      { id: "core-7", title: `There is evidence that the pharmacy reports inspections and other inquires by regulatory agencies, and others, to Pharmacy Administration in a timely fashion.` },
      { id: "core-8", title: `The pharmacy site supervisor and staff understand responses to audits, and inspections from outside agencies and regulatory bodies are to be submitted by AHF Legal and Pharmacy Administration only.` },
      { id: "core-9", title: `All Corrective Action Plans from regulatory agencies (Board of Pharmacy, ACHC, URAC, etc.) have been completed and implemented in a timely manner.` },
      { id: "core-10", title: `The pharmacy has a secure "bin" for the collection of protected patient information (HIPAA).`, detail: `Shredder boxes locked, key controlled, and emptied on schedule.` },
      { id: "core-11", title: `The pharmacy staff is familiar with the Emergency Procedures and how to ensure that patients continue to receive their medications in the event of a disaster.` },
      { id: "core-12", title: `The Q.O. Specialist cannot find evidence that protected patient information is not disposed of properly, including: (1) discarded labels, (2) vials, (3) containers with patient labels, (4) patient list, (5) prescriptions, (6) other documents.` },
      { id: "core-13", title: `The pharmacy utilizes privacy screens on work stations that may be observed by non-pharmacy employees, such as patients or clients.` },
      { id: "core-14", title: `The pharmacy has documented proof that they have a quality assurance meeting that meets at least once per quarter, including an attendance record.` },
      { id: "core-15", title: `The pharmacy quality assurance meeting has an agenda that includes QRE, regulatory updates, workflow discussions, policy and procedure updates as well as customer service issues.` },
      { id: "core-16", title: `There is evidence that the QMC meeting material from Admin/Management are being updated to the staff.` },
      { id: "core-17", title: `The pharmacy is participating in approved quality improvement projects (measures).` },
      { id: "core-18", title: `The pharmacy staff understands their roles and responsibilities within their job descriptions. (Job descriptions may be found on the shared "K" drive.)` },
      { id: "core-19", title: `Pharmacist and Pharmacy technician licenses are current and displayed according to applicable law.` },
      { id: "core-20", title: `AHF Courier driver's licenses are valid and current.` },
      { id: "core-21", title: `All permits required for the pharmacy to conduct business are displayed and current: (1) Board of Pharmacy (2) Non-Resident Pharmacy (if applicable) (3) DEA (4) State Controlled Substance (if required) (5) Local City, County or State business permits (if applicable) (6) Food Permits (if sports nutrition sites).` },
      { id: "core-22", title: `The pharmacy staff is current with all AHF required training programs.` },
      { id: "core-23", title: `The pharmacy staff has access to the Training and Guidance manuals for new employees.` },
      { id: "core-24", title: `The pharmacy staff has access to the AHF Employee Handbook.`, detail: `Accessible on AHFConnect.` },
      { id: "core-25", title: `Documentation exists for new employees on orientation and training relevant to their job descriptions.` },
      { id: "core-26", title: `The pharmacy staff can describe the AHF chain of command.` },
      { id: "core-27", title: `The pharmacy staff can describe the AHF Pharmacy chain of command.`, detail: `Chain of command is posted on AHFConnect; staff can locate it.` },
      { id: "core-28", title: `The pharmacy staff is knowledgeable in how to access on-line drug information (Gold Standard software).` },
      { id: "core-29", title: `All AHF Pharmacist have completed the National Certification for HIV medicine (AAHIVP) through the American Association of HIV Medicine or are working to be certified. (List name and dates of application if not certified in plan of correction.)`, detail: `AAHIVP certificate(s) on file and current.` },
      { id: "core-30", title: `The Pharmacy has signed signature on file forms, patient rights and responsibilities and notice of receiving Welcome Package.` },
      { id: "core-31", title: `The Pharmacy staff is familiar with the Emergency procedures for all potential emergency and disaster situations.` },
      { id: "core-32", title: `Does the staff know the mission statement and its meaning?` },
      { id: "core-33", title: `Are required state and federal labor law posters visible to employees?`, detail: `Includes a current OSHA poster.` },
      { id: "core-34", title: `Does the staff know how to handle requests for information from regulatory agencies?` },
      { id: "core-35", title: `The staff follows AHF policy for Charity Care.` },
      { id: "core-36", title: `The staff informs patients of charges.` },
      { id: "core-37", title: `The pharmacy is secure and only a pharmacist possesses a key. The AHF Pharmacy Key Policy is in place and is followed?` },
      { id: "core-38", title: `Store Security: Panic button(s) are working?` },
      { id: "core-39", title: `Security cameras are working? Does the PIC know how to retrieve information?` },
      { id: "core-40", title: `All IT equipment is working properly?` },
      { id: "core-41", title: `Caller I.D. for outbound calls do not show AHF (should read number and Pharmacy).` },
      { id: "core-42", title: `The pharmacy is following the AHF Cash Management Policies, including the appropriate use of POS system, bank deposits, petty cash procedures?` },
      { id: "core-43", title: `The Pharmacy Manager has completed the AHF Pharmacy or, if the Board of Pharmacy requires the use of an official form, "self-assessment" before July 1 of each year. The completed self-assessment form is filed in the Regulatory Manual?` },
      { id: "core-44", title: `There is evidence that a Patient Medication Leaflet prints for all new prescriptions.` },
      { id: "core-45", title: `There is evidence that the Pharmacy Staff can print a Patient Medication Leaflet at the request of a patient for new or refill prescriptions.`, detail: `Drug monograph print process verified (McKesson + QR code on label).` },
      { id: "core-46", title: `The billing queue is reviewed and monitored to ensure orders are billed and orders completed timely and accurately at frequent intervals throughout each shift.` },
      { id: "core-47", title: `Co-pay cards and other PAP assistance are applied correctly?` },
      { id: "core-48", title: `Dedicated staff assigned to rejection queue that is cleared on the daily basis?` },
      { id: "core-49", title: `Cycles are moved forward per policy after cycle billing is completed.` },
      { id: "core-50", title: `Does the pharmacy reconcile deliveries by collecting signatures and copays from patients that have their medication delivered/shipped?` },
      { id: "core-51", title: `Does pharmacy have P&P in place for Ryan White program according to the contract? (If applicable.)` },
      { id: "core-52", title: `There are no documents, notes or other items on walls, doors, windows, etc. that are taped to the surface.` },
      { id: "core-53", title: `All posted documents are in frames and hanging in appropriate places that the auditor would expect them to be displayed.` },
      { id: "core-54", title: `The pharmacy premises are maintained in a clean and orderly condition.` },
      { id: "core-55", title: `Is there a need for maintenance such as: (1) Paint (2) Carpet replacement (3) Floor tile replacement (4) Fixture repairs (5) Chair or stool replacement.` },
      { id: "core-56", title: `The pharmacy is following the AHF AR system?` },
      { id: "core-57", title: `The pharmacy has addressed all Corrective Action Plans from both accreditation agencies: ACHC and URAC?` },
      { id: "core-58", title: `A visitor log is present and being utilized — visitors sign in on arrival.` },
      { id: "core-59", title: `The Notice of Privacy Practices is posted in the patient area.` },
      { id: "core-60", title: `Medicare Forms are accessible on AHFConnect.` },
      { id: "core-61", title: `The store's Contribution Profile on AHFConnect has been reviewed.` },
    ],
  },
  {
    id: "customer-service",
    number: "2",
    title: "Customer Service",
    description:
      "Patient-facing service: rights & responsibilities, welcome package, adherence services, phone handling, and counseling.",
    items: [
      { id: "cust-1", title: `The staff is aware of Patient's rights and responsibilities?` },
      { id: "cust-2", title: `The Grievance poster is prudently displayed.` },
      { id: "cust-3", title: `There is evidence that the pharmacy staff provides the "Welcome" package to new enrollees in the AHF Pharmacy program.` },
      { id: "cust-4", title: `There is evidence that the Pharmacist are completing request from Mirixa to complete MTM on specific patients and the information is transferred to the "Sales Force" documentation system.` },
      { id: "cust-5", title: `There is evidence that the pharmacy is providing Adherence services to their patents on a regular and at least monthly basis, by documenting in the "Sales Force" documentation system.` },
      { id: "cust-6", title: `The auditor observes pharmacy staff answering incoming telephone calls. Calls should be answered within 30 seconds (3 rings).` },
      { id: "cust-7", title: `The auditor observes if the team member answering the phone identifies themselves by first name and their position. ("Hello, thank you for calling our Pharmacy, this is Jane and I'm a technician".)` },
      { id: "cust-8", title: `The auditor observes if the technician staff refers clinical questions to a pharmacist.` },
      { id: "cust-9", title: `The Pharmacy staff is aware of how to access the language line and the instructions are posted within the pharmacy work area in a place that all have easy access.`, detail: `Printed language-line instructions posted at each station.` },
      { id: "cust-10", title: `The Pharmacy staff routinely and timely retrieves prescriptions and refills from the "ePrescribing" queue in the Cerner system.` },
      { id: "cust-11", title: `The pharmacy staff is familiar with the Policy and Procedure on handling "difficult patients".` },
      { id: "cust-12", title: `The pharmacy staff follows the procedures for "Hardship Cases" if a patient is unable to pay.` },
      { id: "cust-13", title: `The pharmacy staff follows the procedures for Non-Covered Products (NCP) and does not use NCP for prescription only medications.` },
      { id: "cust-14", title: `The pharmacy staff follows the procedures for Charity cases.` },
      { id: "cust-15", title: `Rejected claims are reconciled throughout each shift.` },
      { id: "cust-16", title: `Walk in customers are acknowledged and greeted appropriately.` },
      { id: "cust-17", title: `The pharmacy successfully maintains 30 minutes or less waiting time for patient to pick up prescriptions?` },
      { id: "cust-18", title: `Does staff properly make an offer for counseling?` },
      { id: "cust-19", title: `Has the pharmacy staff participated and completed the customer service training and subsequent assessments?` },
      { id: "cust-20", title: `The staff informs patients of "out of pocket" charges that may not be payable by their insurance or other assistance programs.` },
      { id: "cust-21", title: `"Signature on File" forms are signed and current.` },
      { id: "cust-22", title: `All new hires have completed all the required training, certification, and licenses?` },
    ],
  },
  {
    id: "drug-management",
    number: "3",
    title: "Drug Management",
    description:
      "Workflow integrity, verification, clinical consultation, payment sourcing, and Sales Force documentation.",
    items: [
      { id: "drug-1", title: `The Pharmacist are following workflow procedures as defined by AHF and only pharmacist are conducting PV-1 and PV-2 reviews.` },
      { id: "drug-2", title: `All pharmacy staff, particularly technicians, is following workflow procedures as defined by AHF during the fulfillment phase, are scanning the prescription label and the product container to verify the correct medication is being dispensed.` },
      { id: "drug-3", title: `The auditor observes that the pharmacist staff provides patients with product information upon request.` },
      { id: "drug-4", title: `The auditor observes that the pharmacist provides consultation to patients regarding their drug therapy and other clinical information (not technicians).` },
      { id: "drug-5", title: `The auditor observes pharmacy staff assisting patient's in obtaining prior authorization, co-pay assistance and other appropriate means of obtaining their medications.` },
      { id: "drug-6", title: `There is evidence that pharmacist provide consultation and communication with patients providers, case managers, care givers and patients regarding the patient's drug therapy and medication action plan.` },
      { id: "drug-7", title: `There is evidence that the pharmacy staff aggressively seeks payment sources for patient's medications when the patient has limited means.` },
      { id: "drug-8", title: `The pharmacy staff is aware of how to access the clinical reference material both on-line and hard copy provided by AHF in addition to other sources that the pharmacist has requested.` },
      { id: "drug-9", title: `Appropriate staff has been trained on the use of the "Sales Force" data collection software.` },
      { id: "drug-10", title: `There is evidence that the pharmacist is routinely assessing the appropriateness of patient's drug therapy and recording observations, actions and other appropriate clinical information in the "Sales Force" data collection software.` },
      { id: "drug-11", title: `All staff pharmacists are registered with CSOS and utilizes this system.` },
    ],
  },
  {
    id: "pharmacy-operations",
    number: "4",
    title: "Pharmacy Operations",
    description:
      "Operational standards: staffing, shipping/delivery, inventory, refrigeration, safety, equipment, and facility systems.",
    items: [
      { id: "ops-1", title: `There is evidence the staff is performing duties consistent with their job descriptions.` },
      { id: "ops-2", title: `The staff has access to the employee handbook.`, detail: `Accessible on AHFConnect.` },
      { id: "ops-3", title: `There is evidence the staff have been properly trained.` },
      { id: "ops-4", title: `The staff is current on all AHF required employee trainings.` },
      { id: "ops-5", title: `There is documentation of staff meetings at least quarterly.` },
      { id: "ops-6", title: `The staff can access reference materials including clinical, policy and procedures.`, detail: `Policy & Procedures manual accessible on AHFConnect.` },
      { id: "ops-7", title: `There is evidence, including documentation, that the pharmacist clarifies questionable prescriptions that are not clear for one reason or another.` },
      { id: "ops-8", title: `The auditor verifies that auxiliary labels are attached to finished prescriptions to ensure safety, storage and other cautions pertaining to the medication are available for the patient.` },
      { id: "ops-9", title: `The auditor verifies that all prescriptions shipped or mailed to patients have a return address that DOES NOT INCLUDE the words "AHF" or "AHF Pharmacy". (The return address should be either the Pharmacist in-Charge/Manager name and pharmacy address or just the pharmacy address.)` },
      { id: "ops-10", title: `The auditor observes the packing of all delivery/shipping packages contain temperature appropriate devices to maintain appropriate temperature of medications during delivery/shipping.`, detail: `Cold-chain shipping process documented; staff can describe it.` },
      { id: "ops-11", title: `The auditor observes if the pharmacy staff is following AHF workflow procedures and verifying the address of the patient (based on patient's requirements) for delivery/shipping.` },
      { id: "ops-12", title: `The auditor observes if the pharmacy staff is following AHF workflow procedures and utilizing the correct shipping container to maintain the storage requirements of the medications being shipped.` },
      { id: "ops-13", title: `Delivery vehicle is neat and clean.` },
      { id: "ops-14", title: `Routine safety checks are performed on the delivery vehicle per policy.` },
      { id: "ops-15", title: `Is there evidence that if a shipping/delivery is delayed or lost, that the pharmacy staff refills the medications and ships/delivers the patient's medications to the patient by the most expedient method to help ensure the patient does not miss doses.`, detail: `Delivery receipt signatures stored and retrievable.` },
      { id: "ops-16", title: `There is evidence that the pharmacy has access to an Exception Report daily from UPS/FedEx packages that were not delivered.` },
      { id: "ops-17", title: `The pharmacy has implemented and maintains a perpetual inventory system according to AHF policy for high cost medications and controlled substances.` },
      { id: "ops-18", title: `The pharmacy maintains a daily temperature log for the medication refrigerator, and entries are current.`, detail: `StatTemp access confirmed; out-of-range alert emails are being received.` },
      { id: "ops-19", title: `The pharmacy has implemented AHF approved procedures for routinely checking inventory for expired medications.`, detail: `Random expiration-date check on shelf and refrigerator stock; Expired Medication Pulling Log followed.` },
      { id: "ops-20", title: `The pharmacy has established a clearly marked separate storage area for hazardous materials.` },
      { id: "ops-21", title: `The pharmacy has established a clearly marked separate storage area for medications that are expired and/or otherwise not suitable for dispensing to patients.`, detail: `Includes Expired Bin, Hazardous Expired Bin, and Recall Bin — all present and labeled.` },
      { id: "ops-22", title: `Staff is familiar with Universal Precautions.` },
      { id: "ops-23", title: `Staff is familiar with the location of the "Spill Kit".`, detail: `Chemical Spill Kit location known and stocked.` },
      { id: "ops-24", title: `Staff is familiar with the "Eye Wash" station.`, detail: `Staff can run the eyewash station for 15 minutes.` },
      { id: "ops-25", title: `Staff is familiar with Emergency Preparedness procedures.` },
      { id: "ops-26", title: `The pharmacy has implemented a system of routinely cleaning all equipment utilized in the fulfillment of prescriptions, including counting devices, automated dispensing equipment, weighing balances and other dispensing devices. The log for maintenance of equipment calibration is current.`, detail: `Cleaning Log current; separate trays/solutions for hazardous vs non-hazardous.` },
      { id: "ops-27", title: `There is evidence that all Power Failures are logged including resolutions during the event.` },
      { id: "ops-28", title: `There is evidence that Pharmacy conducts Fire and Disaster Drills followed by the proper documentation.` },
      { id: "ops-29", title: `The pharmacy uses a weight scale for calculating shipping fees for accuracy.` },
      { id: "ops-30", title: `The auditor tests all dispensing equipment for cleanliness.` },
      { id: "ops-31", title: `The auditor observes if dispensing equipment is cleaned after known high risk substance that causes allergies, or that a clearly marked dispensing device is utilized for these substances.` },
      { id: "ops-32", title: `The auditor tests all equipment for accuracy.` },
      { id: "ops-33", title: `The auditor observes if pharmacy staff is limited to AHF policy roles and duties.` },
      { id: "ops-34", title: `The pharmacy staff is familiar with accessing Material Safety Data Sheets (MSDS).`, detail: `MSDS access (Cardinal) verified.` },
      { id: "ops-35", title: `The auditor observes if the pharmacy staff follows infection control procedures including hand washing procedures.` },
      { id: "ops-36", title: `There is evidence that the pharmacy keeps a Communicable Disease Log; and procedures are being followed.` },
      { id: "ops-37", title: `There is evidence that Hazardous Drugs are identified as such in the Pharmacy Inventory Area.` },
      { id: "ops-38", title: `The pharmacy staff is current with all annual health tests and vaccinations (i.e. TB and flu shot).` },
      { id: "ops-39", title: `There is evidence that the staff is aware of REMS Policy and Procedure and how to report such incidents.` },
      { id: "ops-40", title: `Employees that have a short term illness are limited in their duties and exposure to patients or sent home until fully recovered.` },
      { id: "ops-41", title: `The pharmacy sink has hot and cold running water.` },
      { id: "ops-42", title: `The pharmacy restroom is clean, neat and in good working condition.` },
      { id: "ops-43", title: `The air-conditioning and ventilation systems are in good working condition.` },
      { id: "ops-44", title: `There is no evidence to suggest that the pharmacy is compounding medications other than the simple mixing of two or more ingredients into a container.` },
      { id: "ops-45", title: `There is evidence that AHF Courier staff has been trained on the following: Courier Training Checklist.` },
      { id: "ops-46", title: `There is evidence that AHF Courier staff completed the monthly vehicle safety checklist.` },
      { id: "ops-47", title: `Is the pharmacy staff using Sfax?` },
      { id: "ops-48", title: `Hazardous Waste Bins and the disposal log are present and current.` },
      { id: "ops-49", title: `A NIOSH hazardous-medication list is maintained (clipboard or current reference).` },
      { id: "ops-50", title: `Cleaning supplies are stored separately and labeled as Hazardous Materials.` },
      { id: "ops-51", title: `Drug recall notices are being received and reviewed.` },
      { id: "ops-52", title: `The PSL driver communication list / phone numbers are posted.` },
      { id: "ops-53", title: `Dress code is observed — scrubs worn, no open-toed shoes.` },
    ],
  },
  {
    id: "patient-management",
    number: "5",
    title: "Patient Management",
    description:
      "Patient records, adherence counseling, assessments/reassessments, retention follow-up, and Sales Force documentation.",
    items: [
      { id: "pat-1", title: `There is evidence the staff obtain allergy information from patients.` },
      { id: "pat-2", title: `There is evidence the staff is updating the patient's demographic information on a regular basis, including shipping/delivery information.` },
      { id: "pat-3", title: `Adherence calls are recorded in "Sales Force" data base.` },
      { id: "pat-4", title: `There is evidence the "Welcome" package is provided to patients and signature pages are scanned into Cerner.` },
      { id: "pat-5", title: `All MTM cases are current (Mirixa).` },
      { id: "pat-6", title: `Staff is aware of the AHF records retention policy.`, detail: `Records retention policy followed (10 years).` },
      { id: "pat-7", title: `There is no evidence of patient protected information is discarded inappropriately.` },
      { id: "pat-8", title: `Computer screens are protected from view of non-AHF personnel.` },
      { id: "pat-9", title: `Does the staff understand how to educate patients on the proper disposal of their medication?` },
      { id: "pat-10", title: `There is evidence that all appropriate pharmacy staff have access to "Sales Force" to document clinical and non-clinical interventions.` },
      { id: "pat-11", title: `There is evidence that the pharmacist(s) are counseling the patients on the use of Adherence Packaging.` },
      { id: "pat-12", title: `There is evidence that the pharmacist(s) are counseling the patients on the "Fit Your Life" concepts to help the patient maintain adherence to therapy.` },
      { id: "pat-13", title: `There is evidence that the monthly Adherence Calls include asking if there are changes in the patient's medications, any adverse effects, do they feel the medications are effective, and is the patient taking their medications.` },
      { id: "pat-14", title: `There is evidence that Patient Records in Sales Force are up to date including but not limited to Initial Assessment and Plan of Care.` },
      { id: "pat-15", title: `There is evidence that the pharmacy staff transfers calls to the pharmacist during the Adherence Call, if there are any changes in the patient's response to the call regarding the patient's drug therapy.` },
      { id: "pat-16", title: `There is evidence that the pharmacist(s) are documenting any and all counseling that is provided to patients, providers, case managers, care givers and others providing care to patients, in the Sales Force software program.` },
      { id: "pat-17", title: `There is evidence that the pharmacy staff will assist the patient in obtaining medications that require obtaining specific medications from another provider, by transferring the prescription and instructing the patient how to obtain and offering to provide further follow-up with the patient after they obtain the medication.` },
      { id: "pat-18", title: `All pharmacy staff are wearing AHF picture identification badges that clearly identifies the employee by name and title.` },
      { id: "pat-19", title: `Does the pharmacy participate in any Clinical Trials / Research Projects? (If your response is NO please select N/A in the next question.)` },
      { id: "pat-20", title: `There is evidence of the Procedures followed and record keeping of these Clinical Trial / Research Projects.` },
      { id: "pat-21", title: `The 35 day report is reviewed on daily basis by a person assigned to this task. Retention follow-up is completed daily?` },
      { id: "pat-22", title: `Pharmacy is appropriately assigning patients to Nursing Home Cycles? (Use "Patients Not in Nursing Home" report.)` },
      { id: "pat-23", title: `There is evidence that the staff is completing Initial Assessments for new patients in Sales Force.` },
      { id: "pat-24", title: `There is evidence that the staff is completing reassessments for any change in medication therapy.` },
      { id: "pat-25", title: `There is evidence that the staff is properly opting out patients who are on maintenance medication therapy that refuse clinical services provided by AHF Pharmacy.` },
    ],
  },
  {
    id: "quality-outcomes",
    number: "6",
    title: "Quality Outcomes and Performance Improvement",
    description:
      "Performance improvement: action plans, self-reporting, outcomes measurement programs, and management report review.",
    items: [
      { id: "qopi-1", title: `Action plans have been completed related to Performance Improvement audits.` },
      { id: "qopi-2", title: `There is evidence that staff "self-reports" incidents including customer grievances, medication areas and other risk incidents.` },
      { id: "qopi-3", title: `There is evidence staff meetings that include customer complaints and grievances, medication error incidents, regulatory updates and policy and procedure reviews, at least quarterly.` },
      { id: "qopi-4", title: `There is evidence that "password" sharing is not taking place.` },
      { id: "qopi-5", title: `There is evidence that PV-1 (if central refill) and PV-2 procedures are followed.` },
      { id: "qopi-6", title: `The auditor observes that the bar scanning procedure for dispensing accuracy is followed.` },
      { id: "qopi-7", title: `There is evidence that the pharmacy is participating in the current outcomes measurement program for clinical services.` },
      { id: "qopi-8", title: `There is evidence that the pharmacy is participating in the current outcomes measurement program for financial viability of AHF programs.` },
      { id: "qopi-9", title: `There is evidence that the Pharmacist In-Charge/Manager (or person assigned) is reviewing and taking appropriate action on the following: Daily Sales Report.` },
      { id: "qopi-10", title: `There is evidence that the Pharmacist In-Charge/Manager (or person assigned) is reviewing and taking appropriate action on the following: IMM Performance Reports.` },
      { id: "qopi-11", title: `There is evidence that the Pharmacist In-Charge/Manager (or person assigned) is reviewing and taking appropriate action on the following: 35 Day Report.` },
      { id: "qopi-12", title: `There is evidence that the Pharmacist In-Charge/Manager (or person assigned) is reviewing and taking appropriate action on the following: End of Month Financial Reports.` },
    ],
  },
  {
    id: "dmepos",
    number: "7",
    title: "DMEPOS",
    description:
      "Durable Medical Equipment, Prosthetics, Orthotics & Supplies: training, documentation, licensing, insurance, and accreditation evidence.",
    items: [
      { id: "dme-1", title: `(DMEPOS) There is evidence that the staff has been trained on the Policy and Procedure related to assisting patients with the use and care of the Glucometer/Nebulizer and supplies.` },
      { id: "dme-2", title: `(DMEPOS) There is evidence that patients who have received Glucometers/Nebulizers and supplies have been trained on use and care of these items.` },
      { id: "dme-3", title: `(DMEPOS) There is evidence that the Glucometer and/or Nebulizer serial number is documented in the patients Sales Force profile in case of recall.` },
      { id: "dme-4", title: `During Inspection the location was able to show documents that demonstrate the Required licenses, including zoning.` },
      { id: "dme-5", title: `Location was able to show Credit Agreement(s) or Invoices.` },
      { id: "dme-6", title: `Location was able to show Proof of Warranty coverage.` },
      { id: "dme-7", title: `Is there accessibility to physical site per CMS standards?` },
      { id: "dme-8", title: `Are the hours of operation clear and visible in the location?` },
      { id: "dme-9", title: `The location was able to show the Comprehensive liability insurance policy and/or Certificate of Insurance showing NSC as the certificate holder.` },
      { id: "dme-10", title: `The location was able to show the documentation for written instruction/information on beneficiary use/maintenance of supply.` },
      { id: "dme-11", title: `The location was able to show the copy of the supplier standards.`, detail: `Medicare DMEPOS Supplier Standards Poster posted.` },
      { id: "dme-12", title: `The location was able to show the listing of all Management/Owners, including name and title.` },
      { id: "dme-13", title: `The location was able to show the Complaint resolution protocol.` },
      { id: "dme-14", title: `The location was able to show the Complaint Log.` },
      { id: "dme-15", title: `The location was able to show the Accreditation information.`, detail: `DMEPOS Certificate posted / on file.` },
    ],
  },
  {
    id: "controlled-substances",
    number: "8",
    title: "Controlled Substances",
    description:
      "AHF walkthrough checks for C-II–C-V controls, perpetual inventory, CSOS, keys, and DEA/audit contacts.",
    items: [
      { id: "cs-1", title: `C2 Safe access verified and contents reviewed (C2 stock, pharmacy keys, etc.).` },
      { id: "cs-2", title: `Spot-count of 2 different C-II drugs matches the book and McKesson counts.` },
      { id: "cs-3", title: `CSOS access (Cardinal) confirmed for ordering controlled substances.` },
      { id: "cs-4", title: `Pharmacy keys and key log are maintained; key storage location is known.` },
      { id: "cs-5", title: `DEA / Board of Pharmacy audit contact is known: PharmacyLeadership@ahfrx.org.` },
      { id: "cs-6", title: `Insurance audit contact is known: ahfpharmacyaudits@aidshealth.org.` },
      { id: "cs-7", title: `Prescription RTS (return-to-stock) dates checked in the Will Call area — no overdue items.` },
      { id: "cs-8", title: `Inventory adjustment process is documented and followed.` },
    ],
  },
  {
    id: "systems-access",
    number: "9",
    title: "Systems & Access",
    description:
      "AHF walkthrough checks confirming staff have working access to the required day-to-day systems, vendor portals, and reference tools.",
    items: [
      { id: "sa-1", title: `Access to Dynamedex & Clinical Pharmacology is verified.` },
      { id: "sa-2", title: `Pitney Bowes — login, scale, and history are accessible.` },
      { id: "sa-3", title: `Tracking-number lookup process is known (Pitney Bowes & McKesson / CRC).` },
      { id: "sa-4", title: `Outcomes MTM login works and a pharmacist can run a case.` },
      { id: "sa-5", title: `A REMS drug list is maintained and known by staff.` },
      { id: "sa-7", title: `PT ID lookup to link Eagle with McKesson is documented.` },
      { id: "sa-10", title: `Domo access is verified — staff know which reports they work on.` },
      { id: "sa-11", title: `ClerkChat is functioning and used per workflow.` },
      { id: "sa-12", title: `ServiceNow is used for new equipment / IT requests.` },
    ],
  },
  {
    id: "training-credentials",
    number: "10",
    title: "Training & Credentials",
    description:
      "AHF walkthrough checks for required training, certifications, and continuing education not already covered by the core training items.",
    items: [
      { id: "tc-2", title: `Continuing Education credits are current for all pharmacists.` },
      { id: "tc-3", title: `HIPAA training has been completed by all staff this year.` },
      { id: "tc-4", title: `Sexual harassment / state-mandated training has been completed by all staff.` },
      { id: "tc-5", title: `California Violence in the Workplace training has been completed (CA stores).` },
      { id: "tc-7", title: `Annual competency assessments have been completed for technicians.` },
      { id: "tc-8", title: `BLS/CPR certifications are current where applicable.` },
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
