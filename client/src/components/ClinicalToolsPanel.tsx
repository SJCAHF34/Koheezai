import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClinicalToolCards } from "@/components/ClinicalToolCards";

export function ClinicalToolsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <DialogPrimitive.Trigger asChild>
        <button
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          data-testid="button-clinical-tools-panel"
        >
          <Wrench className="w-4 h-4" />
          <span className="hidden sm:inline">Clinical Tools</span>
          <span className="sm:hidden">Tools</span>
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        {/* No overlay — panel is non-modal so the form stays fully interactive */}
        <DialogPrimitive.Content
          onInteractOutside={() => setOpen(false)}
          className={cn(
            "fixed inset-y-0 right-0 z-50 h-full w-full sm:w-[42rem] border-l bg-background shadow-2xl",
            "flex flex-col",
            "transition ease-in-out duration-300",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right"
          )}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center gap-2 pr-8">
              <div className="p-2 rounded-md bg-primary/10 shrink-0">
                <Wrench className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  Clinical Tools
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                  Quick access to ADAP, Medicare, and clinical guideline portals. Links open in a new tab.
                </DialogPrimitive.Description>
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

          {/* Close button */}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            data-testid="button-close-clinical-tools-panel"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
