# Koheez.ai — HIV Clinical Decision Support

## Overview
Koheez.ai is a clinical decision support platform for HIV pharmacists, designed to streamline and enhance HIV treatment assessments. Its core functions include evaluating drug-drug interactions, analyzing patient data, generating AI-powered OpenEvidence query prompts, and providing pharmacist consultation recommendations. The platform features a dark-themed, secure application workspace, aiming to be a comprehensive tool for clinical decision-making in HIV care.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React with TypeScript and Vite. UI components are built with Shadcn/ui (Radix UI-based, "New York" style), managed with Wouter for routing and React hooks/TanStack Query for state. Forms use Zod for validation. Autocomplete for medications is provided by the NIH RxTerms API. The design is responsive using Tailwind CSS, adapting to various screen sizes.

### Backend
The backend is an Express.js (Node.js, TypeScript) RESTful API. The primary `/api/assessment` endpoint processes patient data to deliver drug interaction alerts, clinical recommendations, and AI-generated summaries. All incoming data is validated with Zod schemas.

### Core Features
-   **Authentication & Authorization**: Session-based authentication supports hierarchical roles (CPO, RPD, Pharmacy Director, Pharmacy Technician) with corresponding access controls.
-   **Drug Interaction Engine**: An evidence-based engine with over 100 rules for ARV-to-concomitant, ARV-to-ARV, and duplicate therapy interactions. Includes severity levels and clinical recommendations.
-   **Clinical Validation**: Modules for renal (eGFR), hepatic/pregnancy (Child-Pugh, Efavirenz), and genetic (HLA-B\*5701) considerations.
-   **Clinical Recommendations**: Provides evidence-based support for opportunistic infection prophylaxis (PCP, MAC, Toxoplasmosis), viral load assessment, and immunizations per CDC/ACIP guidelines.
-   **HIV Medication Database**: An internal library of HIV medications, including classifications, generic/brand names, and dosing.
-   **Assessment Workflow**: A multi-step form for patient clinical details, OpenEvidence query generation, response input, initial intake, and comprehensive note generation. Features a dynamic DDI Alert Summary and Patient Assistance Program (PAP) eligibility card.
-   **Pharmacy Task Manager**: A role-based checklist system for daily, weekly, monthly, and quarterly tasks (Operations, ACHC Compliance, State Board, Retention Metrics), with task assignment and priority alerts.
-   **Regional Dashboard**: Provides CPO and RPD roles with aggregate site performance statistics and trends.
-   **Category Report**: Allows detailed analysis of store rankings based on specific task completion categories.
-   **ACHC Compliance Workbook**: A quarterly self-assessment tool for pharmacy directors to document compliance.
-   **Patient Assistance Programs**: A dedicated section listing HIV/ARV medications with details on copay cards and patient assistance programs.
-   **Team Scheduling**: A store-level staff scheduling tool enabling pharmacy directors to manage business hours, staff defaults, and schedule overrides. It supports a submission workflow to RPDs and CPOs for review and approval, including notifications.
-   **Controlled Inventory Management**: Per-store perpetual inventory for C-II–C-V controlled substances. NDC search auto-populates drug name/strength/form from a built-in catalog (~40 controlled drugs). Pharmacists (pharmacist_1/2 and all directors/CPO) can add stock and record adjustments — Addition, Subtraction, Dispensing, or Lost Med (reason required) — with a full immutable adjustment ledger. A Bi-Annual count tool generates a count sheet for every C2–C5 drug, captures actual counts and variances, requires a witness, and reconciles the perpetual inventory on completion (also writing reconciliation entries to the ledger). Technicians have read-only access. Storage is client-side (localStorage) keyed by site.
-   **SSRS Integration**: Enables patient data import from SQL Server Reporting Services (SSRS) via a dedicated API endpoint and CSV import modal, along with a standalone sync script.
-   **Salesforce Integration**: Logs retention events (e.g., Patient Added, Call Attempt) as Tasks/Activities in Salesforce, leveraging OAuth2 for authentication.
-   **Automated Outreach Sequence**: Manages a 4-day automated contact sequence (SMS via Clerkchat, Email via Outlook) for retention patients, based on server-side stored patient data and a daily cron scheduler.

### Data Storage
Storage is split: the shared server-side records that must survive restarts and redeploys — the CQI-QRE quarterly meetings (including attendee signatures) and the HIPAA access audit log — are persisted in PostgreSQL via Drizzle ORM (tables defined in `shared/schema.ts`, connection in `server/db.ts`, applied with `npm run db:push`). `DbStorage` in `server/storage.ts` extends `MemStorage` and overrides those records plus scheduling (hours, defaults, entries, submissions), notifications, retention patients, QA audit workbooks/tasks/evidence, and a `client_store` table that backs browser localStorage app data (task manager, controlled inventory, ACHC docs, saved assessments — 18 allowlisted `koheez_*` keys via `GET/PUT /api/client-store?siteId=`, synced by `client/src/lib/serverStore.ts` which hydrates localStorage after login and debounce-pushes writes). `DbStorage.init()` backfills legacy QA data from `.local/qa-audit-state.json` and seeds site 1417 hours on first boot. Client-store rows are scoped per site (composite key `site_id` + `store_key`); routes enforce site access via `getSiteAccess` (director = own store, RPD = region, CPO = all, other staff = own store). Users with siteId "ALL" (CPO/RPD without a home store) skip syncing and stay local-only. Sessions are persisted in PostgreSQL via `connect-pg-simple` (auto-created `session` table), so logins survive redeploys.

## JotForm → sFax Auto-Fax to McKesson ICQ (Task #38)

### Flow
When a patient submits the Patient Service Agreement on JotForm, a webhook fires to Koheez, which fetches the submission PDF from JotForm and faxes it to the McKesson ICQ queue via sFax — no manual steps.

- **`POST /api/webhooks/jotform`** — public (no auth). Parses multipart/urlencoded/json payloads for `formID` + `submissionID`. If `JOTFORM_FORM_ID` is set, only matching forms are processed (others ignored). Patient name is extracted from the `rawRequest`/`pretty` fields. Responds 200 quickly and processes fax fire-and-forget to avoid JotForm retries.
- **`server/lib/faxService.ts`** — downloads the PDF (`GET https://api.jotform.com/submission/{id}/pdf?apiKey=…`), sends it to sFax (`POST https://api.sfax.com/api/fax/send`, multipart file + `ToFaxNumber`), and records the result. Maintains an in-memory `FaxLogEntry[]` (max 500, FIFO).
- **`GET /api/fax-log`** and **`POST /api/fax-retry/:submissionID`** — both behind `requireAuth`. Retry re-fetches the PDF and re-sends.
- **Fax Log UI** at `/app/fax-log` — gated to `isDirectorRole()` (pharmacy director and above). Shows newest-first table with patient name, time, status badge (Sent/Failed), and a Retry button for failed rows. A config-warning banner appears when secrets are missing. Added to the nav dropdown for directors and above.

### Env Vars for Task #38 (stored as secrets)
| Variable | Purpose |
|---|---|
| `JOTFORM_API_KEY` | JotForm API key (download submission PDF) |
| `JOTFORM_FORM_ID` | Patient Service Agreement form ID (filters webhook) |
| `SFAX_USERNAME` | sFax account username |
| `SFAX_API_KEY` | sFax API key |
| `ICQ_FAX_NUMBER` | McKesson ICQ destination fax number |

Until the secrets are filled in, webhook attempts are logged as Failed with a clear error and the Fax Log UI shows a config-warning banner.

### Store Performance Dashboard access
The Store Performance Dashboard (`/app/store/:siteId`) stats are restricted to **regional pharmacy directors and CPO only** — pharmacy directors no longer have access (route uses `RegionalProtected`; in-page check redirects pharmacy directors; the dashboard widget and the TaskManager store banner are hidden for them).

## External Dependencies

-   **OpenAI API**: For AI-powered clinical summaries and consultation questions.
-   **NIH RxTerms API (Clinical Tables Search Service)**: For medication autocomplete suggestions.
-   **PostgreSQL Database**: For data persistence, session storage, and user management. Integrates with Neon serverless PostgreSQL.
-   **Third-Party UI Libraries**: Radix UI, Lucide React, date-fns, Embla Carousel, Cmdk for UI components, iconography, date manipulation, carousels, and command palettes.
-   **Clerkchat API**: For sending SMS messages in the automated outreach sequence.
-   **Microsoft Graph API (Outlook)**: For sending emails in the automated outreach sequence.
-   **Salesforce API**: For logging activities and events.