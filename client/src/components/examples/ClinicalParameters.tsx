import { useState } from "react";
import ClinicalParameters from "../ClinicalParameters";

export default function ClinicalParametersExample() {
  const [treatmentStatus, setTreatmentStatus] = useState<"naive" | "experienced">("naive");
  const [viralLoad, setViralLoad] = useState<number | undefined>(50000);
  const [cd4Count, setCd4Count] = useState<number | undefined>(350);
  const [egfr, setEgfr] = useState<number | undefined>(90);
  const [hepaticFunction, setHepaticFunction] = useState<"normal" | "mild" | "moderate" | "severe">("normal");

  return (
    <ClinicalParameters
      treatmentStatus={treatmentStatus}
      viralLoad={viralLoad}
      cd4Count={cd4Count}
      egfr={egfr}
      hepaticFunction={hepaticFunction}
      onTreatmentStatusChange={setTreatmentStatus}
      onViralLoadChange={setViralLoad}
      onCd4CountChange={setCd4Count}
      onEgfrChange={setEgfr}
      onHepaticFunctionChange={setHepaticFunction}
    />
  );
}
