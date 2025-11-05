# HIV Treatment Assessor

## Overview

The HIV Treatment Assessor is a clinical decision support tool designed for pharmacists and healthcare providers to perform comprehensive HIV treatment assessments. The application evaluates drug-drug interactions, analyzes patient demographics and clinical parameters, and generates AI-powered consultation recommendations. It accepts patient data including antiretroviral medication regimens, concomitant medications, lab values, and genetic markers, then produces structured clinical assessments with interaction alerts and pharmacist consultation questions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: Shadcn/ui component library built on Radix UI primitives, following the "New York" design style variant. The design system emphasizes a professional clinical interface with Material Design for Healthcare principles, optimized for information density and error-resistant interactions.

**Routing**: Wouter for lightweight client-side routing, with a single-page application structure focused on the assessment form.

**State Management**: React hooks for local component state management. TanStack Query (React Query) handles server state and API request caching.

**Form Handling**: Controlled components using React state, with validation handled through Zod schemas. The assessment form captures:
- Patient demographics (age, pregnancy status, HLA-B*5701 status)
- Treatment regimen (antiretroviral medications organized by drug class)
- Clinical parameters (viral load, CD4 count, eGFR, hepatic function)
- Concomitant medications
- Genetic resistance notes

**Layout System**: Responsive design with Tailwind CSS using a maximum content width of 7xl for optimal readability. Two-column layout on desktop for the assessment form, collapsing to single column on mobile. Consistent spacing using Tailwind units (4, 6, 8, 12, 16).

**Typography**: Custom font stack featuring Inter/Roboto for primary text and JetBrains Mono for medication names and dosages, loaded via Google Fonts CDN.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript

**API Structure**: RESTful API with a single primary endpoint `/api/assessment` (POST) that accepts patient assessment data and returns:
- Drug-drug interactions array
- AI-generated clinical summary
- Pharmacist consultation questions

**Request Validation**: Zod schema validation on incoming assessment requests to ensure data integrity.

**Drug Interaction Engine**: Custom interaction checking logic in `server/lib/drugInteractions.ts` that evaluates selected HIV medications against concomitant medications using pattern-matching rules. Each interaction includes severity level (critical/moderate/minor), description, and clinical recommendations.

**HIV Medication Database**: Comprehensive medication library (`client/src/lib/hivDrugs.ts`) organized by drug class (NRTI, NNRTI, INSTI, PI, etc.) with generic names, brand names, and standard dosing information.

### Data Storage Solutions

**User Storage**: In-memory storage implementation (`MemStorage` class) for user data with a Map-based approach. The current implementation does not persist data between server restarts.

**Database Configuration**: Drizzle ORM configured for PostgreSQL with schema definitions in `shared/schema.ts`. Database migrations are managed through Drizzle Kit. The application is prepared for PostgreSQL integration via Neon serverless database (evidenced by `@neondatabase/serverless` dependency), though data persistence is not currently implemented for assessment results.

**Session Management**: Express session configuration with PostgreSQL session store (`connect-pg-simple`).

### External Dependencies

**OpenAI API**: The application integrates with OpenAI's API to generate clinical assessments. When a patient assessment is submitted, the system:
1. Checks for drug-drug interactions using internal rules
2. Sends patient data and interaction results to OpenAI for clinical summary generation
3. Receives structured assessment recommendations including consultation questions

The OpenAI integration requires an API key configured via the `OPENAI_API_KEY` environment variable.

**Database**: PostgreSQL database (expected via `DATABASE_URL` environment variable) for data persistence, session storage, and user management. The application uses Neon serverless PostgreSQL for cloud database connectivity.

**Third-Party UI Libraries**: 
- Radix UI component primitives (accordion, dialog, popover, radio group, etc.)
- Lucide React for iconography
- date-fns for date manipulation
- embla-carousel for carousel functionality
- cmdk for command palette interfaces

**Development Tools**:
- Replit-specific plugins for development environment integration (cartographer, dev-banner, runtime error modal)
- ESBuild for server-side bundling
- TSX for TypeScript execution in development

### Authentication and Authorization

The codebase includes basic user management infrastructure (User schema, storage interface with getUser, getUserByUsername, createUser methods), but authentication is not currently implemented in the assessment workflow. The application appears designed to be extended with user authentication in the future.