import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, Activity, Shield, Baby, HeartPulse, Syringe, TrendingUp, BookOpen, ExternalLink, Copy, Check } from "lucide-react";
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
    lines.push("I am a pharmacist reviewing an HIV-positive patient. Please evaluate the following for treatment appropriateness and clinically significant drug-drug interactions:");
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
    return lines.join("\n");
  };

  const handleCopy = () => {
    const prompt = buildOpenEvidencePrompt();
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getSeverityIcon = (severity: "critical" | "moderate" | "minor") => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "moderate":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "minor":
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: "critical" | "moderate" | "minor") => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "moderate":
        return <Badge className="bg-orange-600 hover:bg-orange-700">Moderate</Badge>;
      case "minor":
        return <Badge variant="secondary">Minor</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {interactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Drug-Drug Interactions</CardTitle>
            <p className="text-sm text-muted-foreground">
              {interactions.length} interaction{interactions.length !== 1 ? "s" : ""} identified
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {interactions.map((interaction) => (
              <Card key={interaction.id} className="border-2">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(interaction.severity)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium">
                          {interaction.drug1}
                        </span>
                        <span className="text-muted-foreground">↔</span>
                        <span className="font-mono font-medium">
                          {interaction.drug2}
                        </span>
                        {getSeverityBadge(interaction.severity)}
                      </div>
                      <p className="text-sm">{interaction.description}</p>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Recommendation:</p>
                        <p className="text-sm text-muted-foreground">
                          {interaction.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {renalAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Renal Function Alerts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {renalAlerts.length} renal concern{renalAlerts.length !== 1 ? "s" : ""} identified based on patient eGFR
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {renalAlerts.map((alert, index) => (
              <Card key={`${alert.medication}-${index}`} className="border-2" data-testid={`renal-alert-${index}`}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium">
                          {alert.medication}
                        </span>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm">{alert.description}</p>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Recommendation:</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {hepaticPregnancyAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Hepatic / Pregnancy / Genetic Alerts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {hepaticPregnancyAlerts.length} alert{hepaticPregnancyAlerts.length !== 1 ? "s" : ""} for hepatic function, pregnancy, or HLA-B*5701 status
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {hepaticPregnancyAlerts.map((alert, index) => {
              const getCategoryIcon = () => {
                switch (alert.category) {
                  case "hepatic":
                    return <Activity className="w-4 h-4" />;
                  case "pregnancy":
                    return <Baby className="w-4 h-4" />;
                  case "hlab5701":
                    return <Shield className="w-4 h-4" />;
                }
              };

              const getCategoryBadge = () => {
                switch (alert.category) {
                  case "hepatic":
                    return <Badge variant="outline" className="ml-2">Hepatic</Badge>;
                  case "pregnancy":
                    return <Badge variant="outline" className="ml-2 bg-pink-50 dark:bg-pink-950">Pregnancy</Badge>;
                  case "hlab5701":
                    return <Badge variant="outline" className="ml-2 bg-purple-50 dark:bg-purple-950">HLA-B*5701</Badge>;
                }
              };

              return (
                <Card key={`${alert.medication}-${alert.category}-${index}`} className="border-2" data-testid={`hepatic-pregnancy-alert-${index}`}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-medium">
                            {alert.medication}
                          </span>
                          {getSeverityBadge(alert.severity)}
                          {getCategoryBadge()}
                        </div>
                        <p className="text-sm">{alert.description}</p>
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Recommendation:</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {clinicalRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <HeartPulse className="w-5 h-5" />
              Clinical Recommendations
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Evidence-based recommendations for OI prophylaxis and viral load management
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {clinicalRecommendations.filter((rec) => rec.category !== "immunization").map((rec, index) => {
              const getPriorityBadge = () => {
                switch (rec.priority) {
                  case "critical":
                    return <Badge variant="destructive">Critical</Badge>;
                  case "important":
                    return <Badge className="bg-orange-600 hover:bg-orange-700">Important</Badge>;
                  case "routine":
                    return <Badge variant="secondary">Routine</Badge>;
                }
              };

              const getCategoryIcon = () => {
                switch (rec.category) {
                  case "oi_prophylaxis":
                    return <Shield className="w-4 h-4" />;
                  case "viral_load":
                    return <TrendingUp className="w-4 h-4" />;
                  case "immunization":
                    return <Syringe className="w-4 h-4" />;
                  case "adherence":
                    return <HeartPulse className="w-4 h-4" />;
                }
              };

              const getCategoryBadge = () => {
                switch (rec.category) {
                  case "oi_prophylaxis":
                    return <Badge variant="outline" className="ml-2">OI Prophylaxis</Badge>;
                  case "viral_load":
                    return <Badge variant="outline" className="ml-2 bg-blue-50 dark:bg-blue-950">Viral Load</Badge>;
                  case "immunization":
                    return <Badge variant="outline" className="ml-2 bg-green-50 dark:bg-green-950">Immunization</Badge>;
                  case "adherence":
                    return <Badge variant="outline" className="ml-2 bg-purple-50 dark:bg-purple-950">Adherence</Badge>;
                }
              };

              return (
                <Card key={`rec-${index}`} className="border-2" data-testid={`clinical-rec-${index}`}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getCategoryIcon()}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {rec.title}
                          </span>
                          {getPriorityBadge()}
                          {getCategoryBadge()}
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-medium mb-1">Recommendation:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {rec.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

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
