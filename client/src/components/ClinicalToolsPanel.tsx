import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContentNoOverlay,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Wrench } from "lucide-react";
import { ClinicalToolCards } from "@/components/ClinicalToolCards";

export function ClinicalToolsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          data-testid="button-clinical-tools-panel"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Clinical Tools</span>
          <span className="sm:hidden">Tools</span>
        </button>
      </SheetTrigger>

      {/* Non-modal — no overlay — background form remains fully interactive */}
      <SheetContentNoOverlay
        side="right"
        className="w-full sm:max-w-2xl shadow-2xl flex flex-col p-0"
        onInteractOutside={() => setOpen(false)}
        data-testid="panel-clinical-tools"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2 pr-8">
            <div className="p-2 rounded-md bg-primary/10 shrink-0">
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">Clinical Tools</SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                Quick access to ADAP, Medicare, and clinical guideline portals. Links open in a new tab.
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <ClinicalToolCards />

          <p className="text-xs text-muted-foreground border-t pt-3 pb-2">
            These tools open in a new browser tab using your existing credentials. No login information is stored in this application. Contact your organization's administrator if you need portal access credentials for Ramsell or OneSource.
          </p>
        </div>
      </SheetContentNoOverlay>
    </Sheet>
  );
}
