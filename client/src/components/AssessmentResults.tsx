import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, AlertCircle, Info, Activity, Shield, Baby, HeartPulse, Syringe, TrendingUp, BookOpen, ExternalLink } from "lucide-react";
import { type DrugInteraction, type RenalAlert, type HepaticPregnancyAlert, type ClinicalRecommendation, type EvidenceCitation } from "@shared/schema";

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
}: AssessmentResultsProps) {
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
              Evidence-based recommendations for OI prophylaxis, viral load management, and immunizations
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {clinicalRecommendations.map((rec, index) => {
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
            <CardTitle className="text-xl">Clinical Assessment Summary</CardTitle>
            {aiProvider && (
              <Badge variant="outline" className="text-xs">
                {aiProvider === "openevidence" ? "OpenEvidence AI" : "OpenAI"}
              </Badge>
            )}
          </div>
          {sources && sources.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sources: {sources.join(", ")}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm whitespace-pre-line">{clinicalSummary}</p>
          </div>
          
          {citations && citations.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4" />
                Evidence Citations
              </h4>
              <div className="space-y-3">
                {citations.map((citation, index) => (
                  <div key={index} className="text-sm p-3 bg-muted rounded-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{citation.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {citation.journal}
                          {citation.pubmedId && ` (PMID: ${citation.pubmedId})`}
                        </p>
                      </div>
                      <Badge 
                        variant={citation.relevance === "high" ? "default" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {citation.relevance}
                      </Badge>
                    </div>
                    {citation.summary && (
                      <p className="text-xs text-muted-foreground mt-2">{citation.summary}</p>
                    )}
                    {citation.url && (
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
                      >
                        View Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pharmacist Consultation Questions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Key questions to address during patient consultation
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consultationQuestions.map((question, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-md border hover-elevate"
                data-testid={`question-${index}`}
              >
                <Checkbox id={`question-${index}`} data-testid={`checkbox-question-${index}`} />
                <Label
                  htmlFor={`question-${index}`}
                  className="font-normal cursor-pointer flex-1"
                >
                  <span className="font-medium text-muted-foreground mr-2">
                    {index + 1}.
                  </span>
                  {question}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
