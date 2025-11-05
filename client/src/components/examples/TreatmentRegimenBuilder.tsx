import { useState } from "react";
import TreatmentRegimenBuilder from "../TreatmentRegimenBuilder";

export default function TreatmentRegimenBuilderExample() {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(["dolutegravir", "tenofovir_af", "emtricitabine"]);

  return (
    <TreatmentRegimenBuilder
      selectedDrugs={selectedDrugs}
      onDrugsChange={setSelectedDrugs}
    />
  );
}
