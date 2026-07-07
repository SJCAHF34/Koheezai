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
-   **Drug Interaction Engine**: An evidence-based engine with over 100 rules for ARV-to-concomitant, ARV-to-ARV, and duplicate therapy interactions, integrating with the Liverpool HIV DDI database. Includes severity levels and clinical recommendations.
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
Storage is split: the shared server-side records that must survive restarts and redeploys — the CQI-QRE quarterly meetings (including attendee signatures) and the HIPAA access audit log — are persisted in PostgreSQL via Drizzle ORM (tables defined in `shared/schema.ts`, connection in `server/db.ts`, applied with `npm run db:push`). `DbStorage` in `server/storage.ts` extends `MemStorage` and overrides those records plus scheduling (hours, defaults, entries, submissions), notifications, retention patients, QA audit workbooks/tasks/evidence, and a `client_store` table that backs browser localStorage app data (task manager, controlled inventory, ACHC docs, saved assessments — 18 allowlisted `koheez_*` keys via `GET/PUT /api/client-store`, synced by `client/src/lib/serverStore.ts` which hydrates localStorage after login and debounce-pushes writes). `DbStorage.init()` backfills legacy QA data from `.local/qa-audit-state.json` and seeds site 1417 hours on first boot. Client-store blobs are shared across authenticated staff (last-write-wins per key; internal data is keyed by site). Sessions are persisted in PostgreSQL via `connect-pg-simple` (auto-created `session` table), so logins survive redeploys.

## External Dependencies

-   **OpenAI API**: For AI-powered clinical summaries and consultation questions.
-   **Liverpool HIV Drug Interactions API**: For comprehensive drug interaction data and ratings.
-   **NIH RxTerms API (Clinical Tables Search Service)**: For medication autocomplete suggestions.
-   **PostgreSQL Database**: For data persistence, session storage, and user management. Integrates with Neon serverless PostgreSQL.
-   **Third-Party UI Libraries**: Radix UI, Lucide React, date-fns, Embla Carousel, Cmdk for UI components, iconography, date manipulation, carousels, and command palettes.
-   **Clerkchat API**: For sending SMS messages in the automated outreach sequence.
-   **Microsoft Graph API (Outlook)**: For sending emails in the automated outreach sequence.
-   **Salesforce API**: For logging activities and events.