import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import OpenAI from "openai";
import { checkDrugInteractions } from "./lib/drugInteractions";
import { checkRenalFunction } from "./lib/renalValidation";
import { checkHepaticPregnancyFunction } from "./lib/hepaticPregnancyValidation";
import { generateClinicalRecommendations } from "./lib/clinicalRecommendations";
import { openEvidenceClient } from "./lib/openEvidence";
import { checkLiverpoolInteractions, isConfigured as liverpoolConfigured } from "./lib/liverpoolDDI";
import { hivDrugs } from "../client/src/lib/hivDrugs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assessmentRequestSchema = z.object({
  age: z.number().min(0).max(120),
  pregnancy: z.enum(["yes", "no", "unknown"]),
  hlab5701: z.enum(["positive", "negative", "unknown"]),
  treatmentStatus: z.enum(["naive", "experienced"]),
  viralLoad: z.number().min(0).optional(),
  cd4Count: z.number().min(0).optional(),
  egfr: z.number().min(0).optional(),
  hepaticFunction: z.enum(["normal", "mild", "moderate", "severe"]),
  selectedDrugs: z.array(z.string()),
  concomitantMeds: z.array(z.string()),
  geneticResistanceNotes: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/assessment", async (req, res) => {
    try {
      const data = assessmentRequestSchema.parse(req.body);

      if (data.selectedDrugs.length === 0) {
        return res.status(400).json({ error: "At least one HIV medication must be selected" });
      }

      // Drug-drug interactions: try Liverpool API first, fall back to static engine
      let ddiSource: "liverpool" | "static" = "static";
      let ddiResolvedDrugs: number | undefined;
      let interactions = checkDrugInteractions(data.selectedDrugs, data.concomitantMeds);

      if (liverpoolConfigured()) {
        console.log("[Assessment] Liverpool API key present — querying Liverpool DDI…");
        const liverpoolResult = await checkLiverpoolInteractions(
          data.selectedDrugs,
          data.concomitantMeds,
        );
        if (liverpoolResult) {
          interactions = liverpoolResult.interactions;
          ddiSource = "liverpool";
          ddiResolvedDrugs = liverpoolResult.resolvedCount;
          console.log(`[Assessment] Using Liverpool DDI results (${interactions.length} interaction(s))`);
        } else {
          console.log("[Assessment] Liverpool DDI unavailable — using static engine");
        }
      }

      const renalAlerts = checkRenalFunction(data.selectedDrugs, data.egfr);
      const hepaticPregnancyAlerts = checkHepaticPregnancyFunction(
        data.selectedDrugs,
        data.hepaticFunction,
        data.pregnancy,
        data.hlab5701
      );
      const clinicalRecommendations = generateClinicalRecommendations(
        data.cd4Count,
        data.viralLoad,
        data.treatmentStatus
      );

      const selectedDrugDetails = data.selectedDrugs.map(id => {
        const drug = hivDrugs.find(d => d.id === id);
        return drug ? `${drug.name} (${drug.brandName}) - ${drug.dosage}` : id;
      }).join(", ");

      // Try OpenEvidence first (medical-specific AI with evidence-based citations)
      let result: {
        clinicalSummary: string;
        consultationQuestions: string[];
        citations?: Array<{ title: string; journal: string; pubmedId?: string; relevance: string; summary: string; url?: string }>;
        sources?: string[];
        provider?: string;
      } = {
        clinicalSummary: "",
        consultationQuestions: [],
        provider: "openai"
      };

      if (openEvidenceClient.isConfigured()) {
        console.log("[Assessment] Attempting OpenEvidence API...");
        const openEvidenceResult = await openEvidenceClient.generateHIVAssessment({
          age: data.age,
          pregnancy: data.pregnancy,
          hlab5701: data.hlab5701,
          treatmentStatus: data.treatmentStatus,
          viralLoad: data.viralLoad,
          cd4Count: data.cd4Count,
          egfr: data.egfr,
          hepaticFunction: data.hepaticFunction,
          selectedDrugs: data.selectedDrugs,
          concomitantMeds: data.concomitantMeds,
          geneticResistanceNotes: data.geneticResistanceNotes,
          interactions,
          renalAlerts,
          hepaticPregnancyAlerts,
          clinicalRecommendations,
          selectedDrugDetails,
        });

        if (openEvidenceResult) {
          console.log("[Assessment] OpenEvidence response received");
          result = openEvidenceResult;
        } else {
          console.log("[Assessment] OpenEvidence failed, falling back to OpenAI");
        }
      }

      // Fallback to OpenAI if OpenEvidence is not configured or failed
      if (!result.clinicalSummary) {
        console.log("[Assessment] Using OpenAI for clinical assessment");
        const prompt = `You are an experienced clinical pharmacist specializing in HIV treatment. Generate a comprehensive clinical assessment based on the following patient information:

**Patient Demographics:**
- Age: ${data.age} years
- Pregnancy Status: ${data.pregnancy}
- HLA-B*5701: ${data.hlab5701}

**Clinical Parameters:**
- Treatment Status: ${data.treatmentStatus}
- Viral Load: ${data.viralLoad ? `${data.viralLoad.toLocaleString()} copies/mL` : "Not documented"}
- CD4 Count: ${data.cd4Count ? `${data.cd4Count} cells/mm³` : "Not documented"}
- eGFR (Renal Function): ${data.egfr ? `${data.egfr} mL/min` : "Not documented"}
- Hepatic Function: ${data.hepaticFunction}

**Selected HIV Regimen:**
${selectedDrugDetails}

**Concomitant Medications:**
${data.concomitantMeds.length > 0 ? data.concomitantMeds.join(", ") : "None reported"}

**Genetic Resistance Notes:**
${data.geneticResistanceNotes || "None documented"}

**Drug-Drug Interactions Identified:**
${interactions.length > 0 ? interactions.map(i => `${i.severity.toUpperCase()}: ${i.drug1} + ${i.drug2}`).join("; ") : "None identified"}

**Renal Function Alerts:**
${renalAlerts.length > 0 ? renalAlerts.map(a => `${a.severity.toUpperCase()}: ${a.medication} - ${a.description}`).join("; ") : "No renal concerns identified"}

**Hepatic/Pregnancy/HLA-B*5701 Alerts:**
${hepaticPregnancyAlerts.length > 0 ? hepaticPregnancyAlerts.map(a => `${a.severity.toUpperCase()} [${a.category}]: ${a.medication} - ${a.description}`).join("; ") : "No hepatic, pregnancy, or HLA concerns identified"}

**Clinical Recommendations Generated:**
${clinicalRecommendations.length > 0 ? clinicalRecommendations.map(r => `${r.priority.toUpperCase()} [${r.category}]: ${r.title}`).join("; ") : "Standard monitoring"}

Please provide:
1. A clinical assessment summary (3-4 paragraphs) that addresses:
   - Patient's HIV treatment context and appropriateness of selected regimen
   - Key clinical considerations (HLA-B*5701, pregnancy, renal/hepatic function)
   - Drug interaction concerns if present
   - Dosing adjustments needed based on organ function
   - Any contraindications or safety alerts

2. A list of 7-10 specific consultation questions a pharmacist should ask this patient during counseling. Focus on:
   - Medication history and adherence barriers
   - Symptoms and adverse effects
   - Understanding of treatment
   - Social determinants affecting care
   - Specific concerns related to their regimen or interactions

Format your response as JSON:
{
  "clinicalSummary": "multi-paragraph assessment",
  "consultationQuestions": ["question 1", "question 2", ...]
}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert HIV pharmacist. Provide evidence-based, clinically appropriate assessments. Be thorough but concise. Always respond with valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });

        const openaiResult = JSON.parse(completion.choices[0].message.content || "{}");
        result.clinicalSummary = openaiResult.clinicalSummary || "Assessment could not be generated.";
        result.consultationQuestions = openaiResult.consultationQuestions || [];
        result.provider = "openai";
      }

      res.json({
        interactions,
        renalAlerts,
        hepaticPregnancyAlerts,
        clinicalRecommendations,
        clinicalSummary: result.clinicalSummary || "Assessment could not be generated.",
        consultationQuestions: result.consultationQuestions || [],
        citations: result.citations,
        sources: result.sources,
        aiProvider: result.provider,
        ddiSource,
        ddiResolvedDrugs,
      });
    } catch (error) {
      console.error("Assessment generation error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }

      res.status(500).json({ 
        error: "Failed to generate assessment",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ── Frameable check — detects X-Frame-Options / CSP frame-ancestors ──
  app.get("/api/check-frameable", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url parameter required" });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      const xfo = response.headers.get("x-frame-options")?.toLowerCase() ?? "";
      const csp = response.headers.get("content-security-policy") ?? "";

      const blockedByXFO = xfo === "deny" || xfo === "sameorigin";

      // Parse frame-ancestors directive
      const faMatch = csp.match(/frame-ancestors\s+([^;]+)/i);
      let blockedByCSP = false;
      if (faMatch) {
        const fa = faMatch[1].trim();
        blockedByCSP = fa === "'none'" || (fa.includes("'self'") && !fa.includes("*"));
      }

      if (blockedByXFO || blockedByCSP) {
        return res.json({
          frameable: false,
          reason: blockedByXFO
            ? `X-Frame-Options: ${xfo.toUpperCase()}`
            : "CSP frame-ancestors",
        });
      }

      return res.json({ frameable: true });
    } catch (error) {
      return res.json({
        frameable: false,
        reason: "Connection failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
