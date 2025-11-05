import { type DrugInteraction } from "@shared/schema";

export type InteractionRule = {
  drug1Pattern: string;
  drug2Pattern: string;
  severity: "critical" | "moderate" | "minor";
  description: string;
  recommendation: string;
};

// Evidence-based drug interactions from FDA labels, DHHS guidelines, and clinical literature
const interactionRules: InteractionRule[] = [
  // CRITICAL INTERACTIONS - Protease Inhibitors / CYP3A4 Inhibitors + Corticosteroids
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Ritonavir significantly increases fluticasone levels (up to 350-fold AUC increase) through potent CYP3A4 inhibition, leading to systemic corticosteroid effects including Cushing's syndrome and adrenal suppression.",
    recommendation: "AVOID combination. Use beclomethasone (not CYP3A4 metabolized) as safer alternative. If unavoidable, use lowest fluticasone dose and monitor for Cushingoid features, weight gain, adrenal suppression."
  },
  {
    drug1Pattern: "lopinavir",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Lopinavir/ritonavir causes significant increases in fluticasone exposure through CYP3A4 inhibition. Multiple cases of iatrogenic Cushing's syndrome reported.",
    recommendation: "AVOID combination. Switch to beclomethasone inhaler/nasal spray. If combination necessary, use minimum effective fluticasone dose with close monitoring for systemic corticosteroid effects."
  },
  {
    drug1Pattern: "darunavir",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Darunavir/ritonavir or darunavir/cobicistat increases fluticasone levels dramatically, risking Cushing's syndrome and adrenal insufficiency.",
    recommendation: "AVOID concurrent use. Recommend beclomethasone as alternative corticosteroid. Monitor for cushingoid features if combination unavoidable."
  },
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Atazanavir (especially when boosted with ritonavir or cobicistat) significantly increases fluticasone exposure through CYP3A4 inhibition.",
    recommendation: "Avoid combination. Use beclomethasone instead. If fluticasone required, consider switching to unboosted integrase inhibitor regimen."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Cobicistat is a potent CYP3A4 inhibitor that markedly increases fluticasone levels, causing systemic corticosteroid adverse effects including Cushing's syndrome.",
    recommendation: "Contraindicated per FDA labeling. Switch to beclomethasone or alternative non-CYP3A4 metabolized corticosteroid."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Ritonavir increases budesonide exposure, with documented cases of Cushing's syndrome and adrenal suppression. Less severe than fluticasone but still significant risk.",
    recommendation: "Avoid if possible. Beclomethasone preferred. If budesonide necessary, use lowest effective dose and monitor for systemic corticosteroid effects."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Cobicistat significantly increases budesonide levels through potent CYP3A4 inhibition, risking Cushing's syndrome and adrenal suppression.",
    recommendation: "Avoid concurrent use per guidelines. Switch to beclomethasone as safer alternative. Monitor for cushingoid features if combination unavoidable."
  },
  {
    drug1Pattern: "lopinavir",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Lopinavir/ritonavir increases budesonide exposure significantly, with case reports of iatrogenic Cushing's syndrome.",
    recommendation: "Avoid combination. Use beclomethasone instead. If unavoidable, use minimum effective budesonide dose with close monitoring."
  },
  {
    drug1Pattern: "darunavir",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Darunavir (when boosted with ritonavir or cobicistat) significantly increases budesonide levels through CYP3A4 inhibition.",
    recommendation: "Avoid concurrent use. Switch to beclomethasone inhaler/nasal spray as preferred alternative."
  },
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Boosted atazanavir increases budesonide exposure through CYP3A4 inhibition, risking systemic corticosteroid effects.",
    recommendation: "Avoid combination. Use beclomethasone as alternative. Monitor for Cushing's if budesonide required."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Ritonavir may increase mometasone levels through CYP3A4 inhibition, potentially causing systemic corticosteroid effects.",
    recommendation: "Use with caution. Monitor for cushingoid features. Beclomethasone is safer alternative."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Cobicistat increases mometasone exposure through CYP3A4 inhibition, potentially causing systemic corticosteroid adverse effects.",
    recommendation: "Use with caution or avoid. Beclomethasone preferred. Monitor for weight gain, moon facies, other cushingoid features."
  },
  {
    drug1Pattern: "darunavir",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Boosted darunavir may increase mometasone levels, increasing risk of systemic corticosteroid effects.",
    recommendation: "Consider beclomethasone as alternative. If mometasone used, monitor for cushingoid symptoms."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "flonase",
    severity: "critical",
    description: "Flonase (fluticasone nasal spray) with ritonavir can cause iatrogenic Cushing's syndrome. Ritonavir increases fluticasone levels up to 350-fold.",
    recommendation: "AVOID. Multiple case reports of Cushing's syndrome. Switch to beclomethasone nasal spray as safer alternative."
  },
  
  // CRITICAL - Protease Inhibitors + Proton Pump Inhibitors
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "omeprazole",
    severity: "critical",
    description: "Proton pump inhibitors significantly reduce atazanavir absorption and plasma concentrations (pH-dependent), potentially leading to treatment failure and viral resistance.",
    recommendation: "AVOID concurrent use. If acid suppression needed, use H2 antagonist at least 12 hours apart from atazanavir, or consider alternative PI."
  },
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "pantoprazole",
    severity: "critical",
    description: "PPIs reduce atazanavir absorption. Pantoprazole decreases atazanavir AUC by approximately 76%.",
    recommendation: "Avoid concurrent use. Consider H2 antagonist as alternative, administered 12+ hours apart from atazanavir."
  },
  {
    drug1Pattern: "atazanavir",
    drug2Pattern: "esomeprazole",
    severity: "critical",
    description: "Esomeprazole and other PPIs significantly decrease atazanavir levels through gastric pH elevation, risking virologic failure.",
    recommendation: "Contraindicated. Use H2 antagonists if acid suppression required, with appropriate timing separation."
  },
  {
    drug1Pattern: "rilpivirine",
    drug2Pattern: "omeprazole",
    severity: "critical",
    description: "PPIs significantly reduce rilpivirine absorption (requires acidic pH). Concurrent use may lead to virologic failure.",
    recommendation: "CONTRAINDICATED per FDA label. Antacids or H2 antagonists with appropriate timing may be alternatives."
  },
  {
    drug1Pattern: "rilpivirine",
    drug2Pattern: "pantoprazole",
    severity: "critical",
    description: "Pantoprazole and other PPIs reduce rilpivirine exposure, potentially causing loss of virologic response.",
    recommendation: "Avoid combination. If acid suppression needed, use antacids (separated by 2+ hours) or H2 antagonists (12+ hours before rilpivirine)."
  },

  // MODERATE/CRITICAL - Integrase Inhibitors + Metformin
  {
    drug1Pattern: "dolutegravir",
    drug2Pattern: "metformin",
    severity: "moderate",
    description: "Dolutegravir inhibits renal OCT2 transporters, increasing metformin levels. Metformin AUC increases approximately 79% with standard dolutegravir dosing.",
    recommendation: "Monitor for metformin-related adverse effects (GI symptoms, lactic acidosis risk). Consider metformin dose reduction if needed. Monitor renal function and lactate levels in patients at risk."
  },
  {
    drug1Pattern: "bictegravir",
    drug2Pattern: "metformin",
    severity: "moderate",
    description: "Bictegravir inhibits renal OCT2 and MATE1 transporters, potentially increasing metformin exposure and risk of adverse effects.",
    recommendation: "Monitor for metformin toxicity. Consider dose reduction if GI side effects occur. Check renal function and lactate in high-risk patients."
  },

  // MODERATE/CRITICAL - Protease Inhibitors + Statins
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "simvastatin",
    severity: "critical",
    description: "Ritonavir dramatically increases simvastatin levels (AUC increased >30-fold) through CYP3A4 inhibition, significantly increasing risk of myopathy and rhabdomyolysis.",
    recommendation: "CONTRAINDICATED per FDA labeling. Use pravastatin or rosuvastatin (minimal CYP3A4 metabolism) as alternatives."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "lovastatin",
    severity: "critical",
    description: "Ritonavir significantly increases lovastatin levels through CYP3A4 inhibition, greatly increasing myopathy/rhabdomyolysis risk.",
    recommendation: "CONTRAINDICATED. Switch to pravastatin, rosuvastatin, or pitavastatin (non-CYP3A4 metabolized)."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Ritonavir increases atorvastatin AUC by approximately 450% through CYP3A4 inhibition, increasing myopathy risk.",
    recommendation: "Use lowest atorvastatin dose (usually 10mg). Monitor for muscle pain/weakness, CK levels. Consider switching to pravastatin or rosuvastatin."
  },
  {
    drug1Pattern: "darunavir",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Darunavir/ritonavir or darunavir/cobicistat increases atorvastatin levels, increasing risk of myopathy and rhabdomyolysis.",
    recommendation: "Start with lowest atorvastatin dose (10mg max recommended). Monitor for muscle symptoms. Rosuvastatin may be safer alternative."
  },
  {
    drug1Pattern: "lopinavir",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Lopinavir/ritonavir significantly increases atorvastatin exposure (AUC increased 5-6 fold), increasing myopathy risk.",
    recommendation: "Use atorvastatin with caution at lowest dose (10mg). Consider pravastatin or rosuvastatin. Monitor for muscle pain/weakness."
  },
  {
    drug1Pattern: "efavirenz",
    drug2Pattern: "atorvastatin",
    severity: "moderate",
    description: "Efavirenz decreases atorvastatin levels (43% AUC decrease) through CYP3A4 induction, potentially reducing lipid-lowering efficacy.",
    recommendation: "May need to increase atorvastatin dose. Monitor lipid levels and adjust dose accordingly. Clinical effect may be reduced."
  },

  // MODERATE - Protease Inhibitors + Erectile Dysfunction Drugs
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "sildenafil",
    severity: "moderate",
    description: "Ritonavir significantly increases sildenafil levels (11-fold AUC increase for single dose) through CYP3A4 inhibition, increasing risk of hypotension, visual changes, and priapism.",
    recommendation: "Reduce sildenafil dose to 25mg every 48 hours maximum. Monitor for hypotension, visual disturbances. Do NOT exceed recommended dose."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "tadalafil",
    severity: "moderate",
    description: "Ritonavir increases tadalafil exposure significantly through CYP3A4 inhibition.",
    recommendation: "For erectile dysfunction: maximum tadalafil 10mg every 72 hours. For pulmonary hypertension: avoid or consult specialist for dosing."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "vardenafil",
    severity: "moderate",
    description: "Ritonavir markedly increases vardenafil levels, increasing risk of cardiovascular adverse effects.",
    recommendation: "Maximum vardenafil dose 2.5mg every 72 hours. Monitor for hypotension and QT prolongation."
  },

  // MODERATE - NRTIs + Other Medications
  {
    drug1Pattern: "tenofovir",
    drug2Pattern: "nsaid",
    severity: "moderate",
    description: "Concurrent use of tenofovir (TDF or TAF) with NSAIDs may increase risk of renal toxicity through additive nephrotoxic effects.",
    recommendation: "Monitor renal function closely (SCr, eGFR, urinalysis). Avoid prolonged NSAID use if possible. Consider alternative analgesics."
  },
  {
    drug1Pattern: "tenofovir",
    drug2Pattern: "ibuprofen",
    severity: "moderate",
    description: "NSAIDs like ibuprofen may increase risk of renal dysfunction when combined with tenofovir.",
    recommendation: "Monitor renal function. Limit NSAID duration. Use lowest effective dose. Consider acetaminophen as alternative."
  },
  {
    drug1Pattern: "tenofovir",
    drug2Pattern: "naproxen",
    severity: "moderate",
    description: "Naproxen may enhance nephrotoxic effects of tenofovir, particularly in patients with underlying renal disease or risk factors.",
    recommendation: "Monitor renal function regularly. Avoid chronic NSAID use. Use alternative analgesics when possible."
  },

  // MINOR/MODERATE - NNRTIs + Other Medications
  {
    drug1Pattern: "abacavir",
    drug2Pattern: "methadone",
    severity: "minor",
    description: "Abacavir may decrease methadone levels through enzyme induction, potentially causing opioid withdrawal symptoms.",
    recommendation: "Monitor for withdrawal symptoms (sweating, anxiety, drug craving). May need to increase methadone dose. Titrate based on clinical response."
  },
  {
    drug1Pattern: "efavirenz",
    drug2Pattern: "voriconazole",
    severity: "critical",
    description: "Bidirectional interaction: efavirenz decreases voriconazole levels (61% decrease) while voriconazole increases efavirenz levels, with potential for treatment failure and toxicity.",
    recommendation: "Avoid concurrent use. If unavoidable, adjust both medications: increase voriconazole to 400mg q12h and decrease efavirenz to 300mg daily. Monitor levels if available."
  },
  {
    drug1Pattern: "efavirenz",
    drug2Pattern: "methadone",
    severity: "moderate",
    description: "Efavirenz decreases methadone levels (approximately 50% reduction) through CYP enzyme induction, potentially causing withdrawal.",
    recommendation: "Monitor for opioid withdrawal symptoms. Increase methadone dose as needed based on clinical assessment. May require 20-30% dose increase."
  },
  {
    drug1Pattern: "efavirenz",
    drug2Pattern: "warfarin",
    severity: "moderate",
    description: "Efavirenz may alter warfarin metabolism (both CYP2C9 inhibition and induction effects), causing unpredictable INR changes.",
    recommendation: "Monitor INR closely when starting, stopping, or changing efavirenz dose. Adjust warfarin dose based on INR response."
  },

  // CRITICAL - General CYP3A4 Interactions
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "midazolam",
    severity: "critical",
    description: "Ritonavir dramatically increases oral midazolam levels (27-fold AUC increase), causing prolonged/profound sedation and respiratory depression.",
    recommendation: "Oral midazolam CONTRAINDICATED with ritonavir. For procedural sedation, use reduced IV doses with extended monitoring, or use alternative sedatives."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "triazolam",
    severity: "critical",
    description: "Ritonavir significantly increases triazolam levels through CYP3A4 inhibition, causing severe prolonged sedation.",
    recommendation: "CONTRAINDICATED per FDA labeling. Use alternative benzodiazepines not metabolized by CYP3A4 (lorazepam, temazepam, oxazepam)."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "fentanyl",
    severity: "critical",
    description: "Ritonavir increases fentanyl levels, increasing risk of fatal respiratory depression. Effect may be prolonged.",
    recommendation: "Use with extreme caution. Monitor respiratory rate closely. Consider alternative analgesics. Reduce fentanyl dose and extend dosing interval."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "rifampin",
    severity: "critical",
    description: "Rifampin dramatically decreases protease inhibitor levels through potent CYP3A4 induction, leading to virologic failure and resistance.",
    recommendation: "AVOID combination. Use rifabutin instead with appropriate dose adjustments (reduce rifabutin to 150mg 3x/week or daily based on PI). Or consider integrase inhibitor-based regimen."
  },
  {
    drug1Pattern: "protease inhibitor",
    drug2Pattern: "rifampin",
    severity: "critical",
    description: "Rifampin significantly decreases protease inhibitor levels through CYP3A4 induction, risking treatment failure.",
    recommendation: "Contraindicated. Substitute rifabutin with dose adjustment, or switch to integrase inhibitor-based HIV regimen if tuberculosis treatment needed."
  },

  // Combination products interactions - Corticosteroids
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Genvoya contains cobicistat (CYP3A4 inhibitor) which dramatically increases fluticasone levels, risking Cushing's syndrome.",
    recommendation: "Avoid combination. Use beclomethasone as alternative corticosteroid."
  },
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Genvoya (elvitegravir/cobicistat) increases budesonide exposure significantly through CYP3A4 inhibition.",
    recommendation: "Avoid concurrent use. Switch to beclomethasone. Monitor for cushingoid features if unavoidable."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Symtuza contains darunavir/cobicistat which significantly increases fluticasone exposure through CYP3A4 inhibition.",
    recommendation: "Contraindicated. Switch to beclomethasone inhaler or nasal spray."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Symtuza (darunavir/cobicistat/FTC/TAF) dramatically increases budesonide levels, risking Cushing's syndrome.",
    recommendation: "Avoid combination per DHHS guidelines. Use beclomethasone as safer alternative."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Stribild contains cobicistat which significantly increases fluticasone levels through potent CYP3A4 inhibition.",
    recommendation: "Contraindicated. Switch to beclomethasone inhaler or nasal spray."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Stribild (elvitegravir/cobicistat/FTC/TDF) increases budesonide exposure, risking systemic corticosteroid effects.",
    recommendation: "Avoid concurrent use. Beclomethasone is preferred alternative."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Prezcobix (darunavir/cobicistat) dramatically increases fluticasone levels, risking Cushing's syndrome and adrenal suppression.",
    recommendation: "Contraindicated. Use beclomethasone inhaler or nasal spray instead."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Prezcobix (darunavir/cobicistat) significantly increases budesonide exposure through CYP3A4 inhibition.",
    recommendation: "Avoid combination. Switch to beclomethasone as safer corticosteroid alternative."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Evotaz (atazanavir/cobicistat) significantly increases fluticasone levels, risking Cushing's syndrome.",
    recommendation: "Contraindicated. Switch to beclomethasone inhaler or nasal spray."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Evotaz (atazanavir/cobicistat) increases budesonide exposure through CYP3A4 inhibition.",
    recommendation: "Avoid concurrent use. Use beclomethasone as alternative corticosteroid."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "fluticasone",
    severity: "critical",
    description: "Kaletra (lopinavir/ritonavir) dramatically increases fluticasone levels with multiple case reports of Cushing's syndrome.",
    recommendation: "Contraindicated per FDA labeling. Switch to beclomethasone. Monitor closely if combination unavoidable."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "budesonide",
    severity: "critical",
    description: "Kaletra (lopinavir/ritonavir) significantly increases budesonide exposure, risking systemic corticosteroid effects.",
    recommendation: "Avoid combination. Use beclomethasone inhaler or nasal spray as safer alternative."
  },
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Genvoya (elvitegravir/cobicistat) may increase mometasone levels through CYP3A4 inhibition, risking systemic corticosteroid effects.",
    recommendation: "Use with caution or avoid. Beclomethasone preferred. Monitor for cushingoid features."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Symtuza (darunavir/cobicistat) may increase mometasone exposure, potentially causing systemic corticosteroid adverse effects.",
    recommendation: "Consider beclomethasone as alternative. If mometasone used, monitor for weight gain and cushingoid symptoms."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Stribild (elvitegravir/cobicistat) increases mometasone levels through CYP3A4 inhibition.",
    recommendation: "Use with caution. Beclomethasone is safer alternative. Monitor for systemic corticosteroid effects."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Prezcobix (darunavir/cobicistat) may increase mometasone exposure through potent CYP3A4 inhibition.",
    recommendation: "Avoid if possible. Use beclomethasone as safer alternative. Monitor for cushingoid features if mometasone required."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Evotaz (atazanavir/cobicistat) increases mometasone levels, potentially causing systemic corticosteroid effects.",
    recommendation: "Use with caution or avoid. Beclomethasone preferred. Monitor for weight gain, moon facies."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "mometasone",
    severity: "moderate",
    description: "Kaletra (lopinavir/ritonavir) may increase mometasone exposure through CYP3A4 inhibition.",
    recommendation: "Consider beclomethasone as alternative. Monitor for systemic corticosteroid effects if mometasone used."
  },
  
  // Additional Corticosteroids - Critical Interactions
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: ritonavir may increase dexamethasone levels (CYP3A4 substrate), while dexamethasone decreases ritonavir levels (CYP3A4 inducer).",
    recommendation: "Use with caution. Monitor for both cushingoid features and HIV viral load. Consider alternative corticosteroid or HIV regimen."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Ritonavir significantly increases triamcinolone levels through CYP3A4 inhibition. Systemic effects reported even with injectable/intra-articular administration.",
    recommendation: "Avoid concurrent use. Even injectable/intra-articular triamcinolone can cause systemic effects. Consider alternative corticosteroids."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Ritonavir may increase prednisone/prednisolone levels through CYP3A4 inhibition, increasing risk of systemic corticosteroid effects.",
    recommendation: "Use lowest effective prednisone dose. Monitor for cushingoid features, hyperglycemia, hypertension. May need dose reduction."
  },
  {
    drug1Pattern: "ritonavir",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Ritonavir increases methylprednisolone levels through CYP3A4 inhibition, potentially causing systemic corticosteroid toxicity.",
    recommendation: "Reduce methylprednisolone dose. Monitor for systemic effects. Consider alternative corticosteroid less dependent on CYP3A4."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: cobicistat increases dexamethasone levels while dexamethasone may decrease cobicistat/ARV levels through enzyme induction.",
    recommendation: "Avoid combination. Use alternative corticosteroid or HIV regimen without cobicistat."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Cobicistat significantly increases triamcinolone exposure through CYP3A4 inhibition. Risk of systemic effects even with non-oral routes.",
    recommendation: "Avoid concurrent use including injectable and intra-articular formulations. Use alternative corticosteroid."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Cobicistat may increase prednisone levels through CYP3A4 inhibition, increasing risk of adrenal suppression and cushingoid features.",
    recommendation: "Use lowest effective dose. Monitor for systemic corticosteroid effects. Consider dose reduction."
  },
  {
    drug1Pattern: "cobicistat",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Cobicistat increases methylprednisolone exposure through CYP3A4 inhibition, potentially causing systemic corticosteroid toxicity.",
    recommendation: "Reduce methylprednisolone dose. Monitor for cushingoid features and systemic effects."
  },

  // Systemic corticosteroids with boosted combination products
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Genvoya (elvitegravir/cobicistat) significantly increases triamcinolone levels. Systemic effects may occur even with non-oral formulations.",
    recommendation: "Avoid concurrent use including injectable and intra-articular formulations. Consider alternative corticosteroid."
  },
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: Genvoya increases dexamethasone levels while dexamethasone may decrease elvitegravir/cobicistat levels.",
    recommendation: "Avoid combination. Use alternative corticosteroid or HIV regimen."
  },
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Genvoya (elvitegravir/cobicistat) may increase prednisone levels through CYP3A4 inhibition.",
    recommendation: "Use lowest effective dose. Monitor for systemic corticosteroid effects."
  },
  {
    drug1Pattern: "genvoya",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Genvoya increases methylprednisolone exposure through cobicistat's CYP3A4 inhibition.",
    recommendation: "Reduce methylprednisolone dose. Monitor for cushingoid features."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Symtuza (darunavir/cobicistat) significantly increases triamcinolone levels. Risk of systemic effects even with injectable forms.",
    recommendation: "Avoid concurrent use. Use alternative corticosteroid not dependent on CYP3A4."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: Symtuza increases dexamethasone while dexamethasone may decrease darunavir levels.",
    recommendation: "Avoid combination. Consider alternative corticosteroid or HIV regimen."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Symtuza (darunavir/cobicistat) may increase prednisone exposure through CYP3A4 inhibition.",
    recommendation: "Use lowest effective dose. Monitor for systemic corticosteroid effects and hyperglycemia."
  },
  {
    drug1Pattern: "symtuza",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Symtuza increases methylprednisolone levels through cobicistat's potent CYP3A4 inhibition.",
    recommendation: "Reduce methylprednisolone dose. Monitor for cushingoid features and systemic toxicity."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Stribild (elvitegravir/cobicistat) significantly increases triamcinolone exposure. Systemic effects possible even with non-oral routes.",
    recommendation: "Avoid concurrent use including injectable formulations. Use alternative corticosteroid."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: Stribild increases dexamethasone while dexamethasone may decrease elvitegravir levels.",
    recommendation: "Avoid combination. Use alternative corticosteroid or HIV regimen."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Stribild (elvitegravir/cobicistat) may increase prednisone levels through CYP3A4 inhibition.",
    recommendation: "Use lowest effective dose. Monitor for cushingoid features."
  },
  {
    drug1Pattern: "stribild",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Stribild increases methylprednisolone exposure through cobicistat's CYP3A4 inhibition.",
    recommendation: "Reduce methylprednisolone dose. Monitor for systemic corticosteroid effects."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Prezcobix (darunavir/cobicistat) significantly increases triamcinolone levels. Systemic effects reported even with injectable administration.",
    recommendation: "Avoid concurrent use including intra-articular injections. Use alternative corticosteroid."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: Prezcobix increases dexamethasone while dexamethasone may decrease darunavir levels.",
    recommendation: "Avoid combination. Use alternative corticosteroid or switch HIV regimen."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Prezcobix (darunavir/cobicistat) may increase prednisone exposure through CYP3A4 inhibition.",
    recommendation: "Use lowest effective prednisone dose. Monitor for cushingoid features and adrenal suppression."
  },
  {
    drug1Pattern: "prezcobix",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Prezcobix increases methylprednisolone levels through potent CYP3A4 inhibition by cobicistat.",
    recommendation: "Reduce methylprednisolone dose. Monitor for systemic corticosteroid toxicity."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Evotaz (atazanavir/cobicistat) significantly increases triamcinolone exposure. Risk of systemic effects with all formulations.",
    recommendation: "Avoid concurrent use. Use alternative corticosteroid not metabolized by CYP3A4."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: Evotaz increases dexamethasone while dexamethasone may decrease atazanavir levels.",
    recommendation: "Avoid combination. Consider alternative therapy."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Evotaz (atazanavir/cobicistat) may increase prednisone levels through CYP3A4 inhibition.",
    recommendation: "Use lowest effective dose. Monitor for systemic corticosteroid effects."
  },
  {
    drug1Pattern: "evotaz",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Evotaz increases methylprednisolone exposure through cobicistat's CYP3A4 inhibition.",
    recommendation: "Reduce methylprednisolone dose. Monitor for cushingoid features."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "triamcinolone",
    severity: "critical",
    description: "Kaletra (lopinavir/ritonavir) significantly increases triamcinolone levels. Systemic effects can occur even with non-oral administration.",
    recommendation: "Avoid concurrent use including injectable and intra-articular formulations."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "dexamethasone",
    severity: "moderate",
    description: "Bidirectional interaction: Kaletra may increase dexamethasone levels while dexamethasone decreases lopinavir/ritonavir levels.",
    recommendation: "Avoid combination. Monitor viral load if unavoidable."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "prednisone",
    severity: "moderate",
    description: "Kaletra (lopinavir/ritonavir) may increase prednisone/prednisolone levels through CYP3A4 inhibition.",
    recommendation: "Use lowest effective dose. Monitor for systemic corticosteroid effects and hyperglycemia."
  },
  {
    drug1Pattern: "kaletra",
    drug2Pattern: "methylprednisolone",
    severity: "moderate",
    description: "Kaletra increases methylprednisolone exposure through ritonavir's CYP3A4 inhibition.",
    recommendation: "Reduce methylprednisolone dose. Monitor for cushingoid features and systemic toxicity."
  },
  
  // Combination products - Other interactions
  {
    drug1Pattern: "biktarvy",
    drug2Pattern: "metformin",
    severity: "moderate",
    description: "Biktarvy contains bictegravir which inhibits OCT2/MATE1 transporters, increasing metformin exposure.",
    recommendation: "Monitor for metformin adverse effects. Consider dose reduction if needed. Monitor renal function."
  },
  {
    drug1Pattern: "triumeq",
    drug2Pattern: "methadone",
    severity: "minor",
    description: "Triumeq contains abacavir which may decrease methadone levels through enzyme induction.",
    recommendation: "Monitor for opioid withdrawal symptoms. May need to increase methadone dose based on clinical assessment."
  },
  {
    drug1Pattern: "atripla",
    drug2Pattern: "voriconazole",
    severity: "critical",
    description: "Atripla contains efavirenz which has bidirectional interaction with voriconazole, potentially causing treatment failure.",
    recommendation: "Avoid combination. If unavoidable, adjust both medications and monitor therapeutic levels."
  },
  {
    drug1Pattern: "complera",
    drug2Pattern: "omeprazole",
    severity: "critical",
    description: "Complera contains rilpivirine which requires acidic pH for absorption. PPIs significantly reduce rilpivirine levels.",
    recommendation: "Contraindicated. Use antacids (separated by 2+ hours) or H2 antagonists (12+ hours before rilpivirine) if acid suppression needed."
  },
  {
    drug1Pattern: "odefsey",
    drug2Pattern: "omeprazole",
    severity: "critical",
    description: "Odefsey contains rilpivirine which has significantly reduced absorption with PPIs, risking virologic failure.",
    recommendation: "Contraindicated. Consider alternative acid suppression with appropriate timing or switch HIV regimen."
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

  // Check for interactions between HIV drugs themselves
  const arvInteractions = checkARVtoARVInteractions(hivDrugs, idCounter);
  interactions.push(...arvInteractions.interactions);
  idCounter = arvInteractions.nextId;

  return interactions;
}

// Helper function to check if drug name contains component
function containsComponent(drugName: string, component: string): boolean {
  const normalized = drugName.toLowerCase().replace(/_/g, " ");
  return normalized.includes(component.toLowerCase());
}

// Check for interactions between ARVs in the regimen
function checkARVtoARVInteractions(hivDrugs: string[], startId: number): { interactions: DrugInteraction[], nextId: number } {
  const interactions: DrugInteraction[] = [];
  let idCounter = startId;

  // Check for duplicate therapies and inappropriate combinations
  for (let i = 0; i < hivDrugs.length; i++) {
    for (let j = i + 1; j < hivDrugs.length; j++) {
      const drug1 = hivDrugs[i];
      const drug2 = hivDrugs[j];

      // Check for 3TC + FTC (redundant, same resistance profile)
      if ((containsComponent(drug1, "lamivudine") || containsComponent(drug1, "3tc")) &&
          (containsComponent(drug2, "emtricitabine") || containsComponent(drug2, "ftc"))) {
        interactions.push({
          id: String(idCounter++),
          drug1: drug1.replace(/_/g, " "),
          drug2: drug2.replace(/_/g, " "),
          severity: "critical",
          description: "Lamivudine (3TC) and emtricitabine (FTC) are structurally similar and have identical resistance profiles. Using both provides no additional benefit and increases pill burden.",
          recommendation: "Use only one: either 3TC or FTC. These drugs are interchangeable and should never be used together."
        });
      }

      // Check for TDF + TAF (duplicate tenofovir formulations)
      if (containsComponent(drug1, "tenofovir") && containsComponent(drug2, "tenofovir")) {
        const hasTDF1 = containsComponent(drug1, "tdf") || containsComponent(drug1, "tenofovir df");
        const hasTAF1 = containsComponent(drug1, "taf") || containsComponent(drug1, "tenofovir af");
        const hasTDF2 = containsComponent(drug2, "tdf") || containsComponent(drug2, "tenofovir df");
        const hasTAF2 = containsComponent(drug2, "taf") || containsComponent(drug2, "tenofovir af");
        
        if ((hasTDF1 && hasTAF2) || (hasTAF1 && hasTDF2)) {
          interactions.push({
            id: String(idCounter++),
            drug1: drug1.replace(/_/g, " "),
            drug2: drug2.replace(/_/g, " "),
            severity: "critical",
            description: "Tenofovir DF (TDF) and tenofovir alafenamide (TAF) are different formulations of the same active drug. Concurrent use leads to excessive tenofovir exposure.",
            recommendation: "Use only one tenofovir formulation. TAF preferred for renal/bone safety; TDF preferred for high-level tenofovir resistance."
          });
        }
      }

      // Check for multiple boosters (ritonavir + cobicistat)
      if ((containsComponent(drug1, "ritonavir") || containsComponent(drug1, "norvir")) && 
          containsComponent(drug2, "cobicistat")) {
        interactions.push({
          id: String(idCounter++),
          drug1: drug1.replace(/_/g, " "),
          drug2: drug2.replace(/_/g, " "),
          severity: "moderate",
          description: "Concurrent use of ritonavir and cobicistat (both pharmacokinetic boosters) is not recommended and may increase drug interaction risk.",
          recommendation: "Use only one boosting agent. Consult HIV specialist for appropriate regimen adjustment."
        });
      }

      // Check for multiple NNRTIs (generally inappropriate)
      const nnrtis = ["efavirenz", "rilpivirine", "doravirine", "etravirine", "nevirapine"];
      const drug1HasNNRTI = nnrtis.some(nnrti => containsComponent(drug1, nnrti));
      const drug2HasNNRTI = nnrtis.some(nnrti => containsComponent(drug2, nnrti));
      
      if (drug1HasNNRTI && drug2HasNNRTI) {
        interactions.push({
          id: String(idCounter++),
          drug1: drug1.replace(/_/g, " "),
          drug2: drug2.replace(/_/g, " "),
          severity: "critical",
          description: "Multiple NNRTIs in a single regimen is not recommended. This provides no additional antiviral benefit and increases toxicity risk.",
          recommendation: "Use only one NNRTI. Standard regimens contain one NNRTI plus a 2-NRTI backbone, or an INSTI-based regimen."
        });
      }

      // Check for multiple unboosted PIs (generally inappropriate)
      const pis = ["atazanavir", "darunavir", "lopinavir"];
      const drug1HasPI = pis.some(pi => containsComponent(drug1, pi));
      const drug2HasPI = pis.some(pi => containsComponent(drug2, pi));
      
      if (drug1HasPI && drug2HasPI && 
          !containsComponent(drug1, "lopinavir") && !containsComponent(drug2, "lopinavir")) {
        interactions.push({
          id: String(idCounter++),
          drug1: drug1.replace(/_/g, " "),
          drug2: drug2.replace(/_/g, " "),
          severity: "critical",
          description: "Multiple protease inhibitors in a single regimen is not standard practice and may lead to unpredictable drug levels and toxicity.",
          recommendation: "Use only one PI (boosted with ritonavir or cobicistat). Consult HIV specialist for complex salvage regimens."
        });
      }

      // Check for specific ARV-to-ARV interactions
      // Atazanavir + Tenofovir (increases tenofovir levels)
      if (containsComponent(drug1, "atazanavir") && containsComponent(drug2, "tenofovir")) {
        interactions.push({
          id: String(idCounter++),
          drug1: drug1.replace(/_/g, " "),
          drug2: drug2.replace(/_/g, " "),
          severity: "moderate",
          description: "Atazanavir increases tenofovir levels by 24-37%, potentially increasing renal and bone toxicity risk.",
          recommendation: "Monitor renal function closely. Consider TAF formulation for reduced toxicity. Assess bone health in high-risk patients."
        });
      }

      // Efavirenz + Dolutegravir (efavirenz reduces dolutegravir levels)
      if (containsComponent(drug1, "efavirenz") && containsComponent(drug2, "dolutegravir")) {
        interactions.push({
          id: String(idCounter++),
          drug1: drug1.replace(/_/g, " "),
          drug2: drug2.replace(/_/g, " "),
          severity: "moderate",
          description: "Efavirenz reduces dolutegravir levels by ~50% through UGT1A1 induction, potentially leading to virologic failure.",
          recommendation: "Increase dolutegravir dose to 50mg BID when used with efavirenz. Alternative: use different NNRTI or INSTI."
        });
      }
    }
  }

  return { interactions, nextId: idCounter };
}
