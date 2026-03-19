import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Info,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { clinicalTools } from "@/lib/clinicalToolsData";

export function ClinicalToolCards() {
  return (
    <>
      {clinicalTools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Card key={tool.id} data-testid={`tool-card-${tool.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-md shrink-0 ${tool.iconBg}`}>
                  <Icon className={`w-6 h-6 ${tool.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                    {tool.highlight && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${tool.highlight.badgeColor}`}
                        data-testid={`badge-${tool.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {tool.highlight.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{tool.subtitle}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{tool.description}</p>

              {tool.highlight && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                  <Info className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800 dark:text-green-300">{tool.highlight.text}</p>
                </div>
              )}

              <div className="bg-muted rounded-md p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground mb-2">Tips for pharmacists</p>
                {tool.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <a
                  href={tool.primaryAction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={tool.primaryAction.testId}
                >
                  <Button className="gap-1.5">
                    {tool.primaryAction.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
                {tool.secondaryAction && (
                  <a
                    href={tool.secondaryAction.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={tool.secondaryAction.testId}
                  >
                    <Button variant="outline" className="gap-1.5">
                      {tool.secondaryAction.label}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
