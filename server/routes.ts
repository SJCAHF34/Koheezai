import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import type { RetentionPatient } from "@shared/schema";
import OpenAI from "openai";
import { checkDrugInteractions } from "./lib/drugInteractions";
import { checkRenalFunction } from "./lib/renalValidation";
import { checkHepaticPregnancyFunction } from "./lib/hepaticPregnancyValidation";
import { generateClinicalRecommendations } from "./lib/clinicalRecommendations";
import { openEvidenceClient } from "./lib/openEvidence";
import { checkLiverpoolInteractions, isConfigured as liverpoolConfigured } from "./lib/liverpoolDDI";
import { hivDrugs } from "../client/src/lib/hivDrugs";
import { storage } from "./storage";
import { runOutreachNow } from "./lib/outreachScheduler";
import { logRetentionEvent } from "./lib/salesforceClient";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: { email: string; name: string };
  }
}

const DEMO_USERS = [
  { email: "cpo@koheez.ai", password: "AHF1", name: "Chief Pharmacy Officer" },
  { email: "cpo@aidshealth.org", password: "AHF1", name: "Chief Pharmacy Officer" },
  { email: "regionaldirector@koheez.ai", password: "AHF1", name: "Regional Pharmacy Director" },
  { email: "regional@aidshealth.org", password: "AHF1", name: "Regional Pharmacy Director" },
  { email: "director@koheez.ai", password: "AHF1", name: "Pharmacy Director" },
  { email: "techs@koheez.ai", password: "AHF1", name: "Pharmacy Technician" },
  { email: "test@koheez.ai", password: "AHF1", name: "Test User" },
  { email: "jrockwoodpharmd@gmail.com", password: "AHF1", name: "Jason Rockwood" },
  { email: "tech@koheez.ai", password: "AHF1", name: "Data Entry Tech" },
  { email: "claire.wood@aidshealth.org", password: "AHF1", name: "Claire Wood" },
  { email: "pairiss.wilcox@aidshealth.org", password: "AHF1", name: "Pairiss Wilcox" },
  { email: "anh.do@aidshealth.org", password: "AHF1", name: "Anh Do" },
  { email: "debbie.nguyen@aidshealth.org", password: "AHF1", name: "Debbie Nguyen" },
  { email: "seth.collins@aidshealth.org", password: "AHF1", name: "Seth Collins" },
  { email: "elizabeth.camper@aidshealth.org", password: "AHF2", name: "Elizabeth Camper" },
  { email: "roshanak.mohaghegh@ahfrx.org", password: "AHF1", name: "Roshanak Mohaghegh" },
];

const inMemoryUsers: Array<{ email: string; password: string; name: string }> = [];

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
  regimenType: z.enum(["new", "change"]).optional(),
  currentDrugs: z.array(z.string()).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Auth routes ──────────────────────────────────────────────────────────
  app.get("/api/auth/me", (req, res) => {
    if (req.session?.userId && req.session?.user) {
      return res.json({ user: req.session.user });
    }
    return res.status(401).json({ error: "Not authenticated" });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const allUsers = [...DEMO_USERS, ...inMemoryUsers];
    const found = allUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!found) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    req.session.userId = found.email;
    req.session.user = { email: found.email, name: found.name };
    return res.json({ user: req.session.user });
  });

  app.post("/api/auth/signup", (req, res) => {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const allUsers = [...DEMO_USERS, ...inMemoryUsers];
    if (allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const newUser = { email, password, name: name || email };
    inMemoryUsers.push(newUser);
    req.session.userId = email;
    req.session.user = { email, name: newUser.name };
    return res.json({ user: req.session.user });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    return res.json({ ok: true });
  });

  // ── Assessment route ──────────────────────────────────────────────────────
  app.post("/api/assessment", async (req, res) => {
    try {
      const data = assessmentRequestSchema.parse(req.body);

      if (data.selectedDrugs.length === 0) {
        return res.status(400).json({ error: "At least one HIV medication must be selected" });
      }

      const localInteractions = checkDrugInteractions(data.selectedDrugs, data.concomitantMeds);

      // ── Liverpool HIV Drug Interactions API (parallel) ───────────────────
      // Map selected drug IDs → generic names for Liverpool lookup
      const selectedDrugNames = data.selectedDrugs.map(id => {
        const drug = hivDrugs.find(d => d.id === id);
        return drug ? drug.name : id;
      });
      const liverpoolResult = await checkLiverpoolInteractions(selectedDrugNames, data.concomitantMeds).catch(() => null);

      // Merge: Liverpool interactions NOT already covered by our rules engine
      let interactions = localInteractions;
      let liverpoolNewCount = 0;
      if (liverpoolResult && liverpoolResult.interactions.length > 0) {
        const localPairs = new Set(
          localInteractions.map(i =>
            [i.drug1.toLowerCase(), i.drug2.toLowerCase()].sort().join("|")
          )
        );
        const newFromLiverpool = liverpoolResult.interactions.filter(li => {
          const pairKey = [li.drug1.toLowerCase(), li.drug2.toLowerCase()].sort().join("|");
          return !localPairs.has(pairKey);
        });
        liverpoolNewCount = newFromLiverpool.length;
        interactions = [...localInteractions, ...newFromLiverpool];
        if (newFromLiverpool.length > 0) {
          console.log(`[Assessment] Liverpool contributed ${newFromLiverpool.length} new DDI(s)`);
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

      const currentDrugDetails = (data.currentDrugs ?? []).map(id => {
        const drug = hivDrugs.find(d => d.id === id);
        return drug ? `${drug.name} (${drug.brandName}) - ${drug.dosage}` : id;
      }).join(", ");

      const regimenChangeBlock = data.regimenType === "change"
        ? `\n**Regimen Change:**\n- Current Regimen (being discontinued): ${currentDrugDetails || "Not specified"}\n- New Regimen (being initiated): ${selectedDrugDetails}\nPlease address: reasons the current regimen may be suboptimal, clinical appropriateness of the new regimen, any safety considerations during the transition, and whether any washout or overlap is needed.`
        : "";

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
          regimenChangeBlock: regimenChangeBlock || undefined,
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
${regimenChangeBlock}
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
        liverpoolDDI: {
          enabled: liverpoolConfigured(),
          resolvedDrugs: liverpoolResult?.resolvedCount ?? 0,
          newInteractions: liverpoolNewCount,
        },
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

  // ── Generate Comprehensive Note ──────────────────────────────────────────
  const generateNoteSchema = z.object({
    patientContext: z.string(),
    oeQuery: z.string(),
    oeResponse: z.string(),
    consultationQuestions: z.array(z.string()),
  });

  app.post("/api/generate-note", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const data = generateNoteSchema.parse(req.body);
      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      const prompt = `You are an expert HIV clinical pharmacist. Generate a comprehensive pharmacy consultation note for medical record documentation.

PATIENT CLINICAL CONTEXT:
${data.patientContext}

OPENEVIDENCE QUERY SUBMITTED:
${data.oeQuery}

OPENEVIDENCE EVIDENCE-BASED RESPONSE:
${data.oeResponse}

PHARMACIST CONSULTATION QUESTIONS:
${data.consultationQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Generate a professional pharmacy consultation note with these exact sections:

PHARMACY CONSULTATION NOTE
Date: ${today}

1. PATIENT CLINICAL SUMMARY
Brief overview of patient demographics, HIV status, and treatment context.

2. REGIMEN ASSESSMENT
Evaluation of the ARV regimen appropriateness based on the clinical profile and OpenEvidence findings.

3. DRUG INTERACTION SUMMARY
Key drug-drug interaction findings and their clinical significance.

4. CLINICAL RECOMMENDATIONS
Evidence-based recommendations derived from OpenEvidence.

5. PATIENT COUNSELING POINTS
Key points addressed during the consultation, referencing the consultation questions.

6. FOLLOW-UP PLAN
Recommended monitoring parameters and follow-up timeline.

Write in professional clinical language for medical record documentation. Be specific and evidence-based.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert HIV clinical pharmacist generating professional pharmacy consultation notes for medical record documentation. Be thorough, evidence-based, and use appropriate clinical terminology.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      });

      res.json({ note: completion.choices[0].message.content || "" });
    } catch (error) {
      console.error("Note generation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({
        error: "Failed to generate note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ── Handoff note generation — converts free text → action bullet items ──
  app.post("/api/handoff/generate", async (req, res) => {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "text is required" });
    }

    const lineFallback = (raw: string): string[] =>
      raw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);

    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.json({ items: lineFallback(text) });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a clinical pharmacy operations assistant. Convert the following handoff note into a concise, actionable task list. " +
              "Each item should be a clear, self-contained action (4–12 words). " +
              'Respond ONLY with a JSON object in this exact format: { "items": ["task 1", "task 2", ...] }. No markdown, no explanation.',
          },
          { role: "user", content: text.trim() },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
        temperature: 0.3,
      });

      const raw = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(raw);
      const items: string[] = Array.isArray(parsed.items)
        ? parsed.items
        : Array.isArray(parsed.tasks)
        ? parsed.tasks
        : Array.isArray(parsed.actions)
        ? parsed.actions
        : lineFallback(text);

      return res.json({ items: items.filter((i) => typeof i === "string" && i.trim().length > 0) });
    } catch {
      return res.json({ items: lineFallback(text) });
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

  // ── Retention Patient API ──────────────────────────────────────────────────

  function requireAuth(req: any, res: any, next: any) {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    return next();
  }

  function requireApiKeyOrAuth(req: any, res: any, next: any) {
    const authHeader: string = req.headers["authorization"] ?? "";
    const importKey = process.env.IMPORT_API_KEY;
    if (importKey && authHeader === `Bearer ${importKey}`) return next();
    if (req.session?.user) return next();
    return res.status(401).json({ message: "Not authenticated" });
  }

  function fireSalesforce(phone: string, initials: string, event: string, detail: string) {
    if (phone) logRetentionEvent(phone, initials, event, detail).catch(() => {});
  }

  app.get("/api/retention/patients/:siteId", requireAuth, async (req, res) => {
    try {
      const patients = await storage.getPatients(req.params.siteId);
      return res.json(patients);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.post("/api/retention/patients", requireAuth, async (req, res) => {
    try {
      const body = req.body;
      if (!body.siteId || !body.initials || !body.issueType) {
        return res.status(400).json({ message: "siteId, initials, and issueType are required" });
      }
      const patient = await storage.addPatient({
        siteId: body.siteId,
        initials: body.initials,
        issueType: body.issueType,
        dateAdded: body.dateAdded || new Date().toISOString().split("T")[0],
        attemptCount: body.attemptCount ?? 0,
        lastAttemptDate: body.lastAttemptDate ?? null,
        attemptLog: body.attemptLog ?? [],
        notes: body.notes ?? "",
        status: body.status ?? "active",
        resolvedDate: body.resolvedDate ?? null,
        phone1: body.phone1 ?? "",
        phone2: body.phone2 ?? "",
        email: body.email ?? "",
        caseManagerContact: body.caseManagerContact ?? "",
        bin: body.bin ?? "",
        pcn: body.pcn ?? "",
        rxgrp: body.rxgrp ?? "",
        insuranceId: body.insuranceId ?? "",
        city: body.city ?? "",
        state: body.state ?? "",
        zip: body.zip ?? "",
        ahfLocationMatch: body.ahfLocationMatch ?? "",
        sequenceActive: body.sequenceActive ?? false,
        sequenceDay: body.sequenceDay ?? 0,
        sequenceStartDate: body.sequenceStartDate ?? null,
        lastOutreachDate: body.lastOutreachDate ?? null,
        outreachComplete: body.outreachComplete ?? false,
        retentionReason: body.retentionReason ?? "",
      });
      fireSalesforce(patient.phone1, patient.initials, "Patient Added to Retention Tracker",
        `Issue type: ${patient.issueType}`);
      return res.status(201).json(patient);
    } catch (err) {
      return res.status(500).json({ message: "Failed to add patient" });
    }
  });

  app.put("/api/retention/patients/:id", requireAuth, async (req, res) => {
    try {
      const body = req.body;
      if (!body.id || body.id !== req.params.id) {
        return res.status(400).json({ message: "Patient id mismatch" });
      }
      const existing = (await storage.getPatients(body.siteId ?? "")).find((p) => p.id === body.id);
      const updated = await storage.updatePatient(body);
      if (existing) {
        if (updated.attemptCount > existing.attemptCount) {
          const lastEntry = updated.attemptLog?.[updated.attemptLog.length - 1];
          const byNote = lastEntry?.by ? ` by ${lastEntry.by}` : "";
          fireSalesforce(updated.phone1, updated.initials, "Call Attempt Logged",
            `Attempt #${updated.attemptCount}${byNote}`);
        }
        if (updated.status !== existing.status) {
          fireSalesforce(updated.phone1, updated.initials, "Status Changed",
            `${existing.status} → ${updated.status}`);
        }
      }
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to update patient" });
    }
  });

  app.delete("/api/retention/patients/:id", requireAuth, async (req, res) => {
    try {
      const toDelete = await storage.getPatient(req.params.id);
      await storage.deletePatient(req.params.id);
      if (toDelete) {
        fireSalesforce(toDelete.phone1, toDelete.initials, "Patient Removed from Tracker",
          `Status was: ${toDelete.status}`);
      }
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  app.post("/api/retention/outreach/run", requireAuth, async (req, res) => {
    try {
      await runOutreachNow();
      return res.json({ message: "Outreach pass completed" });
    } catch (err) {
      return res.status(500).json({ message: "Outreach run failed" });
    }
  });

  // ── SSRS Import endpoint (accepts session auth OR IMPORT_API_KEY) ──────────

  function normalizeIssueType(raw: string): import("@shared/schema").RetentionIssueType {
    const v = raw.toLowerCase();
    if (v.includes("appointment") || v.includes("lab")) return "appointment_lab";
    if (v.includes("communication") || v.includes("barrier")) return "communication_barriers";
    if (v.includes("transfer")) return "transfer_out";
    if (v.includes("coverage")) return "insurance_coverage";
    if (v.includes("one-time") || v.includes("one time") || v.includes("limited treatment")) return "one_time_limited";
    if (v.includes("restriction")) return "insurance_restrictions";
    if (v.includes("patient status") || v.includes("status change")) return "patient_status_change";
    if (v.includes("clinical") || v.includes("medication")) return "clinical_medication";
    if (v.includes("insurance") || v.includes("lockout")) return "insurance_restrictions";
    if (v.includes("state") || v.includes("out of state")) return "patient_status_change";
    if (v.includes("lost") || v.includes("contact")) return "communication_barriers";
    return "undesignated";
  }

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  function parseCsvText(text: string): Array<{ initials: string; phone1: string; phone2: string; issueType: string }> {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];
    const headerCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase().trim());
    const col = (name: string) => headerCols.findIndex((c) => c === name.toLowerCase());

    const isSSRS = headerCols.some((c) => c === "first name" || c === "first_name");
    if (isSSRS) {
      const firstNameIdx = col("first name");
      const lastNameIdx  = col("last name");
      const phonesIdx    = col("phones");
      const cellIdx      = col("cellphone");
      const workIdx      = col("work phone");
      const altIdx       = col("alt phone");
      const reasonIdx    = col("reason description");
      const categoryIdx  = col("category");
      const rows: Array<{ initials: string; phone1: string; phone2: string; issueType: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const c = parseCsvLine(lines[i]);
        const fn = (c[firstNameIdx] ?? "").trim();
        const ln = (c[lastNameIdx]  ?? "").trim();
        if (!fn && !ln) continue;
        const initials = ((fn[0] ?? "") + (ln[0] ?? "")).toUpperCase();
        if (!initials) continue;
        const phone1    = (phonesIdx >= 0 ? c[phonesIdx] : "") || (cellIdx >= 0 ? c[cellIdx] : "") || "";
        const phone2    = (workIdx   >= 0 ? c[workIdx]   : "") || (altIdx  >= 0 ? c[altIdx]  : "") || "";
        const issueType = (reasonIdx >= 0 ? c[reasonIdx] : "") || (categoryIdx >= 0 ? c[categoryIdx] : "") || "";
        rows.push({ initials, phone1: phone1.trim(), phone2: phone2.trim(), issueType: issueType.trim() });
      }
      return rows;
    }

    const start = headerCols.some((c) => c.includes("initials")) ? 1 : 0;
    const rows: Array<{ initials: string; phone1: string; phone2: string; issueType: string }> = [];
    for (let i = start; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const initials = (c[0] ?? "").toUpperCase();
      if (!initials) continue;
      rows.push({ initials, phone1: c[1] ?? "", phone2: c[2] ?? "", issueType: c[3] ?? "" });
    }
    return rows;
  }

  app.post("/api/retention/import", requireApiKeyOrAuth, async (req, res) => {
    try {
      let siteId: string;
      let patientRows: Array<{ initials?: string; phone1?: string; phone2?: string; issueType?: string }>;

      let issueTypeOverride: string | undefined;
      const ct = req.headers["content-type"] ?? "";
      if (ct.includes("text/csv") || ct.includes("text/plain")) {
        const raw = req.body as string;
        const qs = req.query as Record<string, string>;
        siteId = qs.siteId ?? "";
        issueTypeOverride = qs.issueTypeOverride;
        patientRows = parseCsvText(raw);
      } else {
        const body = req.body as { siteId?: string; patients?: unknown[]; issueTypeOverride?: string };
        siteId = body.siteId ?? "";
        issueTypeOverride = body.issueTypeOverride;
        patientRows = Array.isArray(body.patients) ? body.patients as typeof patientRows : [];
      }

      if (!siteId || !Array.isArray(patientRows)) {
        return res.status(400).json({ message: "siteId and patients array are required" });
      }

      const existing = await storage.getPatients(siteId);
      const existingMap = new Map<string, RetentionPatient>(
        existing.map((p) => [`${p.initials.trim().toUpperCase()}|${p.siteId}`, p])
      );

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of patientRows) {
        const initials = (row.initials ?? "").trim().toUpperCase();
        if (!initials) {
          errors.push("Row skipped: missing initials");
          continue;
        }
        const key = `${initials}|${siteId}`;
        const issueType = normalizeIssueType(issueTypeOverride ?? row.issueType ?? "");
        const phone1 = row.phone1 ?? "";
        const phone2 = row.phone2 ?? "";
        const existing = existingMap.get(key);
        try {
          if (existing) {
            const changed = existing.phone1 !== phone1 || existing.phone2 !== phone2 || existing.issueType !== issueType;
            if (changed) {
              await storage.updatePatient({ ...existing, phone1, phone2, issueType });
              imported++;
            } else {
              skipped++;
            }
          } else {
            await storage.addPatient({
              siteId,
              initials,
              issueType,
              dateAdded: new Date().toISOString().split("T")[0],
              attemptCount: 0,
              lastAttemptDate: null,
              attemptLog: [],
              notes: "",
              status: "active",
              resolvedDate: null,
              phone1,
              phone2,
              email: "",
              caseManagerContact: "",
              bin: "",
              pcn: "",
              rxgrp: "",
              insuranceId: "",
              city: "",
              state: "",
              zip: "",
              ahfLocationMatch: "",
              sequenceActive: false,
              sequenceDay: 0,
              sequenceStartDate: null,
              lastOutreachDate: null,
              outreachComplete: false,
              retentionReason: "",
            });
            imported++;
          }
        } catch (e) {
          errors.push(`Failed to import ${initials}: ${e instanceof Error ? e.message : "unknown error"}`);
        }
      }

      return res.json({ imported, skipped, errors });
    } catch (err) {
      return res.status(500).json({ message: "Import failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
