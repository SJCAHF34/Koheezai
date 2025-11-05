import { type DrugInteraction } from "@shared/schema";

export type InteractionRule = {
  drug1Pattern: string;
  drug2Pattern: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

const interactionRules: InteractionRule[] = [
  {
    drug1Pattern: "dolutegravir",
    drug2Pattern: "metformin",
    severity: "moderate",
    description: "Dolutegravir may increase metformin levels through inhibition of renal OCT2 transporters, potentially increasing risk of lactic acidosis.",
    recommendation: "Monitor for metformin-related adverse effects. Consider dose reduction of metformin if needed. Monitor renal function and lactate levels."
  },
  {
    drug1Pattern: "bictegravir",
    drug2Pattern: "metformin",
    severity: "moderate",
    description: "Bictegravir may increase metformin levels through inhibition of renal OCT2 transporters.",
    recommendation: "Monitor for metformin-related adverse effects. Consider dose reduction of metformin if needed."
  },
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "omeprazole",
    severity: "critical",
    description: "Proton pump inhibitors significantly reduce atazanavir absorption and plasma concentrations, potentially leading to treatment failure.",
    recommendation: "Avoid concurrent use. Consider H2 antagonists if acid suppression needed, administered at least 12 hours apart from atazanavir."
  },
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "pantoprazole",
    severity: "critical",
    description: "Proton pump inhibitors significantly reduce atazanavir absorption and plasma concentrations.",
    recommendation: "Avoid concurrent use. Consider H2 antagonists if acid suppression needed."
  },
  {
    drug1Pattern: "rilpivirine",
    drug2Pattern: "omeprazole",
    severity: "critical",
    description: "Proton pump inhibitors significantly reduce rilpivirine absorption.",
    recommendation: "Avoid concurrent use. If acid suppression is necessary, consider H2 antagonists."
  },
  {
    drug1Pattern: "efavirenz",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Efavirenz decreases atorvastatin levels through CYP3A4 induction.",
    recommendation: "May need to increase atorvastatin dose. Monitor lipid levels and adjust accordingly."
  },
  {
    drug1Pattern: "darunavir",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Darunavir/ritonavir increases atorvastatin levels, increasing risk of myopathy.",
    recommendation: "Use lowest possible atorvastatin dose. Monitor for muscle pain or weakness. Consider rosuvastatin as alternative."
  },
  {
    drug1Pattern: "lopinavir",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Lopinavir/ritonavir significantly increases atorvastatin levels.",
    recommendation: "Use atorvastatin with caution at lowest dose. Monitor for myopathy. Consider pravastatin or rosuvastatin."
  },
  {
    drug1Pattern: "tenofovir",
    drug2Pattern: "nsaid",
    severity: "moderate",
    description: "Concurrent use may increase risk of renal toxicity.",
    recommendation: "Monitor renal function closely. Avoid prolonged NSAID use if possible."
  },
  {
    drug1Pattern: "abacavir",
    drug2Pattern: "methadone",
    severity: "minor",
    description: "Abacavir may decrease methadone levels.",
    recommendation: "Monitor for withdrawal symptoms. May need to increase methadone dose."
  },
  {
    drug1Pattern: "efavirenz",
    drug2Pattern: "voriconazole",
    severity: "critical",
    description: "Bidirectional interaction: efavirenz decreases voriconazole levels and voriconazole increases efavirenz levels.",
    recommendation: "Avoid concurrent use. If necessary, adjust doses of both medications and monitor levels."
  },
  {
    drug1Pattern: "rifampin",
    drug2Pattern: "protease inhibitor",
    severity: "critical",
    description: "Rifampin significantly decreases protease inhibitor levels through CYP3A4 induction.",
    recommendation: "Avoid concurrent use. Consider rifabutin as alternative with appropriate dose adjustments."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "sildenafil",
    severity: "moderate",
    description: "Ritonavir significantly increases sildenafil levels, increasing risk of adverse effects.",
    recommendation: "Reduce sildenafil dose to 25mg every 48 hours. Monitor for hypotension and visual changes."
  },
];

export function checkDrugInteractions(
  hivDrugs: string[],
  concomitantMeds: string[]
): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  let idCounter = 1;

  for (const hivDrug of hivDrugs) {
    for (const conMed of concomitantMeds) {
      for (const rule of interactionRules) {
        const hivDrugLower = hivDrug.toLowerCase().replace(/_/g, " ");
        const conMedLower = conMed.toLowerCase();

        const match1 = (
          hivDrugLower.includes(rule.drug1Pattern) && conMedLower.includes(rule.drug2Pattern)
        );
        const match2 = (
          hivDrugLower.includes(rule.drug2Pattern) && conMedLower.includes(rule.drug1Pattern)
        );

        if (match1 || match2) {
          interactions.push({
            id: String(idCounter++),
            drug1: hivDrug.replace(/_/g, " "),
            drug2: conMed,
            severity: rule.severity,
            description: rule.description,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  return interactions;
}
