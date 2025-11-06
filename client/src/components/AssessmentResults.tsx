import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, AlertCircle, Info, Activity, Shield, Baby } from "lucide-react";
import { type DrugInteraction, type RenalAlert, type HepaticPregnancyAlert } from "@shared/schema";

type AssessmentResultsProps = {
  interactions: DrugInteraction[];
  renalAlerts: RenalAlert[];
  hepaticPregnancyAlerts: HepaticPregnancyAlert[];
  clinicalSummary: string;
  consultationQuestions: string[];
};

export default function AssessmentResults({
  interactions,
  renalAlerts,
  hepaticPregnancyAlerts,
  clinicalSummary,
  consultationQuestions,
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Clinical Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm whitespace-pre-line">{clinicalSummary}</p>
          </div>
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
