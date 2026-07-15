export const WA_STORE_IDS = new Set(["1417", "1310", "1416"]);

export function isWaStore(siteId: string): boolean {
  return WA_STORE_IDS.has(siteId);
}

export interface WaDocItem {
  id: string;
  title: string;
  rule: string;
}

export interface WaItem {
  id: string;
  text: string;
  rule?: string;
  naOption?: boolean;
  locationField?: boolean;
  highlighted?: boolean;
}

export interface WaSection {
  id: string;
  title: string;
  note?: string;
  items: WaItem[];
}

export const WA_DOC_REVIEW_ITEMS: WaDocItem[] = [
  { id: "doc-1", title: "Responsible Pharmacy Manager Self-Inspection Worksheets for the last 2 years", rule: "WAC 246-945-005(4)(a)" },
  { id: "doc-2", title: "Current Biennial Controlled Substance Inventory", rule: "WAC 246-945-420(2)" },
  { id: "doc-3", title: "Schedule II–V Invoices for the last 2 years", rule: "WAC 246-945-040(4)(a)" },
  { id: "doc-4", title: "Completed CII order forms (DEA Form 222) and/or finalized CSOS documentation for the last 2 years", rule: "WAC 246-945-040(7)" },
  { id: "doc-5", title: "Completed significant loss or theft forms (DEA Form 106) for the last 2 years", rule: "WAC 246-945-040(4)(c)" },
  { id: "doc-6", title: "Power of Attorney for staff authorized to order controlled substances", rule: "21 CFR 1305.05(a)" },
  { id: "doc-7", title: "Ancillary Utilization Plan", rule: "WAC 246-945-410(11)(a)" },
  { id: "doc-8", title: "Change of Responsible Pharmacy Manager forms for the last 2 years", rule: "WAC 246-945-480(1)" },
  { id: "doc-9", title: "Collaborative Drug Therapy Agreement(s) (CDTA), if applicable", rule: "WAC 246-945-350(1)" },
  { id: "doc-10", title: "Prescription Records for the last 2 years", rule: "WAC 246-945-410(12)" },
];

export const WA_SECTIONS: WaSection[] = [
  {
    id: "general-licensing",
    title: "General Licensing",
    items: [
      { id: "1", text: "Is the current pharmacy license posted?", rule: "RCW 18.64.043(3)" },
      { id: "2", text: "Are the pharmacist license(s) posted and up to date?", rule: "RCW 18.64.140", highlighted: true },
      { id: "3", text: "Does the pharmacy have a DEA registration number listed in this document?", rule: "WAC 246-945-040(3)" },
      { id: "4", text: "Is the responsible pharmacy manager licensed to practice pharmacy in Washington State?", rule: "WAC 246-945-310" },
      { id: "5", text: "Are ancillary personnel certifications and registrations up to date? (Provide a staff roster with credential and expiration date.)", rule: "WAC 246-945-205(2)", highlighted: true },
      { id: "6", text: "Have Technician in Training Endorsement forms been submitted for all persons enrolled in the technician training program?", rule: "WAC 246-945-203(3)" },
    ],
  },
  {
    id: "facility-standards",
    title: "Facility Standards",
    items: [
      { id: "7", text: "Is the facility appropriately constructed and equipped to protect equipment, records, drugs/devices, and other restricted items from unauthorized access?", rule: "WAC 246-945-410(1)" },
      { id: "8", text: "Is the facility properly equipped to ensure safe, clean, and sanitary conditions necessary for the proper operation and safe preparation of prescriptions?", rule: "WAC 246-945-410(2)" },
      { id: "9", text: "Is the facility appropriately staffed?", rule: "WAC 246-945-410(3)" },
      { id: "10", text: "Is the facility adequately stocked to maintain a representative assortment of drugs to meet patients' pharmaceutical needs?", rule: "WAC 246-945-410(4)" },
      { id: "11", text: "Does the facility have a designated responsible pharmacy manager?", rule: "WAC 246-945-410(5)" },
      { id: "12", text: "Does each drug dispensed and delivered to patients bear a complete and accurate label?", rule: "WAC 246-945-410(9)" },
      { id: "13", text: "Are the drug storage areas appropriately secure from unauthorized access?", rule: "WAC 246-945-410(10)", highlighted: true },
      { id: "14", text: "Is a sign posted in view of patients informing them of generic substitution requirements?", rule: "RCW 69.41.160" },
      { id: "15", text: "Are refrigerator temperatures maintained between 2–8°C (36–46°F)? Electronic monitoring is acceptable.", rule: "WAC 246-945-415(1)", highlighted: true },
      { id: "16", text: "Are medication freezer temperatures maintained between −25° and −10°C (−13° and 14°F), or within acceptable range per manufacturer? Electronic monitoring is acceptable.", rule: "WAC 246-945-415(1)", highlighted: true },
    ],
  },
  {
    id: "ancillary-personnel",
    title: "Ancillary Personnel",
    items: [
      { id: "17", text: "Is the pharmacy adhering to a commission-approved Ancillary Utilization Plan?", rule: "RCW 18.64A.060" },
      { id: "18", text: "Are pharmacy assistants operating within their scope of practice and only completing tasks outlined in the pharmacy's approved ancillary utilization plan?", rule: "RCW 18.64A.060" },
      { id: "19", text: "Are pharmacy technicians operating within their scope of practice and only completing tasks outlined in the pharmacy's approved ancillary utilization plan?", rule: "RCW 18.64A.060" },
    ],
  },
  {
    id: "recordkeeping",
    title: "Recordkeeping",
    items: [
      { id: "20", text: "An electronic recordkeeping system is required. Does your record system have the capability to store patient medication records (allergies, idiosyncrasies, chronic conditions, prescription, refill, transfer, and other information)?", rule: "WAC 246-945-417(1)" },
      { id: "21", text: "Do pharmacists document that refill information for an original paper, fax, or oral prescription order for a Schedule III or IV controlled substance is correct?", rule: "21 CFR 1306.22(f)(3)" },
      { id: "22", text: "Do medications dispensed under an emergency proclamation meet all requirements?", rule: "WAC 246-945-332" },
      { id: "23", text: "Is prescription adaptation in compliance with laws and rules regarding quantity, dosage form, completion of missing information, and documentation in the patient's record?", rule: "WAC 246-945-335" },
      { id: "24", text: "Are all drug or biologic product substitutions in compliance with applicable laws and rules?", rule: "WAC 246-945-340" },
      { id: "25", text: "Are lawfully prescribed drugs and devices, or a therapeutically equivalent drug or device, delivered to patients in a timely manner?", rule: "WAC 246-945-415(2)" },
      { id: "26", text: "Does the pharmacy provide the patient or agent with a timely alternative if the lawfully prescribed drug is not in stock or the prescription cannot be filled?", rule: "WAC 246-945-415(4)" },
      { id: "27", text: "If the pharmacy utilizes a secure delivery area, does it have adequate security and policies and procedures relating to the delivery area? (Select N/A if not applicable.)", rule: "WAC 246-945-415(6)", naOption: true },
      { id: "28", text: "Are all legend drugs dispensed in child-resistant containers, as required by federal law? (Includes customized patient medication packages, blister packs, med-minders, etc.)", rule: "WAC 246-945-032(1)" },
      { id: "29a", text: "Do all prescriptions for non-controlled legend drugs contain the required element: Prescriber's Name?", rule: "WAC 246-945-010(3)(a)" },
      { id: "29b", text: "Non-controlled Rx — Name of Patient / Authorized entity / Animal Name and Species?", rule: "WAC 246-945-010(3)(b)" },
      { id: "29c", text: "Non-controlled Rx — Date of Issuance?", rule: "WAC 246-945-010(3)(c)" },
      { id: "29d", text: "Non-controlled Rx — Drug Name, Strength, and Quantity?", rule: "WAC 246-945-010(3)(d)" },
      { id: "29e", text: "Non-controlled Rx — Directions for Use?", rule: "WAC 246-945-010(3)(e)" },
      { id: "29f", text: "Non-controlled Rx — Number of Refills?", rule: "WAC 246-945-010(3)(f)" },
      { id: "29g", text: "Non-controlled Rx — Substitution Directions?", rule: "WAC 246-945-010(3)(g)" },
      { id: "29h", text: "Non-controlled Rx — Prescriber's Signature?", rule: "WAC 246-945-010(3)(h)" },
      { id: "29i", text: "Non-controlled Rx — If written, on Tamper-resistant Paper?", rule: "WAC 246-945-010(3)(i)" },
      { id: "30a", text: "Do all prescriptions for controlled drugs contain the additional required element: Patient's Address?", rule: "WAC 246-945-010(4)(a)" },
      { id: "30b", text: "Controlled Rx additional element — Dosage Form?", rule: "WAC 246-945-010(4)(b)" },
      { id: "30c", text: "Controlled Rx additional element — Prescriber's Address?", rule: "WAC 246-945-010(4)(c)" },
      { id: "30d", text: "Controlled Rx additional element — Prescriber's DEA Number?", rule: "WAC 246-945-010(4)(d)" },
      { id: "31", text: "Do chart orders meet requirements?", rule: "WAC 246-945-010(5)" },
      { id: "32", text: "Do emergency prescriptions for Schedule II controlled substances meet requirements?", rule: "WAC 246-945-010(6)" },
      { id: "33", text: "Are all controlled substances prescribed orally reduced to a written or electronic prescription?", rule: "WAC 246-945-010(7)" },
      { id: "34", text: "Are all non-controlled legend drugs prescribed orally promptly transcribed to a written or electronic prescription?", rule: "WAC 246-945-010(8)" },
      { id: "35", text: "Are all drugs dispensed pursuant to valid prescriptions?", rule: "WAC 246-945-011", highlighted: true },
      { id: "36", text: "Do all paper prescriptions contain two lines clearly identified for a practitioner's signature, one for \"dispense as written\" and the other for \"substitution permitted\"? (Not necessary if substitution is permitted by a prior consent authorization.)", rule: "RCW 69.41.120(1)" },
      { id: "37", text: "Are paper prescriptions for controlled substances maintained appropriately?", rule: "WAC 246-945-410(12)(a)" },
      { id: "38", text: "Are paper prescriptions for non-controlled substances maintained appropriately?", rule: "RCW 69.41.120(4)" },
      { id: "39", text: "Are electronic prescriptions maintained appropriately?", rule: "WAC 246-945-417(6)" },
      { id: "40", text: "Do the prescription records contain a complete auditable trail?", rule: "WAC 246-945-417(2)" },
      { id: "41", text: "Does the electronic recordkeeping system include security features to protect the confidentiality and integrity of patient records?", rule: "WAC 246-945-417(3)" },
      { id: "42", text: "Are non-controlled substance prescriptions transferred appropriately and with sufficient information to maintain an auditable trail?", rule: "WAC 246-945-345" },
      { id: "43", text: "Do prescription records properly document partial fills?", rule: "WAC 246-945-013" },
      { id: "44", text: "If the pharmacy utilizes shared or central fill pharmacy services, are there policies and procedures outlining these services? (Select N/A if not applicable.)", rule: "WAC 246-945-425", naOption: true },
      { id: "45", text: "Is an inventory of controlled substances conducted and maintained on-site at a minimum every two years?", rule: "WAC 246-945-420(2)", highlighted: true },
      { id: "46", text: "Is an inventory of controlled substances completed within 30 days of a new responsible manager, or on the effective date of the addition of a substance to a schedule?", rule: "WAC 246-945-420(3)" },
      { id: "47", text: "If legend drugs (including controlled substances) are dispensed or delivered without a pharmacist on-site, is there a perpetual inventory? (Select N/A if not applicable.)", rule: "WAC 246-945-420(4)", naOption: true },
      { id: "48", text: "If prescription drugs are dispensed or delivered without pharmacy ancillary personnel physically on-site, is there a perpetual inventory? (Select N/A if not applicable.)", rule: "WAC 246-945-420(5)", naOption: true },
      { id: "49", text: "Are all records readily retrievable for at least two years from the date the record was created or received, whichever is later?", rule: "WAC 246-945-020(1)", highlighted: true },
      { id: "50", text: "Does the pharmacy maintain records of all receipt and distribution of controlled substances?", rule: "WAC 246-945-040(4)" },
      { id: "51", text: "Are records of Schedule II drugs maintained separately from all other controlled substance records?", rule: "WAC 246-945-040(5)" },
      { id: "52", text: "Are records of Schedule III–V drugs maintained either separately or in a form that is readily retrievable from other records?", rule: "WAC 246-945-040(6)" },
      { id: "53", text: "Does the pharmacy have DEA 222 forms or their electronic equivalent (CSOS) for each acquisition or distribution of Schedule II drugs?", rule: "WAC 246-945-040(7)" },
      { id: "54", text: "Are significant losses or disappearances of controlled substances reported to PQAC, the DEA, and other appropriate authorities?", rule: "WAC 246-945-040(4)(c)", highlighted: true },
    ],
  },
  {
    id: "professional-requirements",
    title: "Professional Requirements",
    note: "For items 55–56, provide the location or file pathway if policies are maintained in electronic format.",
    items: [
      { id: "55a", text: "Does the pharmacy have policies and procedures for Purchasing?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "55b", text: "Policies and procedures for Ordering?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "55c", text: "Policies and procedures for Storing?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "55d", text: "Policies and procedures for Compounding?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "55e", text: "Policies and procedures for Delivering?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "55f", text: "Policies and procedures for Dispensing?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "55g", text: "Policies and procedures for Administration?", rule: "WAC 246-945-410(6)(a)", locationField: true },
      { id: "56", text: "Does the pharmacy have a policy for computer system downtime?", rule: "WAC 246-945-417(4)", locationField: true },
      { id: "57", text: "Do pharmacists perform drug utilization reviews when required?", rule: "WAC 246-945-001(29)" },
      { id: "58", text: "Do pharmacists perform patient counseling?", rule: "WAC 246-945-325(1)" },
      { id: "59", text: "Are pharmacists practicing under a valid and unexpired collaborative drug therapy agreement (CDTA)? (Select N/A if not applicable.)", rule: "WAC 246-945-350", naOption: true },
      { id: "60", text: "Is all merchandise in date? (Including OTC medications throughout the store, not solely behind the counter.) *Perform an inventory check for expired medications while completing this report.*", rule: "RCW 69.04.100", highlighted: true },
      { id: "61", text: "Does the pharmacy meet the requirements for the return and reuse of medications?", rule: "WAC 246-945-485(1)" },
      { id: "62", text: "Does the pharmacy meet the requirements for return and destruction of medications?", rule: "WAC 246-945-485(2)" },
      { id: "63", text: "If you possess, distribute, or dispense legend drug samples, are you a pharmacy of a licensed hospital or health care entity? (Select N/A if not applicable.)", rule: "WAC 246-945-035", naOption: true },
      { id: "64", text: "Are all drugs ready to be dispensed to patients properly labeled and stored, in accordance with federal and state statutes, rules, and regulations?", rule: "RCW 18.64.246(1)" },
      { id: "65", text: "Does the pharmacy have required policies and procedures for drugs stored outside of the pharmacy? (Select N/A if not applicable.)", rule: "WAC 246-945-455(1)", naOption: true },
      { id: "66", text: "Are prescriptions being refilled in accordance with pharmacy laws and rules?", rule: "WAC 246-945-012" },
      { id: "67", text: "When prescriptions are delivered, does the pharmacy have appropriate measures in place to ensure product integrity?", rule: "WAC 246-945-415(1)" },
      { id: "68", text: "When pharmacy-owned lockers are utilized to deliver filled prescriptions, are these limited to non-controlled drugs that comply with applicable commission rules and guidance? (Select N/A if not applicable.)", rule: "WAC 246-945-415(1)", naOption: true },
    ],
  },
  {
    id: "remote-supervision",
    title: "Remote Supervision and Access in the Absence of a Pharmacist",
    note: "If the pharmacy does NOT store, dispense, or deliver drugs without a pharmacist on-site, mark questions 70–76 as N/A.",
    items: [
      { id: "69", text: "Does the pharmacy store, dispense, or deliver drugs to patients without a pharmacist on-site? (If No, mark questions 70–76 as N/A.)", rule: "WAC 246-945-430(1)", naOption: true },
      { id: "70", text: "Does the pharmacy have full visual surveillance of the pharmacy?", rule: "WAC 246-945-430(2)", naOption: true },
      { id: "71", text: "Is access to the pharmacy limited and monitored?", rule: "WAC 246-945-430(3)", naOption: true },
      { id: "72", text: "Does the monitoring system include visual and audio communication?", rule: "WAC 246-945-430(4)", naOption: true },
      { id: "73", text: "Does the responsible pharmacy manager or designee perform monthly in-person inspections of the pharmacy?", rule: "WAC 246-945-430(5)", naOption: true },
      { id: "74", text: "Can a pharmacist be on-site within 3 hours of an emergency?", rule: "WAC 246-945-430(6)", naOption: true },
      { id: "75", text: "Does the pharmacy close in the event of a surveillance or communication system failure?", rule: "WAC 246-945-430(7)", naOption: true },
      { id: "76", text: "Does the pharmacy maintain a perpetual inventory for legend drugs and controlled substances?", rule: "WAC 246-945-420(4)/(5)", naOption: true },
    ],
  },
];
