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
  // ── System / generic accounts ────────────────────────────────────────────────
  { email: "cpo@koheez.ai",               password: "AHF1", name: "Chief Pharmacy Officer" },
  { email: "cpo@aidshealth.org",           password: "AHF1", name: "Chief Pharmacy Officer" },
  { email: "jeremy.zellers@aidshealth.org",password: "AHF1", name: "Jeremy Zeller" },
  { email: "regionaldirector@koheez.ai",   password: "AHF1", name: "Regional Pharmacy Director" },
  { email: "regional@aidshealth.org",      password: "AHF1", name: "Regional Pharmacy Director" },
  { email: "negar.shirazpour@aidshealth.org", password: "AHF1", name: "Negar Shirazpour" },
  { email: "director@koheez.ai",           password: "AHF1", name: "Pharmacy Director" },
  { email: "techs@koheez.ai",              password: "AHF1", name: "Pharmacy Technician" },
  { email: "test@koheez.ai",               password: "AHF1", name: "Test User" },
  { email: "tech@koheez.ai",               password: "AHF1", name: "Data Entry Tech" },
  // ── RX Pike Street (1417) staff ─────────────────────────────────────────────
  { email: "seth.collins@aidshealth.org",  password: "AHF1", name: "Seth Collins" },
  { email: "claire.wood@aidshealth.org",   password: "AHF1", name: "Claire Wood" },
  { email: "pairiss.wilcox@aidshealth.org",password: "AHF1", name: "Pairiss Wilcox" },
  { email: "anh.do@aidshealth.org",        password: "AHF1", name: "Anh Do" },
  { email: "debbie.nguyen@aidshealth.org", password: "AHF1", name: "Debbie Nguyen" },
  { email: "uyen-vy.nguyen@aidshealth.org",password: "AHF1", name: "Uyen-Vy Nguyen" },
  { email: "roshanak.mohaghegh@ahfrx.org", password: "AHF1", name: "Roshanak Mohaghegh" },
  // ── Western Region pharmacy directors ───────────────────────────────────────
  { email: "ryan.leong@aidshealth.org",            password: "AHF1", name: "Ryan Leong" },
  { email: "jrockwoodpharmd@gmail.com",             password: "AHF1", name: "Jason Rockwood" },
  { email: "jason.rockwood@aidshealth.org",         password: "AHF1", name: "Jason Rockwood" },
  { email: "elizabeth.camper@aidshealth.org",       password: "AHF1", name: "Elizabeth Camper" },
  { email: "catalic.chavira@aidshealth.org",        password: "AHF1", name: "Catalic Chavira Mendoza" },
  { email: "kaylene.devries@aidshealth.org",        password: "AHF1", name: "Kaylene De Vries" },
  { email: "sam.toma@aidshealth.org",               password: "AHF1", name: "Sam Toma" },
  { email: "walid.mohammad@aidshealth.org",         password: "AHF1", name: "Walid Mohammad" },
  { email: "hiram.juarbe@aidshealth.org",           password: "AHF1", name: "Hiram Juarbe Torres" },
  { email: "juanpedro.flores@aidshealth.org",       password: "AHF1", name: "Juan Pedro Flores" },
  { email: "sam.badanat@aidshealth.org",            password: "AHF1", name: "Sam Badanat" },
  { email: "eric.azcheri@aidshealth.org",           password: "AHF1", name: "Eric Azcheri" },
  { email: "keyvan.shahriary@aidshealth.org",       password: "AHF1", name: "Keyvan Shahriary" },
  // ── Southern South Region pharmacy directors ─────────────────────────────────
  { email: "samantha.kim@aidshealth.org",           password: "AHF1", name: "Samantha Kim" },
  { email: "analis.martin@aidshealth.org",          password: "AHF1", name: "Analis Martin" },
  { email: "shadraka.mcintosh@aidshealth.org",      password: "AHF1", name: "Shadraka McIntosh" },
  { email: "zachary.kushner@aidshealth.org",        password: "AHF1", name: "Zachary Kushner" },
  { email: "venessa.diprima@aidshealth.org",        password: "AHF1", name: "Venessa DiPrima" },
  { email: "kristen.stokes@aidshealth.org",         password: "AHF1", name: "Kristen Stokes" },
  { email: "alejandra.levy@aidshealth.org",         password: "AHF1", name: "Alejandra Levy" },
  { email: "ryan.ford@aidshealth.org",              password: "AHF1", name: "Ryan Ford" },
  { email: "maksim.yermakov@aidshealth.org",        password: "AHF1", name: "Maksim Yermakov" },
  { email: "carlos.palacios@aidshealth.org",        password: "AHF1", name: "Carlos Palacios" },
  { email: "sean.williams@aidshealth.org",          password: "AHF1", name: "Sean Williams" },
  { email: "jonathan.flores@aidshealth.org",        password: "AHF1", name: "Jonathan Flores" },
  { email: "lonnie.strom@aidshealth.org",           password: "AHF1", name: "Lonnie Strom" },
  { email: "adrian.velazquez@aidshealth.org",       password: "AHF1", name: "Adrian Velazquez" },
  { email: "anthony.pierre@aidshealth.org",         password: "AHF1", name: "Anthony Pierre" },
  { email: "lisa.romo@aidshealth.org",              password: "AHF1", name: "Lisa Romo" },
  { email: "ladoucha.moore@aidshealth.org",         password: "AHF1", name: "LaDoucha Moore" },
  { email: "lynette.price@aidshealth.org",          password: "AHF1", name: "Lynette Price" },
  { email: "amanda.haddad@aidshealth.org",          password: "AHF1", name: "Amanda Haddad" },
  // ── Southern North Region pharmacy directors ─────────────────────────────────
  { email: "corey.woodward@aidshealth.org",         password: "AHF1", name: "Corey Woodward" },
  { email: "simone.mack@aidshealth.org",            password: "AHF1", name: "Simone Mack" },
  { email: "chandra.garner@aidshealth.org",         password: "AHF1", name: "Chandra Garner" },
  { email: "riko.charme@aidshealth.org",            password: "AHF1", name: "Riko Charme" },
  { email: "trisha.patel@aidshealth.org",           password: "AHF1", name: "Trisha Patel" },
  { email: "whitney.williams@aidshealth.org",       password: "AHF1", name: "Whitney Williams" },
  { email: "bobby.couch@aidshealth.org",            password: "AHF1", name: "Bobby Couch" },
  { email: "gregory.matuszewski@aidshealth.org",    password: "AHF1", name: "Gregory Matuszewski" },
  { email: "anna.galvan@aidshealth.org",            password: "AHF1", name: "Anna Galvan" },
  { email: "ankit.parikh@aidshealth.org",           password: "AHF1", name: "Ankit Parikh" },
  { email: "aruna.rajmohan@aidshealth.org",         password: "AHF1", name: "Aruna Rajmohan" },
  { email: "lashuta.johnson@aidshealth.org",        password: "AHF1", name: "LaShuta Johnson" },
  { email: "saloumeh.esmaeil@aidshealth.org",       password: "AHF1", name: "Saloumeh Esmaeil" },
  { email: "stella.uche@aidshealth.org",            password: "AHF1", name: "Stella Uche" },
  { email: "gino.ruggeri@aidshealth.org",           password: "AHF1", name: "Gino Ruggeri" },
  { email: "clark.stuart@aidshealth.org",           password: "AHF1", name: "Clark Stuart" },
  // ── Northern Region pharmacy directors ──────────────────────────────────────
  { email: "adaeze.akinsuanya@aidshealth.org",      password: "AHF1", name: "Adaeze Akinsuanya" },
  { email: "mack.parayo@aidshealth.org",            password: "AHF1", name: "Mack Parayo" },
  { email: "dominique.taylor@aidshealth.org",       password: "AHF1", name: "Dominique Taylor" },
  { email: "fishan.khalik@aidshealth.org",          password: "AHF1", name: "Fishan Khalik" },
  { email: "nicholas.bailey@aidshealth.org",        password: "AHF1", name: "Nicholas Bailey" },
  { email: "tarra.bryant@aidshealth.org",           password: "AHF1", name: "Tarra Bryant" },
  { email: "cory.silva@aidshealth.org",             password: "AHF1", name: "Cory Silva" },
  { email: "shane.hodges@aidshealth.org",           password: "AHF1", name: "Shane Hodges" },
  { email: "tamara.applewhite@aidshealth.org",      password: "AHF1", name: "Tamara Applewhite" },
  { email: "fareed.choudhry@aidshealth.org",        password: "AHF1", name: "Fareed Choudhry" },
  { email: "lawrence.goldstein@aidshealth.org",     password: "AHF1", name: "Lawrence Goldstein" },
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

        const patientLine = [
          `${data.age}-year-old`,
          data.pregnancy === "yes" ? "pregnant" : data.pregnancy === "no" ? "not pregnant" : "pregnancy status unknown",
          data.treatmentStatus === "naive" ? "treatment-naive" : "treatment-experienced",
        ].join(", ");

        const extraLines: string[] = [];
        if (data.cd4Count !== undefined) extraLines.push(`CD4 Count: ${data.cd4Count} cells/µL`);
        if (data.viralLoad !== undefined) extraLines.push(`HIV Viral Load: ${data.viralLoad.toLocaleString()} copies/mL`);
        if (data.egfr !== undefined) extraLines.push(`eGFR: ${data.egfr} mL/min/1.73m²`);
        if (data.hepaticFunction && data.hepaticFunction !== "normal") extraLines.push(`Hepatic Function: ${data.hepaticFunction} impairment`);
        if (data.hlab5701 && data.hlab5701 !== "unknown") extraLines.push(`HLA-B*5701: ${data.hlab5701}`);
        if (data.geneticResistanceNotes) extraLines.push(`Resistance Notes: ${data.geneticResistanceNotes}`);

        const prompt = [
          "I am a pharmacist reviewing a patient regimen. Please evaluate the following for treatment appropriateness and clinically significant drug-drug interactions:",
          "",
          `Patient: ${patientLine}`,
          ...extraLines,
          "",
          `ARV Regimen: ${selectedDrugDetails || (data.selectedDrugs.length > 0 ? data.selectedDrugs.join(" + ") : "None specified")}`,
          ...(regimenChangeBlock ? [regimenChangeBlock] : []),
          `Concomitant Medications: ${data.concomitantMeds.length > 0 ? data.concomitantMeds.join(", ") : "None"}`,
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
          "",
          "After the note, provide a JSON block in this exact format:",
          '{ "consultationQuestions": ["question 1", "question 2", ...] }',
          "Include 7-10 specific pharmacist counseling questions relevant to this patient's regimen and concomitant medications.",
        ].join("\n");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are an expert HIV clinical pharmacist. Write concise, evidence-based pharmacy consultation notes. Follow the note format exactly as instructed. After the note append a JSON block with consultation questions as instructed.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5,
        });

        const rawContent = completion.choices[0].message.content || "";

        // Separate the note from the trailing JSON block
        const jsonMatch = rawContent.match(/\{[\s\S]*"consultationQuestions"[\s\S]*\}/);
        let consultationQuestions: string[] = [];
        let clinicalSummary = rawContent.trim();

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            consultationQuestions = parsed.consultationQuestions || [];
            // Strip the JSON block from the displayed note
            clinicalSummary = rawContent.substring(0, rawContent.lastIndexOf(jsonMatch[0])).trim();
          } catch {
            // If parsing fails, keep full content as summary
          }
        }

        result.clinicalSummary = clinicalSummary || "Assessment could not be generated.";
        result.consultationQuestions = consultationQuestions;
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

  // ── AI Performance Evaluator ────────────────────────────────────────────────
  app.post("/api/ai/performance-query", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI not configured — OPENAI_API_KEY is missing." });
    }

    const schema = z.object({
      question: z.string().min(1).max(2000),
      context: z.object({
        scope: z.string(),
        date: z.string(),
        nationalOverall: z.number().optional(),
        regions: z.array(z.object({
          name: z.string(),
          overallAvg: z.number(),
          atRiskCount: z.number(),
          trend: z.string(),
          catAvgs: z.record(z.number()),
        })).optional(),
        atRiskStores: z.array(z.object({
          siteId: z.string(),
          siteName: z.string(),
          region: z.string(),
          overallAvg: z.number(),
          trend: z.string(),
        })).optional(),
        troubleCategories: z.array(z.object({
          category: z.string(),
          label: z.string(),
          avgPct: z.number(),
        })).optional(),
      }),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.issues });
    }

    const { question, context } = parsed.data;

    const systemPrompt = `You are Koheez AI, an expert clinical pharmacy performance analyst for AIDS Healthcare Foundation (AHF). AHF operates a national network of HIV specialty pharmacies. You help pharmacy leadership (CPO and Regional Pharmacy Directors) understand performance trends, identify at-risk stores, and make data-driven decisions.

Platform context:
- Task categories tracked: ACHC Compliance, State Board Compliance, Patient Retention Metrics, Operations
- Completion rates are measured daily; at-risk stores are those below 60% overall
- Regions: Western, Southern North, Southern South, Northern
- Your answers should be concise, actionable, and grounded in the provided data snapshot
- Do not make up store names or numbers not in the provided context
- Use plain, professional language suitable for pharmacy leadership

Performance snapshot for ${context.date}:
Scope: ${context.scope}
${context.nationalOverall !== undefined ? `National overall completion: ${context.nationalOverall}%` : ""}
${context.regions && context.regions.length > 0 ? `\nRegional breakdown:\n${context.regions.map(r => `  • ${r.name}: ${r.overallAvg}% overall (${r.atRiskCount} at-risk stores, trend: ${r.trend}) | ACHC: ${r.catAvgs.achc ?? "N/A"}%, State Board: ${r.catAvgs.state_board ?? "N/A"}%, Retention: ${r.catAvgs.retention ?? "N/A"}%, Operations: ${r.catAvgs.operations ?? "N/A"}%`).join("\n")}` : ""}
${context.atRiskStores && context.atRiskStores.length > 0 ? `\nAt-risk stores (below 60% overall):\n${context.atRiskStores.map(s => `  • ${s.siteName} (#${s.siteId}, ${s.region}): ${s.overallAvg}% overall, trend: ${s.trend}`).join("\n")}` : "\nNo stores currently flagged as at-risk."}
${context.troubleCategories && context.troubleCategories.length > 0 ? `\nLowest-performing categories:\n${context.troubleCategories.map(c => `  • ${c.label}: ${c.avgPct}% average`).join("\n")}` : ""}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.4,
        max_tokens: 800,
      });

      const answer = completion.choices[0].message.content ?? "No response generated.";
      return res.json({ answer });
    } catch (err) {
      console.error("[AI Performance Evaluator] OpenAI error:", err);
      return res.status(502).json({ message: "AI provider error — please try again shortly." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
