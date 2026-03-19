import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { drugClasses, getDrugsByClass } from "@/lib/hivDrugs";
import { cn } from "@/lib/utils";

type RegimenMode = "new" | "change";

type TreatmentRegimenBuilderProps = {
  regimenMode: RegimenMode;
  selectedDrugs: string[];
  currentDrugs: string[];
  onRegimenModeChange: (mode: RegimenMode) => void;
  onDrugsChange: (drugs: string[]) => void;
  onCurrentDrugsChange: (drugs: string[]) => void;
};

function DrugPicker({
  selectedDrugs,
  onDrugsChange,
  idPrefix,
}: {
  selectedDrugs: string[];
  onDrugsChange: (drugs: string[]) => void;
  idPrefix: string;
}) {
  const toggle = (drugId: string) => {
    if (selectedDrugs.includes(drugId)) {
      onDrugsChange(selectedDrugs.filter(id => id !== drugId));
    } else {
      onDrugsChange([...selectedDrugs, drugId]);
    }
  };

  const getClassCount = (drugClass: string) => {
    const classDrugs = getDrugsByClass(drugClass);
    return selectedDrugs.filter(id => classDrugs.some(d => d.id === id)).length;
  };

  return (
    <Accordion type="multiple" className="w-full">
      {drugClasses.map((drugClass) => {
        const drugs = getDrugsByClass(drugClass);
        const count = getClassCount(drugClass);
        const accordionId = `${idPrefix}-${drugClass.toLowerCase().replace(/\s+/g, "-")}`;

        return (
          <AccordionItem key={drugClass} value={accordionId}>
            <AccordionTrigger
              className="hover:no-underline"
              data-testid={`accordion-${idPrefix}-${drugClass.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{drugClass}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {count} selected
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {drugs.map((drug) => {
                  const inputId = `${idPrefix}-${drug.id}`;
                  return (
                    <div key={drug.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={inputId}
                        checked={selectedDrugs.includes(drug.id)}
                        onCheckedChange={() => toggle(drug.id)}
                        data-testid={`checkbox-${idPrefix}-drug-${drug.id}`}
                      />
                      <div className="grid gap-1 leading-none">
                        <Label
                          htmlFor={inputId}
                          className="font-mono text-sm font-medium leading-none cursor-pointer"
                        >
                          {drug.name}
                          {drug.brandName && (
                            <span className="text-muted-foreground font-sans ml-1">
                              ({drug.brandName})
                            </span>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground font-mono">
                          {drug.dosage}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export default function TreatmentRegimenBuilder({
  regimenMode,
  selectedDrugs,
  currentDrugs,
  onRegimenModeChange,
  onDrugsChange,
  onCurrentDrugsChange,
}: TreatmentRegimenBuilderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-xl">Treatment Regimen</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {regimenMode === "new"
                ? "Select antiretroviral medications for this patient"
                : "Select the current and new antiretroviral regimens"}
            </p>
          </div>

          <div
            className="flex rounded-md border overflow-hidden shrink-0"
            role="group"
            aria-label="Regimen type"
          >
            <button
              type="button"
              data-testid="toggle-regimen-new"
              onClick={() => onRegimenModeChange("new")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                regimenMode === "new"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover-elevate"
              )}
            >
              New to Therapy
            </button>
            <button
              type="button"
              data-testid="toggle-regimen-change"
              onClick={() => onRegimenModeChange("change")}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-l",
                regimenMode === "change"
                  ? "bg-primary text-primary-foreground border-l-primary"
                  : "bg-background text-foreground hover-elevate"
              )}
            >
              Change Regimen
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {regimenMode === "new" ? (
          <DrugPicker
            selectedDrugs={selectedDrugs}
            onDrugsChange={onDrugsChange}
            idPrefix="new"
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Current Regimen
                </span>
                {currentDrugs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {currentDrugs.length} selected
                  </Badge>
                )}
              </div>
              <div className="rounded-md border p-4">
                <DrugPicker
                  selectedDrugs={currentDrugs}
                  onDrugsChange={onCurrentDrugsChange}
                  idPrefix="current"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  New Regimen
                </span>
                {selectedDrugs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedDrugs.length} selected
                  </Badge>
                )}
              </div>
              <div className="rounded-md border p-4">
                <DrugPicker
                  selectedDrugs={selectedDrugs}
                  onDrugsChange={onDrugsChange}
                  idPrefix="new"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
