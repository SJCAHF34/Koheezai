import AssessmentResults from "../AssessmentResults";
import { type DrugInteraction } from "@shared/schema";

export default function AssessmentResultsExample() {
  const interactions: DrugInteraction[] = [
    {
      id: "1",
      drug1: "Dolutegravir",
      drug2: "Metformin",
      severity: "moderate",
      description: "Dolutegravir may increase metformin levels through inhibition of renal OCT2 transporters, potentially increasing risk of lactic acidosis.",
      recommendation: "Monitor for metformin-related adverse effects. Consider dose reduction of metformin if needed. Monitor renal function and lactate levels."
    },
    {
      id: "2",
      drug1: "Atazanavir",
      drug2: "Omeprazole",
      severity: "critical",
      description: "Proton pump inhibitors significantly reduce atazanavir absorption and plasma concentrations, potentially leading to treatment failure.",
      recommendation: "Avoid concurrent use. Consider H2 antagonists if acid suppression needed, administered at least 12 hours apart from atazanavir."
    }
  ];

  const clinicalSummary = `Patient Assessment Summary:

This 45-year-old treatment-naive patient presents with a baseline viral load of 50,000 copies/mL and CD4 count of 350 cells/mm³. HLA-B*5701 testing is negative, allowing for consideration of abacavir-containing regimens if appropriate.

Current proposed regimen of dolutegravir + tenofovir AF + emtricitabine represents a preferred first-line option per current DHHS guidelines. Renal function (eGFR 90 mL/min) and hepatic function (normal) are within acceptable parameters for this regimen.

Key considerations:
• Two moderate-to-significant drug interactions identified with concomitant medications
• Renal dosing adjustments not currently required
• Patient education on adherence and food requirements needed
• Baseline resistance testing results should be reviewed prior to finalizing regimen`;

  const consultationQuestions = [
    "Have you been taking any over-the-counter medications, supplements, or herbal products not listed in your medication history?",
    "Are you experiencing any current symptoms such as nausea, fatigue, or unexplained weight loss?",
    "Do you have any known drug allergies or adverse reactions to medications in the past?",
    "What is your current understanding of HIV treatment and the importance of medication adherence?",
    "Are there any barriers that might affect your ability to take medications daily (work schedule, housing, transportation)?",
    "Have you experienced any side effects from the metformin or omeprazole you're currently taking?",
    "Do you have a reliable pharmacy where you can fill prescriptions regularly?"
  ];

  return (
    <AssessmentResults
      interactions={interactions}
      clinicalSummary={clinicalSummary}
      consultationQuestions={consultationQuestions}
    />
  );
}
