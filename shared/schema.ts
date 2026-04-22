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

export const shiftSchema = z.object({
  start: timeStringSchema,
  end: timeStringSchema,
});
export type Shift = z.infer<typeof shiftSchema>;

export const dailyHoursSchema = z
  .object({
    open: timeStringSchema,
    close: timeStringSchema,
  })
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

export const scheduleEntrySchema = z.object({
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
});
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

export const upsertScheduleEntrySchema = scheduleEntrySchema.omit({
  id: true,
  updatedAt: true,
});
export type UpsertScheduleEntry = z.infer<typeof upsertScheduleEntrySchema>;

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
