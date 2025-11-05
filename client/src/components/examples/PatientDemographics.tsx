import { useState } from "react";
import PatientDemographics from "../PatientDemographics";

export default function PatientDemographicsExample() {
  const [age, setAge] = useState(45);
  const [pregnancy, setPregnancy] = useState<"yes" | "no" | "unknown">("no");
  const [hlab5701, setHlab5701] = useState<"positive" | "negative" | "unknown">("negative");

  return (
    <PatientDemographics
      age={age}
      pregnancy={pregnancy}
      hlab5701={hlab5701}
      onAgeChange={setAge}
      onPregnancyChange={setPregnancy}
      onHlab5701Change={setHlab5701}
    />
  );
}
