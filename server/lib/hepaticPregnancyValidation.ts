export type HepaticPregnancyAlert = {
  medication: string;
  category: "hepatic" | "pregnancy" | "hlab5701";
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

type HepaticRule = {
  drugPattern: string;
  severity: "critical" | "moderate" | "minor";
  hepaticLevel?: ("mild" | "moderate" | "severe")[];
  description: string;
  recommendation: string;
};

type PregnancyRule = {
  drugPattern: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

type HLARule = {
  drugPattern: string;
  severity: "critical";
  description: string;
  recommendation: string;
};

const hepaticRules: HepaticRule[] = [
  // CRITICAL - Severe hepatic impairment contraindications
  {
    drugPattern: "nevirapine",
    hepaticLevel: ["moderate", "severe"],
    severity: "critical",
    description: "Nevirapine is CONTRAINDICATED in moderate-to-severe hepatic impairment (Child-Pugh B or C) due to significantly increased hepatotoxicity risk. Nevirapine itself can cause severe hepatotoxicity including fulminant hepatic necrosis.",
    recommendation: "DO NOT use nevirapine in patients with moderate or severe hepatic impairment. Switch to alternative NNRTI (rilpivirine) or integrase inhibitor. Monitor LFTs closely if used in mild impairment."
  },
  {
    drugPattern: "rilpivirine",
    hepaticLevel: ["severe"],
    severity: "moderate",
    description: "Rilpivirine has not been studied in severe hepatic impairment (Child-Pugh C). Use with caution in moderate impairment.",
    recommendation: "Avoid in severe hepatic impairment due to lack of data. Can be used cautiously in mild-moderate impairment. Consider alternative regimen if Child-Pugh C."
  },
  {
    drugPattern: "efavirenz",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Efavirenz exposure may be increased in moderate-severe hepatic impairment. Risk of CNS side effects and hepatotoxicity may be enhanced.",
    recommendation: "Use with caution in mild hepatic impairment. Avoid in moderate-severe impairment due to increased exposure and hepatotoxicity risk. Monitor LFTs closely."
  },
  {
    drugPattern: "etravirine",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Etravirine has not been studied in moderate-severe hepatic impairment. Primarily hepatically metabolized.",
    recommendation: "Can be used in mild impairment without adjustment. Avoid in moderate-severe impairment due to lack of safety data."
  },
  
  // MODERATE - Protease Inhibitors (all hepatically metabolized)
  {
    drugPattern: "ritonavir",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Ritonavir is primarily hepatically metabolized. Exposure increased in hepatic impairment, increasing toxicity risk. Boosting doses may need adjustment.",
    recommendation: "Use with caution in mild impairment. Reduce dose or avoid in moderate-severe impairment. Monitor for PI toxicity. Check LFTs monthly initially."
  },
  {
    drugPattern: "lopinavir",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Lopinavir/ritonavir has not been studied in hepatic impairment. Primarily hepatically cleared, increased exposure expected.",
    recommendation: "Avoid in moderate-severe hepatic impairment. Use with caution and close monitoring in mild impairment. Consider alternative regimen."
  },
  {
    drugPattern: "atazanavir",
    hepaticLevel: ["moderate", "severe"],
    severity: "critical",
    description: "Atazanavir is CONTRAINDICATED in moderate-severe hepatic impairment (Child-Pugh B or C) per FDA labeling. Increased bilirubin and drug exposure in hepatic disease.",
    recommendation: "DO NOT use in moderate-severe hepatic impairment. Can use cautiously in mild impairment (Child-Pugh A) with close monitoring. Switch to integrase inhibitor if hepatic function declines."
  },
  {
    drugPattern: "darunavir",
    hepaticLevel: ["severe"],
    severity: "moderate",
    description: "Darunavir has not been studied in severe hepatic impairment. Caution advised in moderate impairment.",
    recommendation: "Can be used in mild-moderate impairment with monitoring. Avoid in severe impairment (Child-Pugh C). Monitor LFTs and for drug toxicity."
  },
  
  // MODERATE - Integrase Inhibitors (generally safer)
  {
    drugPattern: "raltegravir",
    hepaticLevel: [],
    severity: "minor",
    description: "Raltegravir requires no dose adjustment in hepatic impairment. Undergoes UGT1A1 metabolism. Generally safe in liver disease.",
    recommendation: "No dose adjustment needed. Preferred option for patients with hepatic impairment. Monitor LFTs as routine."
  },
  {
    drugPattern: "dolutegravir",
    hepaticLevel: ["severe"],
    severity: "minor",
    description: "Dolutegravir requires no dose adjustment for mild-moderate hepatic impairment. Not studied in severe impairment (Child-Pugh C).",
    recommendation: "No adjustment needed for mild-moderate impairment. Use with caution in severe impairment due to lack of data. Generally well-tolerated."
  },
  {
    drugPattern: "bictegravir",
    hepaticLevel: ["severe"],
    severity: "minor",
    description: "Bictegravir requires no adjustment in mild-moderate hepatic impairment. Not studied in severe impairment.",
    recommendation: "No dose adjustment for mild-moderate impairment. Avoid in severe impairment due to lack of data. Excellent hepatic safety profile."
  },
  {
    drugPattern: "elvitegravir",
    hepaticLevel: ["severe"],
    severity: "minor",
    description: "Elvitegravir exposure may be increased in severe hepatic impairment but not studied.",
    recommendation: "No adjustment for mild-moderate impairment. Use caution in severe impairment."
  },
  {
    drugPattern: "cabotegravir",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Cabotegravir long-acting has not been studied in moderate-severe hepatic impairment.",
    recommendation: "Can use in mild impairment. Avoid in moderate-severe due to lack of data and long half-life concerns."
  },
  
  // MODERATE - NRTIs (generally safe but monitor)
  {
    drugPattern: "abacavir",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Abacavir is contraindicated in moderate-severe hepatic impairment per FDA labeling. Hepatically metabolized with increased exposure in liver disease.",
    recommendation: "Reduce dose to 200mg BID in mild impairment. AVOID in moderate-severe hepatic impairment. Use alternative NRTI backbone."
  },
  {
    drugPattern: "zidovudine",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Zidovudine undergoes hepatic glucuronidation. Accumulation may occur in hepatic impairment, increasing hematologic toxicity.",
    recommendation: "Reduce dose in moderate-severe hepatic impairment. Monitor CBC closely. Consider alternative NRTI if significant liver disease."
  },
  {
    drugPattern: "tenofovir",
    hepaticLevel: [],
    severity: "minor",
    description: "Tenofovir (both TDF and TAF) requires no dose adjustment for hepatic impairment. Renally eliminated.",
    recommendation: "No hepatic dose adjustment needed. Good choice for patients with liver disease (focus on renal function instead)."
  },
  {
    drugPattern: "emtricitabine",
    hepaticLevel: [],
    severity: "minor",
    description: "Emtricitabine requires no dose adjustment in hepatic impairment. Renally cleared.",
    recommendation: "No adjustment needed. Safe in hepatic impairment (adjust for renal function only)."
  },
  {
    drugPattern: "lamivudine",
    hepaticLevel: [],
    severity: "minor",
    description: "Lamivudine requires no dose adjustment for hepatic impairment. Primarily renally eliminated.",
    recommendation: "No hepatic dose adjustment. Preferred NRTI in liver disease. Adjust for renal function only."
  },
  
  // CRITICAL - Combination products with hepatic concerns
  {
    drugPattern: "atripla",
    hepaticLevel: ["moderate", "severe"],
    severity: "critical",
    description: "Atripla contains efavirenz which is contraindicated in moderate-severe hepatic impairment.",
    recommendation: "AVOID in moderate-severe hepatic impairment. Switch to alternative regimen with drugs suitable for hepatic impairment (e.g., integrase-based)."
  },
  {
    drugPattern: "complera",
    hepaticLevel: ["severe"],
    severity: "moderate",
    description: "Complera (rilpivirine/FTC/TDF) has not been studied in severe hepatic impairment.",
    recommendation: "Avoid in severe hepatic impairment. Can use cautiously in mild-moderate impairment."
  },
  {
    drugPattern: "odefsey",
    hepaticLevel: ["severe"],
    severity: "moderate",
    description: "Odefsey (rilpivirine/FTC/TAF) not studied in severe hepatic impairment.",
    recommendation: "Avoid in severe hepatic impairment. Can use in mild-moderate with monitoring."
  },
  {
    drugPattern: "triumeq",
    hepaticLevel: ["moderate", "severe"],
    severity: "moderate",
    description: "Triumeq contains abacavir which requires dose reduction in mild and is contraindicated in moderate-severe hepatic impairment.",
    recommendation: "AVOID in moderate-severe hepatic impairment. Cannot appropriately dose-adjust fixed combination. Use individual components or alternative regimen."
  },
];

const pregnancyRules: PregnancyRule[] = [
  // CRITICAL - Contraindicated in pregnancy
  {
    drugPattern: "efavirenz",
    severity: "critical",
    description: "Efavirenz is associated with neural tube defects when used in first trimester. Previous FDA Pregnancy Category D. Should be avoided in pregnancy, especially first trimester, and in women of childbearing potential not using effective contraception.",
    recommendation: "AVOID efavirenz in pregnancy. Switch to integrase inhibitor (dolutegravir, raltegravir) or rilpivirine. If patient becomes pregnant on efavirenz after first trimester, discuss risks vs switch with specialist."
  },
  {
    drugPattern: "atripla",
    severity: "critical",
    description: "Atripla contains efavirenz which is associated with neural tube defects in first trimester pregnancy.",
    recommendation: "CONTRAINDICATED in pregnancy and women trying to conceive. Switch to pregnancy-safe regimen (integrase-based preferred: dolutegravir, raltegravir)."
  },
  {
    drugPattern: "symfi",
    severity: "critical",
    description: "Symfi contains efavirenz which should be avoided in pregnancy due to teratogenicity risk.",
    recommendation: "Do not use in pregnancy. Switch to dolutegravir-based or raltegravir-based regimen."
  },
  
  // CRITICAL - Use only if benefit outweighs risk
  {
    drugPattern: "dolutegravir",
    severity: "moderate",
    description: "Dolutegravir was initially associated with possible neural tube defects in Botswana birth surveillance study, but subsequent larger studies showed no increased risk. Now considered safe in pregnancy by WHO and DHHS. Preferred INSTI for pregnancy.",
    recommendation: "Can be used in pregnancy per current guidelines (WHO, DHHS 2023). Previously cautioned in periconception period, but recent evidence supports safety throughout pregnancy. Continue if already pregnant; acceptable to start if needed."
  },
  {
    drugPattern: "bictegravir",
    severity: "moderate",
    description: "Bictegravir has limited pregnancy data. Adequate in animal studies with no teratogenicity. Not preferred due to insufficient human data.",
    recommendation: "Avoid initiation in pregnancy due to limited data. If already on Biktarvy and pregnant, discuss switch vs continuation with specialist. Raltegravir or dolutegravir preferred."
  },
  {
    drugPattern: "cobicistat",
    severity: "moderate",
    description: "Cobicistat exposure is significantly decreased in 2nd and 3rd trimesters of pregnancy, potentially leading to virologic failure. Not recommended in pregnancy.",
    recommendation: "AVOID cobicistat-containing regimens in pregnancy. Switch boosting agent to ritonavir, or use unboosted INSTI regimen (raltegravir, dolutegravir). Risk of treatment failure."
  },
  {
    drugPattern: "genvoya",
    severity: "moderate",
    description: "Genvoya contains cobicistat which has decreased exposure in pregnancy, risking virologic failure.",
    recommendation: "Switch from Genvoya to alternative regimen before/during pregnancy. Consider Biktarvy (if data acceptable) or switch to PI/ritonavir-based or INSTI regimen."
  },
  {
    drugPattern: "stribild",
    severity: "moderate",
    description: "Stribild contains cobicistat with reduced pregnancy exposure. Increased risk of viral rebound.",
    recommendation: "Do not use in pregnancy. Switch to ritonavir-boosted regimen or unboosted INSTI."
  },
  {
    drugPattern: "symtuza",
    severity: "moderate",
    description: "Symtuza contains cobicistat which has inadequate exposure in pregnancy.",
    recommendation: "Switch to ritonavir-boosted darunavir or alternative pregnancy-appropriate regimen."
  },
  {
    drugPattern: "prezcobix",
    severity: "moderate",
    description: "Prezcobix (darunavir/cobicistat) - cobicistat component has reduced exposure in pregnancy.",
    recommendation: "Switch to darunavir/ritonavir (Prezista + Norvir) or alternative regimen for pregnancy."
  },
  {
    drugPattern: "evotaz",
    severity: "moderate",
    description: "Evotaz (atazanavir/cobicistat) - cobicistat has inadequate pregnancy exposure.",
    recommendation: "Switch to atazanavir/ritonavir or alternative pregnancy-safe regimen."
  },
  
  // PREFERRED - Pregnancy safe options
  {
    drugPattern: "raltegravir",
    severity: "minor",
    description: "Raltegravir is a PREFERRED integrase inhibitor for pregnancy per DHHS guidelines. Extensive safety data in pregnancy with favorable outcomes.",
    recommendation: "PREFERRED in pregnancy. No dose adjustment needed. Excellent safety profile. Can be continued or initiated during pregnancy."
  },
  {
    drugPattern: "tenofovir",
    severity: "minor",
    description: "Tenofovir DF (TDF) and TAF have extensive pregnancy safety data. Both are Pregnancy Category B with no evidence of harm.",
    recommendation: "Safe in pregnancy. TDF has more data and is preferred. TAF acceptable. Part of preferred NRTI backbone for pregnancy."
  },
  {
    drugPattern: "emtricitabine",
    severity: "minor",
    description: "Emtricitabine (FTC) is safe in pregnancy with extensive use and no identified risks. Pregnancy Category B.",
    recommendation: "PREFERRED in pregnancy. Continue or start as part of NRTI backbone. Excellent safety data."
  },
  {
    drugPattern: "lamivudine",
    severity: "minor",
    description: "Lamivudine (3TC) has extensive pregnancy data with excellent safety profile. Pregnancy Category B.",
    recommendation: "PREFERRED in pregnancy. Can be used as NRTI backbone. Long track record of safety."
  },
  {
    drugPattern: "abacavir",
    severity: "minor",
    description: "Abacavir is generally considered safe in pregnancy (Category C) with adequate data. Must confirm HLA-B*5701 negative.",
    recommendation: "Can be used in pregnancy if HLA-B*5701 negative. Alternative NRTI option. Monitor for hypersensitivity."
  },
  {
    drugPattern: "zidovudine",
    severity: "minor",
    description: "Zidovudine (AZT) has extensive pregnancy data (used since 1994 ACTG 076 trial). Proven to reduce mother-to-child transmission.",
    recommendation: "Safe and effective in pregnancy. Historical gold standard but less commonly used now due to side effects. Alternative if other NRTIs not tolerated."
  },
  {
    drugPattern: "atazanavir",
    severity: "minor",
    description: "Atazanavir/ritonavir is preferred protease inhibitor for pregnancy. Must use ritonavir boosting (NOT cobicistat).",
    recommendation: "PREFERRED PI in pregnancy (with ritonavir). Monitor bilirubin. Good safety and efficacy data in pregnant women."
  },
  {
    drugPattern: "darunavir",
    severity: "minor",
    description: "Darunavir/ritonavir is alternative preferred PI for pregnancy. Must use ritonavir (NOT cobicistat).",
    recommendation: "ALTERNATIVE preferred PI in pregnancy (with ritonavir). Good option if atazanavir not suitable. Growing safety data."
  },
  {
    drugPattern: "lopinavir",
    severity: "minor",
    description: "Lopinavir/ritonavir (Kaletra) is alternative PI for pregnancy with extensive safety data.",
    recommendation: "Can be used in pregnancy. Consider dose increase to 500/125mg BID in 2nd/3rd trimester due to increased clearance. Monitor viral load."
  },
];

const hlaRules: HLARule[] = [
  {
    drugPattern: "abacavir",
    severity: "critical",
    description: "Abacavir causes severe, potentially fatal hypersensitivity reaction in patients with HLA-B*5701 positive allele (sensitivity 100%, specificity 96%). Presents with fever, rash, GI symptoms, respiratory symptoms. Can be FATAL on re-challenge.",
    recommendation: "CONTRAINDICATED if HLA-B*5701 positive. Must confirm negative HLA-B*5701 status before prescribing abacavir. NEVER rechallenge if hypersensitivity suspected. Immediately discontinue if symptoms develop."
  },
  {
    drugPattern: "triumeq",
    severity: "critical",
    description: "Triumeq contains abacavir which causes severe hypersensitivity in HLA-B*5701 positive patients. Fatal reactions reported.",
    recommendation: "CONTRAINDICATED if HLA-B*5701 positive. Must document negative HLA-B*5701 test before prescribing. Use alternative triple combination if positive."
  },
  {
    drugPattern: "epzicom",
    severity: "critical",
    description: "Epzicom contains abacavir - risk of fatal hypersensitivity reaction in HLA-B*5701 positive patients.",
    recommendation: "CONTRAINDICATED if HLA-B*5701 positive. Confirm negative genetic test before prescribing. Use Descovy or Truvada as alternative."
  },
  {
    drugPattern: "trizivir",
    severity: "critical",
    description: "Trizivir contains abacavir which is contraindicated in HLA-B*5701 positive patients.",
    recommendation: "DO NOT use if HLA-B*5701 positive. Requires genetic testing before initiation."
  },
];

export function checkHepaticPregnancyFunction(
  selectedDrugs: string[],
  hepaticFunction: "normal" | "mild" | "moderate" | "severe",
  pregnancy: "yes" | "no" | "unknown",
  hlab5701: "positive" | "negative" | "unknown"
): HepaticPregnancyAlert[] {
  const alerts: HepaticPregnancyAlert[] = [];

  for (const drugId of selectedDrugs) {
    const normalizedDrugId = drugId.toLowerCase().replace(/_/g, "");

    // Check hepatic function
    if (hepaticFunction !== "normal") {
      for (const rule of hepaticRules) {
        const normalizedPattern = rule.drugPattern.toLowerCase().replace(/[_\s-]/g, "");
        
        if (normalizedDrugId.includes(normalizedPattern)) {
          if (!rule.hepaticLevel || rule.hepaticLevel.length === 0) {
            // Info alert for generally safe drugs
            if (rule.severity === "minor") {
              alerts.push({
                medication: drugId,
                category: "hepatic",
                severity: rule.severity,
                description: `Hepatic function: ${hepaticFunction}. ${rule.description}`,
                recommendation: rule.recommendation,
              });
            }
          } else if (rule.hepaticLevel.includes(hepaticFunction)) {
            alerts.push({
              medication: drugId,
              category: "hepatic",
              severity: rule.severity,
              description: `Hepatic function: ${hepaticFunction}. ${rule.description}`,
              recommendation: rule.recommendation,
            });
          }
        }
      }
    }

    // Check pregnancy
    if (pregnancy === "yes" || pregnancy === "unknown") {
      for (const rule of pregnancyRules) {
        const normalizedPattern = rule.drugPattern.toLowerCase().replace(/[_\s-]/g, "");
        
        if (normalizedDrugId.includes(normalizedPattern)) {
          const prefix = pregnancy === "yes" ? "Patient is pregnant." : "Pregnancy status unknown.";
          alerts.push({
            medication: drugId,
            category: "pregnancy",
            severity: rule.severity,
            description: `${prefix} ${rule.description}`,
            recommendation: rule.recommendation,
          });
        }
      }
    }

    // Check HLA-B*5701
    if (hlab5701 === "positive") {
      for (const rule of hlaRules) {
        const normalizedPattern = rule.drugPattern.toLowerCase().replace(/[_\s-]/g, "");
        
        if (normalizedDrugId.includes(normalizedPattern)) {
          alerts.push({
            medication: drugId,
            category: "hlab5701",
            severity: rule.severity,
            description: `HLA-B*5701 POSITIVE. ${rule.description}`,
            recommendation: rule.recommendation,
          });
        }
      }
    }
  }

  return alerts;
}
