import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type { RetentionPatient } from "@shared/schema";
import OpenAI from "openai";
import { checkDrugInteractions } from "./lib/drugInteractions";
import { checkRenalFunction } from "./lib/renalValidation";
import { checkHepaticPregnancyFunction } from "./lib/hepaticPregnancyValidation";
import { generateClinicalRecommendations } from "./lib/clinicalRecommendations";
import { openEvidenceClient } from "./lib/openEvidence";
import { checkLiverpoolInteractions, isConfigured as liverpoolConfigured } from "./lib/liverpoolDDI";
import { hivDrugs } from "../client/src/lib/hivDrugs";
import {
  getUserProfile,
  getRoleLabel,
  isRegionalOrAbove,
  isDirectorRole,
  isPharmacyDirector,
  isCPO,
  getAssignedRegion,
  getRPDsByRegion,
  getCPOs,
  getDirectorsByStore,
  getStoreStaff,
  isKnownUser,
} from "../client/src/lib/userProfile";
import { sendEmail } from "./lib/outlookClient";
import {
  verifyTeamsSsoToken,
  getTeamsSsoConfig,
  isTeamsSsoConfigured,
  TeamsSsoError,
} from "./lib/teamsAuth";
import { findStoreRegion, ALL_STORES } from "../client/src/lib/storeDirectory";
import {
  upsertPharmacyHoursSchema,
  upsertStaffScheduleDefaultSchema,
  upsertScheduleEntrySchema,
  createScheduleSubmissionSchema,
  reviewScheduleSubmissionSchema,
  upsertQaAuditWorkbookSchema,
  qaAuditEvidenceUploadSchema,
  qaAuditFollowUpSchema,
  consentRecordSchema,
  upsertCqiMeetingSchema,
  signCqiMeetingSchema,
} from "@shared/schema";
import { QA_AUDIT_TOTAL_ITEMS } from "../client/src/lib/qaAuditData";
import { storage } from "./storage";
import { runOutreachNow } from "./lib/outreachScheduler";
import { logRetentionEvent } from "./lib/salesforceClient";
import { getViteInstance } from "./vite";

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
  { email: "laura.fields@aidshealth.org",  password: "AHF1", name: "Laura Fields" },
  { email: "anthony.leggio@aidshealth.org",password: "AHF1", name: "Anthony Leggio" },
  { email: "maryanna.golovash@aidshealth.org", password: "AHF1", name: "Maryanna Golovash" },
  { email: "brandon.patchett@aidshealth.org", password: "AHF1", name: "Brandon Patchett" },
  // ── RX Pike Street (1417) staff ─────────────────────────────────────────────
  { email: "seth.collins@aidshealth.org",  password: "AHF1", name: "Seth Collins" },
  { email: "claire.wood@aidshealth.org",   password: "AHF1", name: "Claire Wood" },
  { email: "micah.bergaguilar@aidshealth.org", password: "AHF1", name: "Micah Bergaguilar" },
  { email: "pairiss.wilcox@aidshealth.org",password: "AHF1", name: "Pairiss Wilcox" },
  { email: "anh.do@aidshealth.org",        password: "AHF1", name: "Anh Do" },
  { email: "debbie.nguyen@aidshealth.org", password: "AHF1", name: "Debbie Nguyen" },
  { email: "uyen-vy.nguyen@aidshealth.org",password: "AHF1", name: "Uyen-Vy Nguyen" },
  { email: "roshanak.mohaghegh@ahfrx.org", password: "AHF1", name: "Roshanak Mohaghegh" },
  { email: "roshanak.mohaghegh@aidshealth.org", password: "AHF1", name: "Roshanak Mohaghegh" },
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
  // ── RX Downtown (1402) — Western ────────────────────────────────────────────
  { email: "albert.chen@aidshealth.org",            password: "AHF1", name: "Albert Chen" },
];

const inMemoryUsers: Array<{ email: string; password: string; name: string }> = [];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY1 || process.env.OPENAI_API_KEY,
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

// Current quarter as "YYYY-Q#". Must match the client's getCurrentQuarter()
// (client/src/lib/taskStorage.ts) so past quarters are treated consistently.
function getServerCurrentQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Public crawlable info routes (must be before Vite catch-all) ─────────
  const KOHEEZ_INFO = {
    name: "Koheez.ai",
    tagline: "Clinical decision support and operational management for AHF HIV pharmacy leadership.",
    description:
      "Koheez.ai gives Pharmacy Directors, Regional Pharmacy Directors, and the Chief Pharmacy Officer at AIDS Healthcare Foundation (AHF) a single place to run their HIV pharmacies — covering daily operational tasks, regional and national dashboards, ACHC accreditation work, patient assistance programs, store performance, AI-assisted clinical assessments, and structured AI performance reviews.",
    audience: [
      "Pharmacy Directors (PDs)",
      "Regional Pharmacy Directors (RPDs)",
      "Chief Pharmacy Officer (CPO)",
      "Pharmacists",
      "Pharmacy Technicians",
    ],
    features: [
      { name: "Task Manager", description: "Role-based daily, weekly, and monthly tasks for directors, pharmacists, and technicians, with cross-role priority alerts." },
      { name: "Treatment Assessor", description: "AI-powered HIV and PrEP regimen review with drug-drug interaction checking, renal/hepatic guidance, and OpenEvidence-backed clinical notes." },
      { name: "ACHC Workbook", description: "Accreditation tracking and document vault for ACHC compliance." },
      { name: "Patient Assistance Programs", description: "Quick links and workflows for ADAP, manufacturer copay programs, and patient assistance." },
      { name: "Store Performance", description: "Regional and national dashboards covering script volume, revenue, retention, and operational KPIs by store." },
      { name: "AI Performance Evaluator", description: "Structured AI-assisted reviews of pharmacy and staff performance." },
      { name: "Retention Tracker", description: "Patient retention outreach with automated multi-day email and SMS sequences." },
    ],
  };

  // Resolve the production bundle/style asset tags once at startup by parsing
  // the built dist/public/index.html for the hashed `<script>` and
  // `<link rel="stylesheet">` tags Vite emitted. In development, the
  // unhashed `/src/main.tsx` entry is used and the assembled HTML is passed
  // through `vite.transformIndexHtml` at request time so HMR + plugin
  // preambles (e.g. React Fast Refresh) keep working.
  const isProd = process.env.NODE_ENV === "production";
  let prodBundleTags = "";
  if (isProd) {
    const distIndexPath = path.resolve(import.meta.dirname, "public", "index.html");
    const distHtml = fs.readFileSync(distIndexPath, "utf-8");
    const scriptMatches = distHtml.match(/<script[^>]*src="\/assets\/[^"]+"[^>]*>\s*<\/script>/g) || [];
    const styleMatches = distHtml.match(/<link[^>]*rel="stylesheet"[^>]*href="\/assets\/[^"]+"[^>]*>/g) || [];
    prodBundleTags = [...styleMatches, ...scriptMatches].join("\n    ");
    if (prodBundleTags === "") {
      throw new Error(
        `[routes] Could not find production bundle tags in ${distIndexPath}. ` +
        `Run "npm run build" before starting in production mode.`
      );
    }
  }

  const require = createRequire(import.meta.url);
  let appVersion = "1.0.0";
  try {
    appVersion = (require("../package.json") as { version?: string }).version ?? "1.0.0";
  } catch {
    // ignore
  }

  function buildIndexHtml(bundleTags: string): string {
    const featuresHtml = KOHEEZ_INFO.features
      .map((f) => `          <li><strong>${f.name}</strong> — ${f.description}</li>`)
      .join("\n");
    const audienceText = KOHEEZ_INFO.audience.join(", ");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>Koheez.ai — Clinical Decision Support &amp; Operations for HIV Pharmacy Leadership</title>
    <meta name="description" content="${KOHEEZ_INFO.tagline} ${KOHEEZ_INFO.description}" />
    <meta name="application-name" content="Koheez.ai" />
    <meta name="theme-color" content="#0b5fff" />
    <meta name="robots" content="index,follow" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Koheez.ai" />
    <meta property="og:title" content="Koheez.ai — Clinical Decision Support &amp; Operations for HIV Pharmacy Leadership" />
    <meta property="og:description" content="${KOHEEZ_INFO.tagline}" />

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Koheez.ai — Clinical Decision Support &amp; Operations for HIV Pharmacy Leadership" />
    <meta name="twitter:description" content="${KOHEEZ_INFO.tagline}" />

    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Fira+Code:wght@300..700&family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Outfit:wght@100..900&family=Oxanium:wght@200..800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100..900;1,100..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    <script>
      document.documentElement.classList.add("js-enabled");
    </script>
    <style>
      html.js-enabled #seo-shell,
      html.app-mounted #seo-shell { display: none !important; }
    </style>
    ${bundleTags}
  </head>
  <body>
    <div id="seo-shell">
      <header>
        <h1>Koheez.ai</h1>
        <p><strong>${KOHEEZ_INFO.tagline}</strong></p>
        <p>${KOHEEZ_INFO.description}</p>
      </header>
      <section>
        <h2>Key product areas</h2>
        <ul>
${featuresHtml}
        </ul>
      </section>
      <section>
        <h2>Who it's for</h2>
        <p>${audienceText}.</p>
      </section>
      <p><a href="/about">Learn more about Koheez.ai</a> · <a href="/info">Machine-readable summary (JSON)</a></p>
    </div>
    <div id="root"></div>
  </body>
</html>`;
  }

  app.get("/", async (req, res, next) => {
    try {
      let html: string;
      if (isProd) {
        html = buildIndexHtml(prodBundleTags);
      } else {
        // Dev: assemble HTML with the unhashed entry script, then delegate
        // to Vite's transformIndexHtml so HMR client + plugin preambles
        // (React Fast Refresh, etc.) are injected by Vite itself.
        const devEntryTag = `<script type="module" src="/src/main.tsx"></script>`;
        const rawHtml = buildIndexHtml(devEntryTag);
        const vite = getViteInstance();
        if (!vite) {
          // setupVite hasn't run yet (shouldn't happen by request time);
          // fall back to the raw HTML so the response is never broken.
          html = rawHtml;
        } else {
          html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        }
      }
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "no-cache");
      res.send(html);
    } catch (e) {
      next(e);
    }
  });

  app.get("/info", (_req, res) => {
    res.set("Cache-Control", "public, max-age=300");
    res.json({
      name: KOHEEZ_INFO.name,
      description: KOHEEZ_INFO.description,
      features: KOHEEZ_INFO.features,
      version: appVersion,
    });
  });

  app.get("/api/info", (_req, res) => {
    res.set("Cache-Control", "public, max-age=300");
    res.json(KOHEEZ_INFO);
  });

  app.get("/about", (_req, res) => {
    const featuresHtml = KOHEEZ_INFO.features
      .map((f) => `        <li><strong>${f.name}</strong> — ${f.description}</li>`)
      .join("\n");
    const audienceHtml = KOHEEZ_INFO.audience
      .map((a) => `        <li>${a}</li>`)
      .join("\n");
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>About Koheez.ai — Clinical Decision Support &amp; Operations for HIV Pharmacy Leadership</title>
    <meta name="description" content="${KOHEEZ_INFO.tagline} ${KOHEEZ_INFO.description}" />
    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Koheez.ai" />
    <meta property="og:title" content="About Koheez.ai" />
    <meta property="og:description" content="${KOHEEZ_INFO.tagline}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="About Koheez.ai" />
    <meta name="twitter:description" content="${KOHEEZ_INFO.tagline}" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif; max-width: 760px; margin: 2.5rem auto; padding: 0 1.25rem; color: #1a1a1a; line-height: 1.55; }
      h1 { font-size: 2rem; margin-bottom: 0.25rem; }
      h2 { font-size: 1.2rem; margin-top: 2rem; }
      .tagline { color: #555; font-size: 1.05rem; margin-top: 0; }
      ul { padding-left: 1.25rem; }
      li { margin-bottom: 0.5rem; }
      a { color: #0b5fff; }
      footer { margin-top: 2.5rem; color: #888; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <header>
      <h1>Koheez.ai</h1>
      <p class="tagline">${KOHEEZ_INFO.tagline}</p>
    </header>
    <section>
      <h2>What it is</h2>
      <p>${KOHEEZ_INFO.description}</p>
    </section>
    <section>
      <h2>Key product areas</h2>
      <ul>
${featuresHtml}
      </ul>
    </section>
    <section>
      <h2>Who it's for</h2>
      <ul>
${audienceHtml}
      </ul>
    </section>
    <footer>
      <p><a href="/">Open the Koheez.ai app</a> · <a href="/api/info">Machine-readable summary (JSON)</a></p>
    </footer>
  </body>
</html>`;
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    res.send(html);
  });

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

  // ── Microsoft Teams SSO ────────────────────────────────────────────────────
  // Non-secret config the Teams frontend needs to request an Entra token.
  app.get("/api/teams-config", (_req, res) => {
    const cfg = getTeamsSsoConfig();
    return res.json({
      enabled: cfg !== null,
      clientId: cfg?.clientId ?? null,
      resource: cfg?.resource ?? null,
    });
  });

  // Exchange a validated Entra access token for an app session. Identity is the
  // user's AHF work email, reused against the same PROFILE_MAP as browser login.
  app.post("/api/auth/teams-sso-login", async (req, res) => {
    if (!isTeamsSsoConfigured()) {
      return res.status(503).json({ error: "Microsoft Teams SSO is not configured" });
    }
    const { token } = req.body as { token?: string };
    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }
    try {
      const { email, name } = await verifyTeamsSsoToken(token);
      // Only provisioned AHF users may sign in via Teams.
      if (!isKnownUser(email)) {
        return res.status(403).json({ error: "Your account is not provisioned for Koheez.ai" });
      }
      req.session.userId = email;
      req.session.user = { email, name };
      await recordAccess(req, "auth.teams-sso-login", "session");
      return res.json({ user: req.session.user });
    } catch (err) {
      if (err instanceof TeamsSsoError) {
        return res.status(401).json({ error: err.message });
      }
      return res.status(500).json({ error: "Teams sign-in failed" });
    }
  });

  // ── HIPAA access audit helper ──────────────────────────────────────────────
  // Records WHO did WHAT and WHEN against PHI-bearing endpoints. The entry never
  // contains PHI itself — `resource` holds only non-PHI identifiers.
  async function recordAccess(req: any, action: string, resource: string) {
    try {
      const email = (req.session?.userId as string) ?? "anonymous";
      const name = req.session?.user?.name ?? "";
      const role = getUserProfile(email, name).role;
      await storage.addAuditLog({
        at: new Date().toISOString(),
        actorEmail: email,
        actorName: name,
        role,
        action,
        resource,
        method: req.method,
        path: req.path,
      });
    } catch (err) {
      console.warn("[audit-log] failed to record access:", err);
    }
  }

  // CPO-only view of the HIPAA access audit log.
  app.get("/api/audit-log", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const email = req.session.userId as string;
    const name = req.session.user?.name ?? "";
    const profile = getUserProfile(email, name);
    if (!isCPO(profile.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const entries = await storage.listAuditLogs(limit);
    return res.json(entries);
  });

  // ── Assessment route ──────────────────────────────────────────────────────
  // Requires auth: this endpoint processes patient clinical inputs (PHI), so a
  // real authenticated actor must be attributable in the access audit log.
  app.post("/api/assessment", requireAuth, async (req, res) => {
    try {
      const data = assessmentRequestSchema.parse(req.body);

      if (data.selectedDrugs.length === 0) {
        return res.status(400).json({ error: "At least one HIV medication must be selected" });
      }

      await recordAccess(req, "assessment.generate", "assessment");

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
    consent: consentRecordSchema,
  });

  app.post("/api/generate-note", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const data = generateNoteSchema.parse(req.body);
      const sessionEmail = req.session.userId as string;
      const sessionName = req.session.user?.name ?? "";
      const sessionProfile = getUserProfile(sessionEmail, sessionName);
      await recordAccess(req, "note.generate", "note");
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

1. PATIENT CONTEXT
Reproduce the relevant patient demographics, regimen, labs, allergies, comorbidities, and any other clinical context provided above. Include the Patient Assistance (PAP) Eligibility block (program availability, the patient's answers to each eligibility question, or the documented reason PAP is not applicable) verbatim where it appears in the patient context.

2. PATIENT CLINICAL SUMMARY
Concise narrative overview of patient demographics, HIV status, and treatment context derived from the Patient Context above.

3. REGIMEN ASSESSMENT
Evaluation of the ARV regimen appropriateness based on the clinical profile and OpenEvidence findings.

4. DRUG INTERACTION SUMMARY
Key drug-drug interaction findings and their clinical significance.

5. CLINICAL RECOMMENDATIONS
Evidence-based recommendations derived from the OpenEvidence response above. When you quote or paraphrase the OpenEvidence response, preserve its original formatting (numbered lists, bullets, headers, line breaks). PAP / financial-access recommendations should be included here when programs are available, or omitted if PAP was marked not applicable.

6. PATIENT COUNSELING POINTS
Key points addressed during the consultation, referencing the consultation questions.

7. FOLLOW-UP PLAN
Recommended monitoring parameters and follow-up timeline.

FORMATTING RULES (strict):
- Write in professional clinical language for medical record documentation. Be specific and evidence-based.
- Do NOT use any Markdown emphasis characters in your own writing — no asterisks (*, **), no underscores for emphasis (_, __), no backticks, no Markdown headings (#). Use plain text with section numbers/titles in ALL CAPS exactly as shown above.
- Use plain hyphens ("- ") for any bullets you create.
- The single exception is when you are reproducing the OpenEvidence response itself: keep its original characters and line breaks exactly as provided, including any asterisks or other formatting it contains. Do not add new asterisks of your own anywhere.`;

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

      const rawNote = completion.choices[0].message.content || "";
      // Bind signer identity to the authenticated session — never trust
      // client-supplied signerName / signerRole on a legal consent record.
      const authoritativeSignerName = sessionProfile.name || sessionName || sessionEmail;
      const authoritativeSignerRole = getRoleLabel(sessionProfile.role);
      const c = data.consent;
      const consentFooter = [
        "",
        "────────────────────────────────────────",
        "PHARMACIST CONSENT",
        `Signed by: ${authoritativeSignerName} (${authoritativeSignerRole})`,
        `Account: ${sessionEmail}`,
        `Typed signature: ${c.typedName}`,
        `Signed at: ${c.timestamp}`,
        `Waiver version: ${c.waiverVersion}`,
      ].join("\n");
      const note = `${rawNote.replace(/\s+$/, "")}\n${consentFooter}\n`;

      res.json({ note });
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
      if (!process.env.OPENAI_API_KEY1 && !process.env.OPENAI_API_KEY) {
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

  // ── Client store: server-side backing for browser localStorage ─────────────
  // Only known app store keys are accepted so the table can't be used as an
  // arbitrary dump. Values are whole-store JSON blobs (last write wins per key).
  const CLIENT_STORE_KEYS = new Set([
    "koheez_task_completions",
    "koheez_task_assignments",
    "koheez_task_priorities",
    "koheez_urgent_tasks",
    "koheez_handoff_notes",
    "koheez_achc_workbook",
    "koheez_retention_risk",
    "koheez_staff_roster",
    "koheez_achc_foundation_docs",
    "koheez_achc_store_docs",
    "koheez_task_counters",
    "koheez_custom_tasks",
    "koheez_deleted_custom_tasks",
    "koheez_controlled_inventory",
    "koheez_controlled_adjustments",
    "koheez_controlled_biannual",
    "koheez_custom_controlled_catalog",
    "koheez_assessments",
  ]);

  app.get("/api/client-store", requireAuth, async (_req, res) => {
    try {
      const stores = await storage.getClientStores();
      res.json(stores.filter((s) => CLIENT_STORE_KEYS.has(s.storeKey)));
    } catch (err) {
      console.error("[client-store] read failed:", err);
      res.status(500).json({ message: "Failed to load saved data" });
    }
  });

  app.put("/api/client-store/:key", requireAuth, async (req, res) => {
    try {
      const key = req.params.key;
      if (!CLIENT_STORE_KEYS.has(key)) {
        return res.status(400).json({ message: "Unknown store key" });
      }
      await storage.setClientStore(key, req.body?.value ?? null);
      res.json({ ok: true });
    } catch (err) {
      console.error("[client-store] write failed:", err);
      res.status(500).json({ message: "Failed to save data" });
    }
  });

  function fireSalesforce(phone: string, initials: string, event: string, detail: string) {
    if (phone) logRetentionEvent(phone, initials, event, detail).catch(() => {});
  }

  // ── CQI-QRE Meeting: email team members to sign attendance ──────────────────
  app.post("/api/cqi/email-signers", requireAuth, async (req, res) => {
    try {
      const sessionEmail = req.session.userId as string;
      const sessionName = req.session.user?.name ?? "";
      const profile = getUserProfile(sessionEmail, sessionName);

      if (!isDirectorRole(profile.role)) {
        return res.status(403).json({ message: "Only pharmacy directors can email the team to sign." });
      }

      const body = req.body ?? {};
      // Pharmacy directors are locked to their own store; regional/CPO may target a store.
      const siteId: string = isPharmacyDirector(profile.role)
        ? profile.siteId
        : (typeof body.siteId === "string" && body.siteId ? body.siteId : profile.siteId);
      const quarter: string =
        typeof body.quarter === "string" && body.quarter.trim()
          ? body.quarter.trim().slice(0, 40)
          : "this quarter";

      const staff = getStoreStaff(siteId);
      const allowed = new Map(staff.map((m) => [m.email.toLowerCase(), m]));

      // Recipients: client may pass a subset of emails; default to the whole store.
      const requested: string[] =
        Array.isArray(body.emails) && body.emails.length > 0
          ? body.emails.filter((e: unknown): e is string => typeof e === "string")
          : staff.map((m) => m.email);

      // Only email people who are actually on this store's roster, never the sender,
      // and never the same address twice.
      const seen = new Set<string>();
      const recipients = requested
        .map((e) => allowed.get(e.toLowerCase()))
        .filter((m): m is NonNullable<typeof m> => {
          if (!m) return false;
          const key = m.email.toLowerCase();
          if (key === sessionEmail.toLowerCase() || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No valid team members to email for this store." });
      }

      const configured = !!process.env.OUTLOOK_ACCESS_TOKEN;
      const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
      const signLink = `${baseUrl}/app/cqi-meeting`;
      const subject = `Action Required: Sign the CQI-QRE Quarterly Meeting (${quarter})`;

      const results: { email: string; ok: boolean }[] = [];
      for (const m of recipients) {
        const text =
          `Hello ${m.name},\n\n` +
          `${profile.name} is requesting that you electronically sign the CQI-QRE Quarterly ` +
          `Meeting attendance record for ${profile.siteName} (${quarter}).\n\n` +
          `Sign here: ${signLink}\n\n` +
          `Open Koheez.ai, go to the CQI Meeting page, and click "Sign Attendance" to confirm ` +
          `your participation.\n\nThank you,\nKoheez.ai`;
        const ok = configured ? await sendEmail(m.email, subject, text) : false;
        results.push({ email: m.email, ok });
      }

      await recordAccess(req, "cqi.email_signers", siteId);

      const sent = results.filter((r) => r.ok).length;
      return res.json({
        configured,
        sent,
        failed: results.length - sent,
        total: results.length,
        results,
      });
    } catch (err) {
      console.error("[CQI] email-signers error:", err);
      return res.status(500).json({ message: "Failed to send meeting sign requests." });
    }
  });

  // ── CQI-QRE Quarterly Meeting: shared site-level record ──────────────────
  // Directors edit the meeting details; all staff at the site (technicians,
  // staff pharmacists, etc.) can view it read-only and sign attendance.

  // Read the meeting for a site/quarter. Any staff member assigned to the site
  // (or a director who oversees it) may view.
  // List all saved meetings for a site (lightweight summaries for the archive).
  // Same view access as the current meeting.
  app.get("/api/cqi/:siteId/meetings", requireAuth, async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const meetings = await storage.listCqiMeetings(siteId);
    await recordAccess(req, "cqi.meeting.list", siteId);
    return res.json(meetings);
  });

  app.get("/api/cqi/:siteId/meeting", requireAuth, async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    const quarter = String(req.query.quarter ?? "");
    if (!quarter) return res.status(400).json({ message: "quarter query param is required" });
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const record = await storage.getCqiMeeting(siteId, quarter);
    await recordAccess(req, "cqi.meeting.read", siteId);
    return res.json(record ?? null);
  });

  // Save the meeting details. Directors (and above, for their scope) only.
  app.put("/api/cqi/:siteId/meeting", requireAuth, async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    const parsed = upsertCqiMeetingSchema.safeParse({ ...req.body, siteId });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid meeting data", errors: parsed.error.issues });
    }
    if (!access.canEditSite(siteId)) {
      return res.status(403).json({ message: "Only directors can edit the meeting form." });
    }
    if (parsed.data.quarter !== getServerCurrentQuarter()) {
      return res
        .status(403)
        .json({ message: "Past quarters are read-only and cannot be edited." });
    }
    const record = await storage.upsertCqiMeeting(parsed.data, {
      email: access.profile.email,
      name: access.profile.name,
    });
    await recordAccess(req, "cqi.meeting.save", siteId);
    return res.json(record);
  });

  // Sign attendance. Any staff member assigned to the site may sign.
  app.post("/api/cqi/:siteId/meeting/sign", requireAuth, async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    const quarter = String(req.query.quarter ?? req.body?.quarter ?? "");
    if (!quarter) return res.status(400).json({ message: "quarter query param is required" });
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    if (quarter !== getServerCurrentQuarter()) {
      return res
        .status(403)
        .json({ message: "Past quarters are read-only and cannot be signed." });
    }
    const parsed = signCqiMeetingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid signature", errors: parsed.error.issues });
    }
    const record = await storage.signCqiMeeting(
      siteId,
      quarter,
      {
        userEmail: access.profile.email,
        printName: parsed.data.printName,
        signatureName: parsed.data.signatureName,
        role: access.profile.role,
      },
      { siteName: parsed.data.siteName, pharmacyLocation: parsed.data.pharmacyLocation },
    );
    await recordAccess(req, "cqi.meeting.sign", siteId);
    return res.json(record);
  });

  app.get("/api/retention/patients/:siteId", requireAuth, async (req, res) => {
    try {
      const patients = await storage.getPatients(req.params.siteId);
      await recordAccess(req, "patient.read", req.params.siteId);
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
      await recordAccess(req, "patient.create", patient.id);
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
      await recordAccess(req, "patient.update", updated.id);
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
      await recordAccess(req, "patient.delete", req.params.id);
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

  // ── Scheduling API ─────────────────────────────────────────────────────────

  function getSiteAccess(req: any):
    | { ok: true; profile: ReturnType<typeof getUserProfile>; canEditSite: (siteId: string) => boolean; canViewSite: (siteId: string) => boolean }
    | { ok: false; status: number; message: string } {
    const sessionEmail = req.session?.userId;
    if (!sessionEmail) return { ok: false, status: 401, message: "Not authenticated" };
    const profile = getUserProfile(sessionEmail, req.session.user?.name ?? "");
    const region = getAssignedRegion(profile);
    const canEditSite = (siteId: string) => {
      if (!isDirectorRole(profile.role)) return false;
      if (isCPO(profile.role)) return true;
      if (isPharmacyDirector(profile.role)) return profile.siteId === siteId;
      // RPD — same region
      const sr = findStoreRegion(siteId);
      return !!sr && !!region && sr.region === region;
    };
    const canViewSite = (siteId: string) => {
      if (canEditSite(siteId)) return true;
      // Non-director staff can view the schedule for their own assigned site only.
      return !!profile.siteId && profile.siteId !== "ALL" && profile.siteId === siteId;
    };
    return { ok: true, profile, canEditSite, canViewSite };
  }

  // List sites this user is allowed to schedule for (used by the picker).
  app.get("/api/scheduling/sites", (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    // PD and non-director site staff: only their own site.
    if (
      isPharmacyDirector(access.profile.role) ||
      !isDirectorRole(access.profile.role)
    ) {
      if (!access.profile.siteId || access.profile.siteId === "ALL") {
        return res.json([]);
      }
      const region = findStoreRegion(access.profile.siteId)?.region ?? null;
      return res.json([
        {
          id: access.profile.siteId,
          name: access.profile.siteName,
          region,
        },
      ]);
    }
    const region = getAssignedRegion(access.profile);
    const stores = ALL_STORES
      .filter((s) => access.canViewSite(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        region: findStoreRegion(s.id)?.region ?? region,
      }));
    return res.json(stores);
  });

  app.get("/api/scheduling/:siteId/hours", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const hours = await storage.getPharmacyHours(siteId);
    return res.json(hours ?? null);
  });

  app.put("/api/scheduling/:siteId/hours", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canEditSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const parsed = upsertPharmacyHoursSchema.safeParse({ ...req.body, siteId });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid hours payload", errors: parsed.error.issues });
    }
    const hours = await storage.upsertPharmacyHours(parsed.data);
    return res.json(hours);
  });

  app.get("/api/scheduling/:siteId/defaults", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const defaults = await storage.getStaffScheduleDefaults(siteId);
    return res.json(defaults);
  });

  app.put("/api/scheduling/:siteId/defaults/:staffId", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId, staffId } = req.params;
    if (!access.canEditSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const parsed = upsertStaffScheduleDefaultSchema.safeParse({ ...req.body, siteId, staffId });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid default payload", errors: parsed.error.issues });
    }
    const record = await storage.upsertStaffScheduleDefault(parsed.data);
    return res.json(record);
  });

  app.delete("/api/scheduling/:siteId/defaults/:staffId", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId, staffId } = req.params;
    if (!access.canEditSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    await storage.deleteStaffScheduleDefault(siteId, staffId);
    return res.json({ ok: true });
  });

  app.get("/api/scheduling/:siteId/entries", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const from = String(req.query.from ?? "");
    const to = String(req.query.to ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ message: "from and to query params (YYYY-MM-DD) are required" });
    }
    const entries = await storage.getScheduleEntries(siteId, from, to);
    return res.json(entries);
  });

  app.put("/api/scheduling/:siteId/entries", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canEditSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const parsed = upsertScheduleEntrySchema.safeParse({ ...req.body, siteId });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid entry payload", errors: parsed.error.issues });
    }
    const entry = await storage.upsertScheduleEntry(parsed.data);
    return res.json(entry);
  });

  app.delete("/api/scheduling/:siteId/entries/:staffId/:date", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId, staffId, date } = req.params;
    if (!access.canEditSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }
    await storage.deleteScheduleEntry(siteId, staffId, date);
    return res.json({ ok: true });
  });

  // ── Schedule Submissions (PD → RPD review) ────────────────────────────

  function formatWeekRange(weekStart: string): string {
    // weekStart is YYYY-MM-DD (Sunday). Build a friendly "MMM D – MMM D, YYYY".
    const [y, m, d] = weekStart.split("-").map((n) => parseInt(n, 10));
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 6);
    const fmt = (dt: Date) =>
      dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
  }

  // PD submits the displayed week to their RPD(s) for review.
  app.post("/api/scheduling/:siteId/submissions", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    // Only the Pharmacy Director of this store may submit (not CPO/RPD/non-director).
    if (!isPharmacyDirector(access.profile.role) || access.profile.siteId !== siteId) {
      return res.status(403).json({ message: "Only the store's Pharmacy Director can submit." });
    }
    const parsed = createScheduleSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid submission payload", errors: parsed.error.issues });
    }
    const region = findStoreRegion(siteId)?.region;
    const siteName = findStoreRegion(siteId)?.stores.find((s) => s.id === siteId)?.name
      ?? access.profile.siteName;
    if (!region) return res.status(400).json({ message: "Site has no region configured" });

    const submission = await storage.createScheduleSubmission({
      siteId,
      siteName,
      region,
      weekStart: parsed.data.weekStart,
      submittedByEmail: access.profile.email,
      submittedByName: access.profile.name || access.profile.email,
      submitterNote: parsed.data.submitterNote,
    });

    // Notify all RPDs of this region (and CPOs).
    const recipients = [...getRPDsByRegion(region), ...getCPOs()];
    const seen = new Set<string>();
    const friendlyWeek = formatWeekRange(parsed.data.weekStart);
    for (const r of recipients) {
      const key = r.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      await storage.addNotification({
        toEmail: r.email,
        type: "schedule_submitted",
        title: `Schedule submitted: ${siteName}`,
        body: `${submission.submittedByName} submitted the schedule for the week of ${friendlyWeek} for review.${parsed.data.submitterNote ? ` Note: ${parsed.data.submitterNote}` : ""}`,
        link: `/app/scheduling?site=${siteId}&week=${parsed.data.weekStart}`,
        submissionId: submission.id,
        siteId,
        siteName,
        weekStart: parsed.data.weekStart,
        fromName: submission.submittedByName,
      });
    }

    return res.json(submission);
  });

  // Get the latest submission for a site/week (or list all for site).
  app.get("/api/scheduling/:siteId/submissions", async (req, res) => {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { siteId } = req.params;
    if (!access.canViewSite(siteId)) {
      return res.status(403).json({ message: "Not authorized for this site" });
    }
    const weekStart = String(req.query.weekStart ?? "");
    if (weekStart) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
        return res.status(400).json({ message: "weekStart must be YYYY-MM-DD" });
      }
      const sub = await storage.getLatestSubmissionForWeek(siteId, weekStart);
      return res.json(sub ?? null);
    }
    const list = await storage.getScheduleSubmissionsForSite(siteId);
    return res.json(list);
  });

  // Approve or request-changes on a submission. RPD (same region) or CPO only.
  async function reviewHandler(
    req: any,
    res: any,
    nextStatus: "approved" | "changes_requested",
  ) {
    const access = getSiteAccess(req);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const { id } = req.params;
    const submission = await storage.getScheduleSubmission(id);
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    // Only RPD of region or CPO can review.
    const isReviewer =
      isCPO(access.profile.role) ||
      (access.profile.role === "regional_pharmacy_director" &&
        getAssignedRegion(access.profile) === submission.region);
    if (!isReviewer) {
      return res.status(403).json({ message: "Only the Regional Director or CPO can review." });
    }
    const parsed = reviewScheduleSubmissionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid review payload", errors: parsed.error.issues });
    }
    if (nextStatus === "changes_requested" && !parsed.data.reviewNote) {
      return res.status(400).json({ message: "A note is required when requesting changes." });
    }
    const reviewerName = access.profile.name || access.profile.email;
    const updated = await storage.reviewScheduleSubmission(
      id,
      nextStatus,
      { email: access.profile.email, name: reviewerName },
      parsed.data.reviewNote,
    );
    if (!updated) return res.status(404).json({ message: "Submission not found" });

    // Notify the original submitter.
    const friendlyWeek = formatWeekRange(submission.weekStart);
    await storage.addNotification({
      toEmail: submission.submittedByEmail,
      type: nextStatus === "approved" ? "schedule_approved" : "schedule_changes_requested",
      title:
        nextStatus === "approved"
          ? `Schedule approved: ${submission.siteName}`
          : `Changes requested: ${submission.siteName}`,
      body:
        nextStatus === "approved"
          ? `${reviewerName} approved the schedule for the week of ${friendlyWeek}.${parsed.data.reviewNote ? ` Note: ${parsed.data.reviewNote}` : ""}`
          : `${reviewerName} requested changes to the schedule for the week of ${friendlyWeek}. Note: ${parsed.data.reviewNote}`,
      link: `/app/scheduling?site=${submission.siteId}&week=${submission.weekStart}`,
      submissionId: submission.id,
      siteId: submission.siteId,
      siteName: submission.siteName,
      weekStart: submission.weekStart,
      fromName: reviewerName,
    });

    return res.json(updated);
  }
  app.post("/api/scheduling/submissions/:id/approve", (req, res) =>
    reviewHandler(req, res, "approved"),
  );
  app.post("/api/scheduling/submissions/:id/request-changes", (req, res) =>
    reviewHandler(req, res, "changes_requested"),
  );

  // ── Notifications ─────────────────────────────────────────────────────

  app.get("/api/notifications", async (req, res) => {
    const sessionEmail = req.session?.userId;
    if (!sessionEmail) return res.status(401).json({ message: "Not authenticated" });
    const list = await storage.getNotifications(sessionEmail);
    return res.json(list);
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    const sessionEmail = req.session?.userId;
    if (!sessionEmail) return res.status(401).json({ message: "Not authenticated" });
    await storage.markNotificationRead(req.params.id, sessionEmail);
    return res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    const sessionEmail = req.session?.userId;
    if (!sessionEmail) return res.status(401).json({ message: "Not authenticated" });
    await storage.markAllNotificationsRead(sessionEmail);
    return res.json({ ok: true });
  });

  // ── QA Audit Workbooks ────────────────────────────────────────────────

  function getQaAuditUser(req: any):
    | { ok: true; profile: ReturnType<typeof getUserProfile>; user: { email: string; name: string } }
    | { ok: false; status: number; message: string } {
    const sessionEmail = req.session?.userId;
    if (!sessionEmail) return { ok: false, status: 401, message: "Not authenticated" };
    const profile = getUserProfile(sessionEmail, req.session.user?.name ?? "");
    return { ok: true, profile, user: { email: sessionEmail, name: profile.name } };
  }

  // Pharmacy Director may edit only their own store's workbook.
  function canEditQaAudit(profile: ReturnType<typeof getUserProfile>, siteId: string): boolean {
    return isPharmacyDirector(profile.role) && profile.siteId === siteId;
  }

  // PD = own site; RPD = sites in their region; CPO = all sites.
  function canViewQaAudit(profile: ReturnType<typeof getUserProfile>, siteId: string): boolean {
    if (!isDirectorRole(profile.role)) return false;
    if (isCPO(profile.role)) return true;
    if (isPharmacyDirector(profile.role)) return profile.siteId === siteId;
    const region = getAssignedRegion(profile);
    const sr = findStoreRegion(siteId);
    return !!sr && !!region && sr.region === region;
  }

  app.get("/api/qa-audit/workbooks", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    if (!isDirectorRole(auth.profile.role)) {
      return res.status(403).json({ message: "Access restricted to Pharmacy Directors and above." });
    }
    const year = typeof req.query.year === "string" ? req.query.year : undefined;
    const list = await storage.listQaAuditWorkbooks(year);
    const filtered = list.filter((w) => canViewQaAudit(auth.profile, w.siteId));
    return res.json(filtered);
  });

  app.get("/api/qa-audit/workbooks/:siteId/:year", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    if (!canViewQaAudit(auth.profile, req.params.siteId)) {
      return res.status(403).json({ message: "You do not have permission to view this site's audit." });
    }
    const wb = await storage.getQaAuditWorkbook(req.params.siteId, req.params.year);
    return res.json(wb ?? null);
  });

  app.put("/api/qa-audit/workbooks/:siteId/:year", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    const parsed = upsertQaAuditWorkbookSchema.safeParse({
      ...req.body,
      siteId: req.params.siteId,
      year: req.params.year,
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid workbook data", errors: parsed.error.errors });
    }
    if (!canEditQaAudit(auth.profile, parsed.data.siteId)) {
      return res.status(403).json({ message: "Only the assigned Pharmacy Director may edit this site's audit." });
    }
    const wb = await storage.upsertQaAuditWorkbook(parsed.data, auth.user);
    return res.json(wb);
  });

  app.post("/api/qa-audit/workbooks/:siteId/:year/submit", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    if (!canEditQaAudit(auth.profile, req.params.siteId)) {
      return res.status(403).json({ message: "Only the assigned Pharmacy Director may submit this site's audit." });
    }
    const existing = await storage.getQaAuditWorkbook(req.params.siteId, req.params.year);
    if (!existing) {
      return res.status(404).json({ message: "Workbook not found — save responses before submitting." });
    }
    const answered = existing.responses.filter((r) => !!r.status).length;
    if (answered < QA_AUDIT_TOTAL_ITEMS) {
      return res.status(400).json({
        message: `All ${QA_AUDIT_TOTAL_ITEMS} items must be answered before submitting (currently ${answered}).`,
      });
    }
    const wb = await storage.submitQaAuditWorkbook(req.params.siteId, req.params.year, auth.user);
    return res.json(wb);
  });

  // Whitelist of safe MIME types for evidence uploads. Inline rendering is
  // only permitted for image types; PDFs are sent as attachments. Anything
  // else is rejected to avoid stored XSS via SVG/HTML/JS payloads.
  const QA_EVIDENCE_INLINE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
  ]);
  const QA_EVIDENCE_ATTACHMENT_TYPES = new Set(["application/pdf"]);

  app.post("/api/qa-audit/evidence", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    const parsed = qaAuditEvidenceUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid evidence upload", errors: parsed.error.errors });
    }
    if (!canEditQaAudit(auth.profile, parsed.data.siteId)) {
      return res.status(403).json({ message: "Only the assigned Pharmacy Director may upload evidence for this site." });
    }
    const ft = (parsed.data.fileType || "").toLowerCase();
    if (!QA_EVIDENCE_INLINE_TYPES.has(ft) && !QA_EVIDENCE_ATTACHMENT_TYPES.has(ft)) {
      return res.status(400).json({
        message:
          "Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF, HEIC, or PDF.",
      });
    }
    let buffer: Buffer;
    try {
      buffer = Buffer.from(parsed.data.dataBase64, "base64");
    } catch {
      return res.status(400).json({ message: "Invalid base64 payload" });
    }
    const MAX_BYTES = 10 * 1024 * 1024;
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      return res.status(400).json({ message: "File must be between 1 byte and 10 MB" });
    }
    const file = await storage.addQaAuditEvidence({
      fileName: parsed.data.fileName,
      fileType: ft,
      uploadedBy: auth.user.name,
      siteId: parsed.data.siteId,
      year: parsed.data.year,
      data: buffer,
    });
    return res.json({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt,
      siteId: file.siteId,
      year: file.year,
    });
  });

  app.get("/api/qa-audit/evidence/:id", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    const file = await storage.getQaAuditEvidence(req.params.id);
    if (!file) return res.status(404).json({ message: "Evidence not found" });
    if (!canViewQaAudit(auth.profile, file.siteId)) {
      return res.status(403).json({ message: "You do not have permission to view this evidence." });
    }
    const ft = (file.fileType || "").toLowerCase();
    const isInlineSafe = QA_EVIDENCE_INLINE_TYPES.has(ft);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Type",
      isInlineSafe ? ft : "application/octet-stream",
    );
    const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `${isInlineSafe ? "inline" : "attachment"}; filename="${safeName}"`,
    );
    return res.end(file.data);
  });

  // Send a failing-item follow-up to the site's Pharmacy Director(s):
  //  1) creates an urgent server-persisted QaAuditTask assigned to each PD
  //     (visible in their Task Manager + survives sessions),
  //  2) records the first task id back on the workbook response so the
  //     "sent" state is durable and visible to every viewer,
  //  3) sends a notification linking back to the failing item.
  app.post("/api/qa-audit/follow-up", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    const parsed = qaAuditFollowUpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid follow-up payload", errors: parsed.error.errors });
    }
    if (!canViewQaAudit(auth.profile, parsed.data.siteId)) {
      return res.status(403).json({ message: "You do not have permission to file a follow-up for this site." });
    }
    const store = ALL_STORES.find((s) => s.id === parsed.data.siteId);
    const siteName = store?.name ?? parsed.data.siteId;
    const link = `/app/qa-audit?site=${encodeURIComponent(parsed.data.siteId)}&year=${encodeURIComponent(parsed.data.year)}&item=${encodeURIComponent(parsed.data.itemId)}`;
    const directors = getDirectorsByStore(parsed.data.siteId);
    const taskIds: string[] = [];
    const notificationIds: string[] = [];
    for (const d of directors) {
      const t = await storage.addQaAuditTask({
        siteId: parsed.data.siteId,
        siteName,
        year: parsed.data.year,
        itemId: parsed.data.itemId,
        itemTitle: parsed.data.itemTitle,
        sectionTitle: parsed.data.sectionTitle,
        notes: parsed.data.notes,
        assignedToEmail: d.email,
        assignedToName: d.name,
        createdByEmail: auth.user.email,
        createdByName: auth.user.name,
        link,
        urgent: true,
      });
      taskIds.push(t.id);
      const n = await storage.addNotification({
        toEmail: d.email,
        type: "qa_audit_failure",
        title: `URGENT: QA Audit failure — ${parsed.data.sectionTitle}`,
        body: `${parsed.data.itemTitle}${parsed.data.notes ? `\n\nAuditor notes: ${parsed.data.notes}` : ""}`,
        link,
        siteId: parsed.data.siteId,
        siteName,
        fromName: auth.user.name,
      });
      notificationIds.push(n.id);
    }
    if (taskIds.length > 0) {
      await storage.setQaAuditResponseTaskId(
        parsed.data.siteId,
        parsed.data.year,
        parsed.data.itemId,
        taskIds[0],
      );
    }
    return res.json({
      ok: true,
      link,
      recipients: directors.map((r) => r.email),
      taskIds,
      notificationIds,
    });
  });

  // Tasks for the signed-in user (used by Task Manager to merge in QA audit
  // follow-ups alongside ordinary custom tasks).
  app.get("/api/qa-audit/tasks", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    const tasks = await storage.listQaAuditTasksForUser(auth.user.email);
    return res.json(tasks);
  });

  app.post("/api/qa-audit/tasks/:id/complete", async (req, res) => {
    const auth = getQaAuditUser(req);
    if (!auth.ok) return res.status(auth.status).json({ message: auth.message });
    const t = await storage.getQaAuditTask(req.params.id);
    if (!t) return res.status(404).json({ message: "Task not found" });
    if (t.assignedToEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
      return res.status(403).json({ message: "You can only complete tasks assigned to you." });
    }
    const done = await storage.completeQaAuditTask(req.params.id, auth.user);
    return res.json(done);
  });

  // ── AI Performance Evaluator ────────────────────────────────────────────────
  app.post("/api/ai/performance-query", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessionEmail = req.session.userId;
    const sessionName = req.session.user?.name ?? "";
    const sessionProfile = getUserProfile(sessionEmail, sessionName);
    if (!isRegionalOrAbove(sessionProfile.role)) {
      return res.status(403).json({ message: "Access restricted to Regional Directors and above." });
    }

    if (!process.env.OPENAI_API_KEY1 && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI not configured — OPENAI_API_KEY is missing." });
    }

    const messageSchema = z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(4000),
    });

    const schema = z.object({
      messages: z.array(messageSchema).min(1).max(40),
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

    const { messages, context } = parsed.data;

    const systemPrompt = `You are Koheez AI, an expert clinical pharmacy performance analyst for AIDS Healthcare Foundation (AHF). AHF operates a national network of HIV specialty pharmacies. You help pharmacy leadership (CPO and Regional Pharmacy Directors) understand performance trends, identify at-risk stores, and make data-driven decisions.

Platform context:
- Task categories tracked: ACHC Compliance, State Board Compliance, Patient Retention Metrics, Operations
- Completion rates are measured daily; at-risk stores are those below 60% overall
- Regions: Western, Southern North, Southern South, Northern
- Your answers should be concise, actionable, and grounded in the provided data snapshot
- Do not make up store names or numbers not in the provided context
- Use plain, professional language suitable for pharmacy leadership
- You are in a multi-turn conversation — remember and build upon earlier answers in this thread

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
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.4,
        max_tokens: 800,
      });

      const answer = completion.choices[0].message.content ?? "No response generated.";
      return res.json({ answer });
    } catch (err: any) {
      console.error("[AI Performance Evaluator] OpenAI error:", err);
      if (err?.code === "insufficient_quota" || err?.error?.code === "insufficient_quota") {
        return res.status(402).json({ message: "The AI quota has been exceeded. Please add credits to the OpenAI account to re-enable the AI Performance Evaluator." });
      }
      if (err?.status === 429 || err?.status === 503) {
        return res.status(503).json({ message: "The AI service is temporarily busy — please try again in a moment." });
      }
      return res.status(502).json({ message: "AI provider error — please try again shortly." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
