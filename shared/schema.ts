import { z } from "zod";

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

export const staffScheduleDefaultSchema = z.object({
  siteId: z.string().min(1),
  staffId: z.string().min(1),
  staffName: z.string().min(1),
  // Index 0 = Sunday, 6 = Saturday. null = staff is off that weekday by default.
  weekdays: z.array(shiftSchema.nullable()).length(7),
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
    status: scheduleEntryShape.status,
    start: scheduleEntryShape.start,
    end: scheduleEntryShape.end,
    note: scheduleEntryShape.note,
  })
  .refine(scheduleEntryRefine, scheduleEntryRefineMsg);
export type UpsertScheduleEntry = z.infer<typeof upsertScheduleEntrySchema>;

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
  fileName: z.string().min(1).max(200),
  fileType: z.string().min(1).max(100),
  dataBase64: z.string().min(1),
});
export type QaAuditEvidenceUpload = z.infer<typeof qaAuditEvidenceUploadSchema>;

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
