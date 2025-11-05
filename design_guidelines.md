# HIV Treatment Assessor - Design Guidelines

## Design Approach: Professional Clinical Interface
**Selected Approach:** Design System - Material Design for Healthcare
**Rationale:** This is a utility-focused clinical tool requiring information density, professional credibility, and error-resistant interactions. Drawing from Material Design's structured approach with healthcare-specific adaptations.

## Layout System & Structure

**Container Strategy:**
- Maximum content width: `max-w-7xl` for optimal readability of dense medical information
- Main assessment form: Two-column layout on desktop (`lg:grid-cols-2`), single column on mobile
- Generated assessment output: Full-width single column with `max-w-4xl` for optimal reading

**Spacing System:**
Use Tailwind spacing units: **4, 6, 8, 12, 16** for consistency
- Section padding: `py-12` mobile, `py-16` desktop
- Card/component spacing: `p-6` or `p-8`
- Form field gaps: `gap-6` for vertical spacing
- Grid gaps: `gap-4` for checkbox groups, `gap-8` for major sections

**Page Structure:**
```
Header (sticky navigation with patient info summary)
├─ Patient Demographics Section
├─ Treatment Regimen Section (organized by drug class)
├─ Clinical Parameters Section (2-column grid)
├─ Concomitant Medications Section
├─ Assessment Notes Section
└─ Submit & Generate Assessment Button

Generated Output Panel (appears after submission)
├─ Drug-Drug Interaction Alerts
├─ Clinical Assessment Summary
└─ Pharmacist Consultation Questions
```

## Typography Hierarchy

**Font Stack:** 
- Primary: Inter or Roboto (via Google Fonts CDN)
- Monospace: JetBrains Mono for medication names and dosages

**Type Scale:**
- Page Title: `text-3xl font-bold` 
- Section Headings: `text-xl font-semibold`
- Subsection Headings: `text-lg font-medium`
- Form Labels: `text-sm font-medium uppercase tracking-wide`
- Body Text: `text-base`
- Helper Text: `text-sm`
- Medication Names: `font-mono text-sm`
- Critical Alerts: `text-base font-semibold`

## Component Library

### Core Input Components

**Patient Demographics Card:**
- Age input field (number)
- Pregnancy status (radio buttons: Yes/No/Unknown)
- HLA-B*5701 status (radio buttons: Positive/Negative/Unknown)
- Layout: Two-column grid on desktop

**Treatment Regimen Builder:**
Organized accordion sections by drug class:
1. NRTIs (Nucleoside Reverse Transcriptase Inhibitors)
2. NNRTIs (Non-Nucleoside Reverse Transcriptase Inhibitors)
3. PIs (Protease Inhibitors)
4. INSTIs (Integrase Strand Transfer Inhibitors)
5. Entry/Fusion Inhibitors

Each drug class expandable panel contains:
- Checkbox grid (3-4 columns on desktop, 2 on tablet, 1 on mobile)
- Drug name + common dosage in lighter text
- Search/filter input at top of each section

**Clinical Parameters Panel:**
Two-column grid containing:
- Treatment Status: Large radio button selection (Treatment Naive / Treatment Experienced)
- Viral Load: Number input with unit label (copies/mL)
- CD4 Count: Number input with unit label (cells/mm³)
- Renal Function (eGFR): Number input with unit label
- Hepatic Function: Dropdown selection (Normal/Mild/Moderate/Severe)

**Concomitant Medications Input:**
- Multi-entry text input with autocomplete/suggestions
- Add/remove buttons for each medication
- Tag-style display of added medications
- Visual counter showing number of medications added

**Genetic Resistance Notes:**
- Large textarea (minimum 4 rows)
- Character counter
- Prominent link button to Stanford HIV Drug Resistance Database (opens in new tab)
- Icon: External link indicator

### Assessment Output Components

**Drug-Drug Interaction Alert Cards:**
Severity-based visual hierarchy (using borders and icons, not colors):
- Critical interactions: Prominent border, warning icon
- Moderate interactions: Standard border, caution icon
- Minor interactions: Subtle border, info icon

Each card displays:
- Drug pair involved
- Interaction severity level
- Clinical significance description
- Recommended action

**Clinical Assessment Summary:**
- Structured text output in readable paragraphs
- Key findings highlighted in bordered callout boxes
- Bullet-point lists for recommendations
- Professional medical formatting

**Consultation Questions Panel:**
- Numbered list of pharmacist prompts
- Each question in its own padded container
- Checkbox next to each question for tracking
- Print-friendly layout

## Navigation & Actions

**Header Navigation (Sticky):**
- Tool title on left
- Patient summary badges (if data entered) in center
- Clear/Reset button on right

**Primary Action Button:**
- "Generate Clinical Assessment" button
- Full-width on mobile, auto-width on desktop
- Positioned at end of input form with generous spacing above (`mt-12`)
- Loading state with spinner when generating

**Secondary Actions:**
- "Save Draft" button (subtle styling)
- "Print Assessment" button (appears after generation)
- "Start New Assessment" button

## Data Display Patterns

**Form Field Structure:**
Each input follows consistent pattern:
- Label (top-aligned, `text-sm font-medium`)
- Input field with adequate padding (`px-4 py-3`)
- Helper text below (if applicable, `text-sm`)
- Error state styling (if validation fails)

**Checkbox/Radio Groups:**
- Clear visual grouping with subtle borders
- Adequate touch targets (minimum 44px height)
- Labels clearly associated with inputs
- Spacing between options: `gap-3`

**Accordion Sections:**
- Clear expand/collapse indicators (chevron icons)
- Smooth transitions
- Section count badges showing selected items
- Persistent state during session

## Medical-Specific Patterns

**Medication Lists:**
- Generic name in primary font weight
- Brand names in parentheses, lighter weight
- Dosage information in monospace font
- Drug class tags/badges

**Clinical Value Displays:**
- Number with unit clearly separated
- Reference range indicators where applicable
- Visual flags for out-of-range values (without relying on color alone)

**Safety Alerts:**
- Icon-driven (using Heroicons or similar)
- Clear hierarchical importance
- Actionable text
- Never rely solely on visual treatment to convey urgency

## Accessibility & Professional Standards

- All form inputs with proper labels and ARIA attributes
- Keyboard navigation fully supported
- Focus states clearly visible
- Sufficient contrast for medical professional use (often in varying lighting)
- Print stylesheet for clinical documentation
- Screen reader optimized for efficiency
- Error messages clearly associated with fields

## Icons
**Library:** Heroicons (via CDN)
**Usage:**
- Medical/clinical icons: beaker, clipboard-document-check, exclamation-triangle
- Action icons: plus, minus, trash, external-link
- Status icons: check-circle, x-circle, information-circle
- Size: `w-5 h-5` for inline, `w-6 h-6` for prominent

## No Images Required
This is a clinical form application - no hero images or marketing visuals needed. Focus is entirely on functional interface design.