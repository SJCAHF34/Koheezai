import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, BookOpen, ExternalLink, Copy, Check, FileText, Save, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import AssessorWaiver from "@/components/AssessorWaiver";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import PatientDemographics from "@/components/PatientDemographics";
import TreatmentRegimenBuilder from "@/components/TreatmentRegimenBuilder";
import ClinicalParameters from "@/components/ClinicalParameters";
import ConcomitantMedications from "@/components/ConcomitantMedications";
import GeneticResistanceNotes from "@/components/GeneticResistanceNotes";
import PharmacistIntake from "@/components/PharmacistIntake";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type AssessmentResult } from "@shared/schema";
import {
  generatePatientId,
  loadAssessment,
  saveAssessment,
} from "@/lib/patientStorage";

const GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444, #facc15)";

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
    title: "Initial Intake Assessment",
    tooltip:
      "Complete the patient intake assessment — insurance details, yes/no intake questions, and counseling checklist — to capture the full consultation context.",
  },
  {
    num: 5,
    title: "Generate Comprehensive Note",
    tooltip:
      "Click 'Generate Comprehensive Note' to compile all clinical details, OpenEvidence findings, and intake responses into a formatted pharmacy documentation note ready for your EHR.",
  },
];

// ── Steps Sidebar ─────────────────────────────────────────────────────────
function StepsSidebar({ activeStep }: { activeStep: number }) {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="sticky top-14 pt-6 pb-6 px-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">
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
                        status === "current" ? "bg-purple-50" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Number bubble */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-colors ${
                          status === "pending" ? "bg-slate-200 text-slate-400" : "text-white"
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
                            ? "text-slate-600"
                            : "text-slate-400"
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
                  <div className="ml-[22px] w-px h-3 bg-slate-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ── Build OpenEvidence Prompt ─────────────────────────────────────────────
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
}): string {
  const lines: string[] = [];
  lines.push(
    "I am a pharmacist reviewing an HIV-positive patient. Please evaluate the following for treatment appropriateness and clinically significant drug-drug interactions:"
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
}): string {
  const lines: string[] = [];
  lines.push(`Age: ${p.age ?? "Not specified"}`);
  lines.push(`Pregnancy: ${p.pregnancy ?? "unknown"}`);
  lines.push(`HLA-B*5701: ${p.hlab5701 ?? "unknown"}`);
  lines.push(`Treatment Status: ${p.treatmentStatus ?? "unknown"}`);
  if (p.cd4Count !== undefined) lines.push(`CD4 Count: ${p.cd4Count} cells/µL`);
  if (p.viralLoad !== undefined) lines.push(`Viral Load: ${p.viralLoad} copies/mL`);
  if (p.egfr !== undefined) lines.push(`eGFR: ${p.egfr} mL/min/1.73m²`);
  lines.push(`Hepatic Function: ${p.hepaticFunction ?? "normal"}`);
  lines.push(`ARV Regimen: ${p.selectedDrugs.join(" + ") || "None"}`);
  lines.push(`Concomitant Medications: ${p.concomitantMeds.join(", ") || "None"}`);
  if (p.geneticResistanceNotes) lines.push(`Genetic/Resistance Notes: ${p.geneticResistanceNotes}`);
  return lines.join("\n");
}

// ── Main Component ────────────────────────────────────────────────────────
export default function AssessmentForm() {
  const { toast } = useToast();
  const search = useSearch();

  const [waiverAccepted, setWaiverAccepted] = useState(() =>
    localStorage.getItem("koheez_waiver_accepted") === "true"
  );

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

  // Step 2 result
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(saved?.assessmentResult ?? null);
  const [promptCopied, setPromptCopied] = useState(false);

  // Step 3 — OpenEvidence response
  const [oeResponse, setOeResponse] = useState(saved?.oeResponse ?? "");

  // Step 5 — Comprehensive note
  const [comprehensiveNote, setComprehensiveNote] = useState<string | null>(saved?.comprehensiveNote ?? null);
  const [noteCopied, setNoteCopied] = useState(false);

  // ── Active step ────────────────────────────────────────────────────────
  const activeStep = !assessmentResult ? 1 : !oeResponse.trim() ? 3 : !comprehensiveNote ? 4 : 5;

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
        geneticResistanceNotes, oeResponse, comprehensiveNote, assessmentResult,
      },
    });
    setLastSaved(new Date());
  }, [
    patientId, age, pregnancy, hlab5701, treatmentStatus, viralLoad, cd4Count, egfr,
    hepaticFunction, regimenMode, selectedDrugs, currentDrugs, concomitantMeds,
    geneticResistanceNotes, oeResponse, comprehensiveNote, assessmentResult,
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
    mutationFn: async (data: { patientContext: string; oeQuery: string; oeResponse: string; consultationQuestions: string[] }) =>
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
      toast({ title: "Missing Information", description: "Please select at least one HIV medication.", variant: "destructive" });
      return;
    }
    if (regimenMode === "change" && currentDrugs.length === 0) {
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
      viralLoad,
      cd4Count,
      egfr,
      hepaticFunction,
      selectedDrugs,
      concomitantMeds: concomitantMeds.flat(),
      geneticResistanceNotes,
      regimenType: regimenMode,
      currentDrugs: regimenMode === "change" ? currentDrugs : undefined,
    });
  };

  const handleGenerateNote = () => {
    if (!assessmentResult || !oeResponse.trim()) {
      toast({ title: "Missing Information", description: "Please paste the OpenEvidence response before generating the note.", variant: "destructive" });
      return;
    }
    const patientCtx = buildPatientContext({
      age, pregnancy, hlab5701, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction,
      selectedDrugs, concomitantMeds, geneticResistanceNotes,
    });
    const oeQuery = buildOePrompt({
      age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction,
      selectedDrugs, concomitantMeds,
    });
    noteMutation.mutate({
      patientContext: patientCtx,
      oeQuery,
      oeResponse,
      consultationQuestions: assessmentResult.consultationQuestions || [],
    });
  };

  const handleCopyPrompt = () => {
    const prompt = buildOePrompt({ age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction, selectedDrugs, concomitantMeds });
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



  const oePrompt = buildOePrompt({ age, pregnancy, treatmentStatus, cd4Count, viralLoad, egfr, hepaticFunction, selectedDrugs, concomitantMeds });

  if (!waiverAccepted) {
    return <AssessorWaiver onAccept={() => setWaiverAccepted(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-200">
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">HIV/PrEP</p>
                <h1 className="text-xl font-bold text-slate-900">Treatment Assessor</h1>
                <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white tracking-wide"
                    style={{ backgroundImage: GRADIENT }}
                    data-testid="text-patient-id"
                  >
                    {patientId}
                  </span>
                  {lastSaved && (
                    <span className="text-[11px] text-slate-400">
                      Auto-saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
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
                  />
                </div>
                <TreatmentRegimenBuilder
                  regimenMode={regimenMode}
                  selectedDrugs={selectedDrugs}
                  currentDrugs={currentDrugs}
                  onRegimenModeChange={setRegimenMode}
                  onDrugsChange={setSelectedDrugs}
                  onCurrentDrugsChange={setCurrentDrugs}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ConcomitantMedications
                    medications={concomitantMeds}
                    onMedicationsChange={setConcomitantMeds}
                  />
                  <GeneticResistanceNotes
                    notes={geneticResistanceNotes}
                    onNotesChange={setGeneticResistanceNotes}
                  />
                </div>
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

                  {/* ── DDI Alert Summary ─────────────────────────────────── */}
                  {(() => {
                    const { interactions, renalAlerts, hepaticPregnancyAlerts, liverpoolDDI } = assessmentResult;
                    const criticalCount = interactions.filter(i => i.severity === "critical").length;
                    const moderateCount = interactions.filter(i => i.severity === "moderate").length;
                    const minorCount = interactions.filter(i => i.severity === "minor").length;
                    const totalAlerts = interactions.length + renalAlerts.length + hepaticPregnancyAlerts.length;
                    return (
                      <div
                        data-testid="ddi-alert-summary"
                        className={`rounded-md border px-4 py-3 flex items-center gap-3 flex-wrap ${
                          criticalCount > 0
                            ? "bg-red-50 border-red-200"
                            : moderateCount > 0
                            ? "bg-amber-50 border-amber-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        {criticalCount > 0 ? (
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                        ) : moderateCount > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-green-600 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-700">
                          DDI Analysis: {totalAlerts === 0 ? "No alerts identified" : `${totalAlerts} alert${totalAlerts > 1 ? "s" : ""} identified`}
                        </span>
                        {criticalCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            {criticalCount} Critical
                          </span>
                        )}
                        {moderateCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {moderateCount} Moderate
                          </span>
                        )}
                        {minorCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                            {minorCount} Minor
                          </span>
                        )}
                        <span className="flex-1" />
                        {/* Liverpool DDI source badge */}
                        {liverpoolDDI?.enabled ? (
                          <span
                            data-testid="badge-liverpool-ddi"
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                            title={`Liverpool HIV Drug Interactions API · ${liverpoolDDI.resolvedDrugs} drugs resolved · ${liverpoolDDI.newInteractions} unique interactions added`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                            Liverpool HIV DDI
                          </span>
                        ) : (
                          <span
                            data-testid="badge-internal-ddi"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200"
                          >
                            Internal Rules Engine
                          </span>
                        )}
                      </div>
                    );
                  })()}

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
                      className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-300 transition-colors resize-y bg-white leading-relaxed"
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── STEP 4: Initial Intake Assessment ── */}
            <section>
              <SectionLabel num={4} label="Initial Intake Assessment" active={activeStep === 4} />
              <div className="mt-4">
                <PharmacistIntake />
              </div>
            </section>

            {/* ── STEP 5: Generate Comprehensive Note (always visible at bottom) ── */}
            <section>
              <SectionLabel num={5} label="Generate Comprehensive Note" active={activeStep >= 4} />
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
                        className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-slate-800 bg-slate-50 rounded-md p-4 border border-slate-200"
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
      <h2 className={`text-sm font-bold uppercase tracking-wider ${active ? "text-slate-900" : "text-slate-400"}`}>
        {label}
      </h2>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}
