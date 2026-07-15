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
  noCheckbox?: boolean;
}

export interface WaSection {
  id: string;
  title: string;
  note?: string;
  items: WaItem[];
}

export const WA_DOC_REVIEW_ITEMS: WaDocItem[] = [
  {
    id: "doc-1",
    title: "Responsible Pharmacy Manager Self-Inspection Worksheets for the last 2 years",
    rule: `WAC 246-945-005(4)(a) "The responsible pharmacy manager, or equivalent manager, shall sign and date the completed self-inspection worksheet(s), and maintain completed worksheets for two years from the date of completion."\nWAC 246-945-005(4)(b) "When a change in responsible pharmacy manager, or equivalent manager occurs, the new responsible pharmacy manager, or equivalent manager, shall conduct a self-inspection as required under this section. The new responsible pharmacy manager, or equivalent manager, shall sign and date the self-inspection worksheet(s) within thirty days of becoming responsible pharmacy manager, or equivalent manager, and maintain completed worksheets for two years from the date of completion."`,
  },
  {
    id: "doc-2",
    title: "Current Biennial Controlled Substance Inventory",
    rule: `WAC 246-945-420(2) "A facility shall conduct an inventory of controlled substances every two years."\nWAC 246-945-420(3)(a) "Within thirty days of designating a responsible pharmacy manager. The incoming responsible pharmacy manager, or designee, shall conduct a complete controlled substance inventory."\n21 CFR 1304.04(h)(1) "Inventories and records of all controlled substances listed in Schedules I and II shall be maintained separately from all of the records of the pharmacy; and. (3) Inventories and records of Schedules III, IV, and V controlled substances shall be maintained either separately from all other records of the pharmacy or in such form that the information required is readily retrievable from the ordinary business records of the pharmacy."`,
  },
  {
    id: "doc-3",
    title: "Schedule II–V Invoices for the last 2 years",
    rule: `WAC 246-945-040(4)(a) "Every registrant shall keep and maintain inventory records required by 21 CFR Sec. 1304.04. Registrants are also required to keep a record of receipt and distribution of controlled substances. Records shall include: Invoices, orders, receipts, or any other document regardless of how titled, establishing the date, supplier, and quantity of drug received, and the name of the drug;"\nWAC 246-945-040(5) "Credential holders and pharmaceutical firms shall maintain records for Schedule II drugs separately from all other records."\nWAC 246-945-040(6) "Credential holders and pharmaceutical firms may maintain records for Schedule III, IV, and V drugs either separately or in a form that is readily retrievable from the business records of the registrant."`,
  },
  {
    id: "doc-4",
    title: "Completed CII order forms (DEA Form 222) and/or finalized CSOS documentation for the last 2 years",
    rule: `WAC 246-945-040(7) "A federal order form is required for each distribution of a Schedule I or II controlled substance. Credential holders and pharmaceutical firms must keep and make readily available these forms and other records to the commission or its designee."\n21 CFR 1305.13(e) "The purchaser must record on its copy of the DEA Form 222 the number of commercial or bulk containers furnished on each item and the dates on which the containers are received by the purchaser."\n21 CFR 1305.22(g) "When a purchaser receives a shipment, the purchaser must create a record of the quantity of each item received and the date received. The record must be electronically linked to the original order and archived."`,
  },
  {
    id: "doc-5",
    title: "Completed significant loss or theft forms (DEA Form 106) for the last 2 years",
    rule: `WAC 246-945-040(4)(c) "In the event of a significant loss or theft, two copies of DEA 106 (report of theft or loss of controlled substances) must be transmitted to the federal authorities and a copy must be sent to the commission."\n21 CFR 1301.76(b) "The registrant shall notify the Field Division Office of the Administration in his area, in writing, of the theft or significant loss of any controlled substances within one business day of discovery of such loss or theft. The registrant must also file a complete and accurate DEA Form 106 with the Administration through DEA's Diversion Control Division secure network application within 45 days after discovery of the theft or loss…"`,
  },
  {
    id: "doc-6",
    title: "Power of Attorney for staff authorized to order controlled substances",
    rule: `WAC 246-945-040(1) "The commission adopts and incorporates Title 21 of the Code of Federal Regulations in effect as of March 2, 2023, by reference."\n21 CFR 1305.05(a) "A registrant may authorize one or more individuals, whether or not located at his or her registered location, to issue orders for Schedule I and II controlled substances on the registrant's behalf by executing a power of attorney for each such individual, if the power of attorney is retained in the files, with executed Forms 222 where applicable, for the same period as any order bearing the signature of the attorney. The power of attorney must be available for inspection together with other order records."`,
  },
  {
    id: "doc-7",
    title: "Ancillary Utilization Plan",
    rule: `WAC 246-945-410(11)(a) "…A copy of the utilization plan must be maintained in the pharmacy..."`,
  },
  {
    id: "doc-8",
    title: "Change of Responsible Pharmacy Manager forms for the last 2 years",
    rule: `WAC 246-945-480(1) "The outgoing and incoming responsible pharmacy manager must report in writing to the commission a change in a responsible pharmacy manager designation within ten business days of the change."\nWAC 246-945-020(1) "Unless an alternative standard for a specified record type, form, or format is expressly stated a pharmaceutical firm must maintain and retain records required as evidence of compliance with statutes and rules enforced by the commission in a readily retrievable form and location for at least two years from the date the record was created or received, whichever date is later. (2) A pharmaceutical firm must allow the commission, or its designee, access to the pharmaceutical firm's records upon request for the purposes of monitoring compliance with statutes and rules enforced by the commission."`,
  },
  {
    id: "doc-9",
    title: "Collaborative Drug Therapy Agreement(s) (CDTA), if applicable",
    rule: `WAC 246-945-350(1) "A pharmacist exercising prescriptive authority in their practice must have a valid CDTA on file with the commission and their practice location." A CDTA must include the elements listed WAC 246-945-350(2) and is only valid for two years from the date of signing. (4) Any modification of the written guideline or protocol shall be treated as a new CDTA.`,
  },
  {
    id: "doc-10",
    title: "Prescription Records for the last 2 years",
    rule: `WAC 246-945-410(12) "A facility's paper prescriptions must be maintained in accordance with WAC 246-945-020 and as follows: (a) Paper prescriptions for Schedule II drugs must be maintained as a separate file from other prescriptions. (b) Paper prescriptions for Schedule III, IV, and V drugs must be maintained as a separate file, or maintained in a separate file with prescriptions for noncontrolled legend drugs as allowed under federal law."`,
  },
];

export const WA_SECTIONS: WaSection[] = [
  {
    id: "general-licensing",
    title: "General Licensing",
    items: [
      {
        id: "1",
        text: "Is the current pharmacy license posted?",
        rule: `RCW 18.64.043(3) "It shall be the duty of the owner to immediately notify the commission of any change of location, ownership, or licensure and to keep the license of location or the renewal thereof properly exhibited in said pharmacy."`,
      },
      {
        id: "2",
        text: "Are the pharmacist license(s) posted and up to date?",
        rule: `RCW 18.64.140 "…The current license shall be conspicuously displayed to the public in the pharmacy to which it applies…"`,
        highlighted: true,
      },
      {
        id: "3",
        text: "Does the pharmacy have a DEA registration number, is it listed on page 3 of this document?",
        rule: `WAC 246-945-040(3) "A separate registration is required for each place of business, as defined in 21 CFR Sec. 1301.12, where controlled substances are manufactured, distributed, or dispensed."`,
      },
      {
        id: "4",
        text: "Is the responsible pharmacy manager licensed to practice pharmacy in Washington State?",
        rule: `WAC 246-945-310 "Responsible pharmacy manager. The responsible pharmacy manager must be licensed to practice pharmacy in the state of Washington. The responsible pharmacy manager designated by a facility as required under WAC 246-945-410 shall have the authority and responsibility to assure that the area(s) within the facility where drugs are stored, compounded, delivered, or dispensed are operated in compliance with all applicable state and federal statutes and regulations."`,
      },
      {
        id: "5",
        text: "Are ancillary personnel certification(s) and registration(s) up to date? Please provide documentation of a regular staff roster with credential and expiration date.",
        rule: `WAC 246-945-205(2) "To be issued a certification as a pharmacy technician an applicant shall meet the qualifications in RCW 18.64A.020,"\nWAC 246-945-200(1) "To become registered as a pharmacy assistant an applicant shall submit an application to the commission that meets the requirements of WAC 246-12-020."`,
        highlighted: true,
      },
      {
        id: "6",
        text: "Have Technician in Training Endorsement forms been submitted for all persons enrolled in the technician training program?",
        rule: `WAC 246-945-203(3) "Before beginning the pharmacy-technician training program the individual shall submit an application to the commission to become certified as a pharmacy assistant. The application must include verification of enrollment in a commission-approved pharmacy-technician education and training program."\n(2) An individual with a technician in training endorsement may only work in that capacity at those sites identified on the application.`,
      },
    ],
  },
  {
    id: "facility-standards",
    title: "Facility Standards",
    items: [
      {
        id: "7",
        text: "Is the facility appropriately constructed and equipped to protect equipment, records, drugs/devices, and other restricted items from unauthorized access?",
        rule: `WAC 246-945-410(1) "The facility shall be constructed and equipped with adequate security to protect equipment, records, and supply of drugs, devices, and other restricted sale items from unauthorized access, acquisition, or use."`,
      },
      {
        id: "8",
        text: "Is the facility properly equipped to ensure safe, clean, and sanitary conditions necessary for the proper operation and safe preparation of prescriptions?",
        rule: `WAC 246-945-410(2) "The facility shall be properly equipped to ensure the safe, clean, and sanitary condition necessary for the proper operation, the safe preparation of prescriptions, and to safeguard product integrity."`,
      },
      {
        id: "9",
        text: "Is the facility appropriately staffed?",
        rule: `WAC 246-945-410(3) "The facility shall be staffed sufficiently to allow appropriate supervision, operate safely and, if applicable, remain open during posted hours of operation."`,
      },
      {
        id: "10",
        text: "Is the facility adequately stocked to maintain a representative assortment of drugs to meet patients' pharmaceutical needs?",
        rule: `WAC 246-945-410(4) "The facility shall be adequately stocked to maintain at all times a representative assortment of drugs in order to meet the pharmaceutical needs of its patients in compliance with WAC 246-945-415."`,
      },
      {
        id: "11",
        text: "Does the facility have a designated responsible pharmacy manager?",
        rule: `WAC 246-945-410(5) "The facility shall designate a responsible pharmacy manager: (a) By the date of opening; and (b) Within thirty calendar days of a vacancy."`,
      },
      {
        id: "12",
        text: "Does each drug dispensed and delivered to patients bear a complete and accurate label?",
        rule: `WAC 246-945-410(9) "Each drug dispensed and delivered to a patient must bear a complete and accurate label as required by WAC 246-945-015 through 246-945-018. The information contained on the label shall be supplemented by oral or written information as required by WAC 246-945-325."`,
      },
      {
        id: "13",
        text: "Are the drug storage areas appropriately secure from unauthorized access?",
        rule: `WAC 246-945-410(10) "Access to the drug storage area located within the facility should be limited to pharmacists unless one of the following applies: (a) A pharmacy intern, or pharmacy ancillary personnel enter under the immediate supervision of a pharmacist; or (b) A pharmacist authorizes temporary access to an individual performing a legitimate nonpharmacy function under the immediate supervision of the pharmacist; or (c) The facility has a policy and procedure restricting access to a health care professional licensed under the chapters specified in RCW 18.130.040, and the actions of the health care professional are within their scope of practice."`,
        highlighted: true,
      },
      {
        id: "14",
        text: "Is a sign posted in view of patients informing them of generic substitution requirements?",
        rule: `RCW 69.41.160 "Every pharmacy shall post a sign in a location at the prescription counter that is readily visible to patrons stating, 'Under Washington law, a less expensive interchangeable biological product or equivalent drug may in some cases be substituted for the drug prescribed by your doctor. Such substitution, however, may only be made with the consent of your doctor. Please consult your pharmacist or physician for more information.'"`,
      },
      {
        id: "15",
        text: "Are refrigerators temperatures maintained between 2–8°C (36–46°F)? **Electronic monitoring is acceptable.**",
        rule: `WAC 246-945-415(1) "A pharmacy may deliver filled prescriptions as long as appropriate measures are taken to ensure product integrity and receipt by the patient or patient's agent."`,
        highlighted: true,
      },
      {
        id: "16",
        text: "Are medication freezer temperatures maintained between −25° & −10°C (−13° & 14°F) or within acceptable range based on manufacturers' storage requirements? **Electronic monitoring is acceptable.**",
        rule: `WAC 246-945-415(1) "A pharmacy may deliver filled prescriptions as long as appropriate measures are taken to ensure product integrity and receipt by the patient or patient's agent."`,
        highlighted: true,
      },
    ],
  },
  {
    id: "ancillary-personnel",
    title: "Ancillary Personnel",
    items: [
      {
        id: "17",
        text: "Is the pharmacy adhering to a commission-approved Ancillary Utilization Plan?",
        rule: `RCW 18.64A.060 "No pharmacy licensed in this state shall utilize the services of pharmacy ancillary personnel without approval of the commission. Any pharmacy licensed in this state may apply to the commission for permission to use the services of pharmacy ancillary personnel. The application shall be accompanied by a fee and shall comply with administrative procedures and administrative requirements set pursuant to RCW 43.70.250 and 43.70.280, shall detail the manner and extent to which the pharmacy ancillary personnel would be used and supervised, and shall provide other information in such form as the secretary may require. The commission may approve or reject such applications. In addition, the commission may modify the proposed utilization of pharmacy ancillary personnel and approve the application as modified. Whenever it appears to the commission that pharmacy ancillary personnel are being utilized in a manner inconsistent with the approval granted, the commission may withdraw such approval. In the event a hearing is requested upon the rejection of an application, or upon the withdrawal of approval, a hearing shall be conducted in accordance with RCW 18.64.022 and appeal may be taken in accordance with the administrative procedure act, chapter 34.05 RCW."\nWAC 246-945-410(11) "In accordance with RCW 18.64A.060 prior to utilizing pharmacy ancillary personnel a facility shall submit to the commission a utilization plan for pharmacy technicians and pharmacy assistants: (a) Utilization plan for pharmacy technicians. The application for approval must describe the manner in which the pharmacy technicians will be utilized and supervised, including job descriptions, task analysis or similar type documents that define the duties performed and the conditions under which they are performed, number of positions in each category, as well as other information as may be required by the commission. The commission will be notified of all changes to the utilization plan. A copy of the utilization plan must be maintained in the pharmacy. The utilization plan must comply with WAC 246-945-315 and 246-945-320. (b) Utilization plan for pharmacy assistants. The application for approval shall list the job title or function of the pharmacy assistant and comply with WAC 246-945-315(3)."`,
      },
      {
        id: "18",
        text: "Are pharmacy assistants operating within their scope of practice and only completing tasks outlined in the pharmacy's approved ancillary utilization plan?",
        rule: `RCW 18.64A.060 "... The commission may approve or reject such applications. In addition, the commission may modify the proposed utilization of pharmacy ancillary personnel and approve the application as modified. Whenever it appears to the commission that pharmacy ancillary personnel are being utilized in a manner inconsistent with the approval granted, the commission may withdraw such approval. In the event a hearing is requested upon the rejection of an application, or upon the withdrawal of approval, a hearing shall be conducted in accordance with chapter RCW 18.64.022, and appeal may be taken in accordance with the administrative procedure act, chapter 34.05 RCW."\nRCW 18.64A.030 "... (2) 'Pharmacy assistants' may perform, under the supervision of a licensed pharmacist, duties including, but not limited to, typing of prescription labels, filing, refiling, bookkeeping, pricing, stocking, delivery, nonprofessional phone inquiries, and documentation of third-party reimbursements and other such duties and subject to such restrictions as the commission may by rule adopt."\nWAC 246-945-315(3) "A pharmacist may delegate to a pharmacy assistant those functions defined in RCW 18.64A.030 and the following: (a) Prepackage and label drugs for subsequent use in prescription dispensing operations; and (b) Count, pour, and label for individual prescriptions."`,
      },
      {
        id: "19",
        text: "Are pharmacy technicians operating within their scope of practice and only completing tasks outlined in the pharmacy's approved ancillary utilization plan?",
        rule: `RCW 18.64A.060 "… The commission may approve or reject such applications. In addition, the commission may modify the proposed utilization of pharmacy ancillary personnel and approve the application as modified. Whenever it appears to the commission that pharmacy ancillary personnel are being utilized in a manner inconsistent with the approval granted, the commission may withdraw such approval. In the event a hearing is requested upon the rejection of an application, or upon the withdrawal of approval, a hearing shall be conducted in accordance with RCW 18.64.022, and appeal may be taken in accordance with the administrative procedure act, chapter 34.05 RCW."\nRCW 18.64A.030 "... (1) 'Pharmacy technicians' may assist in performing, under the supervision and control of a licensed pharmacist, manipulative, nondiscretionary functions associated with the practice of pharmacy and other such duties and subject to such restrictions as the commission may by rule adopt... ."\nWAC 246-945-315(2) "When delegating a pharmacy function to a pharmacy technician: (a) A pharmacist shall consider the pharmacy technician's scope of practice, education, skill, and experience and take them into account; and (b) A pharmacist will not delegate a pharmacy function that is listed in WAC 246-945-320."`,
      },
    ],
  },
  {
    id: "recordkeeping",
    title: "Recordkeeping",
    items: [
      {
        id: "20",
        text: "An electronic recordkeeping system is required. Does your record system have the capability to store patient medication records (allergies, idiosyncrasies, chronic conditions, prescription, refill, transfer, and other information)?",
        rule: `WAC 246-945-417(1) "A pharmacy shall use an electronic recordkeeping system to establish and store patient medication records, including patient allergies, idiosyncrasies or chronic conditions, and prescription, refill, transfer information, and other information necessary to provide safe and appropriate patient care."`,
      },
      {
        id: "21",
        text: "Do pharmacists document that refill information for an original paper, fax, or oral prescription order for a Schedule III or IV controlled substance is correct?",
        rule: `RCW 69.50.306 and 21 CFR 1306.22(f)(3) "Refilling of prescriptions.(f) As an alternative to the procedures provided by paragraphs (a) through (e) of this section, a computer application may be used for the storage and retrieval of refill information for original paper prescription orders for controlled substances in Schedule III and IV, subject to the following conditions:(3) Documentation of the fact that the refill information entered into the computer each time a pharmacist refills an original paper, fax, or oral prescription order for a Schedule III or IV controlled substance is correct must be provided by the individual pharmacist who makes use of such an application. If such an application provides a hard-copy printout of each day's controlled substance prescription order refill data, that printout shall be verified, dated, and signed by the individual pharmacist who refilled such a prescription order. In lieu of such a printout, the pharmacy shall maintain a bound log book, or separate file, in which each individual pharmacist involved in such dispensing shall sign a statement (in the manner previously described) each day, attesting to the fact that the refill information entered into the computer that day has been reviewed by him and is correct as shown."`,
      },
      {
        id: "22",
        text: "Do medications dispensed under an emergency proclamation meet all requirements?",
        rule: `WAC 246-945-332 "Continuity of care (2) For each medication dispensed under this section, a pharmacist shall: (a) Document the dispensing as a prescription, noting where the information from subsection (1)(a) of this section was obtained; (b) Inform the patient's provider and the pharmacy at which the patient obtains his or her medications of the dispensing as soon as possible following the emergency dispensing; (c) Record the prescription or patient record as an 'emergency' prescription."`,
      },
      {
        id: "23",
        text: "Is prescription adaptation in compliance with laws and rules regarding quantity, dosage form, completion of missing information, and documentation in the patient's record?",
        rule: `WAC 246-945-335 "Prescription adaptation. Upon patient consent, a pharmacist may adapt drugs as specified in this rule, provided that the prescriber has not indicated that adaptation is not permitted. (1) Change quantity. A pharmacist may change the quantity of medication prescribed if: (a) The prescribed quantity or package size is not commercially available; (b) The change in quantity is related to a change in dosage form; (c) The change is intended to dispense up to the total amount authorized by the prescriber including refills in accordance with RCW 18.64.520; or (d) The change extends a maintenance drug for the limited quantity necessary to coordinate a patient's refills in a medication synchronization program in accordance with RCW 48.43.096. (2) Change dosage form. A pharmacist may change the dosage form of the prescription if it is in the best interest of patient care, so long as the prescriber's directions are also modified to equate to an equivalent amount of drug dispensed as prescribed. (3) Complete missing information. A pharmacist may complete missing information on a prescription if there is evidence to support the change. (4) Documentation. A pharmacist who adapts a prescription in accordance with these rules must document the adaptation in the patient's record."`,
      },
      {
        id: "24",
        text: "Are all drug or biologic product substitutions in compliance with applicable laws and rules?",
        rule: `WAC 246-945-340 "Prescriptions—Drug product substitutions. (1) A pharmacist may substitute a drug or biologic product dispensed pursuant to a prescription if in compliance with applicable laws and rules. (2) A pharmacist may substitute a drug product or a biologic product when any of the following applies: (a) The substitution is permitted by RCW 69.41.120; (b) The substitution is permitted by a formulary developed by an interdisciplinary team of an institutional facility; or (c) The substitution is otherwise permitted by law." (3) In addition to any other applicable requirements, a pharmacist shall only substitute a drug or a biologic product pursuant to subsection (2)(b) of this section if: (a) An employee or contractor of the institutional facility prescribed the drug or biologic product to be substituted; (b) The interdisciplinary team was composed of a nonpharmacist prescriber listed in RCW 69.41.030 and a pharmacist; and (c) The formulary is readily retrievable by the pharmacist."`,
      },
      {
        id: "25",
        text: "Are lawfully prescribed drugs and devices, or a therapeutically equivalent drug or device, delivered to patients in a timely manner?",
        rule: `WAC 246-945-415 "Dispensing and delivery of prescription drugs (2) Pharmacies have a duty to deliver lawfully prescribed drugs or devices to patients and to distribute drugs and devices approved by the U.S. Food and Drug Administration for restricted distribution by pharmacies, or provide a therapeutically equivalent drug or device in a timely manner consistent with reasonable expectations for filling the prescription, except for the following or substantially similar circumstances: (a) Prescriptions containing an obvious or known error, inadequacies in the instructions, known contraindications, or incompatible prescriptions, or prescriptions requiring action in accordance with WAC 246-945-410(8) or 246-945-335; (b) National or state emergencies or guidelines affecting availability, usage, or supplies of drugs or devices; (c) Lack of specialized equipment or expertise needed to safely produce, store, or dispense drugs or devices, such as certain drug compounding or storage for nuclear medicine; (d) Potentially fraudulent prescriptions; or (e) Unavailability of drug or device despite good faith compliance with WAC 246-945-410(4). WAC 246-945-415(3) Nothing in this section requires pharmacies to deliver a drug or device without payment of their usual and customary or contracted charge."`,
      },
      {
        id: "26",
        text: "Does the pharmacy provide the patient or agent with a timely alternative if the lawfully prescribed drug is not in stock or the prescription cannot be filled?",
        rule: `WAC 246-945-415(4) "If despite good faith compliance with WAC 246-945-410(4), the lawfully prescribed drug or device is not in stock, or the prescription cannot be filled pursuant to subsection (2)(a) of this section, the pharmacy shall provide the patient or agent a timely alternative for appropriate therapy which, consistent with customary pharmacy practice, may include obtaining the drug or device. These alternatives include, but are not limited to: (a) Contact the prescriber to address concerns such as those identified in subsection (2)(a) of this section or to obtain authorization to provide a therapeutically equivalent product; (b) If requested by the patient or their agent, return unfilled lawful prescriptions to the patient or agent; or (c) If requested by the patient or their agent, communicate or transmit, as permitted by law, the original prescription information to a pharmacy of the patient's choice that will fill the prescription in a timely manner."\nWAC 246-945-415(5) "Engaging in or permitting any of the following shall constitute grounds for discipline or other enforcement actions: (a) Destroy unfilled lawful prescriptions; (b) Refuse to return unfilled lawful prescriptions; (c) Violate a patient's privacy; (d) Discriminate against patients or their agent in a manner prohibited by state or federal laws; and (e) Intimidate or harass a patient."`,
      },
      {
        id: "27",
        text: "If the pharmacy utilizes a secure delivery area, does it have adequate security and policies and procedures relating to the delivery area? (Select N/A if not applicable.)",
        rule: `WAC 246-945-415(6) "Filled prescriptions may be picked up or returned for delivery by authorized personnel when the pharmacy is closed for business if the prescriptions are placed in a secured delivery area outside of the drug storage area. The secured delivery area must be a part of a licensed pharmacy, and equipped with adequate security, including an alarm or comparable monitoring system, to prevent unauthorized entry, theft, or diversion. Access to the secured delivery area must be addressed by the policies and procedures developed by the responsible pharmacy manager."`,
        naOption: true,
      },
      {
        id: "28",
        text: "Are all legend drugs dispensed in child-resistant containers, as required by federal law or regulation? (This includes special packaging used such as customized patient medication packages; blister packs, med-minders, etc.) ** Best practice recommendation: It is recommended that these authorizations are updated annually. **",
        rule: `WAC 246-945-032(1) "All legend drugs shall be dispensed in a child-resistant container as required by federal law or regulation, including 16 CFR, Part 1700, unless: (a) Authorization is received from the prescriber to dispense in a container that is not child-resistant. (b) Authorization is obtained from the patient or a representative of the patient to dispense in a container that is not child-resistant."`,
      },
      {
        id: "29-header",
        text: "Do all prescriptions for non-controlled legend drugs include all required elements?",
        noCheckbox: true,
      },
      {
        id: "29a",
        text: "Prescriber's Name",
        rule: `WAC 246-945-010(3) "A prescription for a noncontrolled legend drug must include, but is not limited to, the following: (a) Prescriber's name; (b) Name of patient, authorized entity, or animal name and species; (c) Date of issuance; (d) Drug name, strength, and quantity; (e) Directions for use; (f) Number of refills (if any); (g) Instruction on whether or not a therapeutically equivalent generic drug or interchangeable biological product may be substituted, unless substitution is permitted under a prior-consent authorization; (h) Prescriber's manual or electronic signature, or prescriber's authorized agent signature if allowed by law; and (i) If the prescription is written, it must be written on tamper-resistant prescription pad or paper approved by the commission pursuant to RCW 18.64.500."`,
      },
      {
        id: "29b",
        text: "Name of Patient / Authorized entity / Animal Name and Species",
        rule: `WAC 246-945-010(3)(b) "Name of patient, authorized entity, or animal name and species."`,
      },
      {
        id: "29c",
        text: "Date of Issuance",
        rule: `WAC 246-945-010(3)(c) "Date of issuance."`,
      },
      {
        id: "29d",
        text: "Drug Name, Strength, and Quantity",
        rule: `WAC 246-945-010(3)(d) "Drug name, strength, and quantity."`,
      },
      {
        id: "29e",
        text: "Directions for Use",
        rule: `WAC 246-945-010(3)(e) "Directions for use."`,
      },
      {
        id: "29f",
        text: "Number of Refills",
        rule: `WAC 246-945-010(3)(f) "Number of refills (if any)."`,
      },
      {
        id: "29g",
        text: "Substitution Directions",
        rule: `WAC 246-945-010(3)(g) "Instruction on whether or not a therapeutically equivalent generic drug or interchangeable biological product may be substituted, unless substitution is permitted under a prior-consent authorization."`,
      },
      {
        id: "29h",
        text: "Prescriber's Signature",
        rule: `WAC 246-945-010(3)(h) "Prescriber's manual or electronic signature, or prescriber's authorized agent signature if allowed by law."`,
      },
      {
        id: "29i",
        text: "If written, on Tamper-resistant Paper",
        rule: `WAC 246-945-010(3)(i) "If the prescription is written, it must be written on tamper-resistant prescription pad or paper approved by the commission pursuant to RCW 18.64.500."`,
      },
      {
        id: "30-header",
        text: "Do all prescriptions for controlled drugs include additional required elements?",
        noCheckbox: true,
      },
      {
        id: "30a",
        text: "Patient's Address",
        rule: `WAC 246-945-010(4) "A prescription for a controlled substance must include all the information listed in subsection (3) of this section and the following: (a) Patient's address; (b) Dosage form; (c) Prescriber's address; (d) Prescriber's DEA registration number; and (e) Any other requirements listed in 21 C.F.R. Secs. 1300 through 1399 in effect as of March 7, 2024."`,
      },
      {
        id: "30b",
        text: "Dosage Form",
        rule: `WAC 246-945-010(4)(b) "Dosage form."`,
      },
      {
        id: "30c",
        text: "Prescriber's Address",
        rule: `WAC 246-945-010(4)(c) "Prescriber's address."`,
      },
      {
        id: "30d",
        text: "Prescriber's DEA Number",
        rule: `WAC 246-945-010(4)(d) "Prescriber's DEA registration number."`,
      },
      {
        id: "31",
        text: "Do chart orders meet requirements?",
        rule: `WAC 246-945-010(5) "A chart order must meet the requirements of RCW 18.64.550 and any other applicable requirements listed in 21 C.F.R., Secs. 1300 through 1399 in effect as of March 7, 2024."`,
      },
      {
        id: "32",
        text: "Do emergency prescriptions for Schedule II controlled substances meet requirements?",
        rule: `WAC 246-945-010(6) "A controlled substance listed in Schedule II can only be dispensed pursuant to a valid prescription in accordance with WAC 246-945-011 unless there is an 'emergency.' (a) For the purposes of this subsection, an 'emergency' exists when the immediate administration of the drug is necessary for proper treatment and no alternative treatment is available, and further, it is not possible for the practitioner to provide a written or electronic prescription for the drug at that time. (b) If a Schedule II drug is dispensed in an emergency, the practitioner must deliver a signed prescription to the dispenser within seven days after authorizing an emergency oral prescription or if delivered by mail it must be postmarked within the seven day period, and further the pharmacist must note on the prescription that it was filled on an emergency basis."`,
      },
      {
        id: "33",
        text: "Are all controlled substances prescribed orally reduced to a written or electronic prescription?",
        rule: `WAC 246-945-010(7) "A controlled substance listed in Schedule III, IV, or V, can only be dispensed pursuant to a valid prescription in accordance with WAC 246-945-011, or an oral prescription. An oral prescription for a controlled substance listed in Schedule III, IV, or V must be promptly reduced to a written or electronic prescription that complies with WAC 246-945-011."`,
      },
      {
        id: "34",
        text: "Are all non-controlled legend drugs prescribed orally promptly transcribed to a written or electronic prescription?",
        rule: `WAC 246-945-010(8) "A noncontrolled legend drug can only be dispensed pursuant to a valid prescription in accordance with WAC 246-945-011, or an oral prescription. An oral prescription for a noncontrolled legend drug must be promptly reduced to a written or electronic prescription that complies with WAC 246-945-011."`,
      },
      {
        id: "35",
        text: "Are all drugs dispensed pursuant to valid prescriptions?",
        rule: `WAC 246-945-011 "Prescription validity. (1) Prior to dispensing and delivering a prescription, a pharmacist shall verify its validity. (2) A prescription shall be considered invalid if: (a) At the time of presentation, the prescription shows evidence of alteration, erasure, or addition by any person other than the person who wrote it; (b) The prescription does not contain the required information as provided in WAC 246-945-010; (c) The prescription is expired; or (d) The prescription is for a controlled substance and does not comply with the requirements in RCW 69.50.308. (3) A prescription is considered expired when: (a) The prescription is for a controlled substance listed in Schedule II through V and the date of dispensing is more than six months after the prescription's date of issue. (b) The prescription is for a noncontrolled legend drug or OTC's and the date of dispensing is more than twelve months after the prescription's date of issue."`,
        highlighted: true,
      },
      {
        id: "36",
        text: `Do all paper prescriptions contain two lines clearly identified for a practitioner's signature, one for "dispense as written" and the other for "substitution permitted"? (Not necessary if substitution is permitted by a prior consent authorization.)`,
        rule: `RCW 69.41.120(1) "Every drug prescription shall contain an instruction on whether or not a therapeutically equivalent generic drug or interchangeable biological product may be substituted in its place, unless substitution is permitted under a prior-consent authorization. If a written prescription is involved, the prescription must be legible and the form shall have two signature lines at opposite ends on the bottom of the form. Under the line at the right side shall be clearly printed the words 'DISPENSE AS WRITTEN.' Under the line at the left side shall be clearly printed the words 'SUBSTITUTION PERMITTED.' The practitioner shall communicate the instructions to the pharmacist by signing the appropriate line. No prescription shall be valid without the signature of the practitioner on one of these lines. In the case of a prescription issued by a practitioner in another state that uses a one-line prescription form or variation thereof, the pharmacist may substitute a therapeutically equivalent generic drug or interchangeable biological product unless otherwise instructed by the practitioner through the use of the words 'dispense as written,' words of similar meaning, or some other indication."`,
      },
      {
        id: "37",
        text: "Are paper prescriptions for controlled substances maintained appropriately?",
        rule: `WAC 246-945-410(12) "A facility's paper prescriptions must be maintained in accordance with WAC 246-945-020 and as follows: (a) Paper prescriptions for Schedule II drugs must be maintained as a separate file from other prescriptions. (b) Paper prescriptions for Schedule III, IV, and V drugs must be maintained as a separate file, or maintained in a separate file with prescriptions for noncontrolled legend drugs as allowed under federal law."`,
      },
      {
        id: "38",
        text: "Are paper prescriptions for non-controlled substances maintained appropriately?",
        rule: `RCW 69.41.120(4) "The pharmacist shall retain the file copy of a written or oral prescription for the same period of time specified in RCW 18.64.245 for retention of prescription records."`,
      },
      {
        id: "39",
        text: "Are electronic prescriptions maintained appropriately?",
        rule: `WAC 246-945-417(6) "Electronic prescriptions for prescription drugs must be maintained by the pharmacy in a system that meets the requirements of 21 CFR Sec. 1311."`,
      },
      {
        id: "40",
        text: "Do the prescription records contain a complete auditable trail?",
        rule: `WAC 246-945-417(2) "The electronic recordkeeping system must be capable of real-time retrieval of information pertaining to the ordering, verification, and processing of the prescription where possible."`,
      },
      {
        id: "41",
        text: "Does the electronic recordkeeping system include security features to protect the confidentiality and integrity of patient records?",
        rule: `WAC 246-945-417 "Electronic systems for patient medication records, prescriptions, chart orders, and controlled substance records. (3) The electronic recordkeeping system must include security features to protect the confidentiality and integrity of patient records including: (a) Safeguards designed to prevent and detect unauthorized access, modification, or manipulation of prescription information and patient medication records; and (b) Functionality that documents any alteration of prescription information after a prescription is dispensed, including the identification of the individual responsible for the alteration."`,
      },
      {
        id: "42",
        text: "Are noncontrolled substance prescriptions transferred appropriately and contain sufficient information to maintain an auditable trail? *See 21 CFR 1306.08(e–f) and 21 CFR 1306.25(b) for the requirements for transferring controlled substance prescriptions.",
        rule: `WAC 246-945-345 "Prescription transfers. … (1) Upon request by a patient or an authorized representative of a patient, a noncontrolled prescription shall be transferred within the limits of state and federal law." (2) Pharmacies shall transfer noncontrolled prescription information within three business days of receiving the request or within a time frame that does not adversely impact the provision of medication therapy, whichever comes first. (3) Sufficient information needs to be exchanged in the transfer of a noncontrolled prescription to maintain an auditable trail, and all elements of a valid prescription." (4) Pharmacies sharing a secure real-time database are not required to transfer noncontrolled prescription information for dispensing." (5) Noncontrolled prescriptions must be transferred by electronic means or facsimile, except in emergent situations."`,
      },
      {
        id: "43",
        text: "Do prescription records properly document partial fills?",
        rule: `WAC 246-945-013 "Partial filling of prescriptions. (1) A pharmacist may partially fill a prescription for noncontrolled legend drugs and controlled substances listed in Schedule III through V provided that: (a) The partial fill is requested by the patient or the prescriber; (b) The partial filling is recorded in the same manner as a re-filling; (c) The total quantity dispensed and delivered in all partial fillings must not exceed the total quantity prescribed; and (d) Partial fills for controlled substances listed in Schedule III through V comply with 21 CFR Sec. 1306.23 in effect as of March 7, 2024. (2) A pharmacist may partially fill a prescription for a controlled substance listed in Schedule II within the limits of RCW 18.64.265, 21 U.S.C. Sec. 829, and 21 CFR Sec. 1306.13, in effect as of March 7, 2024, as applicable."`,
      },
      {
        id: "44",
        text: "If the pharmacy utilizes shared or central fill pharmacy services, are there policies and procedures outlining these services? (Select N/A if not applicable.)",
        rule: `WAC 246-945-425 "Pharmacy services may be provided off-site at one or more locations. When the services being performed are related to prescription fulfillment or processing, the pharmacy or pharmacist must comply with the following: … (2) Central fill shared pharmacy services in accordance with the following conditions: (a) The originating pharmacy shall have written policies and procedures outlining the off-site pharmacy services to be provided by the central fill pharmacy, or the off-site pharmacist or pharmacy technician, and the responsibilities of each party; (b) The parties shall share a secure real-time database or utilize other secure technology, including a private, encrypted connection that allows access by the central pharmacy or off-site pharmacist or pharmacy technician to the information necessary to perform off-site pharmacy services; and (c) A single prescription may be shared by an originating pharmacy and a central fill pharmacy or off-site pharmacist or pharmacy technician. The fulfillment, processing and delivery of a prescription by one pharmacy for another pursuant to this section will not be construed as the fulfillment of a transferred prescription or as a wholesale distribution."`,
        naOption: true,
      },
      {
        id: "45",
        text: "Is an inventory of controlled substances conducted and maintained on-site at a minimum every two years?",
        rule: `WAC 246-945-420(2) "A facility shall conduct an inventory of controlled substances every two years." This inventory shall include all controlled substances "on hand".\n21 CFR 1304.11(a) "Controlled substances shall be deemed to be 'on hand' if they are in the possession of or under the control of the registrant, including substances returned by a customer, ordered by a customer but not yet invoiced…" This includes medications in will call.`,
        highlighted: true,
      },
      {
        id: "46",
        text: "Is an inventory of controlled substances completed within 30 days of a new responsible manager, or on the effective date of the addition of a substance to a schedule?",
        rule: `WAC 246-945-420(3) "A facility shall conduct its own separate inventory of controlled substances in the following situations: (a) Within thirty days of designating a responsible pharmacy manager. The incoming responsible pharmacy manager, or designee, shall conduct a complete controlled substance inventory. (b) On the effective date of an addition of a substance to a schedule of controlled substances. Each facility that possesses the substance shall take an inventory of the substance on hand, and thereafter, include the substance in each inventory."`,
      },
      {
        id: "47",
        text: "If legend drugs (including controlled substances) are dispensed or delivered without a pharmacist on-site, is there a perpetual inventory? (Select N/A if not applicable.)",
        rule: `WAC 246-945-420(4) "A pharmacy that exclusively stores, dispenses or delivers legend drugs, including controlled substances, without a pharmacist on-site shall maintain a perpetual inventory."`,
        naOption: true,
      },
      {
        id: "48",
        text: "If prescription drugs are dispensed or delivered without pharmacy ancillary personnel physically on-site, is there a perpetual inventory? (Select N/A if not applicable.)",
        rule: `WAC 246-945-420(5) "A pharmacy that exclusively stores, dispenses or delivers prescription drugs without pharmacy ancillary personnel physically on-site shall maintain a perpetual inventory."`,
        naOption: true,
      },
      {
        id: "49",
        text: "Are all records readily retrievable for at least two years from the date the record was created or received, whichever is later?",
        rule: `WAC 246-945-020(1) "Unless an alternative standard for a specified record type, form, or format is expressly stated a pharmaceutical firm must maintain and retain records required as evidence of compliance with statutes and rules enforced by the commission in a readily retrievable form and location for at least two years from the date the record was created or received, whichever date is later."\nWAC 246-945-001(71) "'Readily retrievable' means a record that is kept by automatic data processing systems or other electronic, mechanized, or written recordkeeping systems in such a manner that it can be separated out from all other records in a reasonable time."`,
        highlighted: true,
      },
      {
        id: "50",
        text: "Does the pharmacy maintain records of all receipt and distribution of controlled substances?",
        rule: `WAC 246-945-040(4) "Registrants are also required to keep a record of receipt and distribution of controlled substances. Records shall include: (a) Invoices, orders, receipts, or any other document regardless of how titled, establishing the date, supplier, and quantity of drug received, and the name of the drug; (b) Distribution records, including invoices, or any other document regardless of how titled from wholesalers, manufacturers, or any other entity to which the substances were distributed and prescriptions records for dispensers; … (d) For transfers of controlled substances from one dispenser to another, a record of the transfer must be made at the time of transfer indicating the drug, quantity, date of transfer, who it was transferred to, and from whom. Records must be retained by both the transferee and the transferor. These transfers can only be made in emergencies pursuant to 21 CFR Sec. 1307.11."`,
      },
      {
        id: "51",
        text: "Are records of Schedule II drugs maintained separately from all other controlled substance records?",
        rule: `WAC 246-945-040(5) "Credential holders and pharmaceutical firms shall maintain records for Schedule II drugs separately from all other records."`,
      },
      {
        id: "52",
        text: "Are records of Schedule III–V drugs maintained either separately or in a form that is readily retrievable from other records?",
        rule: `WAC 246-945-040(6) "Credential holders and pharmaceutical firms may maintain records for Schedule III, IV, and V drugs either separately or in a form that is readily retrievable from the business records of the registrant."`,
      },
      {
        id: "53",
        text: "Does the pharmacy have DEA 222 forms or their electronic equivalent (CSOS) for each acquisition or distribution of Schedule II drugs?",
        rule: `WAC 246-945-040(7) "A federal order form is required for each distribution of a Schedule I or II controlled substance. Credential holders and pharmaceutical firms must keep and make readily available these forms and other records to the commission or its designee."`,
      },
      {
        id: "54",
        text: "Are significant losses or disappearances of controlled substances reported to PQAC, the DEA, and other appropriate authorities?",
        rule: `WAC 246-945-040(4)(c) "In the event of a significant loss or theft, two copies of DEA 106 (report of theft or loss of controlled substances) must be transmitted to the federal authorities and a copy must be sent to the commission."`,
        highlighted: true,
      },
    ],
  },
  {
    id: "professional-requirements",
    title: "Professional Requirements",
    note: "Please provide the location or file pathway if policies are maintained in electronic format (be as specific as possible, there can be many filing cabinets and binders).",
    items: [
      {
        id: "55-header",
        text: "Does the pharmacy have policies and procedures in place for the following as applicable?",
        noCheckbox: true,
      },
      {
        id: "55a",
        text: "Purchasing",
        rule: `WAC 246-945-410(6) "The facility shall create and implement policies and procedures related to: (a) Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "55b",
        text: "Ordering",
        rule: `WAC 246-945-410(6)(a) "Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "55c",
        text: "Storing",
        rule: `WAC 246-945-410(6)(a) "Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "55d",
        text: "Compounding",
        rule: `WAC 246-945-410(6)(a) "Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "55e",
        text: "Delivering",
        rule: `WAC 246-945-410(6)(a) "Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "55f",
        text: "Dispensing",
        rule: `WAC 246-945-410(6)(a) "Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "55g",
        text: "Administration",
        rule: `WAC 246-945-410(6)(a) "Purchasing, ordering, storing, compounding, delivering, dispensing, and administering legend drugs, including controlled substances."`,
        locationField: true,
      },
      {
        id: "56",
        text: "Does the pharmacy have a policy in place if a computer system downtime occurs?",
        rule: `WAC 246-945-417(4) "The pharmacy shall have policies and procedures in place for system downtime. (a) The procedure shall provide for the maintenance of all patient recordkeeping information as required by this chapter. (b) Upon restoration of operation of the electronic recordkeeping system the information placed in the auxiliary recordkeeping procedure shall be entered in each patient's records within two working days, after which the auxiliary records may be destroyed. (c) This section does not require that a permanent dual recordkeeping system be maintained."`,
        locationField: true,
      },
      {
        id: "57",
        text: "Do pharmacists perform drug utilization reviews when required?",
        rule: `WAC 246-945-001(29) "'Drug utilization review' includes, but is not limited to, the following activities: (a) Evaluation of prescriptions and patient records for known allergies, rational therapy-contraindications, appropriate dose, and route of administration and appropriate directions for use; (b) Evaluation of prescriptions and patient records for duplication of therapy; (c) Evaluation of prescriptions and patient records for interactions between drug-drug, drug-disease, and adverse drug reactions; and (d) Evaluation of prescriptions and patient records for proper utilization, including over- or under-utilization, and optimum therapeutic outcomes."\nWAC 246-945-410(8) "A drug utilization review of each prescription before dispensing and delivery shall occur except in emergent medical situations, or if: (a) The drug is a subsequent dose from a previously reviewed prescription; (b) The prescriber is in the immediate vicinity and controls the drug dispensing process; (c) The medication delivery system is being used to provide access to medications on override and only a quantity sufficient to meet the immediate need of the patient is removed; or (d) Twenty-four hour pharmacy services are not available, and a pharmacist will review all prescriptions added to a patient's profile within six hours of the facility opening."`,
      },
      {
        id: "58",
        text: "Do pharmacists perform patient counseling?",
        rule: `WAC 246-945-325(1) "The pharmacist shall offer to counsel: (a) Upon the initial fill of a prescription for a new or change of therapy. (b) When the pharmacist using their professional judgment determines counseling is necessary to promote safe and effective use and to facilitate an appropriate therapeutic outcome for that patient."`,
      },
      {
        id: "59",
        text: "Are pharmacists practicing under a valid and unexpired collaborative drug therapy agreement (CDTA)? (Select N/A if not applicable.)",
        rule: `WAC 246-945-350 "Collaborative drug therapy agreements. (1) A pharmacist exercising prescriptive authority in their practice must have a valid CDTA on file with the commission and their practice location. (2) A CDTA must include: (a) A statement identifying the practitioner authorized to prescribe and the name of each pharmacist who is party to the agreement; (i) The practitioner authorized to prescribe must be in active practice; and (ii) The authority granted must be within the scope of the practitioners' current practice. (b) A statement of the type of prescriptive authority decisions which the pharmacist is authorized to make, which includes: (i) A statement of the types of diseases, drugs, or drug categories involved, and the type of prescriptive authority activity (e.g., modification or initiation of drug therapy) authorized in each case. (ii) A general statement of the training required, procedures, decision criteria, or plan the pharmacist is to follow when making therapeutic decisions, particularly when modification or initiation of drug therapy is involved. (c) A statement of the activities the pharmacist is to follow in the course of exercising prescriptive authority, including: (i) Documentation of decisions made; and (ii) A plan for communication or feedback to the authorizing practitioner concerning specific decisions made. (3) A CDTA is only valid for two years from the date of signing. (4) Any modification of the written guideline or protocol shall be treated as a new CDTA."`,
        naOption: true,
      },
      {
        id: "60",
        text: "Is all merchandise in date? Including OTC medications anywhere within the store, not solely behind the counter.\n*It's advised to perform an inventory check for expired medications while filling out this self-inspection report*",
        rule: `RCW 69.04.100 "Whenever the director shall find in intrastate commerce an article subject to this chapter which is so adulterated or misbranded that it is unfit or unsafe for human use and its immediate condemnation is required to protect the public health, such article is hereby declared to be a nuisance and the director is hereby authorized forthwith to destroy such article or to render it unsalable for human use."\nWAC 246-945-415(1) "A pharmacy may deliver filled prescriptions as long as appropriate measures are taken to ensure product integrity and receipt by the patient or patient's agent."`,
        highlighted: true,
      },
      {
        id: "61",
        text: "Does the pharmacy meet the requirements for the return and reuse of medications?",
        rule: `WAC 246-945-485(1) "A dispensed drug or prescription device must only be accepted for return and reuse as follows: (a) Noncontrolled legend drugs that have been maintained in the custody and control of the institutional facility, dispensing pharmacy, or their related facilities under common control may be returned and reused if product integrity can be assured. (b) Those that qualify for return under the provisions of chapter 69.70 RCW."`,
      },
      {
        id: "62",
        text: "Does the pharmacy meet the requirements for return and destruction of medications?",
        rule: `WAC 246-945-485(2) "A dispensed drug or prescription device may be accepted for return and destruction if: (a) The dispensed drug or prescription device was dispensed in a manner inconsistent with the prescriber's instructions; (b) The return is in compliance with the Washington state safe medication return program laws and rules, chapters 69.48 RCW and 246-480 WAC; or (c) The return and destruction is in compliance with the facility's policies and procedures."`,
      },
      {
        id: "63",
        text: "If you possess, distribute, or dispense legend drug samples, are you a pharmacy of a licensed hospital or health care entity? Select N/A if not applicable.",
        rule: `WAC 246-945-035 "Drug sample prohibitions (1) 'Except as provided in subsection (2) of this section, a pharmacy shall not possess, distribute or dispense legend drug samples. (2) A pharmacy of a licensed hospital or health care entity which receives and distributes drug samples at the request of an authorized practitioner pursuant to RCW 69.45.050 may possess, distribute or dispense legend drug samples."`,
        naOption: true,
      },
      {
        id: "64",
        text: "Are all drugs ready to be dispensed to patients properly labeled and stored, in accordance with federal and state statutes, rules, and regulations?",
        rule: `RCW 18.64.246(1) "To every box, bottle, jar, tube or other container of a prescription which is dispensed there shall be fixed a label bearing the name and address of the dispensing pharmacy, the prescription number, the name of the prescriber, the prescriber's directions, the name and strength of the medication, the name of the patient, the date, and the expiration date."\nRCW 69.41.050(1) "To every box, bottle, jar, tube or other container of a legend drug, which is dispensed by a practitioner authorized to prescribe legend drugs, there shall be affixed a label bearing the name of the prescriber, complete directions for use, the name of the drug either by the brand or generic name and strength per unit dose, name of patient and date: PROVIDED, That the practitioner may omit the name and dosage of the drug if he or she determines that his or her patient should not have this information and that, if the drug dispensed is a trial sample in its original package and which is labeled in accordance with federal law or regulation, there need be set forth additionally only the name of the issuing practitioner and the name of the patient."\nWAC 246-945-016(1) and (3) "Prescriptions—Outpatient labels—Minimum requirements. (1) All licensees of the commission who dispense legend drugs to outpatients shall affix a label to the prescription container that meets the requirements of RCW 69.41.050 and 18.64.246, and shall also include: (a) Drug quantity; (b) The number of refills remaining, if any; (c) The following statement, 'Warning: State or federal law prohibits transfer of this drug to any person other than the person for whom it was prescribed.', except when dispensing to an animal, when a warning sufficient to convey 'for veterinary use only' may be used; (d) The name and species of the patient, if a veterinary prescription; and (e) The name of the facility or entity authorized by law to possess a legend drug, if patient is the facility or entity. (3) For the purposes of determining an expiration date as required in RCW 18.64.246, the dispenser shall take the following factors into account: (a) The nature of the drug; (b) The container in which it was packaged by the manufacturer and the expiration date; (c) The characteristics of the patient's container, if the drug is repackaged for dispensing; (d) The expected conditions to which the drug may be exposed; (e) The expected length of time of the course of therapy; and (f) Any other relevant factors."`,
      },
      {
        id: "65",
        text: "Does the pharmacy have required policies and procedures for drugs stored outside of the pharmacy? If pharmacy-owned drug stock is stored at a different location and address from the pharmacy, it is recommended that the pharmacy maintain a list of those locations in a readily retrievable format. Select N/A if not applicable.",
        rule: `WAC 246-945-455(1) "In order for drugs to be stored in a designated area outside the pharmacy including, but not limited to, floor stock, in an emergency cabinet, in an emergency kit, or as emergency outpatient drug delivery from an emergency department at a registered institutional facility, the following conditions must be met: (a) Drugs stored in such a manner shall remain under the control of, and be routinely monitored by, the supplying pharmacy; (b) The supplying pharmacy shall develop and implement policies and procedures to prevent and detect unauthorized access, document drugs used, returned and wasted, and regular inventory procedures; (c) Access to drugs stored in a designated area outside of the pharmacy must be limited to health care professionals licensed under the chapters specified in RCW 18.130.040 acting within their scope, and nursing students as provided in WAC 246-945-450, except as provided in subsection (2) of this section; (d) The designated area is appropriately equipped to ensure security and protection from diversion or tampering; and (e) The designated area must be located in a facility licensed or otherwise authorized by law to possess and store drugs."`,
        naOption: true,
      },
      {
        id: "66",
        text: "Are prescriptions being refilled in accordance with pharmacy laws and rules?",
        rule: `WAC 246-945-012 "Prescription refills. (1) A prescription for a controlled substance listed in Schedule II cannot be refilled. (2) A prescription for a controlled substance listed in Schedule III, IV, or V may be refilled a maximum of five times as indicated by the prescriber. The prescription will expire six months after the date of issue pursuant to WAC 246-945-011 even if there are refills remaining. (3) A prescription for a noncontrolled legend drug may be refilled as indicated by the prescriber in accordance with RCW 18.64.520. There is no limit on the number of refills, but the prescription will expire after twelve months from the date of issue pursuant to WAC 246-945-011."\nWAC 246-945-330 "Refilling prescriptions. (1) A prescription may be refilled when permitted by state and federal law and only as authorized by the prescriber. (2) Except as provided in subsection (1) of this section, a pharmacist may renew a prescription for a noncontrolled legend drug one time in a six-month period when an effort has been made to contact the prescriber and they are not available for authorization under the following conditions: (a) The amount dispensed is the quantity on the most recent fill or a thirty-day supply, whichever is less; (b) The refill is requested by the patient or the patients agent; (c) The patient has a chronic medical condition; (d) No changes have been made to the prescription; and (e) The pharmacist communicates the renewal to the prescriber within one business day."`,
      },
      {
        id: "67",
        text: "When prescriptions are delivered, does the pharmacy have appropriate measures in place to ensure product integrity?",
        rule: `WAC 246-945-415(1) "A pharmacy may deliver filled prescriptions as long as appropriate measures are taken to ensure product integrity and receipt by the patient or patient's agent."`,
      },
      {
        id: "68",
        text: "When pharmacy-owned lockers are utilized to deliver filled prescriptions, are these limited to noncontrolled drugs that comply with applicable commission rules and guidance document?",
        rule: `WAC 246-945-415(1) "A pharmacy may deliver filled prescriptions as long as appropriate measures are taken to ensure product integrity and receipt by the patient or patient's agent."\nPQAC Guidance Document G004: Pharmacy Lockers for Filled Prescription Pick-up\nSee - https://doh.wa.gov/sites/default/files/2022-10/PharmLockersFilledRXPick-up.pdf`,
        noCheckbox: true,
      },
    ],
  },
  {
    id: "remote-supervision",
    title: "Remote Supervision and Access in the Absence of a Pharmacist",
    note: "If the pharmacy does NOT store, dispense, or deliver drugs without a pharmacist on-site, mark questions 69–75 as N/A.",
    items: [
      {
        id: "69",
        text: "Does the pharmacy store, dispense, or deliver drugs to patients without a pharmacist on site?\n**If you answered \"No\" to question 68, mark questions 69–75 as N/A.**",
        rule: `WAC 246-945-430(1) "The following requirements apply to pharmacies storing, dispensing and delivering drugs to patients without a pharmacist on-site and are in addition to applicable state and federal laws applying to pharmacies."`,
        naOption: true,
      },
      {
        id: "70",
        text: "Does the pharmacy have full visual surveillance of the pharmacy?",
        rule: `WAC 246-945-430(2) "The pharmacy is required to have adequate visual surveillance of the full pharmacy and retain a high quality recording for a minimum of thirty calendar days."`,
        naOption: true,
      },
      {
        id: "71",
        text: "Is access to the pharmacy limited and monitored?",
        rule: `WAC 246-945-430(3) "Access to a pharmacy by individuals must be limited, authorized, and regularly monitored."`,
        naOption: true,
      },
      {
        id: "72",
        text: "Does the monitoring system include visual and audio communication?",
        rule: `WAC 246-945-430(4) "A visual and audio communication system used to counsel and interact with each patient or patient's caregiver, must be clear, secure, and HIPAA compliant."`,
        naOption: true,
      },
      {
        id: "73",
        text: "Does the responsible pharmacy manager or designee perform monthly in-person inspections of the pharmacy?",
        rule: `WAC 246-945-430(5) "The responsible pharmacy manager, or designee, shall complete and retain, in accordance with WAC 246-945-005 a monthly in-person inspection of the pharmacy."`,
        naOption: true,
      },
      {
        id: "74",
        text: "Can a pharmacist be on-site within 3 hours of an emergency?",
        rule: `WAC 246-945-430(6) "A pharmacist must be capable of being on-site at the pharmacy within three hours if an emergency arises."`,
        naOption: true,
      },
      {
        id: "75",
        text: "Does the pharmacy close in the event of a surveillance or communication system failure?",
        rule: `WAC 246-945-430(7) "The pharmacy must be closed to the public if any component of the surveillance or visual and audio communication system is malfunctioning, and remain closed until system corrections or repairs are completed or a pharmacist is on-site to oversee pharmacy operations."`,
        naOption: true,
      },
      {
        id: "76",
        text: "Does the pharmacy maintain a perpetual inventory for legend drugs and controlled substances?",
        rule: `WAC 246-945-420(4) "A pharmacy that exclusively stores, dispenses or delivers legend drugs, including controlled substances, without a pharmacist on-site shall maintain a perpetual inventory."\nWAC 246-945-420(5) "A pharmacy that exclusively stores, dispenses or delivers prescription drugs without pharmacy ancillary personnel physically on-site shall maintain a perpetual inventory."`,
        naOption: true,
      },
    ],
  },
];
