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
      const response = await fetch(`${this.baseUrl}/v1/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json",
        },
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
  }): Promise<ClinicalAssessmentResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const clinicalQuestion = `
As an HIV clinical pharmacist, provide an evidence-based assessment for this patient:

Patient Profile:
- Age: ${patientData.age} years
- Pregnancy: ${patientData.pregnancy}
- HLA-B*5701: ${patientData.hlab5701}
- Treatment Status: ${patientData.treatmentStatus}
- Viral Load: ${patientData.viralLoad ? `${patientData.viralLoad.toLocaleString()} copies/mL` : "Not documented"}
- CD4 Count: ${patientData.cd4Count ? `${patientData.cd4Count} cells/mm³` : "Not documented"}
- eGFR: ${patientData.egfr ? `${patientData.egfr} mL/min` : "Not documented"}
- Hepatic Function: ${patientData.hepaticFunction}

HIV Regimen: ${patientData.selectedDrugDetails}
Concomitant Medications: ${patientData.concomitantMeds.length > 0 ? patientData.concomitantMeds.join(", ") : "None"}

Identified Issues:
- Drug Interactions: ${patientData.interactions.length > 0 ? patientData.interactions.map(i => `${i.drug1} + ${i.drug2} (${i.severity})`).join("; ") : "None"}
- Renal Alerts: ${patientData.renalAlerts.length > 0 ? patientData.renalAlerts.map(a => `${a.medication}: ${a.description}`).join("; ") : "None"}
- Hepatic/Pregnancy/HLA Alerts: ${patientData.hepaticPregnancyAlerts.length > 0 ? patientData.hepaticPregnancyAlerts.map(a => `${a.medication} [${a.category}]: ${a.description}`).join("; ") : "None"}

Please provide:
1. A clinical assessment summary addressing regimen appropriateness, safety concerns, and required monitoring
2. Key consultation questions for pharmacist counseling

Reference DHHS HIV Treatment Guidelines and current evidence.
    `.trim();

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
