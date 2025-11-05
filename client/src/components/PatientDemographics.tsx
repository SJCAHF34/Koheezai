import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PatientDemographicsProps = {
  age: number;
  pregnancy: "yes" | "no" | "unknown";
  hlab5701: "positive" | "negative" | "unknown";
  onAgeChange: (age: number) => void;
  onPregnancyChange: (value: "yes" | "no" | "unknown") => void;
  onHlab5701Change: (value: "positive" | "negative" | "unknown") => void;
};

export default function PatientDemographics({
  age,
  pregnancy,
  hlab5701,
  onAgeChange,
  onPregnancyChange,
  onHlab5701Change,
}: PatientDemographicsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Patient Demographics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="age" className="text-sm font-medium">
            Age (years)
          </Label>
          <Input
            id="age"
            type="number"
            min="0"
            max="120"
            value={age}
            onChange={(e) => onAgeChange(Number(e.target.value))}
            className="max-w-xs"
            data-testid="input-age"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Pregnancy Status</Label>
          <RadioGroup value={pregnancy} onValueChange={onPregnancyChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="pregnancy-yes" data-testid="radio-pregnancy-yes" />
              <Label htmlFor="pregnancy-yes" className="font-normal cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="pregnancy-no" data-testid="radio-pregnancy-no" />
              <Label htmlFor="pregnancy-no" className="font-normal cursor-pointer">
                No
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unknown" id="pregnancy-unknown" data-testid="radio-pregnancy-unknown" />
              <Label htmlFor="pregnancy-unknown" className="font-normal cursor-pointer">
                Unknown
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">HLA-B*5701 Status</Label>
          <RadioGroup value={hlab5701} onValueChange={onHlab5701Change}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="positive" id="hlab-positive" data-testid="radio-hlab-positive" />
              <Label htmlFor="hlab-positive" className="font-normal cursor-pointer">
                Positive
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="negative" id="hlab-negative" data-testid="radio-hlab-negative" />
              <Label htmlFor="hlab-negative" className="font-normal cursor-pointer">
                Negative
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="unknown" id="hlab-unknown" data-testid="radio-hlab-unknown" />
              <Label htmlFor="hlab-unknown" className="font-normal cursor-pointer">
                Unknown
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
