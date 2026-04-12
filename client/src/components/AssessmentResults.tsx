import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BookOpen, ExternalLink, Copy, Check } from "lucide-react";
import { type DrugInteraction, type RenalAlert, type HepaticPregnancyAlert, type ClinicalRecommendation, type EvidenceCitation } from "@shared/schema";

type PatientData = {
  selectedDrugs: string[];
  concomitantMeds: string[];
  age?: number;
  cd4Count?: number;
  viralLoad?: number;
  egfr?: number;
  hepaticFunction?: string;
  pregnancy?: string;
  treatmentStatus?: string;
};

type AssessmentResultsProps = {
  interactions: DrugInteraction[];
  renalAlerts: RenalAlert[];
  hepaticPregnancyAlerts: HepaticPregnancyAlert[];
  clinicalRecommendations: ClinicalRecommendation[];
  clinicalSummary: string;
  consultationQuestions: string[];
  citations?: EvidenceCitation[];
  sources?: string[];
  aiProvider?: "openevidence" | "openai";
  patientData?: PatientData;
};

export default function AssessmentResults({
  interactions,
  renalAlerts,
  hepaticPregnancyAlerts,
  clinicalRecommendations,
  clinicalSummary,
  consultationQuestions,
  citations,
  sources,
  aiProvider,
  patientData,
}: AssessmentResultsProps) {
  const [copied, setCopied] = useState(false);

  const buildOpenEvidencePrompt = (): string => {
    const p = patientData;
    if (!p) return "";
    const lines: string[] = [];
    lines.push("I am a pharmacist reviewing a patient regimen. Please evaluate the following for treatment appropriateness and clinically significant drug-drug interactions:");
    lines.push("");
    lines.push(`Patient: ${p.age ? `${p.age}-year-old` : "Adult"}, ${p.pregnancy === "yes" ? "pregnant" : p.pregnancy === "no" ? "not pregnant" : "pregnancy status unknown"}, ${p.treatmentStatus === "naive" ? "treatment-naive" : "treatment-experienced"}`);
    if (p.cd4Count !== undefined) lines.push(`CD4 Count: ${p.cd4Count} cells/µL`);
    if (p.viralLoad !== undefined) lines.push(`HIV Viral Load: ${p.viralLoad} copies/mL`);
    if (p.egfr !== undefined) lines.push(`eGFR: ${p.egfr} mL/min/1.73m²`);
    if (p.hepaticFunction && p.hepaticFunction !== "normal") lines.push(`Hepatic Function: ${p.hepaticFunction} impairment`);
    lines.push("");
    lines.push(`ARV Regimen: ${p.selectedDrugs.length > 0 ? p.selectedDrugs.join(" + ") : "None specified"}`);
    lines.push(`Concomitant Medications: ${p.concomitantMeds.length > 0 ? p.concomitantMeds.join(", ") : "None"}`);
    lines.push("");
    lines.push("Please address:");
    lines.push("1. Is this ARV regimen appropriate for this patient's clinical profile?");
    lines.push("2. Are there any clinically significant drug-drug interactions between the ARV regimen and concomitant medications?");
    lines.push("3. Are any dose adjustments needed given the patient's renal or hepatic function?");
    lines.push("4. Are there any contraindications or safety concerns?");
    lines.push("");
    lines.push("Make this into a note in this format:");
    lines.push("(ARV DRUG) Consult:");
    lines.push("");
    lines.push("(DRUG NAME)");
    lines.push("Reviewed, sig, and indication: (indication)");
    lines.push("SEs: (side effects)");
    lines.push("WARNINGS: (fda warnings/precautions)");
    lines.push("DDIs: (interactions and symptoms of those interactions)");
    lines.push("RENAL: (if dose adjustment needed, if not just no Hx of renal dysfunction)");
    lines.push("HEPATIC: (if dose adjustment needed, if not just no Hx of hepatic dysfunction)");
    lines.push("CI: (list if any documented)");
    lines.push("NOTE FOR PT: (notes for patient, key tips from FDA patient handouts)");
    return lines.join("\n");
  };

  const handleCopy = () => {
    const prompt = buildOpenEvidencePrompt();
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
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
          <p className="text-sm text-muted-foreground">
            Copy this prompt and paste it into OpenEvidence to look up treatment appropriateness and drug-drug interactions with peer-reviewed citations.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            On mobile or embedded browsers, if prompted to enable cookies, tap "Open in new tab" to open OpenEvidence in your full browser where your login session is available.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <pre
              data-testid="openevidence-prompt"
              className="text-sm whitespace-pre-wrap bg-muted rounded-md p-4 pr-12 leading-relaxed font-sans"
            >
              {buildOpenEvidencePrompt()}
            </pre>
            <button
              type="button"
              data-testid="btn-copy-prompt"
              onClick={handleCopy}
              className={`absolute top-3 right-3 p-1.5 rounded-md border text-xs font-medium transition-colors hover-elevate ${
                copied ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"
              }`}
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
