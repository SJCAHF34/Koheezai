export type TaskRole =
  | "data_entry_tech"
  | "pv2_tech"
  | "delivery_tech"
  | "pharmacist_1"
  | "pharmacist_2"
  | "director"
  | "all_techs"
  | "all_pharmacists"
  | "all_staff";

/** Individual tech roles covered by the `all_techs` pseudo-role. */
export const TECH_ROLES: TaskRole[] = ["data_entry_tech", "pv2_tech", "delivery_tech"];
/** Individual pharmacist roles covered by the `all_pharmacists` pseudo-role. */
export const PHARMACIST_ROLES: TaskRole[] = ["pharmacist_1", "pharmacist_2"];

/** Returns true when a task assigned to `taskRole` should be shown to
 *  someone acting as (or viewing) the individual role `role`.
 *  Handles the group pseudo-roles: all_staff, all_techs, all_pharmacists. */
export function taskRoleMatches(taskRole: TaskRole | string, role: TaskRole | string): boolean {
  if (taskRole === "all_staff") return true;
  if (taskRole === "all_techs") return TECH_ROLES.includes(role as TaskRole);
  if (taskRole === "all_pharmacists") return PHARMACIST_ROLES.includes(role as TaskRole);
  return taskRole === role;
}

/** Returns true when a task assigned to `taskRole` matches ANY of the user's roles. */
export function taskRoleMatchesAny(taskRole: TaskRole | string, roles: string[]): boolean {
  return roles.some((r) => taskRoleMatches(taskRole, r));
}

/** The individual display roles a group pseudo-role folds into. */
export function rolesForTaskRole(taskRole: TaskRole): TaskRole[] {
  if (taskRole === "all_techs") return TECH_ROLES;
  if (taskRole === "all_pharmacists") return PHARMACIST_ROLES;
  return [taskRole];
}

export type TaskFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannual" | "one_time";

export type TaskCategory = "achc" | "state_board" | "retention" | "operations";

export interface PharmacyTask {
  id: string;
  title: string;
  description?: string;
  role: TaskRole;
  frequency: TaskFrequency;
  category: TaskCategory;
  taskGroup: string;
  isUrgent?: boolean;
  counterType?: "start-end" | "end-only";
  hidden?: boolean;
  url?: string;
  urlLabel?: string;
  isCustom?: boolean;
  scope?: "site" | "regional" | "national";
  region?: string;
  dueDate?: string;
}

export interface Site {
  id: string;
  name: string;
  region: string;
}

export const SITES: Site[] = [
  { id: "1417", name: "RX Pike Street", region: "Seattle, WA" },
  { id: "1842", name: "RX Hollywood Flagship", region: "Los Angeles, CA" },
  { id: "2031", name: "RX Oakland", region: "Oakland, CA" },
];

export const CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; color: string; bg: string; badge: string; dot: string }
> = {
  operations: {
    label: "Operations",
    color: "text-slate-700",
    bg: "bg-slate-50",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  achc: {
    label: "ACHC Compliance",
    color: "text-blue-700",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  state_board: {
    label: "State Board",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  retention: {
    label: "Retention Metrics",
    color: "text-amber-700",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
};

export const ROLE_CONFIG: Record<
  Exclude<TaskRole, "all_staff" | "all_techs" | "all_pharmacists">,
  { label: string; short: string; color: string }
> = {
  data_entry_tech: { label: "Data Entry Technician", short: "DE Tech", color: "text-violet-700" },
  pv2_tech: { label: "PV2 Technician", short: "PV2 Tech", color: "text-blue-700" },
  delivery_tech: { label: "Delivery Technician", short: "Delivery Tech", color: "text-cyan-700" },
  pharmacist_1: { label: "Pharmacist 1", short: "RPh 1", color: "text-purple-700" },
  pharmacist_2: { label: "Pharmacist 2", short: "RPh 2", color: "text-indigo-700" },
  director: { label: "Site Director", short: "Director", color: "text-rose-700" },
};

/** Display order for role sections in the new role-based view.
 *  `all_staff` is intentionally excluded — those tasks are folded
 *  into each applicable role section rather than shown separately. */
export const ROLE_ORDER: TaskRole[] = [
  "data_entry_tech",
  "pv2_tech",
  "delivery_tech",
  "pharmacist_1",
  "pharmacist_2",
  "director",
];

/** Ordered task-group names within each role.
 *  "Team Huddle" is listed last in every role so that folded
 *  all_staff tasks always appear at the bottom of any role section. */
export const ROLE_GROUP_ORDER: Partial<Record<TaskRole, string[]>> = {
  data_entry_tech: [
    "Contact Manager",
    "ICQ",
    "Data Entry",
    "Adjudication Exception",
    "Training & Development",
    "Team Huddle",
  ],
  pv2_tech: [
    "CRC Emails",
    "PV2",
    "Patient Retention",
    "Contact Manager",
    "Adjudication Exception",
    "Product Dispensing",
    "ClerkChat",
    "Inventory",
    "Weekly Purchase",
    "Training & Development",
    "Team Huddle",
  ],
  delivery_tech: [
    "Open Register",
    "Temp Log Clipboard",
    "Central Fulfillment",
    "Packing/Shipping",
    "Setting Up Driver Delivery",
    "Inventory",
    "Product Dispensing",
    "AR Report",
    "RX Not Scanned Report",
    "Waiting in Bin Report",
    "Return to Stock",
    "Closing",
    "Weekly",
    "Training & Development",
    "Team Huddle",
  ],
  pharmacist_1: [
    "Shift Sign-In",
    "Central Fulfillment",
    "Voicemail & Emails",
    "PV1 / P4H",
    "Shift Sign-Out",
    "Weekly",
    "Monthly & Quarterly",
    "Training & Development",
    "Team Huddle",
  ],
  pharmacist_2: [
    "Shift Sign-In",
    "Voicemail & Emails",
    "PIKE PV1",
    "Pharmacy Orders",
    "Shift Sign-Out",
    "Weekly",
    "Monthly & Quarterly",
    "Training & Development",
    "Team Huddle",
  ],
  director: [
    "Daily",
    "Weekly",
    "Monthly",
    "Quarterly",
    "Training & Development",
    "Team Huddle",
  ],
};

export const TASKS: PharmacyTask[] = [
  // ── DATA ENTRY TECH · DAILY ─────────────────────────────────────────────
  {
    id: "de-d-001",
    title: "Contact Manager",
    description: "Clear 'Reply Received' — notify pts of any refill denials, mark on CPS priority comments med list\nWork thru 'Phone' contact method — resend requests as needed or call office",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Contact Manager",
    isUrgent: true,
    counterType: "start-end",
  },
  {
    id: "de-d-003",
    title: "ICQ",
    description: "Sort thru ICQ (new Rxs, refill responses, PSAs, transferred Rxs, etc.)",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "ICQ",
    isUrgent: true,
    counterType: "start-end",
  },
  {
    id: "de-d-004",
    title: "Data Entry",
    description: "Work thru DE (prioritize by promise time/work top to bottom) and push thru adjudication to DUR/PV1 (notify pts for billing issues)\nFor new Rxs: process (notify pt of any billing issues as needed), possible sync fill for chronic meds, make note on CPS priority comments — keep delivery method as CONTACT PT\nFor new pts: reach out to pt for profile set up (pt info tab, allergies, insurance, PCCSA), add to Eagle, address billing issues, add alert for IA/PCCSA, transfer to RPh for consult/IA — keep delivery method as CONTACT PT",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Data Entry",
    counterType: "start-end",
  },
  {
    id: "de-d-007",
    title: "Adjudication Exception",
    description: "Resolve all other Rxs and notify pts as needed",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Adjudication Exception",
    counterType: "start-end",
  },
  {
    id: "de-d-008",
    title: "Supply Logix Cycle Counts",
    description: "Complete daily cycle counts in Supply Logix — verify on-hand quantities and reconcile any variances.",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Supply Logix",
  },
  {
    id: "de-d-009",
    title: "Cabrini P4H Data Entry",
    description: "Enter Cabrini P4H patient data — verify patient records, input required fields, and confirm submissions are complete.",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Cabrini P4H",
  },
  {
    id: "de-d-010",
    title: "PV2",
    description: "Perform PV2 verification — review orders for accuracy, confirm NDC/quantity/sig, and push through for final dispensing.",
    role: "data_entry_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "PV2",
    counterType: "start-end",
  },

  // ── PV2 TECH · DAILY ────────────────────────────────────────────────────
  {
    id: "pv2-d-001",
    title: "CRC Emails",
    description: "Respond to/resolve CRC emails (kickbacks) — reprocess orders",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "CRC Emails",
    isUrgent: true,
  },
  {
    id: "pv2-d-002",
    title: "PV2",
    description: "Filter orders by delivery method (will call, FedEx/USPS, driver — OMIT CONTACT PT/PA submitted)\nReview for order completeness/check associated orders to merge split orders if needed\nCheck CPS priority comments for packaging/delivery method confirmation + n/f for any temp address changes\nPush thru items in DE or Adj Exc and message RPh for DUR/PV1 for those items\nSplit order as needed (include external note on rx being filled at HP to MERGE w crc order if needed)\nComplete final NDC check\nCheck/confirm copays — call pt for CC info if new copay (add to Eagle) and leave AR note (ok to autocharge, call before etc)\nAfter PV2'ing complete order, check pt's order in F3 to ensure ALL meds updated to \"submitted\" status — if any rx falls into prod disp, decline to DE and move thru PV2 again",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "PV2",
    counterType: "start-end",
  },
  {
    id: "pv2-d-008",
    title: "Patient Retention",
    description: "Review Retention Risk Report — call patients or process stale orders, confirm ERP enrollment\nAddress Contact Manager orders — take to PV2 if reply received, follow up with pt or MD for pending refills\nClear ERP prescription rejections and notify patients as needed",
    role: "pv2_tech",
    frequency: "daily",
    category: "retention",
    taskGroup: "Patient Retention",
    hidden: true,
  },
  {
    id: "pv2-d-009",
    title: "Contact Manager",
    description: "Address rxs in CM (take to PV2 if reply received)\nFollow up with pt or MD office if pending refill",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Contact Manager",
    counterType: "start-end",
  },
  {
    id: "pv2-d-010",
    title: "Adjudication Exception",
    description: "Clear ERP prescription rejections (notify pts as needed)",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Adjudication Exception",
    counterType: "start-end",
  },
  {
    id: "pv2-d-011",
    title: "Product Dispensing",
    description: "Fill waiter/in-store orders\nOrder OOS meds (notify pts if needed)",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Product Dispensing",
    counterType: "start-end",
  },
  {
    id: "pv2-d-013",
    title: "ClerkChat",
    description: "Respond to/resolve patient requests",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "ClerkChat",
  },
  {
    id: "pv2-d-015",
    title: "Inventory",
    description: "Submit PO",
    role: "pv2_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Inventory",
  },

  // ── DELIVERY TECH · DAILY ───────────────────────────────────────────────
  {
    id: "del-d-001",
    title: "Open Register",
    description: "Open the register at start of shift",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Open Register",
    isUrgent: true,
  },
  {
    id: "del-d-002",
    title: "Temp Log Clipboard",
    description: "Log fridge and freezer temp\nLog humidity",
    role: "delivery_tech",
    frequency: "daily",
    category: "achc",
    taskGroup: "Temp Log Clipboard",
    isUrgent: true,
  },
  {
    id: "del-d-004",
    title: "Central Fulfillment",
    description: "Confirm all packages received are on manifest\nSort packages by will call vs. delivery\nCheck in CRC orders in CF Queue\nMerge packages as needed\nCall/text pts for pick-up orders — write RTS date (14 days from billed date) and 1st contact date",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Central Fulfillment",
    isUrgent: true,
  },
  {
    id: "del-d-007",
    title: "Packing/Shipping",
    description: "Set up PSL deliveries by scheduled AM cutoff\nSet up FedEx/USPS orders by 1:30 PM if needed\nContact pts for CC info as needed",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Packing/Shipping",
    isUrgent: true,
  },
  {
    id: "del-d-009",
    title: "Setting Up Driver Delivery",
    description: "Bring up pt profile in MCK to verify complete order is in hand (grab all filled in-store items, etc.) — note alt phone numbers on packages for driver\nIf copay, follow CPS priority comments (autocharge if ok, call pt if needed, obtain CC info)\nFollow 'Setting up Delivery Order' guide for driver deliveries\nComplete card transaction at end as needed\nAttach invoice envelope for pt to sign and return (delivery receipt) and tape to package",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Setting Up Driver Delivery",
    url: "/setting-up-delivery-order.pdf",
    urlLabel: "Setting up Delivery Order",
  },
  {
    id: "del-d-010",
    title: "Inventory",
    description: "Confirm all items received with Cardinal invoice and MCK purchase order — note any discrepancies\nCheck in Cardinal order",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Inventory",
  },
  {
    id: "del-d-016",
    title: "Product Dispensing",
    description: "Fill FOA items",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Product Dispensing",
    counterType: "start-end",
  },
  {
    id: "del-d-011",
    title: "AR Report",
    description: "Check if copays were billed correctly — bill after release if able\nBill CCOF if pt has one\nReach out to pts to collect payment\nIf needs to be written off, needs director/regional approval",
    role: "delivery_tech",
    frequency: "daily",
    category: "retention",
    taskGroup: "AR Report",
  },
  {
    id: "del-d-012",
    title: "RX Not Scanned Report",
    description: "Run BI portal (Pharmacy > RX Not Scanned in Eagle POS) — sort date range 1st of month to present (or prior 4 weeks if 1st week)\nDisregard subhub pts (Cabrini) — add up totals per patient, check CPS priority comments for autocharging notes\nScan barcode on POS and confirm correct Rxs are selected — charge if CC on file, call pt if no CC\nIf unable to collect, charge to AR, print invoice, leave note on n/f and invoice, put in AR bin",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "RX Not Scanned Report",
  },
  {
    id: "del-d-013",
    title: "Waiting in Bin Report",
    description: "Tools > Reports > Core Reports > 'Waiting in Bin' > Days in Bin = 7\nSend reminder calls/texts to patients",
    role: "delivery_tech",
    frequency: "daily",
    category: "retention",
    taskGroup: "Waiting in Bin Report",
  },
  {
    id: "del-d-014",
    title: "Return to Stock",
    description: "Tools > Rx Tools > Return to Stock > Print\nPull all meds off shelf (confirm Rxs should be returned or rebilled) — print RTS label for each\nSelect appropriate Rxs in RTS report and return to stock\nRTS reminder in the AM if possible",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Return to Stock",
    counterType: "end-only",
  },
  {
    id: "del-d-015",
    title: "Closing",
    description: "Close the register",
    role: "delivery_tech",
    frequency: "daily",
    category: "operations",
    taskGroup: "Closing",
  },

  // ── PHARMACIST 1 · DAILY ────────────────────────────────────────────────
  {
    id: "rph1-d-001",
    title: "Shift Sign-In",
    description: "Sign in to the pharmacist signature log at start of shift",
    role: "pharmacist_1",
    frequency: "daily",
    category: "state_board",
    taskGroup: "Shift Sign-In",
    isUrgent: true,
  },
  {
    id: "rph1-d-002",
    title: "Central Fulfillment",
    description: "Scan CF queue for past-due or missing orders not crossed to CoreFlex/CRC\nScan order grouping to release all pending orders\nSnip morning inventory slips to adherence pack / CRC coordination chat",
    role: "pharmacist_1",
    frequency: "daily",
    category: "operations",
    taskGroup: "Central Fulfillment",
    isUrgent: true,
  },
  {
    id: "rph1-d-005",
    title: "Voicemail & Emails",
    description: "Retrieve and respond to all overnight voicemails before 11 AM\nReview and respond to overnight CRC clinical review emails",
    role: "pharmacist_1",
    frequency: "daily",
    category: "operations",
    taskGroup: "Voicemail & Emails",
  },
  {
    id: "rph1-d-007",
    title: "PV1 / P4H",
    description: "Complete PV1 for all URGENT P4H orders\nDesignated RPh for PV1 P4H scripts\nComplete product verification for all non-urgent/routine prescriptions\nComplete pharmacist consultations for new PIKE scripts and non-waiter patients",
    role: "pharmacist_1",
    frequency: "daily",
    category: "operations",
    taskGroup: "PV1 / P4H",
    isUrgent: true,
    counterType: "start-end",
  },
  {
    id: "rph1-d-018",
    title: "Shift Sign-Out",
    description: "Sign out of pharmacist signature log at end of shift",
    role: "pharmacist_1",
    frequency: "daily",
    category: "state_board",
    taskGroup: "Shift Sign-Out",
  },
  {
    id: "rph1-d-019",
    title: "Good Results Consultation",
    description: "McKesson > CPS Queues > Alert Name > Good Results Consultation\nReview and action all Good Results Consultation alerts in the queue",
    role: "pharmacist_1",
    frequency: "daily",
    category: "retention",
    taskGroup: "Good Results Consultation",
  },

  // ── PHARMACIST 2 · DAILY ────────────────────────────────────────────────
  {
    id: "rph2-d-001",
    title: "Shift Sign-In",
    description: "Sign in to the pharmacist signature log at start of shift",
    role: "pharmacist_2",
    frequency: "daily",
    category: "state_board",
    taskGroup: "Shift Sign-In",
    isUrgent: true,
  },
  {
    id: "rph2-d-002",
    title: "Voicemail & Emails",
    description: "Retrieve and respond to afternoon voicemails (12 PM – 6:30 PM)\nReview and respond to CRC clinical review emails during business hours",
    role: "pharmacist_2",
    frequency: "daily",
    category: "operations",
    taskGroup: "Voicemail & Emails",
  },
  {
    id: "rph2-d-004",
    title: "PIKE PV1",
    description: "Prioritize and address URGENT PIKE orders (waiter / must-mail)\nDesignated RPh for PV1 PIKE scripts\nComplete pharmacist product verification for URGENT PIKE prescriptions\nComplete P4H new consults in PIKE queue\nReview PIKE RPh chat — resolve DUR rejects, Rx clarification, therapy duplication\nProcess Kevin Romero referrals\nResolve any outstanding audit emails",
    role: "pharmacist_2",
    frequency: "daily",
    category: "operations",
    taskGroup: "PIKE PV1",
    isUrgent: true,
  },
  {
    id: "rph2-d-011",
    title: "Pharmacy Orders",
    description: "Scan queues for waiters not in product dispensing, submit pharmacy order before 5:30 PM\nReview Supply Logix for outstanding orders or supply issues before 5 PM",
    role: "pharmacist_2",
    frequency: "daily",
    category: "operations",
    taskGroup: "Pharmacy Orders",
    isUrgent: true,
  },
  {
    id: "rph2-d-018",
    title: "Shift Sign-Out",
    description: "Sign out of pharmacist signature log at end of shift",
    role: "pharmacist_2",
    frequency: "daily",
    category: "state_board",
    taskGroup: "Shift Sign-Out",
  },

  // ── DIRECTOR · DAILY ────────────────────────────────────────────────────
  {
    id: "dir-d-002",
    title: "Morning team briefing / stand-up",
    description: "Lead or facilitate morning team stand-up to communicate priorities and issues.",
    role: "director",
    frequency: "daily",
    category: "operations",
    taskGroup: "Daily",
  },
  {
    id: "dir-d-003",
    title: "Review outstanding patient AR issues",
    description: "Review accounts receivable issues requiring director approval or escalation.",
    role: "director",
    frequency: "monthly",
    category: "retention",
    taskGroup: "Monthly",
  },

  // ── WEEKLY TASKS ────────────────────────────────────────────────────────
  {
    id: "de-w-001",
    title: "File Prescriptions",
    description: "File all hard-copy and printed prescriptions from the week — verify they are organized, dated, and stored per pharmacy filing requirements.",
    role: "data_entry_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly",
  },
  {
    id: "de-w-002",
    title: "Send Back Meds to Cardinal",
    description: "Package and process all medications to be returned to Cardinal Health — confirm item list, attach return authorization, and hand off to courier.",
    role: "data_entry_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly",
  },
  {
    id: "del-w-001",
    title: "Brinks cash deposit",
    description: "Complete Brinks deposit every Monday and on the last business day of the month.",
    role: "delivery_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly",
  },
  {
    id: "pv2-w-001",
    title: "Submit weekly purchase order (inventory)",
    description: "Review inventory levels and submit PO for the upcoming week.",
    role: "pv2_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly Purchase",
  },
  {
    id: "rph-w-001",
    title: "MTM patient outreach review",
    description: "Review patients eligible for Medication Therapy Management and complete or schedule MTM appointments.",
    role: "pharmacist_1",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "rph-w-002",
    title: "Adherence packaging and dispensing audit",
    description: "Audit adherence packaging for accuracy, completeness, and proper labeling compliance.",
    role: "pharmacist_1",
    frequency: "weekly",
    category: "achc",
    taskGroup: "Weekly",
  },
  {
    id: "dir-w-001",
    title: "Weekly performance metrics review",
    description: "Review fill rates, turnaround times, AR aging, and other key KPIs for the week.",
    role: "director",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly",
  },
  {
    id: "dir-w-002",
    title: "Staff communications and escalation follow-up",
    description: "Follow up on all open communications, escalations, and staff issues from the week.",
    role: "director",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly",
  },
  {
    id: "dir-w-003",
    title: "Risk retention report review",
    description: "Review the risk retention report to identify patients at risk of disengaging from care.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "dir-w-004",
    title: "Pharmalink / Order Express Credit Memo",
    description: "Review recalls and quarantined medications, then submit a return through Cardinal as a credit memo. If unable to return through Cardinal, process the return through Pharmalink.",
    role: "director",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Weekly",
  },
  {
    id: "all-w-001",
    title: "Weekly team huddle participation",
    description: "Attend or lead the weekly pharmacy staff team huddle.",
    role: "all_staff",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Team Huddle",
  },

  // ── BIWEEKLY TASKS ──────────────────────────────────────────────────────
  {
    id: "dir-bw-001",
    title: "Approved Time Cards",
    description: "Review and approve employee time cards in Kronos before 10 AM every other Monday.",
    role: "director",
    frequency: "biweekly",
    category: "operations",
    taskGroup: "Approved Time Cards",
    isUrgent: true,
    url: "https://sso-3be35d3b.sso.duosecurity.com/saml2/sp/DICUTYT6TZPGH7WUEBWQ/sso",
    urlLabel: "ADP",
  },

  // ── MONTHLY TASKS ───────────────────────────────────────────────────────
  {
    id: "de-m-001",
    title: "Pull Expired Medications",
    description: "Identify and pull all expired medications from inventory — quarantine, document, and process for proper return or disposal per pharmacy policy.",
    role: "data_entry_tech",
    frequency: "monthly",
    category: "operations",
    taskGroup: "Monthly",
  },

  // ACHC
  {
    id: "achc-m-001",
    title: "Patient rights documentation review",
    description: "Review and ensure all patient rights documentation is current, accessible, and properly distributed to patients.",
    role: "director",
    frequency: "monthly",
    category: "achc",
    taskGroup: "Monthly",
  },
  {
    id: "achc-m-002",
    title: "Adverse event and incident reporting review",
    description: "Review all adverse events and incidents reported during the month. Ensure proper documentation and corrective actions.",
    role: "director",
    frequency: "monthly",
    category: "achc",
    taskGroup: "Monthly",
  },
  {
    id: "achc-m-003",
    title: "Policy & procedure manual review",
    description: "Review and update applicable policies and procedures. Ensure staff have acknowledged any updates.",
    role: "director",
    frequency: "monthly",
    category: "achc",
    taskGroup: "Monthly",
  },
  {
    id: "achc-m-004",
    title: "Medication storage and temperature log audit",
    description: "Audit all temperature logs for completeness and excursions. Verify medication storage conditions were maintained throughout the month.",
    role: "director",
    frequency: "monthly",
    category: "achc",
    taskGroup: "Monthly",
  },
  {
    id: "achc-m-005",
    title: "Staff competency documentation review",
    description: "Verify all staff competency records are current and on file.",
    role: "director",
    frequency: "monthly",
    category: "achc",
    taskGroup: "Monthly",
  },
  // State Board
  {
    id: "sb-m-001",
    title: "Pharmacy and staff license status verification",
    description: "Verify pharmacy license and all pharmacist/tech licenses are active. Note upcoming renewal dates.",
    role: "director",
    frequency: "monthly",
    category: "state_board",
    taskGroup: "Monthly",
  },
  {
    id: "sb-m-002",
    title: "DEA compliance and controlled substance audit",
    description: "Perform controlled substance inventory count and verify records match DEA logs.",
    role: "director",
    frequency: "monthly",
    category: "state_board",
    taskGroup: "Monthly",
  },
  {
    id: "sb-m-003",
    title: "Drug storage and security compliance check",
    description: "Inspect drug storage areas, security measures, and confirm compliance with state board regulations.",
    role: "director",
    frequency: "monthly",
    category: "state_board",
    taskGroup: "Monthly",
  },
  {
    id: "sb-b-001",
    title: "Bi-annual controlled substance count (C-II–C-V)",
    description: "Complete the bi-annual physical count of all controlled substances (Schedules II–V) for this store. Reconcile any discrepancies in the perpetual inventory and finalize the count for the current half-year period (H1: Jan–Jun, H2: Jul–Dec).",
    role: "director",
    frequency: "biannual",
    category: "state_board",
    taskGroup: "Bi-Annual",
    url: "/app/controlled-inventory?tab=biannual",
    urlLabel: "Open Bi-Annual Count",
  },
  // Retention
  {
    id: "ret-m-001",
    title: "Appointment and retention metrics report",
    description: "Run and review the appointment/pickup report. Identify patients with missed or late pickups.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "ret-m-002",
    title: "Appointment no-show analysis and follow-up",
    description: "Analyze no-show patterns and confirm follow-up outreach was completed for all missed appointments.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "ret-m-003",
    title: "MTM billing and documentation audit",
    description: "Audit MTM billing for accuracy and ensure documentation meets all payer requirements.",
    role: "pharmacist_1",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "ret-m-004",
    title: "Patient satisfaction survey distribution",
    description: "Distribute patient satisfaction surveys and track response rates.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  // Operations
  {
    id: "ops-m-001",
    title: "Submit next month's staffing coverage schedule",
    description: "Prepare and submit the staffing schedule for the upcoming month. Due by the end of the first week of the prior month — e.g., April's schedule is due by the end of the first week of March. Ensure all shifts are covered, including backup coverage for anticipated PTO.",
    role: "director",
    frequency: "monthly",
    category: "operations",
    taskGroup: "Monthly",
    url: "/app/scheduling",
    urlLabel: "Open Team Scheduler",
  },
  {
    id: "dir-m-001",
    title: "Hazardous Waste Review",
    description: "Review expired medications and dispose of them appropriately in the black waste bin or blue/white bin. Contact supply chain to schedule a pickup.",
    role: "director",
    frequency: "monthly",
    category: "operations",
    taskGroup: "Monthly",
  },

  // ── QUARTERLY TASKS ─────────────────────────────────────────────────────
  // ACHC
  {
    id: "achc-q-001",
    title: "Mock ACHC survey preparation",
    description: "Conduct an internal mock ACHC survey to identify compliance gaps before formal accreditation review.",
    role: "director",
    frequency: "quarterly",
    category: "achc",
    taskGroup: "Quarterly",
  },
  {
    id: "achc-q-002",
    title: "ACHC corrective action plans review",
    description: "Review the status of all outstanding corrective action plans from previous ACHC findings.",
    role: "director",
    frequency: "quarterly",
    category: "achc",
    taskGroup: "Quarterly",
  },
  {
    id: "achc-q-003",
    title: "ACHC accreditation document updates",
    description: "Update all ACHC-required accreditation documents and confirm current versions are on file.",
    role: "director",
    frequency: "quarterly",
    category: "achc",
    taskGroup: "Quarterly",
  },
  {
    id: "achc-q-004",
    title: "Pharmacy staff competency assessments",
    description: "Complete formal quarterly competency assessments for all pharmacy staff members.",
    role: "director",
    frequency: "quarterly",
    category: "achc",
    taskGroup: "Quarterly",
  },
  {
    id: "cqi-q-001",
    title: "CQI-QRE Quarterly Meeting",
    description: "Complete the CQI-QRE Quarterly Meeting form including safety checks, agenda items, QRE issues discussed, action plans, and staff attendance signatures. Generate and file the completed PDF per ACHC accreditation requirements.",
    role: "director",
    frequency: "quarterly",
    category: "achc",
    taskGroup: "Quarterly",
  },
  // State Board
  {
    id: "sb-q-001",
    title: "State pharmacy law updates review",
    description: "Review recent updates to state pharmacy laws and communicate relevant changes to staff.",
    role: "director",
    frequency: "quarterly",
    category: "state_board",
    taskGroup: "Quarterly",
  },
  {
    id: "sb-q-002",
    title: "Facility inspection readiness assessment",
    description: "Conduct an internal inspection walkthrough to prepare for potential state board inspection.",
    role: "director",
    frequency: "quarterly",
    category: "state_board",
    taskGroup: "Quarterly",
  },
  {
    id: "sb-q-003",
    title: "Pharmacist CE credit tracking",
    description: "Verify all pharmacists have adequate continuing education credits on file for license renewal.",
    role: "director",
    frequency: "quarterly",
    category: "state_board",
    taskGroup: "Quarterly",
  },
  // Retention
  {
    id: "ret-q-001",
    title: "Retention program effectiveness review",
    description: "Analyze retention metrics, compare to benchmarks, and identify improvement opportunities.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "ret-q-002",
    title: "Formulary access and prior authorization barrier review",
    description: "Review recurring PA denial patterns and formulary access issues impacting patient care continuity.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "ret-q-003",
    title: "Outcome measures reporting",
    description: "Compile and submit required outcome measures reports to relevant stakeholders and accrediting bodies.",
    role: "director",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },
  {
    id: "ret-q-004",
    title: "Patient outcomes review",
    description: "Review aggregate patient outcomes including viral load trends, adherence rates, and clinical markers.",
    role: "pharmacist_1",
    frequency: "weekly",
    category: "retention",
    taskGroup: "Weekly",
  },

  // ── MINI-LEARNING SESSIONS · QUARTERLY ──────────────────────────────────
  {
    id: "mls-q-de",
    title: "Complete (2) Mini-Learning Sessions",
    description: "Complete two quarterly Mini-Learning Sessions (MLS) from the AHF Pharmacy Technician catalog on HealthStream.",
    role: "data_entry_tech",
    frequency: "quarterly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/CourseCatalog?categoryId=b27b2a5e-ffa8-ef11-9990-005056a730af&recordsPerPage=20&currentPage=1&CategoryName=AHF%20-%20MLS%20Pharmacy%20Technician&showFilterModal=True&IsCategoryCollapsed=False&courseCatalogSortType=BestMatch&recordsPerPageForRecommendation=0&currentPageForRecommendation=1&isFromSearch=False",
    urlLabel: "Open HealthStream",
  },
  {
    id: "mls-q-pv2",
    title: "Complete (2) Mini-Learning Sessions",
    description: "Complete two quarterly Mini-Learning Sessions (MLS) from the AHF Pharmacy Technician catalog on HealthStream.",
    role: "pv2_tech",
    frequency: "quarterly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/CourseCatalog?categoryId=b27b2a5e-ffa8-ef11-9990-005056a730af&recordsPerPage=20&currentPage=1&CategoryName=AHF%20-%20MLS%20Pharmacy%20Technician&showFilterModal=True&IsCategoryCollapsed=False&courseCatalogSortType=BestMatch&recordsPerPageForRecommendation=0&currentPageForRecommendation=1&isFromSearch=False",
    urlLabel: "Open HealthStream",
  },
  {
    id: "mls-q-del",
    title: "Complete (2) Mini-Learning Sessions",
    description: "Complete two quarterly Mini-Learning Sessions (MLS) from the AHF Pharmacy Technician catalog on HealthStream.",
    role: "delivery_tech",
    frequency: "quarterly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/CourseCatalog?categoryId=b27b2a5e-ffa8-ef11-9990-005056a730af&recordsPerPage=20&currentPage=1&CategoryName=AHF%20-%20MLS%20Pharmacy%20Technician&showFilterModal=True&IsCategoryCollapsed=False&courseCatalogSortType=BestMatch&recordsPerPageForRecommendation=0&currentPageForRecommendation=1&isFromSearch=False",
    urlLabel: "Open HealthStream",
  },
  {
    id: "mls-q-rph1",
    title: "Complete (2) Mini-Learning Sessions",
    description: "Complete two quarterly Mini-Learning Sessions (MLS) from the AHF Pharmacist catalog on HealthStream.",
    role: "pharmacist_1",
    frequency: "quarterly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/CourseCatalog?categoryId=f8da0358-ffa8-ef11-9990-005056a730af&recordsPerPage=20&currentPage=1&CategoryName=AHF%20-%20MLS%20Pharmacist&showFilterModal=True&IsCategoryCollapsed=False&courseCatalogSortType=BestMatch&recordsPerPageForRecommendation=0&currentPageForRecommendation=1&isFromSearch=False",
    urlLabel: "Open HealthStream",
  },
  {
    id: "mls-q-rph2",
    title: "Complete (2) Mini-Learning Sessions",
    description: "Complete two quarterly Mini-Learning Sessions (MLS) from the AHF Pharmacist catalog on HealthStream.",
    role: "pharmacist_2",
    frequency: "quarterly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/CourseCatalog?categoryId=f8da0358-ffa8-ef11-9990-005056a730af&recordsPerPage=20&currentPage=1&CategoryName=AHF%20-%20MLS%20Pharmacist&showFilterModal=True&IsCategoryCollapsed=False&courseCatalogSortType=BestMatch&recordsPerPageForRecommendation=0&currentPageForRecommendation=1&isFromSearch=False",
    urlLabel: "Open HealthStream",
  },
  {
    id: "mls-q-dir",
    title: "Complete (2) Mini-Learning Sessions",
    description: "Complete two quarterly Mini-Learning Sessions (MLS) from the AHF Pharmacist catalog on HealthStream.",
    role: "director",
    frequency: "quarterly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/CourseCatalog?categoryId=f8da0358-ffa8-ef11-9990-005056a730af&recordsPerPage=20&currentPage=1&CategoryName=AHF%20-%20MLS%20Pharmacist&showFilterModal=True&IsCategoryCollapsed=False&courseCatalogSortType=BestMatch&recordsPerPageForRecommendation=0&currentPageForRecommendation=1&isFromSearch=False",
    urlLabel: "Open HealthStream",
  },

  // ── AHF UNIVERSITY · WEEKLY ─────────────────────────────────────────────
  {
    id: "ahfu-w-de",
    title: "Complete AHF University Courses",
    description: "Log in to HealthStream and complete assigned AHF University courses for the week.",
    role: "data_entry_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/Login/HighlightMessage",
    urlLabel: "Open HealthStream",
  },
  {
    id: "ahfu-w-pv2",
    title: "Complete AHF University Courses",
    description: "Log in to HealthStream and complete assigned AHF University courses for the week.",
    role: "pv2_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/Login/HighlightMessage",
    urlLabel: "Open HealthStream",
  },
  {
    id: "ahfu-w-del",
    title: "Complete AHF University Courses",
    description: "Log in to HealthStream and complete assigned AHF University courses for the week.",
    role: "delivery_tech",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/Login/HighlightMessage",
    urlLabel: "Open HealthStream",
  },
  {
    id: "ahfu-w-rph1",
    title: "Complete AHF University Courses",
    description: "Log in to HealthStream and complete assigned AHF University courses for the week.",
    role: "pharmacist_1",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/Login/HighlightMessage",
    urlLabel: "Open HealthStream",
  },
  {
    id: "ahfu-w-rph2",
    title: "Complete AHF University Courses",
    description: "Log in to HealthStream and complete assigned AHF University courses for the week.",
    role: "pharmacist_2",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/Login/HighlightMessage",
    urlLabel: "Open HealthStream",
  },
  {
    id: "ahfu-w-dir",
    title: "Complete AHF University Courses",
    description: "Log in to HealthStream and complete assigned AHF University courses for the week.",
    role: "director",
    frequency: "weekly",
    category: "operations",
    taskGroup: "Training & Development",
    url: "https://www.healthstream.com/HSAPP/Login/HighlightMessage",
    urlLabel: "Open HealthStream",
  },
];
