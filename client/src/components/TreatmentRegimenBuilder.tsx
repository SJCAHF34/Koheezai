import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { drugClasses, getDrugsByClass, prepDrugs } from "@/lib/hivDrugs";
import { cn } from "@/lib/utils";

type RegimenMode = "new" | "change";

type TreatmentRegimenBuilderProps = {
  regimenMode: RegimenMode;
  selectedDrugs: string[];
  currentDrugs: string[];
  onRegimenModeChange: (mode: RegimenMode) => void;
  onDrugsChange: (drugs: string[]) => void;
  onCurrentDrugsChange: (drugs: string[]) => void;
  prepMode?: boolean;
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
              <div className="grid grid-cols-1 gap-2 pt-2">
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
                      <div className="grid gap-0.5 leading-none min-w-0">
                        <Label
                          htmlFor={inputId}
                          className="text-sm font-medium leading-snug cursor-pointer break-words"
                        >
                          {drug.name}
                          {drug.brandName && (
                            <span className="text-muted-foreground ml-1">
                              ({drug.brandName})
                            </span>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground">
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

function PrepDrugPicker({
  selectedDrugs,
  onDrugsChange,
}: {
  selectedDrugs: string[];
  onDrugsChange: (drugs: string[]) => void;
}) {
  const toggle = (drugId: string) => {
    if (selectedDrugs.includes(drugId)) {
      onDrugsChange(selectedDrugs.filter(id => id !== drugId));
    } else {
      onDrugsChange([...selectedDrugs, drugId]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
      {prepDrugs.map((drug) => {
        const inputId = `prep-${drug.id}`;
        const selected = selectedDrugs.includes(drug.id);
        return (
          <label
            key={drug.id}
            htmlFor={inputId}
            className={cn(
              "flex flex-col gap-2 rounded-md border p-4 cursor-pointer transition-colors",
              selected ? "border-primary bg-primary/5" : "border-border hover-elevate"
            )}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id={inputId}
                checked={selected}
                onCheckedChange={() => toggle(drug.id)}
                data-testid={`checkbox-prep-drug-${drug.id}`}
              />
              <span className="text-sm font-semibold">{drug.brandName}</span>
            </div>
            <p className="text-xs text-muted-foreground pl-7 leading-snug">
              {drug.name}
            </p>
            <p className="text-xs text-muted-foreground pl-7">
              {drug.dosage}
            </p>
          </label>
        );
      })}
    </div>
  );
}

export default function TreatmentRegimenBuilder({
  regimenMode,
  selectedDrugs,
  currentDrugs,
  onRegimenModeChange,
  onDrugsChange,
  onCurrentDrugsChange,
  prepMode = false,
}: TreatmentRegimenBuilderProps) {
  if (prepMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">PrEP Medication</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select the PrEP regimen for this patient
          </p>
        </CardHeader>
        <CardContent>
          <PrepDrugPicker
            selectedDrugs={selectedDrugs}
            onDrugsChange={onDrugsChange}
          />
        </CardContent>
      </Card>
    );
  }

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
