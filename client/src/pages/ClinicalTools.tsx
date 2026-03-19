import { Wrench } from "lucide-react";
import { ClinicalToolCards } from "@/components/ClinicalToolCards";

export default function ClinicalTools() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Clinical Tools</h1>
              <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                Quick access to ADAP eligibility verification, Medicare insurance portals, and evidence-based clinical guidelines. These tools open in a new tab using your existing login credentials.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <ClinicalToolCards />

        {/* Footer note */}
        <div className="text-xs text-muted-foreground border-t pt-4 pb-2">
          <p>
            These tools open in a new browser tab using your existing credentials. No login information is stored in this application. Contact your organization's administrator if you need portal access credentials for Ramsell or OneSource.
          </p>
        </div>
      </div>
    </div>
  );
}
