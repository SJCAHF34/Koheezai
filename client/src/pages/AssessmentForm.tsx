import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import PatientDemographics from "@/components/PatientDemographics";
import TreatmentRegimenBuilder from "@/components/TreatmentRegimenBuilder";
import ClinicalParameters from "@/components/ClinicalParameters";
import ConcomitantMedications from "@/components/ConcomitantMedications";
import GeneticResistanceNotes from "@/components/GeneticResistanceNotes";
import PharmacistIntake from "@/components/PharmacistIntake";
import AssessmentResults from "@/components/AssessmentResults";
import { type AssessmentResult } from "@shared/schema";

export default function AssessmentForm() {
  const { toast } = useToast();
  
  const [age, setAge] = useState<number | undefined>(undefined);
  const [pregnancy, setPregnancy] = useState<"yes" | "no" | "unknown">("unknown");
  const [hlab5701, setHlab5701] = useState<"positive" | "negative" | "unknown">("unknown");
  const [treatmentStatus, setTreatmentStatus] = useState<"naive" | "experienced">("naive");
  const [viralLoad, setViralLoad] = useState<number | undefined>();
  const [cd4Count, setCd4Count] = useState<number | undefined>();
  const [egfr, setEgfr] = useState<number | undefined>();
  const [hepaticFunction, setHepaticFunction] = useState<"normal" | "mild" | "moderate" | "severe">("normal");
  const [regimenMode, setRegimenMode] = useState<"new" | "change">("new");
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [currentDrugs, setCurrentDrugs] = useState<string[]>([]);
  const [concomitantMeds, setConcomitantMeds] = useState<string[]>([]);
  const [geneticResistanceNotes, setGeneticResistanceNotes] = useState("");
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  const assessmentMutation = useMutation({
    mutationFn: async (data: {
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
    }) => {
      const response = await apiRequest<AssessmentResult>("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      setAssessmentResult(data);
      toast({
        title: "Assessment Generated",
        description: "Clinical assessment and consultation questions have been created.",
      });
      setTimeout(() => {
        document.getElementById("assessment-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Assessment Failed",
        description: error.message || "Failed to generate assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateAssessment = async () => {
    if (selectedDrugs.length === 0) {
      toast({
        title: "Missing Information",
        description: regimenMode === "change"
          ? "Please select at least one medication for the new regimen."
          : "Please select at least one HIV medication.",
        variant: "destructive",
      });
      return;
    }

    if (regimenMode === "change" && currentDrugs.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one medication from the current regimen being discontinued.",
        variant: "destructive",
      });
      return;
    }

    if (!age || age === 0) {
      toast({
        title: "Missing Information",
        description: "Please enter patient age.",
        variant: "destructive",
      });
      return;
    }

    // Ensure concomitantMeds is a flat array of strings
    const flattenedMeds = concomitantMeds.flat();

    assessmentMutation.mutate({
      age,
      pregnancy,
      hlab5701,
      treatmentStatus,
      viralLoad,
      cd4Count,
      egfr,
      hepaticFunction,
      selectedDrugs,
      concomitantMeds: flattenedMeds,
      geneticResistanceNotes,
      regimenType: regimenMode,
      currentDrugs: regimenMode === "change" ? currentDrugs : undefined,
    });
  };

  const GRADIENT = "linear-gradient(90deg, #3b82f6, #9333ea, #ef4444)";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start gap-4">
            <div
              className="w-11 h-11 rounded-md flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundImage: GRADIENT }}
            >
              <Loader2 className="w-5 h-5 text-white opacity-0 absolute" />
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                HIV/PrEP
              </p>
              <h1 className="text-2xl font-bold text-slate-900">Treatment Assessor</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Build a regimen, screen interactions, and generate an AI-powered clinical summary.
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
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

          <div className="flex justify-center pt-6">
            <button
              onClick={generateAssessment}
              disabled={assessmentMutation.isPending}
              data-testid="button-generate-assessment"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-md w-full sm:w-auto min-w-64 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundImage: GRADIENT }}
            >
              {assessmentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Assessment...
                </>
              ) : (
                "Generate Clinical Assessment"
              )}
            </button>
          </div>

          <PharmacistIntake />

          {assessmentResult && (
            <div id="assessment-results" data-testid="assessment-results" className="pt-8 border-t">
              <AssessmentResults
                interactions={assessmentResult.interactions}
                renalAlerts={assessmentResult.renalAlerts || []}
                hepaticPregnancyAlerts={assessmentResult.hepaticPregnancyAlerts || []}
                clinicalRecommendations={assessmentResult.clinicalRecommendations || []}
                clinicalSummary={assessmentResult.clinicalSummary}
                consultationQuestions={assessmentResult.consultationQuestions}
                citations={assessmentResult.citations}
                sources={assessmentResult.sources}
                aiProvider={assessmentResult.aiProvider}
                patientData={{
                  selectedDrugs,
                  concomitantMeds,
                  age,
                  cd4Count,
                  viralLoad,
                  egfr,
                  hepaticFunction,
                  pregnancy,
                  treatmentStatus,
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
