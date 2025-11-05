import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ClinicalParametersProps = {
  treatmentStatus: "naive" | "experienced";
  viralLoad?: number;
  cd4Count?: number;
  egfr?: number;
  hepaticFunction: "normal" | "mild" | "moderate" | "severe";
  onTreatmentStatusChange: (value: "naive" | "experienced") => void;
  onViralLoadChange: (value: number | undefined) => void;
  onCd4CountChange: (value: number | undefined) => void;
  onEgfrChange: (value: number | undefined) => void;
  onHepaticFunctionChange: (value: "normal" | "mild" | "moderate" | "severe") => void;
};

export default function ClinicalParameters({
  treatmentStatus,
  viralLoad,
  cd4Count,
  egfr,
  hepaticFunction,
  onTreatmentStatusChange,
  onViralLoadChange,
  onCd4CountChange,
  onEgfrChange,
  onHepaticFunctionChange,
}: ClinicalParametersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Clinical Parameters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Treatment Status</Label>
          <RadioGroup value={treatmentStatus} onValueChange={onTreatmentStatusChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="naive" id="treatment-naive" data-testid="radio-treatment-naive" />
              <Label htmlFor="treatment-naive" className="font-normal cursor-pointer">
                Treatment Naive
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="experienced" id="treatment-experienced" data-testid="radio-treatment-experienced" />
              <Label htmlFor="treatment-experienced" className="font-normal cursor-pointer">
                Treatment Experienced
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="viral-load" className="text-sm font-medium">
              Viral Load
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="viral-load"
                type="number"
                min="0"
                placeholder="Enter value"
                value={viralLoad ?? ""}
                onChange={(e) => onViralLoadChange(e.target.value ? Number(e.target.value) : undefined)}
                data-testid="input-viral-load"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">copies/mL</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd4-count" className="text-sm font-medium">
              CD4 Count
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cd4-count"
                type="number"
                min="0"
                placeholder="Enter value"
                value={cd4Count ?? ""}
                onChange={(e) => onCd4CountChange(e.target.value ? Number(e.target.value) : undefined)}
                data-testid="input-cd4-count"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">cells/mm³</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="egfr" className="text-sm font-medium">
              eGFR (Renal Function)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="egfr"
                type="number"
                min="0"
                placeholder="Enter value"
                value={egfr ?? ""}
                onChange={(e) => onEgfrChange(e.target.value ? Number(e.target.value) : undefined)}
                data-testid="input-egfr"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">mL/min</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hepatic-function" className="text-sm font-medium">
              Hepatic Function
            </Label>
            <Select value={hepaticFunction} onValueChange={onHepaticFunctionChange}>
              <SelectTrigger id="hepatic-function" data-testid="select-hepatic-function">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="mild">Mild Impairment</SelectItem>
                <SelectItem value="moderate">Moderate Impairment</SelectItem>
                <SelectItem value="severe">Severe Impairment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
