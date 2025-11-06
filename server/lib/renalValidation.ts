import { type DrugInteraction } from "@shared/schema";

export type RenalAlert = {
  medication: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

type RenalRule = {
  drugPattern: string;
  minEgfr?: number;  // Minimum eGFR required (contraindicated below this)
  adjustmentThreshold?: number;  // eGFR below which adjustment needed
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

const renalRules: RenalRule[] = [
  // CRITICAL - Biktarvy (BIC/FTC/TAF)
  {
    drugPattern: "biktarvy",
    minEgfr: 30,
    severity: "critical",
    description: "Biktarvy is CONTRAINDICATED in patients with eGFR <30 mL/min per FDA labeling. The combination product cannot be dose-adjusted for renal impairment.",
    recommendation: "Biktarvy should NOT be initiated or continued. Switch to alternative regimen with individually dosed components that can be adjusted for renal function (e.g., dolutegravir + lamivudine, or TAF-based regimen with dose-adjustable backbone)."
  },
  
  // CRITICAL - TDF-containing products
  {
    drugPattern: "truvada",
    adjustmentThreshold: 50,
    minEgfr: 30,
    severity: "critical",
    description: "Truvada (TDF/FTC) requires dose adjustment for eGFR 30-49 mL/min. Contraindicated if eGFR <30 mL/min.",
    recommendation: "For eGFR 30-49 mL/min: dose every 48 hours. For eGFR <30 mL/min: DISCONTINUE and switch to TAF-based regimen (e.g., Descovy). Monitor renal function closely."
  },
  {
    drugPattern: "atripla",
    adjustmentThreshold: 50,
    severity: "critical",
    description: "Atripla contains TDF which requires dose adjustment for eGFR <50 mL/min. Fixed-dose combination cannot be adjusted.",
    recommendation: "AVOID Atripla. Switch to individually dosed components (efavirenz + FTC + TAF) or alternative complete regimen. TDF should not be used with eGFR <50 mL/min without adjustment."
  },
  {
    drugPattern: "complera",
    adjustmentThreshold: 50,
    severity: "critical",
    description: "Complera (rilpivirine/FTC/TDF) contains TDF which requires adjustment for eGFR <50 mL/min. Fixed combination cannot be adjusted.",
    recommendation: "Switch to Odefsey (rilpivirine/FTC/TAF) which can be used down to eGFR ≥30 mL/min, or use individual components with appropriate TDF dosing adjustments."
  },
  {
    drugPattern: "stribild",
    minEgfr: 70,
    severity: "critical",
    description: "Stribild (elvitegravir/cobicistat/FTC/TDF) should not be initiated if eGFR <70 mL/min, and should be discontinued if eGFR drops <50 mL/min during treatment.",
    recommendation: "Do NOT initiate or continue Stribild. Switch to Genvoya (TAF-based version) or alternative regimen. Stribild carries high renal toxicity risk."
  },
  {
    drugPattern: "symfi",
    adjustmentThreshold: 50,
    severity: "critical",
    description: "Symfi contains TDF which requires dose adjustment for eGFR <50 mL/min. Fixed-dose combination prevents appropriate adjustment.",
    recommendation: "Switch to individual components or alternative regimen. TDF-containing products should be avoided in renal impairment."
  },
  {
    drugPattern: "tenofovir disoproxil fumarate",
    adjustmentThreshold: 50,
    minEgfr: 10,
    severity: "critical",
    description: "TDF requires dose adjustment for eGFR <50 mL/min: every 48h for eGFR 30-49, every 72-96h for eGFR 10-29, once weekly for eGFR <10 on dialysis.",
    recommendation: "Strongly consider switching to TAF-based regimen (safer renal profile). If TDF continued, adjust dosing interval and monitor renal function monthly. Avoid in Fanconi syndrome or significant proteinuria."
  },
  {
    drugPattern: "viread",
    adjustmentThreshold: 50,
    severity: "critical",
    description: "Viread (TDF) requires dose adjustment for eGFR <50 mL/min and intensive renal monitoring.",
    recommendation: "Adjust dosing interval based on eGFR. Switch to TAF-based alternative (e.g., Vemlidy) if feasible. Monitor renal function and urine protein monthly."
  },
  
  // MODERATE - TAF-containing products
  {
    drugPattern: "genvoya",
    minEgfr: 30,
    severity: "moderate",
    description: "Genvoya (elvitegravir/cobicistat/FTC/TAF) should not be initiated if eGFR <30 mL/min. Can be continued if eGFR drops below 30 during treatment with close monitoring.",
    recommendation: "If eGFR <30 mL/min at initiation, use alternative regimen. If eGFR declines <30 during treatment, continue with close renal monitoring or consider switch if progressive decline."
  },
  {
    drugPattern: "odefsey",
    minEgfr: 30,
    severity: "moderate",
    description: "Odefsey (rilpivirine/FTC/TAF) should not be initiated if eGFR <30 mL/min.",
    recommendation: "For eGFR <30 mL/min, use alternative regimen. Odefsey is generally renal-safe for eGFR ≥30 mL/min."
  },
  {
    drugPattern: "symtuza",
    minEgfr: 30,
    severity: "moderate",
    description: "Symtuza (darunavir/cobicistat/FTC/TAF) should not be initiated if eGFR <30 mL/min.",
    recommendation: "Use alternative regimen if eGFR <30 mL/min. If eGFR declines during treatment, continue with close monitoring."
  },
  {
    drugPattern: "descovy",
    minEgfr: 30,
    severity: "moderate",
    description: "Descovy (FTC/TAF) should not be initiated for HIV treatment if eGFR <30 mL/min. For PrEP, requires eGFR ≥60 mL/min.",
    recommendation: "For HIV treatment with eGFR <30 mL/min: use alternative NRTI backbone (e.g., 3TC/ABC if HLA-B*5701 negative). TAF has better renal safety than TDF overall."
  },
  {
    drugPattern: "bictegravir",
    minEgfr: 30,
    severity: "moderate",
    description: "Bictegravir (as in Biktarvy) should not be initiated if eGFR <30 mL/min due to combination product constraints.",
    recommendation: "Use individually dosed regimen components if eGFR <30 mL/min. Bictegravir itself has no significant renal toxicity."
  },
  
  // MODERATE - Integrase Inhibitors (generally renal-safe but considerations)
  {
    drugPattern: "dolutegravir",
    adjustmentThreshold: 30,
    severity: "minor",
    description: "Dolutegravir inhibits renal tubular secretion of creatinine (OCT2 inhibitor), causing 10-15% increase in serum creatinine without affecting true GFR. This is a benign laboratory effect.",
    recommendation: "No dose adjustment needed. Expect 10-15% creatinine increase within 4 weeks of starting DTG - this does NOT represent true renal impairment. Use alternative GFR estimation if available (cystatin C)."
  },
  {
    drugPattern: "tivicay",
    adjustmentThreshold: 30,
    severity: "minor",
    description: "Tivicay (dolutegravir) causes benign increase in serum creatinine without affecting actual GFR.",
    recommendation: "No dose adjustment required. Inform providers about expected creatinine increase to avoid unnecessary discontinuation. True renal function remains unchanged."
  },
  {
    drugPattern: "bictegravir",
    adjustmentThreshold: 30,
    severity: "minor",
    description: "Bictegravir inhibits tubular creatinine secretion, causing modest creatinine increase without true GFR change.",
    recommendation: "No action needed. Expected creatinine increase is not clinically significant renal impairment."
  },
  
  // MODERATE - Protease Inhibitors (generally need adjustment in severe renal impairment)
  {
    drugPattern: "atazanavir",
    adjustmentThreshold: 10,
    severity: "moderate",
    description: "Atazanavir should be used with caution in severe renal impairment (eGFR <10 mL/min on dialysis) due to increased exposure of ritonavir/cobicistat boosters.",
    recommendation: "Can be used in mild-moderate renal impairment without adjustment. For eGFR <10 mL/min on dialysis, use unboosted if possible or monitor closely for toxicity."
  },
  {
    drugPattern: "darunavir",
    adjustmentThreshold: 30,
    severity: "moderate",
    description: "Darunavir requires caution in severe renal impairment due to booster (ritonavir/cobicistat) considerations and increased risk of nephrolithiasis.",
    recommendation: "No dose adjustment for mild-moderate impairment. For eGFR <30 mL/min, monitor for adverse effects. Ensure adequate hydration to prevent kidney stones."
  },
  
  // MODERATE - Other NRTIs
  {
    drugPattern: "emtricitabine",
    adjustmentThreshold: 50,
    severity: "moderate",
    description: "Emtricitabine (FTC) requires dose adjustment for eGFR <50 mL/min: every 48h for eGFR 30-49, every 72h for eGFR 15-29, every 96h for eGFR <15.",
    recommendation: "Adjust dosing interval based on eGFR. FTC is generally well-tolerated in renal impairment with appropriate adjustment. Monitor renal function every 3-6 months."
  },
  {
    drugPattern: "lamivudine",
    adjustmentThreshold: 50,
    severity: "moderate",
    description: "Lamivudine (3TC) requires dose adjustment for eGFR <50 mL/min: 150mg daily for eGFR 30-49, dose reduction for eGFR <30.",
    recommendation: "Adjust dose based on eGFR per prescribing information. 3TC has excellent safety profile even in renal impairment with proper dosing."
  },
  {
    drugPattern: "abacavir",
    adjustmentThreshold: 0,
    severity: "minor",
    description: "Abacavir requires no dose adjustment for renal impairment. Primarily hepatically metabolized.",
    recommendation: "No renal dose adjustment needed. Good choice for patients with renal impairment (if HLA-B*5701 negative). Avoid in end-stage liver disease."
  },
  {
    drugPattern: "zidovudine",
    adjustmentThreshold: 15,
    severity: "moderate",
    description: "Zidovudine (AZT) requires dose adjustment for eGFR <15 mL/min or on dialysis.",
    recommendation: "Reduce dose to 300mg daily (or 100mg TID) for severe renal impairment. Monitor for hematologic toxicity (anemia, neutropenia)."
  },
  
  // CRITICAL - Combinations with multiple renal considerations
  {
    drugPattern: "triumeq",
    adjustmentThreshold: 30,
    severity: "moderate",
    description: "Triumeq (dolutegravir/abacavir/lamivudine) requires consideration for lamivudine component in renal impairment. DTG causes benign creatinine increase.",
    recommendation: "For eGFR 30-50 mL/min: consider switching to individual components to adjust 3TC dosing. For eGFR <30 mL/min: use individual components with dose adjustments."
  },
  {
    drugPattern: "dovato",
    adjustmentThreshold: 30,
    severity: "moderate",
    description: "Dovato (dolutegravir/lamivudine) has no dose adjustment for eGFR ≥30 mL/min, but should not be initiated if eGFR <30 (due to 3TC component).",
    recommendation: "For eGFR <30 mL/min: use alternative regimen or individual components with 3TC dose adjustment. Monitor for DTG-related creatinine increase."
  },
  {
    drugPattern: "epzicom",
    adjustmentThreshold: 50,
    severity: "moderate",
    description: "Epzicom (abacavir/lamivudine) requires consideration for lamivudine dose adjustment if eGFR <50 mL/min.",
    recommendation: "For eGFR <50 mL/min: switch to individual components to adjust 3TC dosing. Abacavir requires no adjustment."
  },
  
  // MODERATE - Additional boosters
  {
    drugPattern: "cobicistat",
    adjustmentThreshold: 70,
    severity: "moderate",
    description: "Cobicistat inhibits tubular creatinine secretion (causing 10-15% creatinine increase without true GFR change). Should not be initiated if eGFR <70 mL/min when used with TDF.",
    recommendation: "Expect creatinine increase of 0.1-0.2 mg/dL without true renal impairment. If using with TDF, do not initiate if eGFR <70. If using with TAF, can initiate down to eGFR ≥30."
  },
  {
    drugPattern: "ritonavir",
    adjustmentThreshold: 0,
    severity: "minor",
    description: "Ritonavir has no specific renal dose adjustment requirements. Primarily hepatically metabolized.",
    recommendation: "No renal dose adjustment needed. Monitor for drug interactions that may affect renal function (e.g., with TDF)."
  },
];

export function checkRenalFunction(
  selectedDrugs: string[],
  egfr: number | undefined
): RenalAlert[] {
  if (!egfr) {
    return [];
  }

  const alerts: RenalAlert[] = [];

  for (const drugId of selectedDrugs) {
    const normalizedDrugId = drugId.toLowerCase().replace(/_/g, "");
    
    for (const rule of renalRules) {
      const normalizedPattern = rule.drugPattern.toLowerCase().replace(/[_\s-]/g, "");
      
      if (normalizedDrugId.includes(normalizedPattern)) {
        let triggered = false;
        let alertDescription = rule.description;
        let alertRecommendation = rule.recommendation;

        // Check if below minimum eGFR (contraindication)
        if (rule.minEgfr && egfr < rule.minEgfr) {
          triggered = true;
          alertDescription = `eGFR ${egfr} mL/min is BELOW minimum required ${rule.minEgfr} mL/min. ${rule.description}`;
        }
        // Check if below adjustment threshold (dose adjustment needed)
        else if (rule.adjustmentThreshold && egfr < rule.adjustmentThreshold) {
          triggered = true;
          alertDescription = `eGFR ${egfr} mL/min requires dosing consideration (threshold ${rule.adjustmentThreshold} mL/min). ${rule.description}`;
        }

        if (triggered) {
          alerts.push({
            medication: drugId,
            severity: rule.severity,
            description: alertDescription,
            recommendation: alertRecommendation,
          });
        }
      }
    }
  }

  return alerts;
}
