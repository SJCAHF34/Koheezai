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
import AssessmentResults from "@/components/AssessmentResults";
import { type AssessmentResult } from "@shared/schema";

export default function AssessmentForm() {
  const { toast } = useToast();
  
  const [age, setAge] = useState(0);
  const [pregnancy, setPregnancy] = useState<"yes" | "no" | "unknown">("unknown");
  const [hlab5701, setHlab5701] = useState<"positive" | "negative" | "unknown">("unknown");
  const [treatmentStatus, setTreatmentStatus] = useState<"naive" | "experienced">("naive");
  const [viralLoad, setViralLoad] = useState<number | undefined>();
  const [cd4Count, setCd4Count] = useState<number | undefined>();
  const [egfr, setEgfr] = useState<number | undefined>();
  const [hepaticFunction, setHepaticFunction] = useState<"normal" | "mild" | "moderate" | "severe">("normal");
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
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
        description: "Please select at least one HIV medication.",
        variant: "destructive",
      });
      return;
    }

    if (age === 0) {
      toast({
        title: "Missing Information",
        description: "Please enter patient age.",
        variant: "destructive",
      });
      return;
    }

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
      concomitantMeds,
      geneticResistanceNotes,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">HIV Treatment Assessor</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive clinical assessment and drug-drug interaction checker
          </p>
        </div>
      </header>

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
            selectedDrugs={selectedDrugs}
            onDrugsChange={setSelectedDrugs}
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
            <Button
              size="lg"
              onClick={generateAssessment}
              disabled={assessmentMutation.isPending}
              className="w-full sm:w-auto min-w-64"
              data-testid="button-generate-assessment"
            >
              {assessmentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Assessment...
                </>
              ) : (
                "Generate Clinical Assessment"
              )}
            </Button>
          </div>

          {assessmentResult && (
            <div id="assessment-results" className="pt-8 border-t">
              <AssessmentResults
                interactions={assessmentResult.interactions}
                clinicalSummary={assessmentResult.clinicalSummary}
                consultationQuestions={assessmentResult.consultationQuestions}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
