export type ClinicalRecommendation = {
  category: "oi_prophylaxis" | "viral_load" | "immunization" | "adherence";
  priority: "critical" | "important" | "routine";
  title: string;
  description: string;
  recommendation: string;
};

export function generateClinicalRecommendations(
  cd4Count: number | undefined,
  viralLoad: number | undefined,
  treatmentStatus: "naive" | "experienced"
): ClinicalRecommendation[] {
  const recommendations: ClinicalRecommendation[] = [];

  // OI Prophylaxis Recommendations (CD4-based)
  if (cd4Count !== undefined) {
    // PCP Prophylaxis (CD4 <200)
    if (cd4Count < 200) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "critical",
        title: "PCP Prophylaxis Required",
        description: `CD4 count is ${cd4Count} cells/μL, which is below 200. Patient is at high risk for Pneumocystis jirovecii pneumonia (PCP).`,
        recommendation: "INITIATE PCP prophylaxis immediately. Preferred: TMP-SMX DS (160/800mg) 1 tablet PO daily OR 1 tablet PO three times weekly. Alternatives if sulfa allergy: Dapsone 100mg PO daily (screen for G6PD deficiency first) OR Atovaquone 1500mg PO daily with food OR Aerosolized pentamidine 300mg monthly via Respigard II nebulizer. Continue prophylaxis until CD4 >200 for ≥3 months on ART with undetectable viral load."
      });
    } else if (cd4Count >= 200 && cd4Count < 250) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "important",
        title: "Monitor for PCP Prophylaxis Need",
        description: `CD4 count is ${cd4Count} cells/μL, approaching the threshold for PCP prophylaxis (CD4 <200).`,
        recommendation: "Monitor CD4 count closely. Initiate PCP prophylaxis if CD4 declines below 200 cells/μL or if patient develops PCP-related symptoms (fever, cough, dyspnea). Consider prophylaxis if CD4% <14% even if absolute count >200."
      });
    }

    // MAC Prophylaxis (CD4 <50)
    if (cd4Count < 50) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "critical",
        title: "MAC Prophylaxis Required",
        description: `CD4 count is ${cd4Count} cells/μL, which is below 50. Patient is at high risk for disseminated Mycobacterium avium complex (MAC).`,
        recommendation: "INITIATE MAC prophylaxis immediately. Preferred: Azithromycin 1200mg PO once weekly (better tolerability) OR 600mg PO twice weekly. Alternative: Clarithromycin 500mg PO BID (more drug interactions). Rule out active MAC disease before starting prophylaxis (mycobacterial blood cultures). Continue until CD4 >100 for ≥3 months on ART with undetectable viral load."
      });
    } else if (cd4Count >= 50 && cd4Count < 100) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "important",
        title: "Monitor for MAC Prophylaxis Need",
        description: `CD4 count is ${cd4Count} cells/μL, approaching the threshold for MAC prophylaxis (CD4 <50).`,
        recommendation: "Monitor CD4 count closely. Initiate MAC prophylaxis if CD4 declines below 50 cells/μL. Rule out active disseminated MAC (blood cultures, clinical symptoms) before starting prophylaxis."
      });
    }

    // Toxoplasmosis Prophylaxis (CD4 <100 AND seropositive)
    if (cd4Count < 100) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "important",
        title: "Toxoplasmosis Prophylaxis Consideration",
        description: `CD4 count is ${cd4Count} cells/μL, which is below 100. If patient is Toxoplasma IgG seropositive, they are at risk for CNS toxoplasmosis.`,
        recommendation: "CHECK Toxoplasma IgG serology if unknown. If POSITIVE, initiate prophylaxis. TMP-SMX DS (160/800mg) 1 tablet PO daily provides dual coverage for both PCP and toxoplasmosis (preferred). If sulfa allergy: Dapsone 50mg PO daily PLUS Pyrimethamine 50mg PO weekly PLUS Leucovorin 25mg PO weekly. Alternative: Atovaquone 1500mg PO daily with food. Continue until CD4 >200 for ≥3 months."
      });
    }

    // Positive Clinical Sign - Immune Reconstitution
    if (cd4Count >= 200 && cd4Count < 350) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "routine",
        title: "Immune Reconstitution In Progress",
        description: `CD4 count is ${cd4Count} cells/μL, indicating immune recovery. No OI prophylaxis required at this level.`,
        recommendation: "Continue ART to achieve immune reconstitution. Monitor for IRIS (immune reconstitution inflammatory syndrome) if recently started ART. Discontinue OI prophylaxis if previously on prophylaxis and CD4 has been >200 for ≥3 months with undetectable viral load."
      });
    }

    // Healthy Immune Function
    if (cd4Count >= 500) {
      recommendations.push({
        category: "oi_prophylaxis",
        priority: "routine",
        title: "Excellent Immune Function",
        description: `CD4 count is ${cd4Count} cells/μL, indicating excellent immune function. No opportunistic infection prophylaxis required.`,
        recommendation: "No OI prophylaxis needed. Continue current ART regimen. Routine monitoring as per guidelines (CD4 optional once durably suppressed with CD4 >500)."
      });
    }
  }

  // Viral Load Assessment
  if (viralLoad !== undefined) {
    if (viralLoad === 0 || viralLoad < 20) {
      recommendations.push({
        category: "viral_load",
        priority: "routine",
        title: "Virologic Suppression Achieved",
        description: `HIV RNA is undetectable (<20 copies/mL). Excellent virologic response to therapy.`,
        recommendation: "Continue current ART regimen - excellent adherence and response. Monitor viral load every 3-6 months. Continue to reinforce adherence. Patient is at minimal risk of disease progression and transmission (U=U: Undetectable = Untransmittable)."
      });
    } else if (viralLoad >= 20 && viralLoad < 200) {
      recommendations.push({
        category: "viral_load",
        priority: "important",
        title: "Low-Level Viremia (Blip)",
        description: `HIV RNA is ${viralLoad} copies/mL. Detectable but low-level viremia may represent a transient blip or early treatment failure.`,
        recommendation: "REPEAT viral load in 4 weeks to distinguish blip from true virologic failure. Assess adherence barriers (missed doses, food requirements, drug interactions, pharmacy access). If viral load confirmed >200 copies/mL on repeat, consider resistance testing and regimen modification. Reinforce adherence counseling."
      });
    } else if (viralLoad >= 200 && viralLoad < 1000) {
      recommendations.push({
        category: "viral_load",
        priority: "critical",
        title: "Virologic Failure - Action Required",
        description: `HIV RNA is ${viralLoad} copies/mL, confirming virologic failure. Risk of resistance development and disease progression.`,
        recommendation: "VIROLOGIC FAILURE confirmed. URGENT: (1) Assess adherence - conduct comprehensive adherence assessment and address barriers. (2) Review drug interactions and appropriate dosing. (3) Order HIV genotypic resistance testing while patient is on current regimen. (4) DO NOT stop current regimen until resistance results available and new regimen selected. (5) Consult HIV specialist for regimen optimization. Address immediately to prevent resistance accumulation."
      });
    } else {
      // viralLoad >= 1000
      const isHighVL = viralLoad > 100000;
      recommendations.push({
        category: "viral_load",
        priority: "critical",
        title: isHighVL ? "High Viremia - Treatment Urgent" : "Virologic Failure - Action Required",
        description: `HIV RNA is ${viralLoad} copies/mL. ${isHighVL ? "Very high viral load indicating" : "Elevated viral load confirming"} ${treatmentStatus === "naive" ? "need for ART initiation" : "virologic failure"}.`,
        recommendation: treatmentStatus === "naive" 
          ? `INITIATE ART IMMEDIATELY. High viral load increases risk of transmission and disease progression. Start regimen today if possible (same-day ART initiation). Baseline resistance testing recommended in treatment-naive patients, especially if transmitted drug resistance suspected, but do not delay treatment. Preferred regimens: Biktarvy, Dovato, or boosted darunavir + FTC/TDF. Provide adherence counseling and ensure follow-up in 2-4 weeks.`
          : `CRITICAL VIROLOGIC FAILURE. Immediate action required: (1) Comprehensive adherence assessment - identify and address all barriers to adherence. (2) Review for drug interactions, malabsorption, or dosing errors. (3) Order HIV genotypic AND phenotypic resistance testing ASAP (if viral load >500-1000). (4) Continue current regimen until resistance results return and new regimen available (stopping creates resistance risk). (5) URGENT HIV specialist consultation - patient needs expert management for treatment optimization. Consider directly observed therapy (DOT) if severe adherence issues.`
      });
    }

    // Special case: Treatment-experienced with suppressed VL
    if (treatmentStatus === "experienced" && viralLoad < 50) {
      recommendations.push({
        category: "adherence",
        priority: "routine",
        title: "Durably Suppressed - Adherence Success",
        description: "Patient is treatment-experienced with undetectable viral load, demonstrating excellent long-term adherence and treatment response.",
        recommendation: "Congratulate patient on excellent adherence. Continue current regimen. Routine monitoring every 3-6 months. Consider simplified regimens if interested (2-drug regimens like Dovato). Continue U=U counseling for prevention."
      });
    }
  }

  // Immunization Recommendations (General for PLWH)
  // These are general recommendations - not CD4 dependent in most cases
  recommendations.push({
    category: "immunization",
    priority: "important",
    title: "Recommended Immunizations for PLWH",
    description: "People living with HIV require specific immunizations to prevent vaccine-preventable diseases, with timing based on CD4 count.",
    recommendation: `REVIEW and UPDATE immunization status:

ROUTINE VACCINES (Give if not up to date):
• COVID-19: Updated vaccine annually or as recommended
• Influenza: Inactivated vaccine annually (avoid live attenuated)
• Pneumococcal: PCV20 (single dose) OR PCV15 + PPSV23 (1 year later)
  - If prior PPSV23 only: Give PCV (PCV15 or PCV20) ≥1 year after
• Tdap: Once, then Td booster every 10 years
• HPV: 3-dose series if age 26 years or younger (consider up to age 45)
• Hepatitis A: 2-dose series if not immune (especially if HCV+, MSM, IVDU)
• Hepatitis B: 3-dose series if not immune; check anti-HBs after series
• Meningococcal: MenACWY + MenB series
• Herpes Zoster (Shingrix): 2 doses ≥2 months apart if age ≥50 years${cd4Count && cd4Count >= 200 ? " [Can give now - CD4 ≥200]" : cd4Count && cd4Count < 200 ? " [Consider delaying until CD4 ≥200 for better response]" : ""}

TRAVEL VACCINES: Consider based on destination

LIVE VACCINES: 
${cd4Count && cd4Count >= 200 ? "✓ Can administer MMR, Varicella, Zoster if needed (CD4 ≥200)" : cd4Count && cd4Count < 200 ? "✗ CONTRAINDICATED - CD4 <200 (defer MMR, Varicella, live Zoster)" : "• Assess CD4 count - MMR, Varicella, live Zoster only if CD4 ≥200"}

• Coordinate with primary care provider or ID specialist for immunization review.`
  });

  return recommendations;
}
