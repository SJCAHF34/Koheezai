/**
 * OpenEvidence API Integration
 * 
 * OpenEvidence is a medical AI platform used by 40%+ of U.S. physicians
 * that provides evidence-based clinical answers with peer-reviewed citations
 * from sources like NEJM, JAMA, PubMed, and clinical guidelines.
 * 
 * API Endpoint: https://api.openevidence.com
 * Documentation: https://docs.openevidence.com
 * 
 * Features:
 * - Evidence-based clinical answers
 * - Citations from peer-reviewed sources
 * - HIPAA-compliant infrastructure
 * - No hallucinations (trained on trusted medical literature only)
 */

interface OpenEvidenceCitation {
  title: string;
  journal: string;
  pubmedId?: string;
  relevance: "high" | "moderate" | "low";
  summary: string;
  url?: string;
}

interface OpenEvidenceResponse {
  answer: string;
  citations: OpenEvidenceCitation[];
  sources: string[];
  confidence: "high" | "moderate" | "low";
  lastUpdated: string;
}

interface ClinicalAssessmentResult {
  clinicalSummary: string;
  consultationQuestions: string[];
  citations?: OpenEvidenceCitation[];
  sources?: string[];
  provider: "openevidence" | "openai";
}

export class OpenEvidenceClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENEVIDENCE_API_KEY || "";
    this.baseUrl = "https://api.openevidence.com";
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  async query(clinicalQuestion: string): Promise<OpenEvidenceResponse | null> {
    if (!this.isConfigured()) {
      console.log("[OpenEvidence] API key not configured, skipping");
      return null;
    }

    try {
      const sessionCookie = process.env.OPENEVIDENCE_SESSION_COOKIE;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        "Accept": "application/json",
      };
      if (sessionCookie) {
        headers["Cookie"] = sessionCookie;
      }

      const response = await fetch(`${this.baseUrl}/v1/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: clinicalQuestion,
          include_citations: true,
          include_sources: true,
        }),
      });

      if (!response.ok) {
        console.error(`[OpenEvidence] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return {
        answer: data.answer || data.response || "",
        citations: data.citations || [],
        sources: data.sources || [],
        confidence: data.confidence || "moderate",
        lastUpdated: data.last_updated || new Date().toISOString(),
      };
    } catch (error) {
      console.error("[OpenEvidence] Request failed:", error);
      return null;
    }
  }

  async generateHIVAssessment(patientData: {
    age: number;
    pregnancy: string;
    hlab5701: string;
    treatmentStatus: string;
    viralLoad?: number;
    cd4Count?: number;
    egfr?: number;
    hepaticFunction: string;
    selectedDrugs: string[];
    concomitantMeds: string[];
    geneticResistanceNotes?: string;
    interactions: Array<{ severity: string; drug1: string; drug2: string }>;
    renalAlerts: Array<{ severity: string; medication: string; description: string }>;
    hepaticPregnancyAlerts: Array<{ severity: string; category: string; medication: string; description: string }>;
    clinicalRecommendations: Array<{ priority: string; category: string; title: string }>;
    selectedDrugDetails: string;
    regimenChangeBlock?: string;
  }): Promise<ClinicalAssessmentResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const patientLine = [
      `${patientData.age}-year-old`,
      patientData.pregnancy === "yes" ? "pregnant" : patientData.pregnancy === "no" ? "not pregnant" : "pregnancy status unknown",
      patientData.treatmentStatus === "naive" ? "treatment-naive" : "treatment-experienced",
    ].join(", ");

    const extraLines: string[] = [];
    if (patientData.cd4Count) extraLines.push(`CD4 Count: ${patientData.cd4Count} cells/µL`);
    if (patientData.viralLoad) extraLines.push(`HIV Viral Load: ${patientData.viralLoad.toLocaleString()} copies/mL`);
    if (patientData.egfr) extraLines.push(`eGFR: ${patientData.egfr} mL/min/1.73m²`);
    if (patientData.hepaticFunction && patientData.hepaticFunction !== "normal")
      extraLines.push(`Hepatic Function: ${patientData.hepaticFunction} impairment`);
    if (patientData.hlab5701 && patientData.hlab5701 !== "unknown")
      extraLines.push(`HLA-B*5701: ${patientData.hlab5701}`);
    if (patientData.geneticResistanceNotes)
      extraLines.push(`Resistance Notes: ${patientData.geneticResistanceNotes}`);

    const clinicalQuestion = [
      "I am a pharmacist reviewing a patient regimen. Please evaluate the following for treatment appropriateness and clinically significant drug-drug interactions:",
      "",
      `Patient: ${patientLine}`,
      ...extraLines,
      "",
      `ARV Regimen: ${patientData.selectedDrugDetails || (patientData.selectedDrugs.length > 0 ? patientData.selectedDrugs.join(" + ") : "None specified")}`,
      ...(patientData.regimenChangeBlock ? [patientData.regimenChangeBlock] : []),
      `Concomitant Medications: ${patientData.concomitantMeds.length > 0 ? patientData.concomitantMeds.join(", ") : "None"}`,
      "",
      "Please address:",
      "1. Is this ARV regimen appropriate for this patient's clinical profile?",
      "2. Are there any clinically significant drug-drug interactions between the ARV regimen and concomitant medications?",
      "3. Are any dose adjustments needed given the patient's renal or hepatic function?",
      "4. Are there any contraindications or safety concerns?",
      "",
      "Make this into a note in this format:",
      "(ARV DRUG) Consult:",
      "",
      "(DRUG NAME)",
      "Reviewed, sig, and indication: (indication)",
      "SEs: (side effects)",
      "WARNINGS: (fda warnings/precautions, if pertinent)",
      "DDIs: (interactions and symptoms of those interactions, if taking the medication, don't list unless taking medication that interact)",
      "RENAL: (if dose adjustment needed, if not just no Hx of renal dysfunction)",
      "HEPATIC: (if dose adjustment needed, if not just no Hx of hepatic dysfunction)",
      "CI: (list if any documented and pertinent)",
      "NOTE FOR PT: (notes for patient, key tips from FDA patient handouts)",
    ].join("\n");

    try {
      const response = await this.query(clinicalQuestion);
      if (!response) {
        return null;
      }

      // Parse the response - OpenEvidence returns structured answers
      // We need to extract the summary and consultation questions
      const answer = response.answer;
      
      // Try to extract consultation questions from the response
      const questionsMatch = answer.match(/consultation questions?:?\s*([\s\S]*?)(?:$|references|citations)/i);
      let consultationQuestions: string[] = [];
      
      if (questionsMatch) {
        const questionsText = questionsMatch[1];
        consultationQuestions = questionsText
          .split(/\n/)
          .map(q => q.replace(/^[\d\.\-\*]+\s*/, "").trim())
          .filter(q => q.length > 10 && q.endsWith("?"));
      }

      // If we couldn't extract questions, generate some standard ones
      if (consultationQuestions.length < 5) {
        consultationQuestions = [
          "How have you been taking your HIV medications - any missed doses in the past week?",
          "Have you experienced any side effects like nausea, headaches, or fatigue since starting treatment?",
          "Are you taking any other medications, supplements, or herbal products?",
          "Do you have any concerns about your treatment or questions about how it works?",
          "Have you noticed any changes in your health since starting therapy?",
          "Do you use any recreational substances that might interact with your medications?",
          "Are there any barriers to picking up your medications on time?",
        ];
      }

      // Extract clinical summary (everything before consultation questions section)
      let clinicalSummary = answer;
      if (questionsMatch) {
        clinicalSummary = answer.substring(0, questionsMatch.index).trim();
      }

      return {
        clinicalSummary,
        consultationQuestions: consultationQuestions.slice(0, 10),
        citations: response.citations,
        sources: response.sources,
        provider: "openevidence",
      };
    } catch (error) {
      console.error("[OpenEvidence] Assessment generation failed:", error);
      return null;
    }
  }
}

// Singleton instance
export const openEvidenceClient = new OpenEvidenceClient();
