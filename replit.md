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
-   **Authentication**: Session-based authentication is implemented using `express-session`, supporting user roles such as Chief Pharmacy Officer (CPO), Regional Pharmacy Director (RPD), Pharmacy Director, and various Pharmacy Technician roles.
-   **Role-Based Access Control**: A three-tier hierarchy (`chief_pharmacy_officer`, `regional_pharmacy_director`, `pharmacy_director`) governs access and features within the application. Technicians have specific access to tasks.
-   **Drug Interaction Engine**: A comprehensive engine with over 100 evidence-based rules for ARV-to-concomitant, ARV-to-ARV, and duplicate therapy interactions. It includes severity levels and clinical recommendations. This integrates with the Liverpool HIV DDI database for enhanced interaction lookups.
-   **Clinical Validation Modules**: Includes renal function validation (eGFR-based safety, contraindications, dose adjustments), hepatic/pregnancy considerations (Child-Pugh, pregnancy contraindications like Efavirenz), and genetic validation (HLA-B*5701 screening for Abacavir).
-   **Clinical Recommendations Engine**: Provides evidence-based decision support for opportunistic infection (OI) prophylaxis (PCP, MAC, Toxoplasmosis based on CD4 count), viral load assessment, and immunization recommendations following CDC/ACIP guidelines.
-   **HIV Medication Database**: A comprehensive internal library of HIV medications, categorized by drug class, including generic and brand names, and dosing information.
-   **Assessment Workflow**: A multi-step form (`AssessmentForm.tsx`) guides users through clinical details, OpenEvidence query generation, response input, initial intake assessment, and comprehensive note generation. A dynamic DDI Alert Summary bar displays interaction counts and severity.
-   **Pharmacy Task Manager**: A role-based checklist system with over 70 seeded tasks across daily, weekly, monthly, and quarterly frequencies, categorized into Operations, ACHC Compliance, State Board, and Retention Metrics. It supports task assignment, priority alerts for directors, and animated completion tracking.
-   **Regional Dashboard**: Provides CPO and RPD roles with aggregate statistics and site-specific performance insights across regions, including site breakdowns, 7-day category trends, and identification of "trouble spots."
-   **Category Report**: Allows detailed analysis of store rankings based on a single category's completion over a selected period, with regional filtering for CPO and locked views for RPD.
-   **ACHC Compliance Workbook**: A quarterly self-assessment form for pharmacy directors to document ACHC compliance across 37 checklist items in 7 sections. It features role-based access, status tracking, and attestation.
-   **Patient Assistance Programs**: A dedicated section listing 32 HIV/ARV medications with details on copay cards and patient assistance programs, including savings, eligibility, and contact information.

### Data Storage Solutions
User data is managed in-memory for non-persistence across restarts. Drizzle ORM is configured for PostgreSQL with schema definitions, utilizing Drizzle Kit for migrations, and is prepared for integration with Neon serverless databases. Express session with a PostgreSQL session store handles persistent session management.

## External Dependencies

-   **OpenAI API**: Used for generating AI-powered clinical summaries and consultation questions.
-   **Liverpool HIV Drug Interactions API**: Provides enhanced drug interaction coverage and traffic-light interaction ratings.
-   **NIH RxTerms API (Clinical Tables Search Service)**: Supplies autocomplete suggestions for concomitant medications.
-   **PostgreSQL Database**: Employed for data persistence, session storage, and user management, typically via a `DATABASE_URL` environment variable and integrated with Neon serverless PostgreSQL.
-   **Third-Party UI Libraries**: Radix UI, Lucide React, date-fns, Embla Carousel, and Cmdk for UI components, iconography, date manipulation, carousel functionality, and command palette features, respectively.