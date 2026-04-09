import { z } from "zod";

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
