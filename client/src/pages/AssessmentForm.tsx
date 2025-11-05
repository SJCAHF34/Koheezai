import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PatientDemographics from "@/components/PatientDemographics";
import TreatmentRegimenBuilder from "@/components/TreatmentRegimenBuilder";
import ClinicalParameters from "@/components/ClinicalParameters";
import ConcomitantMedications from "@/components/ConcomitantMedications";
import GeneticResistanceNotes from "@/components/GeneticResistanceNotes";
import AssessmentResults from "@/components/AssessmentResults";
import { type DrugInteraction } from "@shared/schema";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{
    interactions: DrugInteraction[];
    clinicalSummary: string;
    consultationQuestions: string[];
  } | null>(null);

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

    setIsGenerating(true);
    
    // todo: remove mock functionality
    setTimeout(() => {
      const mockInteractions: DrugInteraction[] = [];
      
      if (selectedDrugs.includes("dolutegravir") && concomitantMeds.some(m => m.toLowerCase().includes("metformin"))) {
        mockInteractions.push({
          id: "1",
          drug1: "Dolutegravir",
          drug2: "Metformin",
          severity: "moderate",
          description: "Dolutegravir may increase metformin levels through inhibition of renal OCT2 transporters, potentially increasing risk of lactic acidosis.",
          recommendation: "Monitor for metformin-related adverse effects. Consider dose reduction of metformin if needed. Monitor renal function and lactate levels."
        });
      }

      if (selectedDrugs.includes("atazanavir") && concomitantMeds.some(m => m.toLowerCase().includes("omeprazole"))) {
        mockInteractions.push({
          id: "2",
          drug1: "Atazanavir",
          drug2: "Omeprazole",
          severity: "critical",
          description: "Proton pump inhibitors significantly reduce atazanavir absorption and plasma concentrations, potentially leading to treatment failure.",
          recommendation: "Avoid concurrent use. Consider H2 antagonists if acid suppression needed, administered at least 12 hours apart from atazanavir."
        });
      }

      const mockSummary = `Patient Assessment Summary:

This ${age}-year-old ${treatmentStatus === "naive" ? "treatment-naive" : "treatment-experienced"} patient ${viralLoad ? `presents with a viral load of ${viralLoad.toLocaleString()} copies/mL` : "has undocumented viral load"} ${cd4Count ? `and CD4 count of ${cd4Count} cells/mm³` : ""}. ${hlab5701 === "positive" ? "HLA-B*5701 testing is POSITIVE - AVOID abacavir-containing regimens." : hlab5701 === "negative" ? "HLA-B*5701 testing is negative, allowing for consideration of abacavir-containing regimens if appropriate." : "HLA-B*5701 status unknown - testing recommended before initiating abacavir."}

${pregnancy === "yes" ? "⚠️ PREGNANCY STATUS: Special considerations for antiretroviral selection required. Avoid dolutegravir in first trimester, consider integrase inhibitor alternatives or protease inhibitor-based regimens." : ""}

Selected regimen includes: ${selectedDrugs.map(id => id.replace(/_/g, " ")).join(", ")}

Renal function ${egfr ? `(eGFR ${egfr} mL/min)` : "(not documented)"} ${egfr && egfr < 50 ? "indicates dose adjustments required for tenofovir and other renally-cleared medications" : egfr && egfr >= 50 ? "is adequate for standard dosing" : "should be assessed"}. Hepatic function is ${hepaticFunction}.

${mockInteractions.length > 0 ? `⚠️ ${mockInteractions.length} significant drug interaction${mockInteractions.length > 1 ? "s" : ""} identified requiring clinical intervention.` : "No major drug-drug interactions identified with current medication list."}

${geneticResistanceNotes ? `Genetic resistance notes: ${geneticResistanceNotes}` : "No genetic resistance data documented."}`;

      const mockQuestions = [
        "Have you been taking any over-the-counter medications, supplements, or herbal products not listed in your medication history?",
        "Are you experiencing any current symptoms such as nausea, fatigue, or unexplained weight loss?",
        "Do you have any known drug allergies or adverse reactions to medications in the past?",
        "What is your current understanding of HIV treatment and the importance of medication adherence?",
        "Are there any barriers that might affect your ability to take medications daily (work schedule, housing, transportation)?",
        concomitantMeds.length > 0 ? `Have you experienced any side effects from ${concomitantMeds.join(", ")} you're currently taking?` : "Are you currently taking any other prescription medications?",
        "Do you have a reliable pharmacy where you can fill prescriptions regularly?",
        viralLoad && viralLoad > 100000 ? "Given your high viral load, have you experienced any opportunistic infections recently?" : null,
        cd4Count && cd4Count < 200 ? "With your CD4 count below 200, are you taking prophylaxis for opportunistic infections?" : null,
      ].filter(Boolean) as string[];

      setAssessmentResult({
        interactions: mockInteractions,
        clinicalSummary: mockSummary,
        consultationQuestions: mockQuestions,
      });

      setIsGenerating(false);
      
      toast({
        title: "Assessment Generated",
        description: "Clinical assessment and consultation questions have been created.",
      });

      setTimeout(() => {
        document.getElementById("assessment-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 2000);
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
              disabled={isGenerating}
              className="w-full sm:w-auto min-w-64"
              data-testid="button-generate-assessment"
            >
              {isGenerating ? (
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
