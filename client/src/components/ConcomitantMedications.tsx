import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useState } from "react";

type ConcomitantMedicationsProps = {
  medications: string[];
  onMedicationsChange: (medications: string[]) => void;
};

export default function ConcomitantMedications({
  medications,
  onMedicationsChange,
}: ConcomitantMedicationsProps) {
  const [inputValue, setInputValue] = useState("");

  const addMedication = () => {
    if (inputValue.trim() && !medications.includes(inputValue.trim())) {
      onMedicationsChange([...medications, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeMedication = (med: string) => {
    onMedicationsChange(medications.filter(m => m !== med));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMedication();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Concomitant Medications</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add medications for drug-drug interaction checking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter medication name..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            data-testid="input-concomitant-med"
          />
          <Button
            type="button"
            onClick={addMedication}
            disabled={!inputValue.trim()}
            data-testid="button-add-med"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {medications.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Added Medications ({medications.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {medications.map((med) => (
                <Badge
                  key={med}
                  variant="secondary"
                  className="pl-3 pr-2 py-1.5 gap-2"
                  data-testid={`badge-med-${med}`}
                >
                  <span className="font-mono text-sm">{med}</span>
                  <button
                    onClick={() => removeMedication(med)}
                    className="hover-elevate active-elevate-2 rounded-sm"
                    data-testid={`button-remove-${med}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
