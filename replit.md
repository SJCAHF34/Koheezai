# Koheez.ai — HIV Clinical Decision Support

## Overview
Koheez.ai is a clinical decision support platform for HIV pharmacists. It features a Klaviyo-inspired dark landing/marketing page, session-based authentication (sign in / sign up), and a protected app workspace. The app performs comprehensive HIV treatment assessments by evaluating drug-drug interactions, analyzing patient demographics and clinical parameters, and generating AI-powered OpenEvidence query prompts and pharmacist consultation recommendations.

## Authentication
- Session-based auth via express-session (SESSION_SECRET env var).
- Demo credentials (all hardcoded in server/routes.ts DEMO_USERS):
  - `cpo@koheez.ai` / `KohezCPO1` — Chief Pharmacy Officer (all regions)
  - `test@koheez.ai` / `Koheez1` — Regional Pharmacy Director (Western Region, siteId 1417)
  - `jrockwoodpharmd@gmail.com` / `hollywood` — Pharmacy Director (Site 1417, RX Pike Street)
  - `director@koheez.ai` / `Director1` — Pharmacy Director (Site 1417, RX Pike Street)
- New accounts stored in in-memory array (inMemoryUsers) — not persisted across restarts.
- Auth endpoints: GET /api/auth/me, POST /api/auth/login, POST /api/auth/signup, POST /api/auth/logout.
- Unauthenticated users accessing /app/* are redirected to /login.

## Route Structure
- `/` → LandingPage (public, white background, blue→purple→red gradient logo only)
- `/login` → LoginPage (sign in / create account tabs, white/light theme)
- `/app` → DashboardPage (protected; CPO + RPD redirect to /app/tasks/regional; PD goes to /app)
- `/app/assessment` → AssessmentForm (protected, HIV/PrEP Treatment Assessor)
- `/app/patient-assistance` → PatientAssistance (protected)
- `/app/clinical-tools` → ClinicalTools (protected)
- `/app/tasks/regional` → RegionalDashboard (protected, CPO + RPD only; others redirected to /app/tasks)
- `/app/tasks` → TaskManager (protected, role-based pharmacy task management)
- `/app/category-report` → CategoryReport (protected, regional dashboard drill-down; filterable by region)
- `/app/achc-workbook` → AchcWorkbook (protected; tech roles redirected to /app/tasks; CPO/RPD read-only with site selector; directors fill out quarterly ACHC compliance workbook)

## User Preferences
Preferred communication style: Simple, everyday language.

## Role Hierarchy
Three-tier hierarchy defined in `client/src/lib/userProfile.ts`:
- **`chief_pharmacy_officer` (CPO)**: All-region access to Regional Dashboard. Sees region filter tabs (All / Western / Northern / Southern / Eastern) on RegionalDashboard and CategoryReport. Can flag task priorities.
- **`regional_pharmacy_director` (RPD)**: Locked to assigned region (e.g., Western Region). Auto-filtered dashboard + category report. Can flag task priorities.
- **`pharmacy_director`**: Site-level task manager access (`/app/tasks`). Sees priority alert banner, can flag and dismiss alerts. Can assign tasks.
- Tech roles: `data_entry_tech`, `pv2_tech`, `delivery_tech`, `pharmacist` — see only their tasks, no flagging.

Helper functions: `isRegionalOrAbove()`, `isCPO()`, `isPharmacyDirector()`, `isTechRole()`, `isDirectorRole()`, `getAssignedRegion()`.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite build tool).
- **UI Component System**: Shadcn/ui (Radix UI primitives) with "New York" design style, focusing on a professional clinical interface.
- **Routing**: Wouter for client-side routing in a single-page application.
- **State Management**: React hooks for local state; TanStack Query for server state and caching.
- **Form Handling**: Controlled components with Zod validation for patient demographics, treatment regimens, clinical parameters, concomitant medications, and genetic resistance notes.
- **Medication Search**: Autocomplete for concomitant medications via NIH RxTerms API, with debouncing, duplicate filtering, and keyboard navigation.
- **Layout System**: Responsive design using Tailwind CSS, with a two-column desktop layout collapsing to single column on mobile.
- **Typography**: Custom font stack (Inter/Roboto, JetBrains Mono) via Google Fonts CDN.

### Backend Architecture
- **Server Framework**: Express.js with Node.js and TypeScript.
- **API Structure**: RESTful API with a primary endpoint `/api/assessment` (POST) for processing patient data and returning drug interaction alerts, clinical recommendations, AI-generated summaries, and consultation questions.
- **Request Validation**: Zod schema validation for incoming assessment data.

### Clinical Validation Modules
- **Drug Interaction Engine**: Comprehensive engine with 100+ evidence-based rules for ARV-to-concomitant, ARV-to-ARV, and duplicate therapy interactions. Includes severity levels, descriptions, and clinical recommendations. (`server/lib/drugInteractions.ts`)
- **Liverpool HIV DDI Integration**: `server/lib/liverpoolDDI.ts` — calls the University of Liverpool HIV Drug Interactions API (requires `LIVERPOOL_API_KEY`). Looks up drug IDs by name, then fetches traffic-light interaction ratings (red→critical, amber→moderate, yellow→minor, green→skip). Merges Liverpool results with local rules, deduplicating by drug pair. Falls back gracefully when key is not configured.
- **Renal Function Validation**: eGFR-based safety checks for medications, including contraindications and dose adjustments for TDF/TAF-containing products and Biktarvy.
- **Hepatic/Pregnancy/Genetic Validation**: Alerts for hepatic impairment (Child-Pugh staging), pregnancy contraindications (e.g., Efavirenz, Cobicistat), and HLA-B*5701 screening for Abacavir hypersensitivity.
- **Clinical Recommendations Engine**: Evidence-based decision support for OI prophylaxis (PCP, MAC, Toxoplasmosis based on CD4 count), viral load assessment (undetectable, low-level viremia, virologic failure), and immunization recommendations (CDC/ACIP guidelines).

### HIV Medication Database
- Comprehensive library (`client/src/lib/hivDrugs.ts`) organized by drug class with generic names, brand names, and dosing information.

### Data Storage Solutions
- **User Storage**: In-memory storage (`MemStorage` class) for user data (not persistent across restarts).
- **Database Configuration**: Drizzle ORM configured for PostgreSQL with schema definitions, using Drizzle Kit for migrations. Prepared for Neon serverless database integration.
- **Session Management**: Express session with PostgreSQL session store.

### Assessment Form & DDI Alert Summary
- `AssessmentForm.tsx`: Multi-step workflow — Step 1 Clinical Details → Step 2 Create OpenEvidence Query → Step 3 Input OE Response → Step 4 Initial Intake Assessment → Step 5 Generate Comprehensive Note.
- After the query is created (Step 2), a **DDI Alert Summary bar** appears showing:
  - Total alert count with severity badges (Critical/Moderate/Minor color-coded pills)
  - **Liverpool HIV DDI badge** (blue, `data-testid="badge-liverpool-ddi"`) if Liverpool API is configured
  - **Internal Rules Engine badge** (gray, `data-testid="badge-internal-ddi"`) when Liverpool not configured
  - `data-testid="ddi-alert-summary"` for the entire summary bar
- Assessment API response includes `liverpoolDDI: { enabled, resolvedDrugs, newInteractions }`.

### Pharmacy Task Manager (`/app/tasks`)
- Role-based checklist system with 70+ seeded tasks across four frequencies: Daily, Weekly, Monthly, Quarterly.
- Task categories: **Operations** (slate), **ACHC Compliance** (blue), **State Board** (emerald), **Retention Metrics** (amber).
- `TaskRole` strings (internal): `data_entry_tech`, `pv2_tech`, `delivery_tech`, `pharmacist`, `director`, `all_staff`.
- Non-directors see only their role's tasks + `all_staff` tasks.
- Directors see a **role-view selector** and a **Site Overview panel** showing per-role completion % cards.
- **Animated checkboxes**: circular checkbox scales on click, turns green with Check icon, task text fades/strikes through. Completions saved to localStorage.
- **Assign Task dialog** (directors only): hover any task row → UserPlus button → dialog to assign role + optional note.
- **Priority Alert system** (directors only): Flag (amber) button on task rows → `PriorityDialog` sets Low/Medium/High priority with optional note. `pharmacy_director` users see an amber alert banner at top of TaskManager for their site's flagged tasks (individual dismiss + "Dismiss all"). CPO/RPD can also flag tasks.
- **Today's Tasks widget** on Dashboard: compact progress bar linking to /app/tasks.
- Data layer: `client/src/lib/taskData.ts`, `client/src/lib/taskStorage.ts`, `client/src/lib/userProfile.ts`.
- localStorage keys: `koheez_task_completions`, `koheez_task_assignments`, `koheez_task_priorities`.
- Period keys: daily=YYYY-MM-DD, weekly=YYYY-Www, monthly=YYYY-MM, quarterly=YYYY-Qn.

### Patient Assistance Programs Section
- Dedicated page (`/patient-assistance`) sourced from NeedyMeds and manufacturer websites.
- **32 HIV/ARV medications** across Gilead, ViiV Healthcare, Janssen, Merck, AbbVie, and more.
- Each medication lists copay cards and patient assistance programs (PAPs) with savings amounts, eligibility, phone numbers, and direct links.
- Searchable and filterable by program type (copay/PAP) and manufacturer.
- Data file: `client/src/lib/assistancePrograms.ts`.

### Regional Dashboard (`/app/tasks/regional`)
- Role-gated: CPO and RPD can access; Pharmacy Directors + tech roles are redirected to `/app/tasks`.
- **CPO view**: Region filter tabs ("All", Western, Northern, Southern, Eastern) in the Category Trends header and CategoryReport. Filter persists as URL param `region=`.
- **RPD view**: Auto-locked to assigned region (e.g., Western Region). No region filter tabs.
- **Aggregate stat tiles**: Sites Monitored, Today's Avg, 7-Day Compliance.
- **Site Breakdown**: Cards per site with today's overall % and category mini-bars. Click expands 7-day trend sparklines.
- **Store Directory**: 69 simulated stores across 4 regions from `client/src/lib/storeDirectory.ts`. Filterable by CPO region filter.
- **7-Day Category Trends**: Sparkline cards per category with period selector (7d/30d/6m/1y). Click → CategoryReport.
- **Trouble Spots**: Categories sorted by 7-day avg. Below 65% → "Action needed" badge.
- Trend data: Simulated via seeded PRNG (`trendData.ts`). Base rates: operations 74%, ACHC 82%, state board 79%, retention 58%.
- Header shows dynamic role label ("Chief Pharmacy Officer" / "Regional Pharmacy Director") and region.

### CategoryReport (`/app/category-report`)
- All stores ranked by a single category's completion across a selected period.
- URL params: `cat=` (achc/state_board/operations/retention), `period=` (7d/30d/6m/1y), `region=` (optional).
- **CPO**: Shows region filter tabs (All Regions / each region). Clickable, updates store list.
- **RPD**: Shows non-interactive "Western Region" badge with store count (auto-locked).
- Stores grouped into tiers: Top (≥80%), Good (65–79%), At Risk (50–64%), Critical (<50%).
- Mini sparklines per store row, progress bars, trend icons (up/down/stable).
- Data file: `client/src/lib/trendData.ts` → `getSiteRankingByCategory()`.

### ACHC Compliance Workbook (`/app/achc-workbook`)
- Quarterly self-assessment form for pharmacy directors to document ACHC compliance.
- **7 sections**: Patient Rights & Education (6 items), Policies & Procedures (5), Medication Management (6), Quality Management/CQI (5), Staff Competency & Training (5), Infection Control (5), Emergency Preparedness (5) — 37 total checklist items.
- Each section is an accordion with boolean checkboxes and a free-text notes field.
- **Role-based access**: Tech roles redirected to `/app/tasks`. CPO sees all-store site selector (read-only). RPD sees region-scoped site selector (read-only). Pharmacy Director sees editable form for their site.
- **Status tracking**: Not Started → In Progress (any item checked) → Submitted (director attests + clicks Submit).
- **Attestation area**: Auto-fills director name + today's date; Submit Workbook button locks the form.
- **localStorage key**: `koheez_achc_workbook`, scoped by siteId + quarter (YYYY-Qn).
- **TaskManager integration**: All ACHC quarterly task rows show an "Open ACHC Workbook" link.
- **Nav link**: "ACHC" appears in top nav for all non-tech roles (data-testid: `nav-achc-workbook`).
- Data file: `client/src/lib/achcWorkbookData.ts`. Storage helpers: `client/src/lib/taskStorage.ts` (`loadWorkbook`, `saveWorkbook`, `submitWorkbook`, `getCurrentQuarter`, `getWorkbookStatus`).

## External Dependencies

- **OpenAI API**: Used for generating AI-powered clinical summaries and consultation questions. Requires `OPENAI_API_KEY`.
- **Liverpool HIV Drug Interactions API**: University of Liverpool DDI checker for enhanced drug interaction coverage. Requires `LIVERPOOL_API_KEY` (contact hivgroup@liverpool.ac.uk). API docs: hivdrugs.docs.apiary.io. Falls back gracefully when not configured.
- **NIH RxTerms API (Clinical Tables Search Service)**: Provides autocomplete suggestions for concomitant medications. No API key required.
- **PostgreSQL Database**: Expected via `DATABASE_URL` environment variable for data persistence, session storage, and user management. Utilizes Neon serverless PostgreSQL.
- **Third-Party UI Libraries**:
    - Radix UI (component primitives)
    - Lucide React (iconography)
    - date-fns (date manipulation)
    - embla-carousel (carousel functionality)
    - cmdk (command palette)
