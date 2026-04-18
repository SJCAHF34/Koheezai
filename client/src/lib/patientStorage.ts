import { type AssessmentResult } from "@shared/schema";

const STORAGE_KEY = "koheez_assessments";

const ANIMALS = [
  "Bear", "Eagle", "Fox", "Wolf", "Hawk", "Deer", "Owl", "Tiger",
  "Lynx", "Crane", "Raven", "Falcon", "Bison", "Moose", "Heron",
  "Otter", "Seal", "Mink", "Viper", "Puma",
];

export interface AssessmentFormData {
  age?: number;
  pregnancy: "yes" | "no" | "unknown";
  hlab5701: "positive" | "negative" | "unknown";
  treatmentStatus: "naive" | "experienced";
  viralLoad?: number;
  cd4Count?: number;
  egfr?: number;
  hepaticFunction: "normal" | "mild" | "moderate" | "severe";
  regimenMode: "new" | "change";
  selectedDrugs: string[];
  currentDrugs: string[];
  concomitantMeds: string[];
  geneticResistanceNotes: string;
  additionalNotes: string;
  medicationAllergies?: string;
  emergencyContactStatus?: "yes" | "no" | "";
  emergencyContactInfo?: string;
  caseManagerStatus?: "yes" | "no" | "";
  caseManagerInfo?: string;
  patientEmailStatus?: "yes" | "no" | "";
  patientEmail?: string;
  oeResponse: string;
  comprehensiveNote: string | null;
  assessmentResult: AssessmentResult | null;
}

export interface SavedAssessment {
  patientId: string;
  savedAt: string;
  formData: AssessmentFormData;
}

export function generatePatientId(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${animal}-${num}`;
}

function loadAll(): SavedAssessment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAssessment[]) : [];
  } catch {
    return [];
  }
}

export function loadAllAssessments(): SavedAssessment[] {
  return loadAll().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function loadAssessment(patientId: string): SavedAssessment | null {
  return loadAll().find((a) => a.patientId === patientId) ?? null;
}

export function saveAssessment(assessment: SavedAssessment): void {
  const all = loadAll().filter((a) => a.patientId !== assessment.patientId);
  all.unshift(assessment);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteAssessment(patientId: string): void {
  const all = loadAll().filter((a) => a.patientId !== patientId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
