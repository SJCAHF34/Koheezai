import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { jsPDF } = require("jspdf");
import { writeFileSync } from "fs";

const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
const PW = 612, PH = 792;
const ML = 48, MR = 48;
const CW = PW - ML - MR;

let cy = 48;
let pageNum = 1;

const C = {
  ink:    [15,  23,  42],
  navy:   [15,  36,  74],
  blue:   [29,  78, 216],
  teal:   [13, 148, 136],
  green:  [22, 163,  74],
  amber:  [180,  83,   9],
  red:    [185,  28,  28],
  slate:  [71,  85, 105],
  light:  [248, 250, 252],
  border: [203, 213, 225],
  white:  [255, 255, 255],
  muted:  [100, 116, 139],
  yellow: [161, 98, 7],
};

function rgb(c)   { doc.setTextColor(c[0], c[1], c[2]); }
function fill(c)  { doc.setFillColor(c[0], c[1], c[2]); }
function stroke(c){ doc.setDrawColor(c[0], c[1], c[2]); }

function footer() {
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); rgb(C.muted);
  const label = "Koheez.ai Technical Architecture & Risk Assessment  |  Internal -- Prepared for Informatics Review  |  July 22, 2026";
  doc.text(label, ML, PH - 22);
  doc.text(String(pageNum), PW - MR, PH - 22, { align: "right" });
  stroke(C.border); doc.setLineWidth(0.5);
  doc.line(ML, PH - 32, PW - MR, PH - 32);
}

function newPage() { doc.addPage(); pageNum++; cy = 48; footer(); }

function ensureSpace(n) { if (cy + n > PH - 52) newPage(); }

function sectionHeading(text) {
  ensureSpace(36);
  cy += 8;
  fill(C.navy);
  doc.rect(ML, cy, CW, 20, "F");
  doc.setFontSize(10.5); doc.setFont("helvetica", "bold"); rgb(C.white);
  doc.text(text, ML + 8, cy + 13.5);
  cy += 28;
}

function subh(text) {
  ensureSpace(26);
  cy += 6;
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); rgb(C.blue);
  doc.text(text, ML, cy);
  cy += 15;
}

function para(text, indent = 0) {
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); rgb(C.ink);
  const lines = doc.splitTextToSize(text, CW - indent);
  ensureSpace(lines.length * 12 + 3);
  doc.text(lines, ML + indent, cy);
  cy += lines.length * 12 + 3;
}

function monoBlock(lines) {
  const lineH = 11.5;
  const padV = 6;
  const padH = 8;
  const longest = Math.max(...lines.map(l => l.length));
  const totalH = lines.length * lineH + padV * 2;
  ensureSpace(totalH + 4);
  fill(C.light);
  doc.rect(ML, cy - padV, CW, totalH, "F");
  stroke(C.border); doc.setLineWidth(0.4);
  doc.rect(ML, cy - padV, CW, totalH, "S");
  doc.setFontSize(8); doc.setFont("courier", "normal"); rgb(C.slate);
  lines.forEach((line, i) => {
    doc.text(line, ML + padH, cy + i * lineH);
  });
  cy += totalH + 4;
}

function bullet(text, indent = 0) {
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); rgb(C.ink);
  const avail = CW - indent - 14;
  const lines = doc.splitTextToSize(text, avail);
  ensureSpace(lines.length * 12 + 2);
  doc.text("-", ML + indent, cy);
  doc.text(lines, ML + indent + 12, cy);
  cy += lines.length * 12 + 2;
}

function gap(n = 8) { cy += n; }

function hRule() {
  stroke(C.border); doc.setLineWidth(0.5);
  doc.line(ML, cy, PW - MR, cy);
  cy += 8;
}

function tableRow(cells, cols, isHeader, shaded) {
  const rowLines = cells.map((c, i) =>
    doc.splitTextToSize(String(c ?? ""), cols[i].w - 8)
  );
  const maxLines = Math.max(...rowLines.map(l => l.length));
  const rowH = maxLines * 11 + 8;
  ensureSpace(rowH + 2);
  if (isHeader) {
    fill(C.navy); doc.rect(ML, cy - 3, CW, rowH, "F");
  } else if (shaded) {
    fill(C.light); doc.rect(ML, cy - 3, CW, rowH, "F");
  }
  let x = ML + 4;
  cells.forEach((c, i) => {
    if (isHeader) {
      doc.setFontSize(8); doc.setFont("helvetica", "bold"); rgb(C.white);
    } else {
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); rgb(C.ink);
    }
    doc.text(rowLines[i], x, cy + 4);
    x += cols[i].w;
  });
  cy += rowH;
}

// =============================================================================
// COVER PAGE
// =============================================================================
fill(C.navy); doc.rect(0, 0, PW, 200, "F");
fill(C.blue); doc.rect(0, 200, PW, 4, "F");

doc.setFontSize(8); doc.setFont("helvetica", "bold"); rgb([147,197,253]);
doc.text("INTERNAL -- PREPARED FOR INFORMATICS REVIEW", ML, 68);

doc.setFontSize(26); doc.setFont("helvetica", "bold"); rgb(C.white);
doc.text("Koheez.ai", ML, 104);

doc.setFontSize(13); doc.setFont("helvetica", "normal"); rgb([147,197,253]);
doc.text("Technical Architecture & Risk Assessment", ML, 126);

doc.setFontSize(9); rgb([147,197,253]);
doc.text("Version 4.0  --  July 22, 2026", ML, 148);
doc.text("Prepared for: Director of Informatics, Governance & Integration Review", ML, 163);
doc.text("Author: Engineering Team, AHF Pharmacy Division", ML, 178);

fill([254, 243, 199]);
doc.rect(ML, 218, CW, 52, "F");
stroke([217,119,6]); doc.setLineWidth(1);
doc.rect(ML, 218, CW, 52, "S");
doc.setFontSize(8); doc.setFont("helvetica", "bold"); rgb(C.amber);
doc.text("METHODOLOGY", ML + 8, 232);
doc.setFont("helvetica", "normal"); rgb(C.ink);
const methodText = "Every claim in this document was verified against the production codebase on July 22, 2026. File and line references are included so any statement can be independently verified. Items that are planned but not yet implemented are marked [PLANNED] or [PARTIAL]. Items that could not be independently confirmed from code are marked [NOT VERIFIED].";
const mLines = doc.splitTextToSize(methodText, CW - 16);
doc.text(mLines, ML + 8, 245);
cy = 290;

doc.setFontSize(9); doc.setFont("helvetica", "bold"); rgb(C.ink);
doc.text("Contents", ML, cy); cy += 14;
hRule();
const toc = [
  ["1", "System Overview", 2],
  ["2", "Data Architecture", 3],
  ["3", "Authentication & Access Control", 4],
  ["4", "Integrations", 5],
  ["5", "Security Posture", 6],
  ["6", "Risk Register", 7],
  ["7", "Remediation Roadmap", 8],
  ["8", "Governance Fit", 9],
];
doc.setFontSize(9); doc.setFont("helvetica", "normal");
toc.forEach(([n, title, pg]) => {
  rgb(C.ink); doc.text(`${n}.  ${title}`, ML + 8, cy);
  rgb(C.muted); doc.text(String(pg), PW - MR, cy, { align: "right" });
  cy += 15;
});

cy += 10; hRule(); gap(4);
doc.setFontSize(8); doc.setFont("helvetica", "bold"); rgb(C.slate);
doc.text("SNAPSHOT -- STATE AS OF JULY 22, 2026", ML, cy); cy += 14;

const stats = [
  ["~50+", "named users, all sharing one 4-character password (AHF1) hashed at startup"],
  ["72",   "total API routes; 28 use requireAuth middleware; remainder rely on in-handler checks"],
  ["15",   "distinct audit event types logged; ~40 route handlers have no audit coverage"],
  ["0",    "CSRF protection tokens issued -- no middleware installed"],
  ["0",    "rate-limit rules on any route, including /api/auth/login"],
  ["3+",   "third-party services receiving PHI with no confirmed BAA (OpenAI, Clerkchat, sFax)"],
  ["1",    "shared DATABASE_URL used across development and production environments"],
];
stats.forEach(([n, desc]) => {
  ensureSpace(14);
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); rgb(C.red);
  doc.text(n, ML + 8, cy);
  doc.setFont("helvetica", "normal"); rgb(C.ink);
  doc.text(desc, ML + 50, cy);
  cy += 14;
});
footer();

// =============================================================================
// PAGE 2 -- Section 1: System Overview
// =============================================================================
newPage();
sectionHeading("1.  System Overview");
para("Koheez.ai is a web-based clinical decision support and pharmacy operations management platform serving AHF (AIDS Healthcare Foundation) pharmacies. Its primary functions are: (1) HIV/PrEP drug regimen assessment -- checking drug-drug interactions, renal/hepatic contraindications, and generating AI-written clinical summaries; (2) operational task management, scheduling, QA compliance tracking, and controlled substance inventory for pharmacy directors and staff; and (3) automated patient retention outreach via SMS and email. It is not an EHR, does not store full patient charts, and does not integrate with an EHR system.");
gap(6);

subh("Tech Stack  (versions from package.json)");
const stack = [
  ["Runtime", "Node.js (version not pinned; Replit provides ~20.x)"],
  ["Language", "TypeScript 5.x"],
  ["Frontend", "React 18.3.1 + Vite"],
  ["Backend", "Express.js 4.21.2"],
  ["ORM", "Drizzle ORM 0.39.1 + drizzle-zod 0.7.0"],
  ["DB driver", "@neondatabase/serverless 0.10.4 (WebSocket-based)"],
  ["Session store", "express-session 1.18.1 + connect-pg-simple 10.0.0"],
  ["Password hashing", "bcryptjs 3.0.3 (pure JS; no native bindings)"],
  ["JWT validation", "jose 6.2.3 (Teams SSO JWKS verification)"],
  ["AI client", "openai SDK 6.8.1  ->  api.openai.com (NOT Azure)"],
  ["Hosting", "Replit (dev); Aptible-compatible (TLS terminated at proxy)"],
  ["Scheduling", "node-cron 4.2.1 (in-process; not a queue)"],
];
const stackCols = [{ w: 148 }, { w: CW - 148 }];
stack.forEach(([k, v], i) => tableRow([k, v], stackCols, false, i % 2 === 0));
gap(10);

subh("Architecture -- PHI Flow Diagram");
monoBlock([
  "  Browser (React SPA)",
  "       |",
  "       | HTTPS (TLS-terminated at Replit/Aptible proxy)",
  "       |",
  "       v",
  "  Express.js API  ----  OpenAI api.openai.com      [PHI IN PROMPT -- NO BAA CONFIRMED]",
  "       |          ----  Microsoft Graph (Outlook)   [PHI: patient name, phone, msg body]",
  "       |          ----  Clerkchat SMS API           [PHI: patient phone + message body]",
  "       |          ----  Salesforce REST API         [PHI: patient activity records]",
  "       |          ----  sFax API                   [PHI: patient PDF document]",
  "       |          ----  JotForm webhook             [PHI: patient service agreement PDF]",
  "       |          ----  ADP Workforce Now           [Employee data only -- no patient PHI]",
  "       |          ----  Liverpool HIV DDI API       [Drug names only -- no PHI]",
  "       |          ----  NIH RxTerms API            [Drug names only -- no PHI]",
  "       |",
  "       v",
  "  Neon PostgreSQL  (TLS over WebSocket)",
  "       |   Tables holding PHI:",
  "       |     retention_patients.record (JSONB) -- initials, phone, email, address, insur. ID",
  "       |     cqi_meetings.attendees   (JSONB) -- staff names + signatures",
  "       |     audit_logs              -- staff email addresses",
  "       |     client_store.value      (JSONB) -- koheez_assessments: clinical notes",
  "       |",
  "       v",
  "  Browser localStorage  <-- synced via /api/client-store -->  PostgreSQL client_store",
  "       |   koheez_assessments: clinical notes (PHI in browser)",
  "       |   Cleared on logout (App.tsx)",
  "       |   NOT encrypted client-side",
]);
gap(4);
para("PHI does NOT flow to: Liverpool HIV DDI, NIH RxTerms, ADP Workforce Now, Microsoft Entra ID JWKS endpoint. PHI DOES flow to: OpenAI (clinical notes in AI prompt), Outlook (patient outreach email), Clerkchat (patient phone + SMS body), Salesforce (patient activity), sFax (patient PDF), JotForm PDF download. BAA status for each is in Section 5.");

// =============================================================================
// PAGE 3 -- Section 2: Data Architecture
// =============================================================================
newPage();
sectionHeading("2.  Data Architecture");

subh("2.1  Schema Overview  (shared/schema.ts lines 550-780)");
para("The database uses a flat JSONB pattern: most tables store a primary key and a `record` JSONB blob containing the full typed object. Column-level queries are not possible on JSONB sub-fields without json operators. Drizzle schema was verified at shared/schema.ts.");
gap(6);

const tableCols = [{ w: 150 }, { w: 140 }, { w: CW - 290 }];
tableRow(["Table", "PHI Fields (if any)", "Notes"], tableCols, true, false);
const tables = [
  ["retention_patients", "initials, phone1, phone2, email, city, state, zip, bin, pcn, insuranceId", "All PHI in JSONB `record` column. Patients can be hard-deleted (storage.ts:1274). No soft-delete. Deletion not written to audit log."],
  ["cqi_meetings", "attendees[].printName, .signatureName, .userEmail", "Quarterly meeting records including staff signatures. JSONB."],
  ["audit_logs", "actorEmail, actorName", "Staff identity only -- by design contains no patient PHI. Append-only in application code; no DELETE route."],
  ["client_store", "value (JSONB: koheez_assessments blob)", "koheez_assessments holds clinical assessment JSON including patient-level clinical data entered during assessment session."],
  ["qa_workbooks / qa_evidence / qa_tasks", "uploadedBy (staff email)", "Compliance workbook data. Evidence files stored as base64 in qa_audit_evidence.data_b64 -- not in object storage."],
  ["schedule_submissions / entries / defaults", "staffName, staffId, submittedByEmail", "Staff scheduling. No patient PHI."],
  ["notifications", "toEmail", "Staff email. No patient PHI."],
  ["pharmacy_hours", "None", "Store hours config only."],
  ["session", "sess JSONB (user email + name)", "Auto-created by connect-pg-simple. Contains authenticated user's email and name in session JSON."],
  ["adp_worker_mappings / sync_status / history", "None (employee IDs)", "ADP worker IDs. Employee data, not patient PHI."],
  ["wa_inspection_archives", "None identified", "WA state inspection checklists."],
  ["staff_time_off_balances", "staffName, staffId", "PTO balances. No patient PHI."],
];
tables.forEach((r, i) => tableRow(r, tableCols, false, i % 2 === 0));
gap(10);

subh("2.2  PHI Lifecycle");
bullet("Creation: Patient PHI enters via (a) manual entry in Retention Tracker UI -> POST /api/retention/patients; (b) bulk CSV/SSRS import -> POST /api/retention/import (server/routes.ts:1691); (c) clinical assessment form (drug regimen, age, labs) stored client-side in koheez_assessments localStorage key, synced to client_store table.", 0);
gap(3);
bullet("Storage at rest: PostgreSQL on Neon serverless. Neon encrypts data at rest using AES-256 at the infrastructure level [NOT VERIFIED independently -- based on Neon documentation, not confirmed by code inspection]. No application-level column encryption. No pgcrypto usage found in codebase.", 0);
gap(3);
bullet("Retention: No automated retention or expiry policy exists in code. Retention patients persist until manually deleted. Audit logs are append-only in the application; the PostgreSQL audit_logs table has no DELETE route and no TTL. The in-memory fallback cap (AUDIT_LOG_CAP = 10,000, storage.ts:63) applies only to the dev file-backed fallback -- the PostgreSQL table is unbounded.", 0);
gap(3);
bullet("Deletion: Retention patients can be hard-deleted via DELETE /api/retention/patients/:id (requireAuth enforced; storage.ts:1274). Deletion itself is NOT logged in the audit trail -- no recordAccess call in the delete handler (routes.ts:1593-1605). No right-to-be-forgotten workflow or deletion policy exists.", 0);
gap(3);
bullet("Transit: All API traffic flows over TLS terminated at the Replit/Aptible proxy. The Node process receives plain HTTP internally. Server-to-Neon uses TLS over WebSocket.", 0);
gap(8);

subh("2.3  Environment Separation");
para("As of July 22, 2026: there is one DATABASE_URL environment variable. No separate staging or production database is provisioned. Development work and production share the same Neon PostgreSQL instance. Test data, seed data written during development, and production patient records coexist in the same database. The session table is shared across environments -- a developer session on the same DATABASE_URL appears in the same session store as a production user session. This is rated HIGH severity in the risk register.");

// =============================================================================
// PAGE 4 -- Section 3: Authentication & Access Control
// =============================================================================
newPage();
sectionHeading("3.  Authentication & Access Control");

subh("3.1  Authentication Mechanism");
para("Authentication is session-based. On successful credential check, the server writes req.session.user = { email, name } and the session is persisted in the PostgreSQL `session` table via connect-pg-simple. Subsequent requests are authenticated by the presence of req.session.user.");
gap(4);
const sessionConfig = [
  ["Mechanism", "express-session 1.18.1 + connect-pg-simple 10.0.0"],
  ["Session secret", "SESSION_SECRET env var (required; server throws at startup if absent). server/index.ts:61-66."],
  ["Cookie flags", "HttpOnly: true | Secure: true (production only) | SameSite: 'none' (required for Teams iframe) | maxAge: 7 days (server/index.ts:70-78)"],
  ["Cookie name", "Not customized -- default 'connect.sid'"],
  ["Trust proxy", "app.set('trust proxy', 1) -- server/index.ts:23. Required for Secure flag behind Aptible/Replit TLS proxy."],
  ["Password hashing", "bcryptjs 3.0.3, cost factor 10. DEMO_USERS hashed at module load (routes.ts:170-178). bcrypt.compareSync used at login (routes.ts:460)."],
  ["Second factor", "None implemented."],
  ["Password reset", "Not implemented. No /api/auth/reset-password route exists."],
  ["Session fixation", "req.session.regenerate() NOT called after login. Session ID is unchanged pre/post-authentication."],
];
sessionConfig.forEach(([k, v], i) => {
  const cols = [{ w: 130 }, { w: CW - 130 }];
  tableRow([k, v], cols, false, i % 2 === 0);
});
gap(10);

subh("3.2  User Registry -- Known Gap  (server/routes.ts:74-169)");
para("User accounts are defined in a hardcoded DEMO_USERS array. As of this audit the array contains 53 named entries. Every entry has the source password 'AHF1' (4 characters), hashed with bcrypt at startup. All users share a credential derived from the same 4-character plaintext. A compromised session or credential for any one user reveals a password that opens every other account at any role level.");
gap(4);
para("There is no database-backed user table. Adding or removing a user requires a code change and redeployment. A POST /api/auth/signup endpoint exists (routes.ts:499) but is not linked to any UI and creates in-memory-only accounts that do not survive restarts. No mustChangePassword flag, no forced rotation, no account lockout after failed attempts.");
gap(8);

subh("3.3  Role Model");
const roleCols = [{ w: 130 }, { w: 70 }, { w: CW - 200 }];
tableRow(["Role", "Data Scope", "Notable Permissions"], roleCols, true, false);
const roles = [
  ["CPO", "All stores (national)", "Audit log read + CSV export. All store data. No admin UI exists -- user management is code-only."],
  ["RPD (Regional Director)", "Assigned region", "Schedule approval. Regional dashboard. QA audit oversight. Cross-region access blocked via getSiteAccess()."],
  ["Pharmacy Director", "Assigned store", "CQI editing. Schedule submission. ACHC workbook. Controlled inventory. Fax log. Cross-store access blocked."],
  ["Staff Pharmacist", "Assigned store", "Assessment generation. Task completion. CQI signing. Inventory adjustments."],
  ["Pharmacy Technician", "Assigned store", "Task completion. CQI signing. Controlled inventory read-only."],
];
roles.forEach((r, i) => tableRow(r, roleCols, false, i % 2 === 0));
gap(10);

subh("3.4  Auth Enforcement Gaps  (server/routes.ts)");
para("Of 72 routes, 28 use the requireAuth Express middleware (routes.ts:1153-1159). The remaining routes rely on in-handler session checks via getSiteAccess() or role guards applied inside the handler body. The following routes have no requireAuth middleware and appear to have incomplete or absent auth enforcement:");
gap(4);
monoBlock([
  "  Route                              Line    Auth situation",
  "  ----------------------------------------------------------",
  "  POST /api/generate-note           942     No requireAuth, no in-handler session check visible",
  "  POST /api/handoff/generate        1044    No requireAuth, no in-handler session check visible",
  "  GET  /api/audit-log               560     isCPO() check inside handler only (no middleware)",
  "  GET  /api/audit-log/export        576     isCPO() check inside handler only (no middleware)",
  "  GET/PUT /api/scheduling/*         1850+   getSiteAccess() inside handler (functional but not middleware)",
  "  POST /api/webhooks/jotform        658     Intentionally public; X-Webhook-Secret validated",
]);
gap(4);
para("Note: getSiteAccess() reads req.session.user and returns an error response if not found -- it is functionally an auth check, but it is applied per-handler, not at the middleware layer. The /api/generate-note and /api/handoff/generate routes require independent verification of whether they enforce authentication.");
gap(4);
para("No rate limiting is applied to any route, including /api/auth/login. express-rate-limit is not installed. An attacker can enumerate passwords or user accounts without triggering any server-side throttle.");

// =============================================================================
// PAGE 5 -- Section 4: Integrations
// =============================================================================
newPage();
sectionHeading("4.  Integrations");

const intCols = [{ w: 105 }, { w: 90 }, { w: 55 }, { w: 65 }, { w: CW - 315 }];
tableRow(["Service", "Auth Method", "PHI?", "Status", "Notes / Known Issues"], intCols, true, false);
const integrations = [
  [
    "OpenAI\n(api.openai.com)",
    "API key: OPENAI_API_KEY1 or OPENAI_API_KEY env var\n(routes.ts:191)",
    "YES\nclinical notes, drug regimens, patient context in prompt",
    "Production",
    "Uses api.openai.com NOT Azure OpenAI. Standard OpenAI does not include a HIPAA BAA. PHI in AI prompts without a BAA is a HIPAA violation. Azure OpenAI migration is PLANNED (Task #75) -- not complete.",
  ],
  [
    "Microsoft Graph\n(Outlook email)",
    "Static Bearer token:\nOUTLOOK_ACCESS_TOKEN env var\n(outlookClient.ts:4)",
    "YES\npatient name, phone, outreach msg body",
    "Production",
    "OUTLOOK_ACCESS_TOKEN is a static OAuth2 access token stored as a plain env var -- NOT a refresh token. When it expires the integration silently returns false and logs a warning. No automated rotation. Microsoft 365 / Graph is HIPAA-eligible under Microsoft BAA [NOT VERIFIED whether AHF has executed that BAA].",
  ],
  [
    "Clerkchat\n(SMS outreach)",
    "Bearer API key:\nCLERKCHAT_API_KEY env var\n(clerkchatClient.ts:4)",
    "YES\npatient phone number + SMS body",
    "Production",
    "No BAA confirmed. Clerkchat BAA status: MISSING / NOT VERIFIED. Patient phone numbers and outreach message content transmitted.",
  ],
  [
    "Salesforce\n(CRM activity log)",
    "OAuth2 password grant:\nSF_CLIENT_ID, SF_CLIENT_SECRET,\nSF_USERNAME, SF_PASSWORD,\nSF_SECURITY_TOKEN\n(salesforceClient.ts:15-35)",
    "YES\npatient activity records",
    "Production",
    "Password grant type (grant_type=password) is deprecated by Salesforce and scheduled for removal. Token cached 90 min in process memory (cleared on restart). BAA status: NOT VERIFIED -- Salesforce Health Cloud has HIPAA BAA; standard Sales Cloud may not.",
  ],
  [
    "JotForm\n(webhook + PDF)",
    "X-Webhook-Secret header validated vs. JOTFORM_WEBHOOK_SECRET env var\n(routes.ts:664-672)",
    "YES\npatient service agreement PDF",
    "Production",
    "Public endpoint (no session auth). Secret validation added in Task #137. If JOTFORM_WEBHOOK_SECRET is unset, all requests are accepted with a console warning. JotForm BAA: NOT VERIFIED.",
  ],
  [
    "sFax\n(fax to McKesson)",
    "SFAX_USERNAME + SFAX_API_KEY env vars\n(faxService.ts)",
    "YES\npatient PDF document",
    "Production",
    "sFax BAA: NOT VERIFIED. PHI in faxed content.",
  ],
  [
    "ADP Workforce Now",
    "Client credentials:\nADP_CLIENT_ID + ADP_CLIENT_SECRET\n(adpClient.ts:24-35)",
    "NO\nemployee data only",
    "Production",
    "No patient PHI transmitted. Employee name, ID, PTO data only. replit.md mentions mTLS but code uses client_id/client_secret -- mTLS status NOT VERIFIED from this code audit.",
  ],
  [
    "Microsoft Entra ID\n(Teams SSO)",
    "JWKS validation via jose 6.2.3\n(teamsAuth.ts:45-50)\nRequires: AAD_APP_CLIENT_ID, AAD_TENANT_ID, APP_DOMAIN",
    "NO\nstaff email + display name only",
    "Production",
    "Token validated against Microsoft public JWKS endpoint. No PHI in token. If env vars absent, SSO silently disabled; Teams users fall back to standard login.",
  ],
  [
    "Liverpool HIV DDI API",
    "HTTPS REST\n(no API key visible in code)",
    "NO\ndrug names only",
    "Production",
    "No patient identifiers sent. Drug names only for interaction lookup.",
  ],
  [
    "NIH RxTerms API",
    "Public HTTPS REST\n(no API key)",
    "NO",
    "Production",
    "Drug name autocomplete. Public endpoint. No PHI.",
  ],
  [
    "Neon PostgreSQL",
    "DATABASE_URL env var\n(server/db.ts:16)",
    "YES\nprimary PHI store",
    "Prod + Dev\n(shared)",
    "Single database for all environments. TLS on WebSocket connection. Infrastructure-level AES-256 encryption at rest [NOT VERIFIED by code -- standard Neon offering]. No application-level encryption.",
  ],
];
integrations.forEach((r, i) => tableRow(r, intCols, false, i % 2 === 0));

// =============================================================================
// PAGE 6 -- Section 5: Security Posture
// =============================================================================
newPage();
sectionHeading("5.  Security Posture");

subh("5.1  Encryption in Transit");
para("All browser-to-server traffic flows over TLS, terminated at the Replit or Aptible reverse proxy. The Node.js process itself serves plain HTTP. trust proxy is set (server/index.ts:23) so the Secure cookie flag works correctly. Server-to-Neon traffic is TLS over WebSocket. Server-to-external-API traffic is HTTPS for all integrations listed in Section 4. No non-TLS external calls were identified.");
gap(8);

subh("5.2  Encryption at Rest");
para("No application-level encryption is implemented. Neon PostgreSQL provides infrastructure-level AES-256 encryption at rest per their documentation [NOT VERIFIED independently from this codebase -- based on Neon's published compliance documentation]. A direct database read using the DATABASE_URL connection string exposes all PHI in plaintext. Sensitive JSONB columns (retention_patients.record, client_store.value) are not encrypted at the column level. Evidence files uploaded to QA audit are stored as base64 text in qa_audit_evidence.data_b64 -- not in object storage and not encrypted at the application level.");
gap(8);

subh("5.3  Secrets Management");
para("All secrets are stored as environment variables. No secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault) is in use. Confirmed secrets stored as plain env vars:");
gap(3);
const secretList = [
  "SESSION_SECRET -- session signing key",
  "DATABASE_URL -- full Neon connection string with embedded credentials",
  "OPENAI_API_KEY1 / OPENAI_API_KEY -- OpenAI API key",
  "OUTLOOK_ACCESS_TOKEN -- static Outlook OAuth2 access token (not a refresh token; expires silently)",
  "SF_CLIENT_ID, SF_CLIENT_SECRET, SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN (5 vars for Salesforce)",
  "CLERKCHAT_API_KEY, CLERKCHAT_CHANNEL_ID -- Clerkchat SMS",
  "ADP_CLIENT_ID, ADP_CLIENT_SECRET -- ADP Workforce Now",
  "AAD_APP_CLIENT_ID, AAD_TENANT_ID, APP_DOMAIN -- Microsoft Entra SSO",
  "JOTFORM_API_KEY, JOTFORM_FORM_ID, JOTFORM_WEBHOOK_SECRET -- JotForm",
  "SFAX_USERNAME, SFAX_API_KEY, ICQ_FAX_NUMBER -- sFax",
];
secretList.forEach(s => bullet(s, 8));
gap(4);
para("No rotation policy exists for any secret. The Salesforce integration stores the AHF user's Salesforce password (SF_PASSWORD) as a plain env var.");
gap(8);

subh("5.4  CSRF / Injection / Session Protections");
const protCols = [{ w: 130 }, { w: CW - 130 }];
const protections = [
  ["CSRF tokens", "NOT IMPLEMENTED. No csrf-csrf or equivalent middleware installed (not found in package.json or server/index.ts). SameSite=None cookies (required for Teams iframe embedding) combined with no CSRF tokens means state-changing requests can be forged by a malicious page sharing the browser context."],
  ["Rate limiting", "NOT IMPLEMENTED. express-rate-limit not in package.json. No throttle on /api/auth/login, /api/auth/signup, or any other route."],
  ["Helmet / security headers", "NOT INSTALLED. helmet package not in package.json. No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy headers are set."],
  ["SQL injection", "Mitigated by Drizzle ORM parameterized queries. No raw SQL string interpolation found in storage.ts or routes.ts."],
  ["Input validation", "Zod schemas applied to most POST/PUT request bodies. Some handlers use direct req.body access without Zod (not exhaustively audited)."],
  ["XSS", "React handles output escaping by default. react-markdown renders AI output -- markdown renderer config not audited for XSS mitigations."],
  ["Session fixation", "NOT mitigated. express-session does not regenerate session ID on login by default. No req.session.regenerate() call found in login handler (routes.ts:437-490)."],
  ["Account lockout", "Not implemented. Unlimited login attempts permitted."],
  ["Secure / HttpOnly cookies", "Correctly configured in production (server/index.ts:70-78). SameSite=None is a known CSRF-enabling configuration when CSRF tokens are absent."],
];
protections.forEach(([k, v], i) => tableRow([k, v], protCols, false, i % 2 === 0));
gap(10);

subh("5.5  Audit Logging -- Coverage and Gaps");
para("The HIPAA access audit log is append-only. Entries are written to both a JSON file and the PostgreSQL audit_logs table. Each entry records: at (ISO timestamp), actorEmail, actorName, role, action, resource, method, path.");
gap(4);
para("Events that ARE logged (15 types):");
const logged = [
  "auth.login.success / auth.login.failure (routes.ts:462, 467)",
  "auth.teams-sso-login (routes.ts:526)",
  "assessment.generate (routes.ts:711)",
  "note.generate (routes.ts:951)",
  "client-store.write.phi -- koheez_assessments key write (routes.ts:1324)",
  "cqi.meeting.list / .read / .save / .sign (routes.ts:1434-1507)",
  "cqi.email_signers (routes.ts:1402)",
  "patient.read / .create / .update / .delete (routes.ts:1514-1597)",
  "patient.import -- bulk CSV/SSRS import (routes.ts:1782)",
];
logged.forEach(s => bullet(s, 8));
gap(4);
para("Actions NOT in the audit log (gaps from routes.ts line review):");
const unlogged = [
  "QA audit workbook reads, edits, and submissions (routes.ts:2187-2227) -- no recordAccess calls",
  "QA audit evidence uploads and downloads (routes.ts:2259, 2305) -- no recordAccess",
  "Schedule submission, approval, and override workflow -- no recordAccess in scheduling routes",
  "Retention patient DELETION -- handler at routes.ts:1593 exists but no audit entry is written on delete",
  "GET /api/client-store reads -- not logged (only writes are logged)",
  "Fax log reads and retry attempts -- not logged",
  "Any administrative action (no admin UI exists yet)",
];
unlogged.forEach(s => bullet(s, 8));
gap(10);

subh("5.6  BAA Status by Vendor Receiving PHI");
const baaCols = [{ w: 130 }, { w: 90 }, { w: CW - 220 }];
tableRow(["Vendor", "BAA Status", "PHI Transmitted"], baaCols, true, false);
const baas = [
  ["OpenAI (api.openai.com)", "MISSING -- standard tier has no HIPAA BAA", "Clinical notes, drug regimens, patient context in AI prompts"],
  ["Clerkchat (SMS)", "NOT VERIFIED -- presumed missing", "Patient phone number, outreach message body"],
  ["sFax", "NOT VERIFIED", "Patient PDF (service agreement)"],
  ["Salesforce (standard CRM)", "NOT VERIFIED -- Health Cloud has BAA; standard Sales Cloud may not", "Patient contact activity records"],
  ["Microsoft (Graph / Outlook)", "HIPAA-eligible under Microsoft BAA -- NOT VERIFIED whether AHF has executed it", "Patient name, phone, outreach email body"],
  ["Neon (PostgreSQL)", "NOT VERIFIED -- Neon offers HIPAA compliance tier; unclear if AHF account is on it", "All PHI -- primary data store"],
  ["JotForm", "NOT VERIFIED", "Patient service agreement PDF"],
  ["ADP", "N/A -- employee data only, not patient PHI", "Employee scheduling data"],
  ["NIH RxTerms / Liverpool DDI", "N/A -- no PHI transmitted", "Drug names only"],
];
baas.forEach((r, i) => tableRow(r, baaCols, false, i % 2 === 0));

// =============================================================================
// PAGE 7 -- Section 6: Risk Register
// =============================================================================
newPage();
sectionHeading("6.  Risk Register");
para("Each item reflects actual code state as of July 22, 2026. 'Owner' is the party whose action is required to resolve.");
gap(6);

const rrCols = [{ w: 34 }, { w: 168 }, { w: 55 }, { w: 76 }, { w: 88 }, { w: CW - 421 }];
tableRow(["#", "Risk", "Severity", "Current Status", "Owner", "Target"], rrCols, true, false);
const risks = [
  ["R01", "~53 users share password 'AHF1' -- compromise of one account exposes all accounts at that role level", "CRITICAL", "PARTIAL -- hashed at startup; plaintext 'AHF1' still in source (routes.ts:76+); per-user passwords planned in Task #138", "Engineering", "30 days"],
  ["R02", "OpenAI API receives PHI without a BAA -- HIPAA violation", "CRITICAL", "OPEN -- api.openai.com in production; Azure migration planned (Task #75) but not started", "CPO + Legal + Eng", "30 days"],
  ["R03", "No CSRF protection -- SameSite=None cookies + no token = forgeable state-changing requests", "HIGH", "OPEN -- not implemented; deferred from Task #137 due to Teams embedding complexity", "Engineering", "30 days"],
  ["R04", "Clerkchat SMS transmits patient PHI; no confirmed BAA", "HIGH", "OPEN", "CPO + Legal", "30 days"],
  ["R05", "Dev and prod share one DATABASE_URL -- no environment separation", "HIGH", "OPEN", "DevOps / CPO", "30 days"],
  ["R06", "No rate limiting on /api/auth/login or any route", "HIGH", "OPEN -- express-rate-limit not installed", "Engineering", "30 days"],
  ["R07", "Outlook access token is a static env var -- no refresh mechanism; expires silently", "HIGH", "OPEN", "Engineering / IT", "60 days"],
  ["R08", "Patient deletion not audited -- DELETE /api/retention/patients/:id writes no audit entry (routes.ts:1593)", "HIGH", "OPEN", "Engineering", "30 days"],
  ["R09", "Salesforce uses deprecated OAuth2 password grant; user password stored as env var", "MEDIUM", "OPEN", "Eng / SF Admin", "60 days"],
  ["R10", "sFax transmits patient PHI; BAA status unconfirmed", "MEDIUM", "OPEN", "CPO + Legal", "30 days"],
  ["R11", "QA audit workbook reads and edits not in audit log", "MEDIUM", "OPEN", "Engineering", "60 days"],
  ["R12", "Session ID not regenerated on login -- session fixation risk", "MEDIUM", "OPEN", "Engineering", "30 days"],
  ["R13", "Helmet security headers not set -- no CSP, no X-Frame-Options", "MEDIUM", "OPEN", "Engineering", "30 days"],
  ["R14", "No database-backed user management -- add/remove user requires code deploy", "MEDIUM", "OPEN -- planned Task #138", "Engineering", "30 days"],
  ["R15", "Evidence files stored as base64 in PostgreSQL, not object storage", "MEDIUM", "OPEN", "Engineering", "90 days"],
  ["R16", "No automated regression or security test suite", "MEDIUM", "OPEN -- planned Task #139", "Engineering", "60 days"],
  ["R17", "Neon and JotForm BAA status unverified", "MEDIUM", "OPEN", "CPO + Legal", "30 days"],
  ["R18", "ADP mTLS vs. client credential discrepancy -- replit.md describes mTLS but code uses client_id/secret", "LOW", "NEEDS VERIFICATION", "Engineering", "60 days"],
  ["R19", "JOTFORM_WEBHOOK_SECRET not set in prod -- accepts all requests with warning (routes.ts:672)", "LOW", "PARTIAL -- warning logged; env var should be provisioned", "DevOps", "15 days"],
  ["R20", "No formal security review or penetration test has been conducted", "LOW", "OPEN -- documented Section 8", "CPO", "90 days"],
];
risks.forEach((r, i) => tableRow(r, rrCols, false, i % 2 === 0));

// =============================================================================
// PAGE 8 -- Section 7: Remediation Roadmap
// =============================================================================
newPage();
sectionHeading("7.  Remediation Roadmap");
para("Ordered by risk severity and implementation dependency. Items in the same band can be parallelized unless noted.");
gap(8);

const roadCols = [{ w: 36 }, { w: 264 }, { w: CW - 300 }];

subh("Immediate (before next review)");
tableRow(["Ref", "Action", "Acceptance Criterion"], roadCols, true, false);
[
  ["R02", "Migrate OpenAI calls to Azure OpenAI HIPAA-eligible endpoint OR cease sending PHI until BAA is in place", "No PHI sent to api.openai.com; Azure endpoint in use with executed BAA"],
  ["R04", "Execute BAA with Clerkchat OR remove patient PHI from SMS content", "BAA on file OR PHI removed from outreach SMS payload"],
  ["R17", "Confirm/execute Neon HIPAA compliance tier and JotForm BAA", "Written BAA with both vendors on file"],
  ["R19", "Set JOTFORM_WEBHOOK_SECRET in production environment", "Env var present; webhook rejects unmatched requests"],
].forEach((r, i) => tableRow(r, roadCols, false, i % 2 === 0));
gap(10);

subh("30 Days");
tableRow(["Ref", "Action", "Acceptance Criterion"], roadCols, true, false);
[
  ["R01", "Per-user unique passwords: generate random initial creds per user; mustChangePassword flag; POST /api/auth/change-password endpoint; first-login redirect (Task #138)", "No two users share plaintext password; 'AHF1' no longer valid for any account"],
  ["R03", "Implement csrf-csrf middleware on all state-mutating routes; add CSRF token to frontend apiRequest (Task #138). Exempt JotForm webhook and Teams SSO.", "All POST/PUT/PATCH/DELETE routes require valid CSRF token"],
  ["R05", "Provision separate Neon project for production; update DATABASE_URL in prod secrets only", "Production DB contains only production data; dev DB is separate"],
  ["R06", "Install express-rate-limit; apply 10 attempts/15 min window to /api/auth/login", "Brute-force login returns 429 after threshold"],
  ["R08", "Add recordAccess('patient.delete') call in DELETE /api/retention/patients/:id handler (routes.ts:1593)", "Deletion events appear in audit log"],
  ["R10", "Confirm or execute BAA with sFax", "Written BAA on file or sFax replaced with HIPAA-covered alternative"],
  ["R12", "Call req.session.regenerate() after successful login (routes.ts:467)", "Session ID changes on login; prior session ID invalid"],
  ["R13", "Install helmet; configure CSP allowing Teams iframe origins", "Security headers present in all responses"],
  ["R14", "POST/DELETE /api/admin/users; /app/admin/users CPO UI; database-backed user table (Task #138)", "Users can be added/removed without code deploy"],
].forEach((r, i) => tableRow(r, roadCols, false, i % 2 === 0));
gap(10);

subh("60 Days");
tableRow(["Ref", "Action", "Acceptance Criterion"], roadCols, true, false);
[
  ["R07", "Replace static OUTLOOK_ACCESS_TOKEN with automated OAuth2 refresh token flow via Microsoft Graph app registration", "Outlook integration renews tokens automatically; no static token in env vars"],
  ["R09", "Migrate Salesforce from password grant to JWT Bearer or Connected App certificate flow", "No user password in env vars; token obtained via non-deprecated grant type"],
  ["R11", "Add recordAccess calls to QA audit workbook read, edit, submit, and evidence upload/download handlers", "QA audit interactions appear in HIPAA audit log"],
  ["R16", "Regression test suite covering auth paths, RBAC enforcement, audit log writes, PHI lifecycle (Task #139)", "CI pipeline blocks deploys on test failure"],
  ["R18", "Verify ADP auth method in production; document whether mTLS certs or client credentials are in use", "Auth method documented and consistent with code"],
].forEach((r, i) => tableRow(r, roadCols, false, i % 2 === 0));
gap(10);

subh("90 Days");
tableRow(["Ref", "Action", "Acceptance Criterion"], roadCols, true, false);
[
  ["R15", "Move evidence file uploads from base64 PostgreSQL column to object storage (S3/Azure Blob) with server-side encryption", "PHI files not stored in database; object store is HIPAA-eligible"],
  ["R20", "Commission external penetration test against production environment", "Test report on file; critical/high findings remediated before next governance review"],
  ["--", "Evaluate secrets manager for all env var secrets; implement rotation policy for API keys", "Secrets have defined rotation schedule; no static tokens in env vars"],
].forEach((r, i) => tableRow(r, roadCols, false, i % 2 === 0));

// =============================================================================
// PAGE 9 -- Section 8: Governance Fit
// =============================================================================
newPage();
sectionHeading("8.  Governance Fit -- HIPAA Security Rule Technical Safeguards  (45 CFR ss164.312)");
para("The following maps the platform's current state to HIPAA Security Rule Technical Safeguard requirements. Each row states what is required, what is implemented, and what is not.");
gap(6);

const govCols = [{ w: 155 }, { w: CW - 155 }];
tableRow(["Safeguard", "Current Implementation State"], govCols, true, false);
const gov = [
  ["(a)(1) Access Control\n-- Unique user ID required", "NOT MET: ~53 users share password 'AHF1'. Unique user IDs (email addresses) exist but unique credentials do not. Remediation in Task #138."],
  ["(a)(1) Access Control\n-- Automatic logoff", "PARTIAL: 7-day session maxAge (server/index.ts:78). No idle-timeout or inactivity-based expiry. A session left in a browser is valid for 7 days regardless of activity."],
  ["(a)(1) Access Control\n-- Encryption/decryption", "PARTIAL: TLS in transit confirmed. Neon infrastructure encryption at rest [not independently verified]. No application-level column encryption. Evidence files stored as base64 plaintext in DB."],
  ["(a)(2) Emergency Access Procedure", "NOT VERIFIED: No documented emergency access procedure found in codebase. No break-glass account mechanism."],
  ["(b) Audit Controls", "PARTIAL: HIPAA audit log with 15 event types, PostgreSQL persistence, CPO-only CSV export. Gaps: patient deletion, QA workbook access, scheduling actions not logged. No log integrity mechanism -- the audit_logs table is mutable by anyone with DATABASE_URL access."],
  ["(c) Integrity\n-- PHI not improperly altered/destroyed", "PARTIAL: Drizzle ORM prevents SQL injection. Patients can be hard-deleted with no tombstone or recovery path. No data integrity checksums on PHI records."],
  ["(d) Person/Entity Authentication", "PARTIAL: Session-based auth with bcrypt hashing (cost 10). No MFA. No certificate-based auth. Shared credential issue undermines authentication assurance level."],
  ["(e) Transmission Security", "MET: TLS on all external communication paths. trust proxy correctly configured for production."],
];
gov.forEach((r, i) => tableRow(r, govCols, false, i % 2 === 0));
gap(12);

subh("8.1  Formal Reviews This Platform Has NOT Undergone");
para("The following is stated directly, without softening:");
gap(4);
const notDone = [
  "No formal security review or risk analysis by a qualified information security professional has been conducted on this codebase.",
  "No penetration test has been performed against the production deployment.",
  "No formal BAA inventory has been compiled or reviewed by legal counsel. BAA status for 5 of 7 PHI-receiving vendors is unverified as of this writing.",
  "No data flow diagram has been formally reviewed or signed off by a HIPAA Security Officer.",
  "No Business Associate Agreement has been established between AHF (as covered entity) and the Koheez.ai platform itself, if the platform operates as a Business Associate.",
  "No Minimum Necessary standard review has been performed. The platform transmits full patient records (phone, email, insurance IDs, address) to outreach services; it has not been evaluated whether a data subset would suffice.",
  "No formal incident response plan references this system.",
  "No audit log integrity mechanism exists -- a database administrator with the DATABASE_URL connection string can alter or delete audit_logs records without detection.",
  "The platform has not undergone change management review for any integration added in the past 12 months (Clerkchat, sFax, ADP, Teams SSO).",
];
notDone.forEach(s => bullet(s, 8));
gap(10);

subh("8.2  What Has Been Implemented");
para("For completeness, the following controls are in place as of this review:");
gap(4);
const done = [
  "Session-based authentication with bcrypt password hashing (cost 10) -- Task #137",
  "SESSION_SECRET enforcement -- production startup fails without it -- Task #137",
  "Append-only HIPAA audit log: 15 event types, PostgreSQL persistence, CPO-only CSV export -- Task #137",
  "PHI (koheez_assessments) cleared from browser localStorage on logout -- Task #137",
  "JotForm webhook X-Webhook-Secret header validation -- Task #137",
  "Role-based access control: 5 tiers; site-scoped data access enforced on patient, scheduling, and CQI routes",
  "TLS on all external communication paths; Secure + HttpOnly cookie flags in production",
  "Input validation via Zod schemas on most API endpoints; Drizzle ORM prevents SQL injection",
  "Microsoft Entra ID JWKS token validation for Teams SSO -- eliminates Teams-based auth spoofing",
  "Patient import audit logging (routes.ts:1782)",
];
done.forEach(s => bullet(s, 8));

gap(12); hRule(); gap(4);

doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); rgb(C.muted);
const disc = "This document was prepared by the Koheez.ai engineering team for internal informatics governance review. Every factual claim references a specific file and line number in the codebase as it existed on July 22, 2026 (git commit 54acee1a). Claims marked [NOT VERIFIED] reflect limitations of this code-only audit and require independent confirmation. This document does not constitute legal advice and does not substitute for a formal HIPAA risk analysis under 45 CFR ss164.308(a)(1).";
const dLines = doc.splitTextToSize(disc, CW);
ensureSpace(dLines.length * 11 + 4);
doc.text(dLines, ML, cy);

const buf = doc.output("arraybuffer");
writeFileSync("koheez-informatics-review.pdf", Buffer.from(buf));
console.log("Written:", buf.byteLength, "bytes,", pageNum, "pages");
