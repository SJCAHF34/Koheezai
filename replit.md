# Koheez.ai — HIV Clinical Decision Support

## Overview
Koheez.ai is a clinical decision support platform for HIV pharmacists. It features a Klaviyo-inspired dark landing/marketing page, session-based authentication (sign in / sign up), and a protected app workspace. The app performs comprehensive HIV treatment assessments by evaluating drug-drug interactions, analyzing patient demographics and clinical parameters, and generating AI-powered OpenEvidence query prompts and pharmacist consultation recommendations.

## Authentication
- Session-based auth via express-session (SESSION_SECRET env var).
- Test login: test@koheez.ai / Koheez1 (hardcoded in server/routes.ts DEMO_USERS).
- New accounts stored in in-memory array (inMemoryUsers) — not persisted across restarts.
- Auth endpoints: GET /api/auth/me, POST /api/auth/login, POST /api/auth/signup, POST /api/auth/logout.
- Unauthenticated users accessing /app/* are redirected to /login.

## Route Structure
- `/` → LandingPage (public, white background, blue→purple→red gradient logo only)
- `/login` → LoginPage (sign in / create account tabs, white/light theme)
- `/app` → DashboardPage (protected, member dashboard with tool cards + Today's Tasks widget)
- `/app/assessment` → AssessmentForm (protected, HIV/PrEP Treatment Assessor)
- `/app/patient-assistance` → PatientAssistance (protected)
- `/app/clinical-tools` → ClinicalTools (protected)
- `/app/tasks` → TaskManager (protected, role-based pharmacy task management)

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Drug Interaction Engine**: Comprehensive engine with 100+ evidence-based rules for ARV-to-concomitant, ARV-to-ARV, and duplicate therapy interactions. Includes severity levels, descriptions, and clinical recommendations.
- **Renal Function Validation**: eGFR-based safety checks for medications, including contraindications and dose adjustments for TDF/TAF-containing products and Biktarvy.
- **Hepatic/Pregnancy/Genetic Validation**: Alerts for hepatic impairment (Child-Pugh staging), pregnancy contraindications (e.g., Efavirenz, Cobicistat), and HLA-B*5701 screening for Abacavir hypersensitivity.
- **Clinical Recommendations Engine**: Evidence-based decision support for OI prophylaxis (PCP, MAC, Toxoplasmosis based on CD4 count), viral load assessment (undetectable, low-level viremia, virologic failure), and immunization recommendations (CDC/ACIP guidelines).

### HIV Medication Database
- Comprehensive library (`client/src/lib/hivDrugs.ts`) organized by drug class with generic names, brand names, and dosing information.

### Data Storage Solutions
- **User Storage**: In-memory storage (`MemStorage` class) for user data (not persistent across restarts).
- **Database Configuration**: Drizzle ORM configured for PostgreSQL with schema definitions, using Drizzle Kit for migrations. Prepared for Neon serverless database integration.
- **Session Management**: Express session with PostgreSQL session store.

### Pharmacy Task Manager (`/app/tasks`)
- Role-based checklist system with 70+ seeded tasks across four frequencies: Daily, Weekly, Monthly, Quarterly.
- Task categories: **Operations** (slate), **ACHC Compliance** (blue), **State Board** (emerald), **Retention Metrics** (amber).
- Roles: `data_entry_tech`, `pv2_tech`, `delivery_tech`, `pharmacist`, `director`, `regional_director`.
- Non-directors see only their role's tasks + `all_staff` tasks.
- Directors see a **role-view selector** (My Tasks / DE Tech / PV2 Tech / Delivery Tech / Pharmacist / All Roles) and a **Site Overview panel** showing per-role completion % cards.
- **Animated checkboxes**: circular checkbox scales on click, turns green with Check icon, task text fades/strikes through. Completions saved to localStorage.
- **Assign Task dialog** (directors only): hover any task row → UserPlus button → dialog to assign role + optional note. Assignment displayed inline on the task row.
- **Today's Tasks widget** on Dashboard: compact progress bar linking to /app/tasks.
- Data layer: `client/src/lib/taskData.ts` (types + seed), `client/src/lib/taskStorage.ts` (localStorage helpers), `client/src/lib/userProfile.ts` (role mapping for demo users).
- localStorage keys: `koheez_task_completions`, `koheez_task_assignments`.
- Period keys: daily=YYYY-MM-DD, weekly=YYYY-Www, monthly=YYYY-MM, quarterly=YYYY-Qn.

### Patient Assistance Programs Section
- Dedicated page (`/patient-assistance`) sourced from NeedyMeds and manufacturer websites
- **32 HIV/ARV medications** across Gilead, ViiV Healthcare, Janssen, Merck, AbbVie, and more
- Each medication lists copay cards and patient assistance programs (PAPs) with savings amounts, eligibility, phone numbers, and direct links to manufacturer programs and NeedyMeds pages
- Broader resources section: ADAP, Ryan White Program, HealthWell Foundation, PAN Foundation, NeedyMeds directory
- Searchable and filterable by program type (copay/PAP) and manufacturer
- Data file: `client/src/lib/assistancePrograms.ts`

### Assessment Results Display
- The `AssessmentResults` component displays comprehensive output, including:
    - Drug-Drug Interactions (severity-coded alerts).
    - Renal Function Alerts (eGFR-based warnings).
    - Hepatic/Pregnancy/Genetic Alerts (category-tagged).
    - Clinical Recommendations (priority-based cards for OI prophylaxis, viral load, immunizations, adherence).
    - AI-generated Clinical Assessment Summary.
    - Pharmacist Consultation Questions (checkbox-enabled list).

### Authentication and Authorization
- Basic user management infrastructure exists, but full authentication is not yet implemented in the assessment workflow.

## External Dependencies

- **OpenAI API**: Used for generating AI-powered clinical summaries and consultation questions. Requires `OPENAI_API_KEY`.
- **NIH RxTerms API (Clinical Tables Search Service)**: Provides autocomplete suggestions for concomitant medications. No API key required.
- **PostgreSQL Database**: Expected via `DATABASE_URL` environment variable for data persistence, session storage, and user management. Utilizes Neon serverless PostgreSQL.
- **Third-Party UI Libraries**:
    - Radix UI (component primitives)
    - Lucide React (iconography)
    - date-fns (date manipulation)
    - embla-carousel (carousel functionality)
    - cmdk (command palette)