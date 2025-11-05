import { useState } from "react";
import GeneticResistanceNotes from "../GeneticResistanceNotes";

export default function GeneticResistanceNotesExample() {
  const [notes, setNotes] = useState("M184V, K103N mutations detected on prior genotypic resistance testing.");

  return (
    <GeneticResistanceNotes
      notes={notes}
      onNotesChange={setNotes}
    />
  );
}
