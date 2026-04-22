# Koheez.ai — HIV Clinical Decision Support

## Overview
Koheez.ai is a clinical decision support platform designed for HIV pharmacists. Its primary purpose is to streamline and enhance HIV treatment assessments. Key capabilities include evaluating drug-drug interactions, analyzing patient demographics and clinical parameters, and generating AI-powered OpenEvidence query prompts and pharmacist consultation recommendations. The platform features a dark-themed landing page, secure session-based authentication, and a protected application workspace, aiming to provide a comprehensive tool for clinical decision-making in HIV care.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, using Vite for fast development. UI components leverage Shadcn/ui (based on Radix UI) with the "New York" design style, emphasizing a professional clinical interface. Wouter handles client-side routing for a single-page application experience. State management utilizes React hooks for local state and TanStack Query for server state and caching. Form handling employs controlled components with Zod for validation across various clinical data inputs. Medication search functionality includes autocomplete via the NIH RxTerms API, featuring debouncing and duplicate filtering. The layout is responsive, designed with Tailwind CSS, adapting from a two-column desktop layout to a single column on mobile. Custom typography is implemented using Google Fonts.

### Backend Architecture
The backend is powered by Express.js with Node.js and TypeScript, providing a RESTful API. The core API endpoint, `/api/assessment`, processes patient data to deliver drug interaction alerts, clinical recommendations, AI-generated summaries, and consultation questions. All incoming assessment data is validated using Zod schemas.

### Core Clinical and System Features
-   **Authentication**: Session-based authentication is implemented using `express-session`, supporting user roles such as Chief Pharmacy Officer (CPO), Regional Pharmacy Director (RPD), Pharmacy Director, and various Pharmacy Technician roles. All accounts use password `AHF1`. System accounts: `cpo@aidshealth.org` / `cpo@koheez.ai` (CPO), `jeremy.zellers@aidshealth.org` (CPO), `regional@aidshealth.org` / `negar.shirazpour@aidshealth.org` (RPD - Western Region), `director@koheez.ai` (generic PD). Over 60 named Pharmacy Directors are mapped to their stores with `firstname.lastname@aidshealth.org` format, password AHF1 (e.g. `seth.collins@aidshealth.org` → RX Pike Street, `anna.galvan@aidshealth.org` → RX Fort Worth, `elizabeth.camper@aidshealth.org` → RX Cabrini). All profiles are defined in `client/src/lib/userProfile.ts` (PROFILE_MAP) and login credentials in `server/routes.ts` (DEMO_USERS).
-   **Role-Based Access Control**: A three-tier hierarchy (`chief_pharmacy_officer`, `regional_pharmacy_director`, `pharmacy_director`) governs access and features within the application. Technicians have specific access to tasks.
-   **Drug Interaction Engine**: A comprehensive engine with over 100 evidence-based rules for ARV-to-concomitant, ARV-to-ARV, and duplicate therapy interactions. It includes severity levels and clinical recommendations. This integrates with the Liverpool HIV DDI database for enhanced interaction lookups.
-   **Clinical Validation Modules**: Includes renal function validation (eGFR-based safety, contraindications, dose adjustments), hepatic/pregnancy considerations (Child-Pugh, pregnancy contraindications like Efavirenz), and genetic validation (HLA-B*5701 screening for Abacavir).
-   **Clinical Recommendations Engine**: Provides evidence-based decision support for opportunistic infection (OI) prophylaxis (PCP, MAC, Toxoplasmosis based on CD4 count), viral load assessment, and immunization recommendations following CDC/ACIP guidelines.
-   **HIV Medication Database**: A comprehensive internal library of HIV medications, categorized by drug class, including generic and brand names, and dosing information.
-   **Assessment Workflow**: A multi-step form (`AssessmentForm.tsx`) guides users through clinical details, OpenEvidence query generation, response input, initial intake assessment, and comprehensive note generation. A dynamic DDI Alert Summary bar displays interaction counts and severity.
-   **Pharmacy Task Manager**: A role-based checklist system with tasks across daily, weekly, monthly, and quarterly frequencies, categorized into Operations, ACHC Compliance, State Board, and Retention Metrics. Pharmacist role is split into **Pharmacist 1** (morning/P4H focus: CF queue, overnight voicemails, PV1/P4H, P4H consults) and **Pharmacist 2** (PIKE/afternoon focus: PIKE PV1, urgent PIKE verification, Kevin Romero referrals, audit emails, pharmacy order submission, Supply Logix). It supports task assignment, priority alerts for directors, and animated completion tracking.
-   **Regional Dashboard**: Provides CPO and RPD roles with aggregate statistics and site-specific performance insights across regions, including site breakdowns, 7-day category trends, and identification of "trouble spots."
-   **Category Report**: Allows detailed analysis of store rankings based on a single category's completion over a selected period, with regional filtering for CPO and locked views for RPD.
-   **ACHC Compliance Workbook**: A quarterly self-assessment form for pharmacy directors to document ACHC compliance across 37 checklist items in 7 sections. It features role-based access, status tracking, and attestation.
-   **Patient Assistance Programs**: A dedicated section listing 32 HIV/ARV medications with details on copay cards and patient assistance programs, including savings, eligibility, and contact information.
-   **Team Scheduling (Task #54)**: Store-level staff scheduling tool for pharmacy directors and above (`/app/scheduling`, gated by `DirectorProtected`). Backend stores three entities per site: pharmacy business hours (per-weekday open/close + holiday closures), recurring per-staff weekly defaults, and per-date schedule overrides with status (Scheduled/Unscheduled/Sick/PTO/Floating Holiday) plus optional shift times and notes. Frontend renders a staff×day weekly grid that merges defaults with overrides, with click-to-edit cell dialog and a Defaults & Hours settings dialog. RPDs see only stores in their assigned region; PDs are scoped to their own site; CPOs see all. The roster comes from client-side `DEFAULT_ROSTERS` (`taskStorage.ts`); seed data is preloaded for site 1417 (RX Pike Street). The monthly Operations task `ops-m-001` ("Submit next month's staffing coverage schedule") includes an inline "Open Team Scheduling" link in the Task Manager. API: `GET /api/scheduling/sites`, `GET|PUT /api/scheduling/:siteId/hours`, `GET /api/scheduling/:siteId/defaults`, `PUT|DELETE /api/scheduling/:siteId/defaults/:staffId`, `GET /api/scheduling/:siteId/entries?from=&to=`, `PUT /api/scheduling/:siteId/entries`, `DELETE /api/scheduling/:siteId/entries/:staffId/:date`.

    **Submission workflow (PD → RPD/CPO)**: Each weekly schedule can be submitted by the site's PD for review. Statuses: `pending`, `approved`, `changes_requested`. The PD sees a banner with "Submit week to RPD" (week view only); on submit, RPDs of the same region and all CPOs are notified. Reviewers (same-region RPD or any CPO) see Approve / Request Changes controls in the same banner; requesting changes requires a note. Submitter is notified on review. A global notifications bell in the AppNav header polls every 30s, shows an unread badge, and deep-links into `/app/scheduling?site=&week=` (the Scheduling page reads these URL params on mount). API: `POST /api/scheduling/:siteId/submissions` (PD only), `GET /api/scheduling/:siteId/submissions[?weekStart=]`, `POST /api/scheduling/submissions/:id/approve`, `POST /api/scheduling/submissions/:id/request-changes`, `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`. Schemas live in `shared/schema.ts` (`ScheduleSubmission`, `AppNotification`, `createScheduleSubmissionSchema`, `reviewScheduleSubmissionSchema`); MemStorage holds them in-memory (Task #55 will persist).

### Data Storage Solutions
User data is managed in-memory for non-persistence across restarts. Drizzle ORM is configured for PostgreSQL with schema definitions, utilizing Drizzle Kit for migrations, and is prepared for integration with Neon serverless databases. Express session with a PostgreSQL session store handles persistent session management.

## SSRS → Koheez → Salesforce Pipeline (Task #23)

### SSRS Inbound (patient import)
- **`POST /api/retention/import`** — accepts JSON `{ siteId, patients[] }` with fields `initials, phone1, phone2, issueType`; upserts by `initials+siteId` key (existing patients skipped); secured by session auth OR `IMPORT_API_KEY` bearer token
- **CSV Import modal** in the Patient Retention Tracker UI — "Import from SSRS" button opens a modal with file picker or paste area, CSV preview table, and import confirmation
- **`scripts/ssrs-sync/`** — standalone Node.js script for AHF IT to schedule on the `ahfbi` network via Windows Task Scheduler; queries SQL Server via `MSSQL_QUERY`, maps columns, POSTs to Koheez import API; includes `README.md` with full setup instructions

### Salesforce Outbound (activity logging)
- **`server/lib/salesforceClient.ts`** — OAuth2 username-password flow to get access token; finds Salesforce Contact by phone1; creates Task/Activity record for each retention event
- Events logged: Patient Added, Call Attempt, Status Changed, Patient Removed, each Outreach Step Sent
- Fire-and-forget (does not block API responses); logs to console on success/failure
- **Env vars required**: `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_USERNAME`, `SF_PASSWORD`, `SF_SECURITY_TOKEN` (optional), `SF_INSTANCE_URL`
- Salesforce → DOMO pipeline remains unchanged (no DOMO changes required)

### Env Vars for Task #23
| Variable | Purpose |
|---|---|
| `IMPORT_API_KEY` | Secures the import endpoint for the ssrs-sync script |
| `SF_CLIENT_ID` | Salesforce Connected App client ID |
| `SF_CLIENT_SECRET` | Salesforce Connected App client secret |
| `SF_USERNAME` | Salesforce user login email |
| `SF_PASSWORD` | Salesforce user password |
| `SF_SECURITY_TOKEN` | Salesforce security token (appended to password) |
| `SF_INSTANCE_URL` | e.g. `https://ahf.my.salesforce.com` |
| `MSSQL_SERVER` | SQL Server hostname (ahfbi), for sync script |
| `MSSQL_DB` | Database name |
| `MSSQL_USER` | SQL login |
| `MSSQL_PASSWORD` | SQL password |
| `MSSQL_QUERY` | SQL SELECT for Retention Risk Report rows |
| `KOHEEZ_URL` | Public Koheez URL (for sync script) |
| `KOHEEZ_SITE_ID` | Site ID to import patients under |

## Automated Outreach Sequence (Task #22)

### Architecture
- **Retention patients** are now stored server-side in-memory (`server/storage.ts`) rather than browser `localStorage`
- **REST API** endpoints at `/api/retention/patients/:siteId`, POST/PUT/DELETE manage patient data
- **Daily cron scheduler** (`server/lib/outreachScheduler.ts`) runs at 9:00 AM (configurable via `OUTREACH_CRON` env var) and executes a 4-day contact sequence per patient
- **PatientCard UI** shows an "Automated Outreach" toggle and step timeline when a patient has `phone1` or `email` filled in

### Sequence Steps
| Day | Channel | Notes |
|-----|---------|-------|
| 1 | SMS (Clerkchat) | "Please call us..." |
| 2 | SMS (Clerkchat) | Reminder SMS |
| 3 | Email (Outlook) | To patient email, marked confidential |
| 4 | Email (Outlook) | To caseManagerContact |

### Environment Variables Required
- `CLERKCHAT_API_KEY` — Clerkchat bearer token (user must add via Secrets tab)
- `CLERKCHAT_CHANNEL_ID` — Clerkchat sending channel ID (user must add via Secrets tab)
- **Outlook email**: The Microsoft Outlook connector (`connector:ccfg_outlook_01K4BBCKRJKP82N3PYQPZQ6DAK`) was NOT connected (user dismissed the OAuth flow). To enable email outreach (Days 3 & 4), the user must either:
  1. Re-propose the Outlook integration and complete OAuth, then add the integration to the project, OR
  2. Provide a valid `OUTLOOK_ACCESS_TOKEN` secret manually
  Until one of these is done, email steps will be skipped with a console warning.

### New Files
- `server/lib/clerkchatClient.ts` — Clerkchat SMS helper
- `server/lib/outlookClient.ts` — Microsoft Graph email helper (uses `OUTLOOK_ACCESS_TOKEN` secret or Replit connector token)
- `server/lib/outreachScheduler.ts` — `node-cron`-based daily scheduler
- Package added: `node-cron`, `@types/node-cron`

### Manual Trigger
POST `/api/retention/outreach/run` — runs the scheduler pass immediately (for testing)

## External Dependencies

-   **OpenAI API**: Used for generating AI-powered clinical summaries and consultation questions.
-   **Liverpool HIV Drug Interactions API**: Provides enhanced drug interaction coverage and traffic-light interaction ratings.
-   **NIH RxTerms API (Clinical Tables Search Service)**: Supplies autocomplete suggestions for concomitant medications.
-   **PostgreSQL Database**: Employed for data persistence, session storage, and user management, typically via a `DATABASE_URL` environment variable and integrated with Neon serverless PostgreSQL.
-   **Third-Party UI Libraries**: Radix UI, Lucide React, date-fns, Embla Carousel, and Cmdk for UI components, iconography, date manipulation, carousel functionality, and command palette features, respectively.