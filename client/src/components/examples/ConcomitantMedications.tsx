import { useState } from "react";
import ConcomitantMedications from "../ConcomitantMedications";

export default function ConcomitantMedicationsExample() {
  const [medications, setMedications] = useState<string[]>(["Atorvastatin", "Omeprazole", "Metformin"]);

  return (
    <ConcomitantMedications
      medications={medications}
      onMedicationsChange={setMedications}
    />
  );
}
