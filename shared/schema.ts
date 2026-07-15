import { z } from "zod";
import { pgTable, text, jsonb, bigserial, primaryKey, integer } from "drizzle-orm/pg-core";

// ── Scheduling ───────────────────────────────────────────────────────────────

export const SCHEDULE_STATUSES = [
  "scheduled",
  "unscheduled",
  "sick",
  "pto",
  "floating_holiday",
] as const;
export type ScheduleStatus = typeof SCHEDULE_STATUSES[number];

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM (24h)");
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const shiftSchema = z
  .object({
    start: timeStringSchema,
    end: timeStringSchema,
  })
  .refine((s) => s.start < s.end, { message: "Shift start must be earlier than end" });
export type Shift = z.infer<typeof shiftSchema>;

export const dailyHoursSchema = z
  .object({
    open: timeStringSchema,
    close: timeStringSchema,
  })
  .refine((d) => d.open < d.close, { message: "Open must be earlier than close" })
  .nullable();
export type DailyHours = z.infer<typeof dailyHoursSchema>;

export const pharmacyHoursSchema = z.object({
  siteId: z.string().min(1),
  // Index 0 = Sunday, 6 = Saturday. null = closed.
  weekdays: z.array(dailyHoursSchema).length(7),
  holidayClosures: z.array(dateStringSchema).default([]),
  updatedAt: z.string(),
});
export type PharmacyHours = z.infer<typeof pharmacyHoursSchema>;

export const upsertPharmacyHoursSchema = pharmacyHoursSchema.omit({
  updatedAt: true,
});
export type UpsertPharmacyHours = z.infer<typeof upsertPharmacyHoursSchema>;

export const SCHEDULE_PATTERNS = ["standard", "alternating_a", "alternating_b"] as const;
export type SchedulePattern = typeof SCHEDULE_PATTERNS[number];

export const staffScheduleDefaultSchema = z.object({
  siteId: z.string().min(1),
  staffId: z.string().min(1),
  staffName: z.string().min(1),
  // Index 0 = Sunday, 6 = Saturday. null = staff is off that weekday by default.
  weekdays: z.array(shiftSchema.nullable()).length(7),
  // Hex color for calendar event chips, e.g. "#7c3aed"
  color: z.string().optional(),
  // Alternating-week patterns: alternating_a = works odd ISO weeks, alternating_b = works even ISO weeks.
  schedulePattern: z.enum(SCHEDULE_PATTERNS).optional(),
  updatedAt: z.string(),
});
export type StaffScheduleDefault = z.infer<typeof staffScheduleDefaultSchema>;

export const upsertStaffScheduleDefaultSchema = staffScheduleDefaultSchema.omit({
  updatedAt: true,
});
export type UpsertStaffScheduleDefault = z.infer<
  typeof upsertStaffScheduleDefaultSchema
>;

const scheduleEntryShape = {
  id: z.string(),
  siteId: z.string().min(1),
  staffId: z.string().min(1),
  staffName: z.string().min(1),
  date: dateStringSchema,
  // Optional end date for multi-day blocks (PTO/sick spanning multiple days).
  // When set, the entry spans date..endDate inclusive. date is the start date.
  endDate: dateStringSchema.optional(),
  status: z.enum(SCHEDULE_STATUSES),
  start: timeStringSchema.optional(),
  end: timeStringSchema.optional(),
  note: z.string().optional(),
  updatedAt: z.string(),
} as const;

const scheduleEntryRefine = (e: { status: ScheduleStatus; start?: string; end?: string }) => {
  if (e.status === "scheduled") {
    if (!e.start || !e.end) return false;
    if (e.start >= e.end) return false;
  }
  return true;
};
const scheduleEntryRefineMsg = {
  message: "Scheduled entries require a valid start before end",
};

export const scheduleEntrySchema = z
  .object(scheduleEntryShape)
  .refine(scheduleEntryRefine, scheduleEntryRefineMsg);
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

export const upsertScheduleEntrySchema = z
  .object({
    siteId: scheduleEntryShape.siteId,
    staffId: scheduleEntryShape.staffId,
    staffName: scheduleEntryShape.staffName,
    date: scheduleEntryShape.date,
    endDate: scheduleEntryShape.endDate,
    status: scheduleEntryShape.status,
    start: scheduleEntryShape.start,
    end: scheduleEntryShape.end,
    note: scheduleEntryShape.note,
  })
  .refine(scheduleEntryRefine, scheduleEntryRefineMsg);
export type UpsertScheduleEntry = z.infer<typeof upsertScheduleEntrySchema>;

// ── Staff Time-Off Balances ───────────────────────────────────────────────

export const staffTimeOffBalanceSchema = z.object({
  siteId: z.string().min(1),
  staffId: z.string().min(1),
  staffName: z.string().min(1),
  year: z.number().int().min(2020).max(2099),
  ptoDaysAllotted: z.number().int().min(0).max(365).default(10),
  sickDaysAllotted: z.number().int().min(0).max(365).default(5),
  floatingHolidayDaysAllotted: z.number().int().min(0).max(30).default(0),
  updatedAt: z.string(),
});
export type StaffTimeOffBalance = z.infer<typeof staffTimeOffBalanceSchema>;

export const upsertStaffTimeOffBalanceSchema = staffTimeOffBalanceSchema.omit({ updatedAt: true });
export type UpsertStaffTimeOffBalance = z.infer<typeof upsertStaffTimeOffBalanceSchema>;

// ── Schedule Submissions (PD → RPD review workflow) ───────────────────────

export const SUBMISSION_STATUSES = ["pending", "approved", "changes_requested"] as const;
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];

export const scheduleSubmissionSchema = z.object({
  id: z.string(),
  siteId: z.string().min(1),
  siteName: z.string().min(1),
  region: z.string().min(1),
  weekStart: dateStringSchema, // Sunday YYYY-MM-DD
  status: z.enum(SUBMISSION_STATUSES),
  submittedByEmail: z.string().email(),
  submittedByName: z.string().min(1),
  submittedAt: z.string(),
  submitterNote: z.string().optional(),
  reviewedByEmail: z.string().email().optional(),
  reviewedByName: z.string().optional(),
  reviewedAt: z.string().optional(),
  reviewNote: z.string().optional(),
});
export type ScheduleSubmission = z.infer<typeof scheduleSubmissionSchema>;

export const createScheduleSubmissionSchema = z.object({
  weekStart: dateStringSchema,
  submitterNote: z.string().max(2000).optional(),
});
export type CreateScheduleSubmission = z.infer<typeof createScheduleSubmissionSchema>;

export const reviewScheduleSubmissionSchema = z.object({
  reviewNote: z.string().max(2000).optional(),
});
export type ReviewScheduleSubmission = z.infer<typeof reviewScheduleSubmissionSchema>;

// ── Notifications ─────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  "schedule_submitted",
  "schedule_approved",
  "schedule_changes_requested",
  "qa_audit_failure",
] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface AppNotification {
  id: string;
  toEmail: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  submissionId?: string;
  siteId?: string;
  siteName?: string;
  weekStart?: string;
  fromName?: string;
  createdAt: string;
  read: boolean;
}

// ── CQI-QRE Quarterly Meeting ─────────────────────────────────────────────
// Site-level quarterly meeting record. Directors edit the details; all staff
// at the site (including technicians and staff pharmacists) can view it
// read-only and sign the attendance list. Stored server-side so the same
// record is shared across every user at the site.

export const cqiAttendeeSchema = z.object({
  id: z.string(),
  userEmail: z.string(),
  printName: z.string(),
  signatureName: z.string(),
  role: z.string(),
  signedAt: z.string(),
});
export type CQIAttendee = z.infer<typeof cqiAttendeeSchema>;

export const CQI_QUARTER_OPTIONS = ["Q1", "Q2", "Q3", "Q4", "Other", ""] as const;
export const CQI_STATUSES = ["not_started", "in_progress", "submitted"] as const;

export const cqiMeetingSchema = z.object({
  siteId: z.string(),
  quarter: z.string(),
  siteName: z.string().default(""),
  pharmacyLocation: z.string(),
  pic: z.string(),
  selectedQuarter: z.enum(CQI_QUARTER_OPTIONS),
  otherDate: z.string(),
  safetyChecks: z.object({
    fireExtinguisher: z.boolean(),
    smokeDetector: z.boolean(),
    evacuationPlan: z.boolean(),
  }),
  agendaItems: z.object({
    regulatoryUpdates: z.boolean(),
    workflowUpdates: z.boolean(),
    qreIssues: z.boolean(),
    policyUpdates: z.boolean(),
    qmcMeetingMinutes: z.boolean(),
  }),
  qreIssues: z.string(),
  actionPlan: z.string(),
  attendees: z.array(cqiAttendeeSchema),
  status: z.enum(CQI_STATUSES),
  lastUpdatedAt: z.string(),
  submittedBy: z.string().optional(),
  submittedAt: z.string().optional(),
});
export type CQIMeetingRecord = z.infer<typeof cqiMeetingSchema>;

// Director save payload. Attendees and server-managed fields (status,
// lastUpdatedAt) are excluded — the server preserves attendees and recomputes
// status on every save.
export const upsertCqiMeetingSchema = cqiMeetingSchema.omit({
  attendees: true,
  status: true,
  lastUpdatedAt: true,
  submittedBy: true,
  submittedAt: true,
});
export type UpsertCqiMeeting = z.infer<typeof upsertCqiMeetingSchema>;

// Lightweight summary of a saved meeting, used for the prior-meetings archive
// list. Avoids sending the full record (and attendee PII) just to render a list.
export const cqiMeetingSummarySchema = z.object({
  quarter: z.string(),
  status: z.enum(CQI_STATUSES),
  pic: z.string(),
  lastUpdatedAt: z.string(),
});
export type CqiMeetingSummary = z.infer<typeof cqiMeetingSummarySchema>;

// Sign-attendance payload. Any authenticated staff member at the site may sign.
export const signCqiMeetingSchema = z.object({
  siteName: z.string().optional(),
  pharmacyLocation: z.string().optional(),
  printName: z.string().min(1),
  signatureName: z.string().min(1),
});
export type SignCqiMeeting = z.infer<typeof signCqiMeetingSchema>;

// ── Access audit log (HIPAA) ──────────────────────────────────────────────
// Records WHO accessed WHAT patient/assessment action and WHEN. The entry
// itself never contains PHI — `resource` holds only non-PHI identifiers such as
// a site id or an internal record UUID.
export interface AuditLogEntry {
  id: string;
  at: string; // ISO timestamp
  actorEmail: string;
  actorName: string;
  role: string;
  action: string; // e.g. "assessment.generate", "patient.read", "patient.update"
  resource: string; // non-PHI: siteId, record UUID, or "assessment"
  method: string;
  path: string;
}

// ── QA Audit Workbook (yearly) ────────────────────────────────────────────

export const QA_AUDIT_STATUSES = ["pass", "fail", "na", ""] as const;
export type QaAuditStatus = typeof QA_AUDIT_STATUSES[number];

export const QA_AUDIT_WORKBOOK_STATUSES = ["not_started", "in_progress", "submitted"] as const;
export type QaAuditWorkbookStatus = typeof QA_AUDIT_WORKBOOK_STATUSES[number];

export const qaAuditEvidenceSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  uploadedBy: z.string().min(1),
  uploadedAt: z.string().min(1),
  siteId: z.string().optional(),
  year: z.string().optional(),
});
export type QaAuditEvidence = z.infer<typeof qaAuditEvidenceSchema>;

export const qaAuditItemResponseSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(QA_AUDIT_STATUSES),
  notes: z.string().default(""),
  verifierName: z.string().default(""),
  verifiedAt: z.string().optional(),
  evidence: z.array(qaAuditEvidenceSchema).default([]),
  taskCreatedId: z.string().optional(),
});
export type QaAuditItemResponse = z.infer<typeof qaAuditItemResponseSchema>;

export const qaAuditWorkbookSchema = z.object({
  siteId: z.string().min(1),
  siteName: z.string().min(1),
  region: z.string().default(""),
  year: z.string().regex(/^\d{4}$/),
  responses: z.array(qaAuditItemResponseSchema).default([]),
  status: z.enum(QA_AUDIT_WORKBOOK_STATUSES).default("not_started"),
  submittedByEmail: z.string().optional(),
  submittedByName: z.string().optional(),
  submittedAt: z.string().optional(),
  lastUpdatedAt: z.string(),
  lastUpdatedByEmail: z.string().optional(),
  lastUpdatedByName: z.string().optional(),
});
export type QaAuditWorkbook = z.infer<typeof qaAuditWorkbookSchema>;

export const upsertQaAuditWorkbookSchema = z.object({
  siteId: z.string().min(1),
  siteName: z.string().min(1),
  region: z.string().default(""),
  year: z.string().regex(/^\d{4}$/),
  responses: z.array(qaAuditItemResponseSchema).default([]),
});
export type UpsertQaAuditWorkbook = z.infer<typeof upsertQaAuditWorkbookSchema>;

export const qaAuditEvidenceUploadSchema = z.object({
  siteId: z.string().min(1),
  year: z.string().regex(/^\d{4}$/),
  fileName: z.string().min(1).max(200),
  fileType: z.string().min(1).max(100),
  dataBase64: z.string().min(1),
});
export type QaAuditEvidenceUpload = z.infer<typeof qaAuditEvidenceUploadSchema>;

export interface QaAuditTask {
  id: string;
  siteId: string;
  siteName: string;
  year: string;
  itemId: string;
  itemTitle: string;
  sectionTitle: string;
  notes: string;
  assignedToEmail: string;
  assignedToName: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: string;
  link: string;
  urgent: true;
  completedAt?: string;
  completedByEmail?: string;
}

export const qaAuditFollowUpSchema = z.object({
  siteId: z.string().min(1),
  year: z.string().regex(/^\d{4}$/),
  itemId: z.string().min(1),
  itemTitle: z.string().min(1),
  sectionTitle: z.string().min(1),
  notes: z.string().default(""),
});
export type QaAuditFollowUp = z.infer<typeof qaAuditFollowUpSchema>;

// ── Retention Patient ────────────────────────────────────────────────────────

export type RetentionIssueType =
  | "undesignated"
  | "appointment_lab"
  | "communication_barriers"
  | "transfer_out"
  | "insurance_coverage"
  | "one_time_limited"
  | "insurance_restrictions"
  | "patient_status_change"
  | "clinical_medication";
export type RetentionStatus = "active" | "resolved" | "referred_out";

export interface AttemptLogEntry {
  ts: string;
  by: string;
}

export interface RetentionPatient {
  id: string;
  siteId: string;
  initials: string;
  issueType: RetentionIssueType;
  dateAdded: string;
  attemptCount: number;
  lastAttemptDate: string | null;
  attemptLog: AttemptLogEntry[];
  notes: string;
  status: RetentionStatus;
  resolvedDate: string | null;
  phone1: string;
  phone2: string;
  email: string;
  caseManagerContact: string;
  bin: string;
  pcn: string;
  rxgrp: string;
  insuranceId: string;
  city: string;
  state: string;
  zip: string;
  ahfLocationMatch: string;
  sequenceActive: boolean;
  sequenceDay: number;
  sequenceStartDate: string | null;
  lastOutreachDate: string | null;
  outreachComplete: boolean;
  retentionReason?: string;
}


export const assessmentSchema = z.object({
  age: z.number().min(0).max(120),
  pregnancy: z.enum(["yes", "no", "unknown"]),
  hlab5701: z.enum(["positive", "negative", "unknown"]),
  treatmentStatus: z.enum(["naive", "experienced"]),
  viralLoad: z.number().min(0).optional(),
  cd4Count: z.number().min(0).optional(),
  egfr: z.number().min(0).optional(),
  hepaticFunction: z.enum(["normal", "mild", "moderate", "severe"]),
  selectedDrugs: z.array(z.string()),
  concomitantMeds: z.array(z.string()),
  geneticResistanceNotes: z.string().optional(),
  regimenType: z.enum(["new", "change"]).optional(),
  currentDrugs: z.array(z.string()).optional(),
});

export type Assessment = z.infer<typeof assessmentSchema>;

// ── Per-note pharmacist consent ──────────────────────────────────────────
export const CURRENT_WAIVER_VERSION = "v1-2026-05";

export const consentRecordSchema = z.object({
  signerName: z.string().min(1, "Signer name required"),
  signerRole: z.string().default(""),
  typedName: z.string().min(1, "Typed name is required"),
  signatureDataUrl: z
    .string()
    .min(1, "Signature is required")
    .refine((s) => s.startsWith("data:image/"), "Signature must be an image data URL"),
  timestamp: z.string().datetime({ message: "Timestamp must be an ISO datetime string" }),
  waiverVersion: z.literal(CURRENT_WAIVER_VERSION),
  patientId: z.string().min(1).optional(),
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;

export type DrugInteraction = {
  id: string;
  drug1: string;
  drug2: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

export type RenalAlert = {
  medication: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

export type HepaticPregnancyAlert = {
  medication: string;
  category: "hepatic" | "pregnancy" | "hlab5701";
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

export type ClinicalRecommendation = {
  category: "oi_prophylaxis" | "viral_load" | "immunization" | "adherence";
  priority: "critical" | "important" | "routine";
  title: string;
  description: string;
  recommendation: string;
};

export type EvidenceCitation = {
  title: string;
  journal: string;
  pubmedId?: string;
  relevance: "high" | "moderate" | "low";
  summary: string;
  url?: string;
};

export type LiverpoolDDIStatus = {
  enabled: boolean;
  resolvedDrugs: number;
  newInteractions: number;
};

export type AssessmentResult = {
  interactions: DrugInteraction[];
  renalAlerts: RenalAlert[];
  hepaticPregnancyAlerts: HepaticPregnancyAlert[];
  clinicalRecommendations: ClinicalRecommendation[];
  clinicalSummary: string;
  consultationQuestions: string[];
  citations?: EvidenceCitation[];
  sources?: string[];
  aiProvider?: "openevidence" | "openai";
  liverpoolDDI?: LiverpoolDDIStatus;
};

// ── Drizzle / PostgreSQL tables ───────────────────────────────────────────
// These tables back the shared, server-side records that must survive process
// restarts and redeploys (Aptible recycles the container filesystem). The
// application-facing shapes remain the Zod types above; these mappers store
// nested objects/arrays as JSONB so a row round-trips to a CQIMeetingRecord /
// AuditLogEntry without losing structure.

type CqiSafetyChecks = CQIMeetingRecord["safetyChecks"];
type CqiAgendaItems = CQIMeetingRecord["agendaItems"];
type CqiSelectedQuarter = CQIMeetingRecord["selectedQuarter"];
type CqiStatus = CQIMeetingRecord["status"];

export const cqiMeetingsTable = pgTable(
  "cqi_meetings",
  {
    siteId: text("site_id").notNull(),
    quarter: text("quarter").notNull(),
    siteName: text("site_name").notNull().default(""),
    pharmacyLocation: text("pharmacy_location").notNull().default(""),
    pic: text("pic").notNull().default(""),
    selectedQuarter: text("selected_quarter").$type<CqiSelectedQuarter>().notNull().default(""),
    otherDate: text("other_date").notNull().default(""),
    safetyChecks: jsonb("safety_checks").$type<CqiSafetyChecks>().notNull(),
    agendaItems: jsonb("agenda_items").$type<CqiAgendaItems>().notNull(),
    qreIssues: text("qre_issues").notNull().default(""),
    actionPlan: text("action_plan").notNull().default(""),
    attendees: jsonb("attendees").$type<CQIAttendee[]>().notNull().default([]),
    status: text("status").$type<CqiStatus>().notNull().default("not_started"),
    lastUpdatedAt: text("last_updated_at").notNull(),
    submittedBy: text("submitted_by"),
    submittedAt: text("submitted_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.siteId, t.quarter] }),
  }),
);

export const auditLogsTable = pgTable("audit_logs", {
  // Monotonic insertion order — used to return the most recent entries first.
  seq: bigserial("seq", { mode: "number" }).notNull(),
  id: text("id").primaryKey(),
  at: text("at").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorName: text("actor_name").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
});

// ── Persistent storage tables (Task #87: save everything) ───────────────────
// These tables use a "natural key columns + jsonb record" pattern: the columns
// needed for lookups/filters are first-class, and the full typed record is
// stored in a jsonb column. This keeps the storage layer simple while making
// every dataset durable across restarts and redeploys.

export const retentionPatientsTable = pgTable("retention_patients", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  record: jsonb("record").$type<RetentionPatient>().notNull(),
});

export const pharmacyHoursTable = pgTable("pharmacy_hours", {
  siteId: text("site_id").primaryKey(),
  record: jsonb("record").$type<PharmacyHours>().notNull(),
});

export const staffScheduleDefaultsTable = pgTable(
  "staff_schedule_defaults",
  {
    siteId: text("site_id").notNull(),
    staffId: text("staff_id").notNull(),
    record: jsonb("record").$type<StaffScheduleDefault>().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.siteId, t.staffId] }) }),
);

export const scheduleEntriesTable = pgTable("schedule_entries", {
  // Natural key `${siteId}|${staffId}|${date}` (matches MemStorage keying).
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  date: text("date").notNull(),
  record: jsonb("record").$type<ScheduleEntry>().notNull(),
});

export const scheduleSubmissionsTable = pgTable("schedule_submissions", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  region: text("region").notNull().default(""),
  weekStart: text("week_start").notNull(),
  submittedAt: text("submitted_at").notNull(),
  record: jsonb("record").$type<ScheduleSubmission>().notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey(),
  toEmail: text("to_email").notNull(),
  createdAt: text("created_at").notNull(),
  record: jsonb("record").$type<AppNotification>().notNull(),
});

export const qaWorkbooksTable = pgTable(
  "qa_audit_workbooks",
  {
    siteId: text("site_id").notNull(),
    year: text("year").notNull(),
    record: jsonb("record").$type<QaAuditWorkbook>().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.siteId, t.year] }) }),
);

export const qaEvidenceTable = pgTable("qa_audit_evidence", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  year: text("year").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  // Base64-encoded file contents (uploads are already base64 JSON payloads).
  dataB64: text("data_b64").notNull(),
});

export const qaTasksTable = pgTable("qa_audit_tasks", {
  id: text("id").primaryKey(),
  assignedToEmail: text("assigned_to_email").notNull(),
  createdAt: text("created_at").notNull(),
  record: jsonb("record").$type<QaAuditTask>().notNull(),
});

// Server-side backing for browser localStorage stores (task completions,
// assignments, rosters, controlled inventory, etc.). Each row holds one
// store's full JSON value keyed by its localStorage key name. The client
// hydrates localStorage from these rows at login and writes back on change,
// so the data is shared across devices and survives everything.
export const staffTimeOffBalancesTable = pgTable(
  "staff_time_off_balances",
  {
    siteId: text("site_id").notNull(),
    staffId: text("staff_id").notNull(),
    year: text("year").notNull(),
    record: jsonb("record").$type<StaffTimeOffBalance>().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.siteId, t.staffId, t.year] }) }),
);

export const clientStoreTable = pgTable(
  "client_store",
  {
    siteId: text("site_id").notNull(),
    storeKey: text("store_key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.siteId, t.storeKey] }),
  }),
);

// ── ADP Workforce Now integration ─────────────────────────────────────────
// Stores the mapping between ADP workerIDs and internal staffIds per site.
// Auto-matched by name similarity on first sync; directors can correct via UI.
export interface AdpWorkerMapping {
  siteId: string;
  adpWorkerId: string;
  adpDisplayName: string;
  staffId: string;    // empty string if unmatched
  staffName: string;  // our internal display name
  confirmedAt?: string;
  updatedAt: string;
}

export const adpWorkerMappingsTable = pgTable(
  "adp_worker_mappings",
  {
    siteId: text("site_id").notNull(),
    adpWorkerId: text("adp_worker_id").notNull(),
    record: jsonb("record").$type<AdpWorkerMapping>().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.siteId, t.adpWorkerId] }) }),
);

// Per-site sync status (last run timestamp + result).
export interface AdpSyncStatus {
  siteId: string;
  lastSyncAt?: string;
  lastSyncResult?: "success" | "error";
  lastSyncMessage?: string;
  updatedAt: string;
}

export const adpSyncStatusTable = pgTable("adp_sync_status", {
  siteId: text("site_id").primaryKey(),
  record: jsonb("record").$type<AdpSyncStatus>().notNull(),
});

// Per-site sync history — one row per run, capped at 10 most recent by the
// application layer. Allows directors to verify nightly cron reliability.
export interface AdpSyncHistoryEntry {
  id: string;
  siteId: string;
  runAt: string;
  result: "success" | "error";
  message: string;
}

export const adpSyncHistoryTable = pgTable("adp_sync_history", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  runAt: text("run_at").notNull(),
  result: text("result").$type<"success" | "error">().notNull(),
  message: text("message").notNull().default(""),
});

// ── WA Self-Inspection annual archive ─────────────────────────────────────
// One record per site per inspection cycle year. The cycle starts March 1,
// so the 2026 cycle covers March 1 2026 – Feb 28 2027. Records persist
// permanently and survive all redeploys.
export interface WaInspectionArchive {
  siteId: string;
  year: number;
  status: "in-progress" | "completed";
  data: unknown;
  createdAt: string;
  updatedAt: string;
}

export const waInspectionArchivesTable = pgTable(
  "wa_inspection_archives",
  {
    siteId: text("site_id").notNull(),
    year: integer("year").notNull(),
    status: text("status").$type<"in-progress" | "completed">().notNull().default("in-progress"),
    data: jsonb("data").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.siteId, t.year] }) }),
);
