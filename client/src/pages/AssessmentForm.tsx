import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, BookOpen, ExternalLink, Copy, Check, FileText, Save, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import NoteConsentModal from "@/components/NoteConsentModal";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/App";
import { getUserProfile, getRoleLabel } from "@/lib/userProfile";
import PatientDemographics from "@/components/PatientDemographics";
import TreatmentRegimenBuilder from "@/components/TreatmentRegimenBuilder";
import ClinicalParameters from "@/components/ClinicalParameters";
import ConcomitantMedications from "@/components/ConcomitantMedications";
import GeneticResistanceNotes from "@/components/GeneticResistanceNotes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { derivePapContext, formatPapContextForNote, computePapProbability, type PapQuestion } from "@/lib/papQuestions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type AssessmentResult, type ConsentRecord, CURRENT_WAIVER_VERSION } from "@shared/schema";
import {
  generatePatientId,
  loadAssessment,
  saveAssessment,
} from "@/lib/patientStorage";

const GRADIENT = "linear-gradient(135deg, #7c3aed, #9333ea)";

// ── Steps definition ──────────────────────────────────────────────────────
const STEPS = [
  {
    num: 1,
    title: "Input Clinical Details",
    tooltip:
      "Fill in patient demographics, lab values (CD4, viral load, eGFR, hepatic status), the ARV regimen, and any concomitant medications or genetic resistance notes.",
  },
  {
    num: 2,
    title: "Create OpenEvidence Query",
    tooltip:
      "Click 'Create OpenEvidence Query' to generate a structured clinical prompt. Copy it and paste it into OpenEvidence at openevidence.com to retrieve peer-reviewed evidence.",
  },
  {
    num: 3,
    title: "Input OpenEvidence Response",
    tooltip:
      "Paste the full OpenEvidence response into the response box. This evidence will be incorporated into your comprehensive clinical note.",
  },
  {
    num: 4,
    title: "Generate Comprehensive Note",
    tooltip:
      "Click 'Generate Comprehensive Note' to compile all clinical details, OpenEvidence findings, and intake responses into a formatted pharmacy documentation note ready for your EHR.",
  },
];

// ── Steps Sidebar ─────────────────────────────────────────────────────────
function StepsSidebar({ activeStep }: { activeStep: number }) {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-card">
      <div className="sticky top-14 pt-6 pb-6 px-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-3">
          Workflow Steps
        </p>
        <div className="flex flex-col">
          {STEPS.map((step, idx) => {
            const status =
              step.num < activeStep
                ? "completed"
                : step.num === activeStep || (step.num === 5 && activeStep === 4)
                ? "current"
                : "pending";
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={step.num} className="flex flex-col">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-md cursor-default select-none transition-colors ${
                        status === "current" ? "bg-purple-50 dark:bg-purple-950/40" : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Number bubble */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-colors ${
                          status === "pending" ? "bg-muted text-muted-foreground" : "text-white"
                        }`}
                        style={status !== "pending" ? { backgroundImage: GRADIENT } : {}}
                      >
                        {status === "completed" ? <Check className="w-3 h-3" /> : step.num}
                      </div>
                      {/* Label */}
                      <p
                        className={`text-xs font-medium leading-snug mt-0.5 ${
                          status === "current"
                            ? "text-purple-700"
                            : status === "completed"
                            ? "text-muted-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed">
                    <p className="font-semibold mb-1">Step {step.num}: {step.title}</p>
                    <p className="text-muted-foreground">{step.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
                {/* Connector line */}
                {!isLast && (
                  <div className="ml-[22px] w-px h-3 bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ── Build OpenEvidence Prompt (HIV) ──────────────────────────────────────
function buildOePrompt(p: {
  age?: number;
  pregnancy?: string;
  treatmentStatus?: string;
  cd4Count?: number;
  viralLoad?: number;
  egfr?: number;
  hepaticFunction?: string;
  selectedDrugs: string[];
  concomitantMeds: string[];
  additionalNotes?: string;
  medicationAllergies?: string;
}): string {
  const lines: string[] = [];
  lines.push(
    "I am a pharmacist reviewing a patient regimen. Please evaluate the following for treatment appropriateness and clinically significant drug-drug interactions:"
  );
  lines.push("");
  lines.push(
    `Patient: ${p.age ? `${p.age}-year-old` : "Adult"}, ${
      p.pregnancy === "yes"
        ? "pregnant"
        : p.pregnancy === "no"
        ? "not pregnant"
        : "pregnancy status unknown"
    }, ${p.treatmentStatus === "naive" ? "treatment-naive" : "treatment-experienced"}`
  );
  if (p.cd4Count !== undefined) lines.push(`CD4 Count: ${p.cd4Count} cells/µL`);
  if (p.viralLoad !== undefined) lines.push(`HIV Viral Load: ${p.viralLoad} copies/mL`);
  if (p.egfr !== undefined) lines.push(`eGFR: ${p.egfr} mL/min/1.73m²`);
  if (p.hepaticFunction && p.hepaticFunction !== "normal")
    lines.push(`Hepatic Function: ${p.hepaticFunction} impairment`);
  lines.push("");
  lines.push(
    `ARV Regimen: ${p.selectedDrugs.length > 0 ? p.selectedDrugs.join(" + ") : "None specified"}`
  );
  lines.push(
    `Concomitant Medications: ${p.concomitantMeds.length > 0 ? p.concomitantMeds.join(", ") : "None"}`
  );
  lines.push(
    `Medication Allergies: ${p.medicationAllergies && p.medicationAllergies.trim() ? p.medicationAllergies.trim() : "NKDA"}`
  );
  lines.push("");
  lines.push("Please address:");
  lines.push("1. Is this ARV regimen appropriate for this patient's clinical profile?");
  lines.push(
    "2. Are there any clinically significant drug-drug interactions between the ARV regimen and concomitant medications?"
  );
  lines.push(
    "3. Are any dose adjustments needed given the patient's renal or hepatic function?"
  );
  lines.push("4. Are there any contraindications or safety concerns?");
  lines.push("");
  lines.push("Make this into a note in this format:");
  lines.push("(ARV DRUG) Consult:");
  lines.push("");
  lines.push("(DRUG NAME)");
  lines.push("Reviewed, sig, and indication: (indication)");
  lines.push("SEs: (side effects)");
  lines.push("WARNINGS: (fda warnings/precautions, if pertinent)");
  lines.push("DDIs: (interactions and symptoms of those interactions, if taking the medication, don't list unless taking medication that interact)");
  lines.push("RENAL: (if dose adjustment needed, if not just no Hx of renal dysfunction)");
  lines.push("HEPATIC: (if dose adjustment needed, if not just no Hx of hepatic dysfunction)");
  lines.push("CI: (list if any documented and pertinent)");
  lines.push("NOTE FOR PT: (notes for patient, key tips from FDA patient handouts)");
  if (p.additionalNotes && p.additionalNotes.trim()) {
    lines.push("");
    lines.push(`Additional Notes: ${p.additionalNotes.trim()}`);
  }
  return lines.join("\n");
}

// ── Build OpenEvidence Prompt (PrEP) ─────────────────────────────────────
function buildPrepOePrompt(p: {
  age?: number;
  pregnancy?: string;
  egfr?: number;
  hepaticFunction?: string;
  selectedDrugs: string[];
  concomitantMeds: string[];
  additionalNotes?: string;
  medicationAllergies?: string;
}): string {
  const lines: string[] = [];
  lines.push(
    "I am a pharmacist reviewing an HIV-negative patient being assessed for PrEP (pre-exposure prophylaxis). Please evaluate the following:"
  );
  lines.push("");
  lines.push(
    `Patient: ${p.age ? `${p.age}-year-old` : "Adult"}, ${
      p.pregnancy === "yes"
        ? "pregnant"
        : p.pregnancy === "no"
        ? "not pregnant"
        : "pregnancy status unknown"
    }`
  );
  if (p.egfr !== undefined) lines.push(`eGFR: ${p.egfr} mL/min/1.73m²`);
  if (p.hepaticFunction && p.hepaticFunction !== "normal")
    lines.push(`Hepatic Function: ${p.hepaticFunction} impairment`);
  lines.push("");
  lines.push(
    `Proposed PrEP Regimen: ${p.selectedDrugs.length > 0 ? p.selectedDrugs.join(", ") : "None specified"}`
  );
  lines.push(
    `Concomitant Medications: ${p.concomitantMeds.length > 0 ? p.concomitantMeds.join(", ") : "None"}`
  );
  lines.push(
    `Medication Allergies: ${p.medicationAllergies && p.medicationAllergies.trim() ? p.medicationAllergies.trim() : "NKDA"}`
  );
  lines.push("");
  lines.push("Please address:");
  lines.push("1. Is this PrEP regimen appropriate for this patient's clinical profile?");
  lines.push(
    "2. Are there any clinically significant drug-drug interactions between the PrEP regimen and concomitant medications?"
  );
  lines.push(
    "3. Are any dose adjustments or contraindications present given the patient's renal or hepatic function?"
  );
  lines.push("4. Are there any safety concerns, monitoring requirements, or counseling points specific to this PrEP regimen?");
  if (p.additionalNotes && p.additionalNotes.trim()) {
    lines.push("");
    lines.push(`Additional Notes: ${p.additionalNotes.trim()}`);
  }
  return lines.join("\n");
}

function buildPatientContext(p: {
  age?: number;
  pregnancy?: string;
  treatmentStatus?: string;
  cd4Count?: number;
  viralLoad?: number;
  egfr?: number;
  hepaticFunction?: string;
  hlab5701?: string;
  selectedDrugs: string[];
  concomitantMeds: string[];
  geneticResistanceNotes?: string;
  additionalNotes?: string;
  prepMode?: boolean;
  medicationAllergies?: string;
  emergencyContact?: string;
  caseManager?: string;
  patientEmail?: string;
}): string {
  const lines: string[] = [];
  lines.push(`Assessment Type: ${p.prepMode ? "PrEP" : "HIV Treatment"}`);
  lines.push(`Age: ${p.age ?? "Not specified"}`);
  lines.push(`Pregnancy: ${p.pregnancy ?? "unknown"}`);
  if (!p.prepMode) {
    lines.push(`HLA-B*5701: ${p.hlab5701 ?? "unknown"}`);
    lines.push(`Treatment Status: ${p.treatmentStatus ?? "unknown"}`);
    if (p.cd4Count !== undefined) lines.push(`CD4 Count: ${p.cd4Count} cells/µL`);
    if (p.viralLoad !== undefined) lines.push(`Viral Load: ${p.viralLoad} copies/mL`);
  }
  if (p.egfr !== undefined) lines.push(`eGFR: ${p.egfr} mL/min/1.73m²`);
  lines.push(`Hepatic Function: ${p.hepaticFunction ?? "normal"}`);
  if (p.prepMode) {
    lines.push(`PrEP Regimen: ${p.selectedDrugs.join(", ") || "None"}`);
  } else {
    lines.push(`ARV Regimen: ${p.selectedDrugs.join(" + ") || "None"}`);
  }
  lines.push(`Concomitant Medications: ${p.concomitantMeds.join(", ") || "None"}`);
  lines.push(`Medication Allergies: ${p.medicationAllergies && p.medicationAllergies.trim() ? p.medicationAllergies.trim() : "NKDA"}`);
  if (p.emergencyContact) lines.push(`Emergency Contact: ${p.emergencyContact}`);
  if (p.caseManager) lines.push(`Case Manager: ${p.caseManager}`);
  if (p.patientEmail) lines.push(`Patient Email: ${p.patientEmail}`);
  if (!p.prepMode && p.geneticResistanceNotes) lines.push(`Genetic/Resistance Notes: ${p.geneticResistanceNotes}`);
  if (p.additionalNotes && p.additionalNotes.trim()) lines.push(`Additional Notes: ${p.additionalNotes.trim()}`);
  return lines.join("\n");
}

// ── Main Component ────────────────────────────────────────────────────────
export default function AssessmentForm() {
  const { toast } = useToast();
  const search = useSearch();

  const { user } = useAuth();
  const profile = user ? getUserProfile(user.email, user.name) : null;
  const signerName = user?.name || profile?.name || "";
  const signerRole = profile ? getRoleLabel(profile.role) : "";

  // ── HIV / PrEP mode ────────────────────────────────────────────────────
  const [mode, setMode] = useState<"hiv" | "prep">("hiv");
  const prepMode = mode === "prep";

  const handleModeSwitch = (next: "hiv" | "prep") => {
    if (next === mode) return;
    setMode(next);
    setSelectedDrugs([]);
    setCurrentDrugs([]);
    setCd4Count(undefined);
    setViralLoad(undefined);
    setAssessmentResult(null);
    setOeResponse("");
    setComprehensiveNote(null);
  };

  // ── Patient ID ─────────────────────────────────────────────────────────
  const urlPatientId = new URLSearchParams(search).get("patientId");
  const [patientId] = useState<string>(() => urlPatientId ?? generatePatientId());

  // ── Form state (initialised from saved data if resuming) ───────────────
  const saved = urlPatientId ? loadAssessment(urlPatientId)?.formData : null;

  const [age, setAge] = useState<number | undefined>(saved?.age);
  const [pregnancy, setPregnancy] = useState<"yes" | "no" | "unknown">(saved?.pregnancy ?? "unknown");
  const [hlab5701, setHlab5701] = useState<"positive" | "negative" | "unknown">(saved?.hlab5701 ?? "unknown");
  const [treatmentStatus, setTreatmentStatus] = useState<"naive" | "experienced">(saved?.treatmentStatus ?? "naive");
  const [viralLoad, setViralLoad] = useState<number | undefined>(saved?.viralLoad);
  const [cd4Count, setCd4Count] = useState<number | undefined>(saved?.cd4Count);
  const [egfr, setEgfr] = useState<number | undefined>(saved?.egfr);
  const [hepaticFunction, setHepaticFunction] = useState<"normal" | "mild" | "moderate" | "severe">(saved?.hepaticFunction ?? "normal");
  const [regimenMode, setRegimenMode] = useState<"new" | "change">(saved?.regimenMode ?? "new");
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(saved?.selectedDrugs ?? []);
  const [currentDrugs, setCurrentDrugs] = useState<string[]>(saved?.currentDrugs ?? []);
  const [concomitantMeds, setConcomitantMeds] = useState<string[]>(saved?.concomitantMeds ?? []);
  const [geneticResistanceNotes, setGeneticResistanceNotes] = useState(saved?.geneticResistanceNotes ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(saved?.additionalNotes ?? "");

  // Patient context (allergies + emergency contact + case manager + email)
  const [medicationAllergies, setMedicationAllergies] = useState(saved?.medicationAllergies ?? "");
  const [emergencyContactStatus, setEmergencyContactStatus] = useState<"yes" | "no" | "">(saved?.emergencyContactStatus ?? "");
  const [emergencyContactInfo, setEmergencyContactInfo] = useState(saved?.emergencyContactInfo ?? "");
  const [caseManagerStatus, setCaseManagerStatus] = useState<"yes" | "no" | "">(saved?.caseManagerStatus ?? "");
  const [caseManagerInfo, setCaseManagerInfo] = useState(saved?.caseManagerInfo ?? "");
  const [patientEmailStatus, setPatientEmailStatus] = useState<"yes" | "no" | "">(saved?.patientEmailStatus ?? "");
  const [patientEmail, setPatientEmail] = useState(saved?.patientEmail ?? "");

  // PAP eligibility section
  const [papNotApplicable, setPapNotApplicable] = useState<boolean>(saved?.papNotApplicable ?? false);
  const [papNotApplicableReason, setPapNotApplicableReason] = useState(saved?.papNotApplicableReason ?? "");
  const [papAnswers, setPapAnswers] = useState<Record<string, "yes" | "no" | "">>(saved?.papAnswers ?? {});
  const [papDetails, setPapDetails] = useState<Record<string, string>>(saved?.papDetails ?? {});
  const papContext = derivePapContext(selectedDrugs);

  // Step 2 result
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(saved?.assessmentResult ?? null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Step 3 — OpenEvidence response
  const [oeResponse, setOeResponse] = useState(saved?.oeResponse ?? "");

  // Step 5 — Comprehensive note
  const [comprehensiveNote, setComprehensiveNote] = useState<string | null>(saved?.comprehensiveNote ?? null);
  const [noteCopied, setNoteCopied] = useState(false);

  // Per-note pharmacist consent
  const [consent, setConsent] = useState<ConsentRecord | null>(saved?.consent ?? null);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const sessionConsentRef = useRef(false);

  // ── Active step ────────────────────────────────────────────────────────
  const activeStep = !assessmentResult ? 1 : !oeResponse.trim() ? 3 : 4;

  // ── Auto-save (debounced 800 ms) ───────────────────────────────────────
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const persistNow = useCallback(() => {
    saveAssessment({
      patientId,
      savedAt: new Date().toISOString(),
      formData: {
        age, pregnancy, hlab5701, treatmentStatus, viralLoad, cd4Count, egfr,
        hepaticFunction, regimenMode, selectedDrugs, currentDrugs, concomitantMeds,
        geneticResistanceNotes, additionalNotes,
        medicationAllergies,
        emergencyContactStatus, emergencyContactInfo,
        caseManagerStatus, caseManagerInfo,
        patientEmailStatus, patientEmail,
        papNotApplicable, papNotApplicableReason, papAnswers, papDetails,
        oeResponse, comprehensiveNote, assessmentResult,
        consent,
      },
    });
    setLastSaved(new Date());
  }, [
    patientId, age, pregnancy, hlab5701, treatmentStatus, viralLoad, cd4Count, egfr,
    hepaticFunction, regimenMode, selectedDrugs, currentDrugs, concomitantMeds,
    geneticResistanceNotes, additionalNotes,
    medicationAllergies, emergencyContactStatus, emergencyContactInfo,
    caseManagerStatus, caseManagerInfo, patientEmailStatus, patientEmail,
    papNotApplicable, papNotApplicableReason, papAnswers, papDetails,
    oeResponse, comprehensiveNote, assessmentResult, consent,
  ]);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(persistNow, 800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [persistNow]);

  // ── Mutation: Create OE Query (Step 2) ───────────────────────────────
  type AssessmentPayload = {
    age: number;
    pregnancy: "yes" | "no" | "unknown";
    hlab5701: "positive" | "negative" | "unknown";
    treatmentStatus: "naive" | "experienced";
    viralLoad?: number;
    cd4Count?: number;
    egfr?: number;
    hepaticFunction: "normal" | "mild" | "moderate" | "severe";
    selectedDrugs: string[];
    concomitantMeds: string[];
    geneticResistanceNotes?: string;
    regimenType?: "new" | "change";
    currentDrugs?: string[];
  };

  const assessmentMutation = useMutation({
    mutationFn: async (data: AssessmentPayload) =>
      apiRequest<AssessmentResult>("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      setAssessmentResult(data);
      setOeResponse("");
      setComprehensiveNote(null);
      toast({ title: "OpenEvidence Query Created", description: "Copy the prompt and paste it into OpenEvidence." });
      setTimeout(() => {
        document.getElementById("oe-query-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Query Creation Failed",
        description: error.message || "Failed to create the query. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Mutation: Generate Comprehensive Note (Step 5) ────────────────────
  const noteMutation = useMutation({
    mutationFn: async (data: { patientContext: string; oeQuery: string; oeResponse: string; consultationQuestions: string[]; consent: ConsentRecord }) =>
      apiRequest<{ note: string }>("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      setComprehensiveNote(data.note);
      toast({ title: "Comprehensive Note Generated", description: "Your pharmacy consultation note is ready." });
      setTimeout(() => {
        document.getElementById("comprehensive-note")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Note Generation Failed",
        description: error.message || "Failed to generate note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreateQuery = () => {
    if (selectedDrugs.length === 0) {
      toast({
        title: "Missing Information",
        description: prepMode
          ? "Please select a PrEP medication."
          : "Please select at least one HIV medication.",
        variant: "destructive",
      });
      return;
    }
    if (!prepMode && regimenMode === "change" && currentDrugs.length === 0) {
      toast({ title: "Missing Information", description: "Please select at least one medication from the current regimen.", variant: "destructive" });
      return;
    }
    if (!age || age === 0) {
      toast({ title: "Missing Information", description: "Please enter patient age.", variant: "destructive" });
      return;
    }
    assessmentMutation.mutate({
      age: age!,
      pregnancy,
      hlab5701,
      treatmentStatus,
      viralLoad: prepMode ? undefined : viralLoad,
      cd4Count: prepMode ? undefined : cd4Count,
      egfr,
      hepaticFunction,
      selectedDrugs,
      concomitantMeds: concomitantMeds.flat(),
      geneticResistanceNotes: prepMode ? undefined : geneticResistanceNotes,
      regimenType: prepMode ? "new" : regimenMode,
      currentDrugs: !prepMode && regimenMode === "change" ? currentDrugs : undefined,
    });
  };

  const handleGenerateNote = () => {
    if (!assessmentResult || !oeResponse.trim()) {
      toast({ title: "Missing Information", description: "Please paste the OpenEvidence response before generating the note.", variant: "destructive" });
      return;
    }
    if (!medicationAllergies.trim()) {
      toast({ title: "Allergies Required", description: "Please document medication allergies (or enter NKDA) before generating the note.", variant: "destructive" });
      return;
    }
    if (!emergencyContactStatus || (emergencyContactStatus === "yes" && !emergencyContactInfo.trim())) {
      toast({ title: "Emergency Contact Required", description: "Please indicate whether the patient has an emergency contact (and provide details if yes).", variant: "destructive" });
      return;
    }
    if (!caseManagerStatus || (caseManagerStatus === "yes" && !caseManagerInfo.trim())) {
      toast({ title: "Case Manager Required", description: "Please indicate whether the patient works with a case manager (and provide details if yes).", variant: "destructive" });
      return;
    }
    if (!patientEmailStatus || (patientEmailStatus === "yes" && !patientEmail.trim())) {
      toast({ title: "Email Required", description: "Please indicate whether the patient has an email address (and provide it if yes).", variant: "destructive" });
      return;
    }
    const emergencyContactStr = emergencyContactStatus === "yes" ? emergencyContactInfo.trim() : "None reported";
    const caseManagerStr = caseManagerStatus === "yes" ? caseManagerInfo.trim() : "Not working with a case manager";
    const patientEmailStr = patientEmailStatus === "yes" ? patientEmail.trim() : "No email on file";
    const papBlock = formatPapContextForNote({
      papNotApplicable,
      papNotApplicableReason,
      papAnswers,
      papDetails,
      context: papContext,
    });
    const patientCtx = buildPatientContext({
      age, pregnancy, hlab5701, treatmentStatus,
      cd4Count: prepMode ? undefined : cd4Count,
      viralLoad: prepMode ? undefined : viralLoad,
      egfr, hepaticFunction, selectedDrugs, concomitantMeds,
      geneticResistanceNotes: prepMode ? undefined : geneticResistanceNotes,
      additionalNotes: additionalNotes || undefined,
      prepMode,
      medicationAllergies,
      emergencyContact: emergencyContactStr,
      caseManager: caseManagerStr,
      patientEmail: patientEmailStr,
    }) + "\n\n" + papBlock;
    const oeQuery = prepMode
      ? buildPrepOePrompt({ age, pregnancy, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies })
      : buildOePrompt({ age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies });
    const proceedConsent =
      sessionConsentRef.current && consent && consent.waiverVersion === CURRENT_WAIVER_VERSION
        ? consent
        : null;

    if (!proceedConsent) {
      setConsentModalOpen(true);
      return;
    }

    noteMutation.mutate({
      patientContext: patientCtx,
      oeQuery,
      oeResponse,
      consultationQuestions: assessmentResult.consultationQuestions || [],
      consent: proceedConsent,
    });
  };

  const handleConfirmConsent = (c: ConsentRecord) => {
    if (!assessmentResult) return;
    setConsent(c);
    sessionConsentRef.current = true;
    setConsentModalOpen(false);

    const emergencyContactStr = emergencyContactStatus === "yes" ? emergencyContactInfo.trim() : "None reported";
    const caseManagerStr = caseManagerStatus === "yes" ? caseManagerInfo.trim() : "Not working with a case manager";
    const patientEmailStr = patientEmailStatus === "yes" ? patientEmail.trim() : "No email on file";
    const papBlock = formatPapContextForNote({
      papNotApplicable, papNotApplicableReason, papAnswers, papDetails, context: papContext,
    });
    const patientCtx = buildPatientContext({
      age, pregnancy, hlab5701, treatmentStatus,
      cd4Count: prepMode ? undefined : cd4Count,
      viralLoad: prepMode ? undefined : viralLoad,
      egfr, hepaticFunction, selectedDrugs, concomitantMeds,
      geneticResistanceNotes: prepMode ? undefined : geneticResistanceNotes,
      additionalNotes: additionalNotes || undefined,
      prepMode,
      medicationAllergies,
      emergencyContact: emergencyContactStr,
      caseManager: caseManagerStr,
      patientEmail: patientEmailStr,
    }) + "\n\n" + papBlock;
    const oeQuery = prepMode
      ? buildPrepOePrompt({ age, pregnancy, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies })
      : buildOePrompt({ age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies });

    noteMutation.mutate({
      patientContext: patientCtx,
      oeQuery,
      oeResponse,
      consultationQuestions: assessmentResult.consultationQuestions || [],
      consent: c,
    });
  };

  const handleCopyPrompt = () => {
    const prompt = prepMode
      ? buildPrepOePrompt({ age, pregnancy, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies })
      : buildOePrompt({ age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies });
    navigator.clipboard.writeText(prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const handleCopyNote = () => {
    if (!comprehensiveNote) return;
    navigator.clipboard.writeText(comprehensiveNote).then(() => {
      setNoteCopied(true);
      setTimeout(() => setNoteCopied(false), 2000);
    });
  };



  const oePrompt = prepMode
    ? buildPrepOePrompt({ age, pregnancy, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies })
    : buildOePrompt({ age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction, selectedDrugs, concomitantMeds, additionalNotes, medicationAllergies });

  return (
    <div className="min-h-screen bg-muted/40">
      {/* ── Page header ── */}
      <div className="bg-card border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundImage: GRADIENT }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Treatment Assessor</h1>
                <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white tracking-wide"
                    style={{ backgroundImage: GRADIENT }}
                    data-testid="text-patient-id"
                  >
                    {patientId}
                  </span>
                  {lastSaved && (
                    <span className="text-[11px] text-muted-foreground">
                      Auto-saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* HIV / PrEP mode toggle */}
              <div
                className="flex rounded-md border overflow-hidden shrink-0"
                role="group"
                aria-label="Assessment mode"
                data-testid="toggle-mode-group"
              >
                <button
                  type="button"
                  data-testid="toggle-mode-hiv"
                  onClick={() => handleModeSwitch("hiv")}
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${
                    mode === "hiv"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover-elevate"
                  }`}
                >
                  HIV
                </button>
                <button
                  type="button"
                  data-testid="toggle-mode-prep"
                  onClick={() => handleModeSwitch("prep")}
                  className={`px-4 py-2 text-sm font-semibold transition-colors border-l ${
                    mode === "prep"
                      ? "bg-primary text-primary-foreground border-l-primary"
                      : "bg-background text-foreground hover-elevate"
                  }`}
                >
                  PrEP
                </button>
              </div>

              <button
                onClick={() => { persistNow(); toast({ title: "Saved", description: `Patient ${patientId} saved to dashboard.` }); }}
                data-testid="button-save-assessment"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundImage: GRADIENT }}
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex min-h-[calc(100vh-8rem)]">
        {/* Steps sidebar */}
        <StepsSidebar activeStep={activeStep} />

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">

            {/* ── STEP 1: Clinical Details ── */}
            <section>
              <SectionLabel num={1} label="Input Clinical Details" active={activeStep === 1} />
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PatientDemographics
                    age={age}
                    pregnancy={pregnancy}
                    hlab5701={hlab5701}
                    onAgeChange={setAge}
                    onPregnancyChange={setPregnancy}
                    onHlab5701Change={setHlab5701}
                  />
                  <ClinicalParameters
                    treatmentStatus={treatmentStatus}
                    viralLoad={viralLoad}
                    cd4Count={cd4Count}
                    egfr={egfr}
                    hepaticFunction={hepaticFunction}
                    onTreatmentStatusChange={setTreatmentStatus}
                    onViralLoadChange={setViralLoad}
                    onCd4CountChange={setCd4Count}
                    onEgfrChange={setEgfr}
                    onHepaticFunctionChange={setHepaticFunction}
                    prepMode={prepMode}
                  />
                </div>
                <TreatmentRegimenBuilder
                  regimenMode={regimenMode}
                  selectedDrugs={selectedDrugs}
                  currentDrugs={currentDrugs}
                  onRegimenModeChange={setRegimenMode}
                  onDrugsChange={setSelectedDrugs}
                  onCurrentDrugsChange={setCurrentDrugs}
                  prepMode={prepMode}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ConcomitantMedications
                    medications={concomitantMeds}
                    onMedicationsChange={setConcomitantMeds}
                  />
                  {!prepMode && (
                    <GeneticResistanceNotes
                      notes={geneticResistanceNotes}
                      onNotesChange={setGeneticResistanceNotes}
                    />
                  )}
                </div>

                {/* Patient Context — allergies + emergency contact + case manager + email */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                      Patient Context
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Required before generating the comprehensive note.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Medication allergies */}
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Medication Allergies <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          data-testid="input-medication-allergies"
                          value={medicationAllergies}
                          onChange={(e) => setMedicationAllergies(e.target.value)}
                          placeholder="e.g. Sulfa, Penicillin — or NKDA"
                          className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
                        />
                        <button
                          type="button"
                          data-testid="button-allergies-nkda"
                          onClick={() => setMedicationAllergies("NKDA")}
                          className="text-xs px-3 py-2 rounded-md border border-border hover-elevate"
                        >
                          NKDA
                        </button>
                      </div>
                    </div>

                    {/* Emergency contact */}
                    <YesNoWithDetail
                      label="Does the patient have an emergency contact?"
                      testIdPrefix="emergency-contact"
                      status={emergencyContactStatus}
                      onStatusChange={setEmergencyContactStatus}
                      detail={emergencyContactInfo}
                      onDetailChange={setEmergencyContactInfo}
                      detailPlaceholder="Name, relationship, phone number"
                    />

                    {/* Case manager */}
                    <YesNoWithDetail
                      label="Does the patient work with a case manager?"
                      testIdPrefix="case-manager"
                      status={caseManagerStatus}
                      onStatusChange={setCaseManagerStatus}
                      detail={caseManagerInfo}
                      onDetailChange={setCaseManagerInfo}
                      detailPlaceholder="Case manager name and contact"
                    />

                    {/* Email */}
                    <YesNoWithDetail
                      label="Does the patient have an email address?"
                      testIdPrefix="patient-email"
                      status={patientEmailStatus}
                      onStatusChange={setPatientEmailStatus}
                      detail={patientEmail}
                      onDetailChange={setPatientEmail}
                      detailPlaceholder="patient@example.com"
                    />
                  </CardContent>
                </Card>

                {/* Patient Assistance Program (PAP) Eligibility */}
                <Card data-testid="card-pap-eligibility">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                          Patient Assistance (PAP) Eligibility
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {papContext.entries.length > 0
                            ? `Tailored to ${papContext.entries.map((e) => e.brandName).join(", ")}.`
                            : "Select a medication to see program-specific questions."}
                        </p>
                      </div>
                      <label
                        className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer shrink-0"
                        data-testid="label-pap-not-applicable"
                      >
                        <Checkbox
                          checked={papNotApplicable}
                          onCheckedChange={(c) => setPapNotApplicable(!!c)}
                          data-testid="checkbox-pap-not-applicable"
                        />
                        PAP not applicable
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {papNotApplicable ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          PAP questions and recommendations will be skipped in the comprehensive note.
                        </p>
                        <input
                          type="text"
                          data-testid="input-pap-not-applicable-reason"
                          value={papNotApplicableReason}
                          onChange={(e) => setPapNotApplicableReason(e.target.value)}
                          placeholder="Optional: reason (e.g. patient has full coverage, ADAP-enrolled, etc.)"
                          className="w-full px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
                        />
                      </div>
                    ) : papContext.entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No manufacturer assistance programs were found for the currently selected medication(s).
                      </p>
                    ) : (
                      <>
                        {/* Programs found */}
                        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Available programs
                          </p>
                          <div className="space-y-1.5">
                            {papContext.entries.map((e) => (
                              <div key={e.brandName} className="text-xs">
                                <div className="font-medium text-foreground">
                                  {e.brandName} <span className="text-muted-foreground">— {e.manufacturer}</span>
                                </div>
                                <ul className="ml-3 mt-0.5 space-y-0.5 text-muted-foreground">
                                  {e.programs.map((p) => (
                                    <li key={p.name} className="flex items-start gap-1.5">
                                      <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-card border border-border mt-0.5 shrink-0">
                                        {p.type}
                                      </span>
                                      <span>
                                        <span className="font-medium">{p.name}</span>
                                        {p.savings ? <span className="text-muted-foreground"> — {p.savings}</span> : null}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Eligibility questions */}
                        <div className="space-y-3">
                          {papContext.questions.map((q: PapQuestion) => {
                            const ans = papAnswers[q.key] ?? "";
                            return (
                              <div
                                key={q.key}
                                className="space-y-1.5"
                                data-testid={`pap-question-${q.key}`}
                              >
                                <label className="text-xs font-semibold text-foreground block">{q.question}</label>
                                {q.hint && (
                                  <p className="text-[11px] text-muted-foreground">{q.hint}</p>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex rounded-md border border-border overflow-hidden shrink-0">
                                    <button
                                      type="button"
                                      data-testid={`button-pap-${q.key}-yes`}
                                      onClick={() =>
                                        setPapAnswers((prev) => ({ ...prev, [q.key]: prev[q.key] === "yes" ? "" : "yes" }))
                                      }
                                      className={`px-4 py-2 text-xs font-semibold transition-colors ${
                                        ans === "yes" ? "bg-purple-600 text-white" : "bg-card text-foreground hover-elevate"
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      data-testid={`button-pap-${q.key}-no`}
                                      onClick={() =>
                                        setPapAnswers((prev) => ({ ...prev, [q.key]: prev[q.key] === "no" ? "" : "no" }))
                                      }
                                      className={`px-4 py-2 text-xs font-semibold border-l border-border transition-colors ${
                                        ans === "no" ? "bg-purple-600 text-white" : "bg-card text-foreground hover-elevate"
                                      }`}
                                    >
                                      No
                                    </button>
                                  </div>
                                  {q.hasDetail && ans === "yes" && (
                                    <input
                                      type="text"
                                      data-testid={`input-pap-${q.key}-detail`}
                                      value={papDetails[q.key] ?? ""}
                                      onChange={(e) =>
                                        setPapDetails((prev) => ({ ...prev, [q.key]: e.target.value }))
                                      }
                                      placeholder={q.detailLabel ?? "Details"}
                                      className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Probability of PAP enrollment success */}
                        {(() => {
                          const probability = computePapProbability({ context: papContext, papAnswers });
                          if (!probability) return null;
                          const { score, label, answered, total } = probability;
                          const barColor =
                            label === "High"
                              ? "bg-emerald-500"
                              : label === "Moderate"
                                ? "bg-amber-500"
                                : "bg-rose-500";
                          const labelColor =
                            label === "High"
                              ? "text-emerald-700"
                              : label === "Moderate"
                                ? "text-amber-700"
                                : "text-rose-700";
                          return (
                            <div
                              data-testid="gauge-pap-probability"
                              className="rounded-md border border-border bg-card p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Probability of PAP Enrollment Success
                                </p>
                                <span
                                  data-testid="text-pap-probability-label"
                                  className={`text-xs font-semibold ${labelColor}`}
                                >
                                  {label} · {score}%
                                </span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full ${barColor} transition-all`}
                                  style={{ width: `${score}%` }}
                                  data-testid="bar-pap-probability"
                                />
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Based on {answered} of {total} eligibility questions answered. Heuristic estimate — clinical judgment required.
                              </p>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Notes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Additional Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      id="additional-notes"
                      data-testid="textarea-additional-notes"
                      placeholder="Enter any additional clinical context, patient history, or notes to include in the OpenEvidence query and comprehensive note..."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="min-h-[96px] text-sm resize-none"
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── STEP 2: Create OE Query ── */}
            <section>
              <SectionLabel num={2} label="Create OpenEvidence Query" active={activeStep <= 2} />
              <div className="mt-4 flex justify-start">
                <button
                  onClick={handleCreateQuery}
                  disabled={assessmentMutation.isPending}
                  data-testid="button-generate-assessment"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundImage: GRADIENT }}
                >
                  {assessmentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Query...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      Create OpenEvidence Query
                    </>
                  )}
                </button>
              </div>

              {/* OE Query result */}
              {assessmentResult && (
                <div id="oe-query-section" className="mt-5 space-y-3">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          OpenEvidence Query
                        </CardTitle>
                        <a
                          href="https://www.openevidence.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-openevidence-query"
                        >
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover-elevate"
                          >
                            Open OpenEvidence
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Copy this prompt and paste it into OpenEvidence to retrieve peer-reviewed citations.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <pre
                          data-testid="openevidence-prompt"
                          className="text-sm whitespace-pre-wrap bg-muted rounded-md p-4 pr-12 leading-relaxed font-sans"
                        >
                          {oePrompt}
                        </pre>
                        <button
                          type="button"
                          data-testid="btn-copy-prompt"
                          onClick={handleCopyPrompt}
                          className={`absolute top-3 right-3 p-1.5 rounded-md border text-xs font-medium transition-colors hover-elevate ${
                            promptCopied
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border"
                          }`}
                          title="Copy to clipboard"
                        >
                          {promptCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </section>

            {/* ── STEP 3: OpenEvidence Response (always visible) ── */}
            <section>
              <SectionLabel num={3} label="Input OpenEvidence Response" active={activeStep === 3} />
              <div className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      OpenEvidence Response
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      After running your query on OpenEvidence, paste the full response here. It will be incorporated into your comprehensive pharmacy note.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      data-testid="input-oe-response"
                      value={oeResponse}
                      onChange={(e) => setOeResponse(e.target.value)}
                      placeholder={
                        assessmentResult
                          ? "Paste the OpenEvidence response here..."
                          : "Complete Step 2 first, then paste the OpenEvidence response here..."
                      }
                      rows={10}
                      className="w-full px-3.5 py-2.5 rounded-md border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 transition-colors resize-y bg-card leading-relaxed"
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── STEP 4: Generate Comprehensive Note (always visible at bottom) ── */}
            <section>
              <SectionLabel num={4} label="Generate Comprehensive Note" active={activeStep >= 4} />
              <div className="mt-4 flex justify-start">
                <button
                  onClick={handleGenerateNote}
                  disabled={noteMutation.isPending}
                  data-testid="button-generate-note"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundImage: GRADIENT }}
                >
                  {noteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Note...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate Comprehensive Note
                    </>
                  )}
                </button>
              </div>

              {/* Comprehensive note output */}
              {comprehensiveNote && (
                <div id="comprehensive-note" className="mt-5">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Pharmacy Consultation Note
                        </CardTitle>
                        <button
                          type="button"
                          data-testid="btn-copy-note"
                          onClick={handleCopyNote}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors hover-elevate ${
                            noteCopied
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border"
                          }`}
                        >
                          {noteCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {noteCopied ? "Copied!" : "Copy Note"}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Review and edit as needed before pasting into your EHR.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <pre
                        data-testid="comprehensive-note-text"
                        className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-foreground bg-muted/40 rounded-md p-4 border border-border"
                      >
                        {comprehensiveNote}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      <NoteConsentModal
        open={consentModalOpen}
        patientId={patientId}
        signerName={signerName}
        signerRole={signerRole}
        priorConsent={consent}
        onCancel={() => setConsentModalOpen(false)}
        onConfirm={handleConfirmConsent}
      />
    </div>
  );
}

// ── Yes/No with optional detail input ─────────────────────────────────────
function YesNoWithDetail({
  label,
  testIdPrefix,
  status,
  onStatusChange,
  detail,
  onDetailChange,
  detailPlaceholder,
}: {
  label: string;
  testIdPrefix: string;
  status: "yes" | "no" | "";
  onStatusChange: (v: "yes" | "no") => void;
  detail: string;
  onDetailChange: (v: string) => void;
  detailPlaceholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-foreground block mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-md border border-border overflow-hidden shrink-0">
          <button
            type="button"
            data-testid={`button-${testIdPrefix}-yes`}
            onClick={() => onStatusChange("yes")}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              status === "yes" ? "bg-purple-600 text-white" : "bg-card text-foreground hover-elevate"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            data-testid={`button-${testIdPrefix}-no`}
            onClick={() => onStatusChange("no")}
            className={`px-4 py-2 text-xs font-semibold border-l border-border transition-colors ${
              status === "no" ? "bg-purple-600 text-white" : "bg-card text-foreground hover-elevate"
            }`}
          >
            No
          </button>
        </div>
        {status === "yes" && (
          <input
            type="text"
            data-testid={`input-${testIdPrefix}-detail`}
            value={detail}
            onChange={(e) => onDetailChange(e.target.value)}
            placeholder={detailPlaceholder}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-border text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300"
          />
        )}
      </div>
    </div>
  );
}

// ── Section label helper ──────────────────────────────────────────────────
function SectionLabel({ num, label, active }: { num: number; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white`}
        style={{ backgroundImage: active ? GRADIENT : "linear-gradient(135deg, #cbd5e1, #94a3b8)" }}
      >
        {num}
      </div>
      <h2 className={`text-sm font-bold uppercase tracking-wider ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </h2>
      <div className="flex-1 h-px bg-muted" />
    </div>
  );
}
