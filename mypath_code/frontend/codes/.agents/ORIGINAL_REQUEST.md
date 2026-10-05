# Original User Request

## Initial Request — 2026-09-13T16:45:21Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Build a PDF Parsing and Validation Pipeline
> Requested team: [none — teamwork routes from the description]

Build a standalone Node.js backend pipeline that parses PDF files, extracts specific pages/sentences based on keyword matching, and uses the Gemini API to cross-reference (unity check) the extracted data against database criteria.

Working directory: `c:\Users\sindh\Documents\codes\mypath-scraper`
Integrity mode: development

## Requirements

### R1. Targeted PDF Parsing
Create a utility that reads a PDF file but does not just dump the entire text. It must be able to search the PDF for specific keywords and extract only the relevant pages or sentences containing those keywords to minimize token usage and noise.

### R2. Gemini API Integration
Integrate the official `@google/genai` SDK. Pass the targeted, extracted PDF text to the Gemini model to intelligently parse out structured criteria (e.g., eligibility requirements, qualifications, or specific data points). 

### R3. Unity / Database Checking
Implement a verification module ("unity checking") that compares the structured data returned by Gemini against a predefined set of database criteria or schema rules. Ensure the logic can evaluate if the parsed PDF matches the required criteria.

### R4. Standalone Execution
This must be a standalone pipeline. **Do NOT include** Firestore database interactions, user creation, or email sending integrations (Resend). Provide a local test script (e.g., `parse-demo.js`) that allows the user to supply a PDF, a Gemini API key via `.env`, and mock database criteria to see the end-to-end extraction and validation in the console.

## Acceptance Criteria

### Parsing Verification
- [ ] The script successfully reads a sample PDF and extracts only the text from pages or sentences containing specified keywords.

### Extraction & Validation Verification
- [ ] The script successfully sends the targeted text to the Gemini API and receives a structured response.
- [ ] The script runs a "unity check" function that correctly validates the Gemini output against mock database criteria and logs the match/mismatch result.
- [ ] The pipeline runs entirely locally via a command like `node parse-demo.js` without relying on active Firebase connections or email services.

## Follow-up — 2026-09-16T14:30:58Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.

Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes
Integrity mode: development

## Requirements

### R1. CSS-Only Responsiveness via `responsive.css`
Implement responsiveness strictly through CSS media queries in a central CSS file (e.g., `responsive.css`). Add CSS classes to elements as needed and use `!important` in the media queries to override the existing inline styles on mobile/tablet devices.

### R2. Strict Preservation of Assets and Structure
Keep the exact existing layout, DOM structure, components, logos, colors, and typography. Do not add, remove, or invent UI elements. Do not use generic "AI" styling (no new gradients, glassmorphism, or shadows).

### R3. Desktop Integrity
The desktop design must remain untouched and completely unaltered. Do not introduce conditional JavaScript rendering (e.g., no `isMobile` hooks) or separate mobile DOM trees. Do not remove the existing inline styles.

## Acceptance Criteria

### Implementation Constraints
- [ ] A central `responsive.css` file is created and imported into the application.
- [ ] Responsive rules are wrapped in standard media queries (e.g., `@media (max-width: 768px)`).
- [ ] No new components, conditional JSX branching, or duplicate mobile-specific DOM nodes are created.
- [ ] The desktop view (> 1024px) remains 100% pixel-for-pixel identical to the current state because mobile CSS overrides do not apply.

### Visual Behavior on Mobile/Tablet
- [ ] Elements stack logically on smaller screens without horizontal scrolling/overflow (e.g., Dashboard stats grid, Profile forms).
- [ ] Padding, margins, gap, and font sizes are appropriately scaled down using `!important` overrides.
- [ ] Existing navigation/layout adapts for mobile purely via CSS media queries, while maintaining existing colors and icons. No visual theme changes (colors, shadows) occur.

## Follow-up — 2026-09-16T14:38:58Z

# Teamwork Project Prompt — Draft

> Status: Launched (Restarted with User Feedback)
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.

Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes
Integrity mode: development

## Requirements

### R1. CSS-driven responsiveness
Implement responsiveness through a central `responsive.css` file using media queries. Add classes where needed. Use `!important` only when required to override existing inline styles, and avoid unnecessary `!important` rules.

### R2. Strict Preservation of Assets and Structure
Keep the exact existing layout, DOM structure, components, logos, colors, and typography. Do not add, remove, or invent UI elements. Do not use generic "AI" styling (no new gradients, glassmorphism, or shadows).

### R3. Desktop Integrity
The desktop design must remain untouched and completely unaltered. Do not introduce conditional JavaScript rendering (e.g., no `isMobile` hooks) or separate mobile DOM trees. Do not remove the existing inline styles.

## Acceptance Criteria

### Implementation Constraints
- [ ] A central `responsive.css` file is created and imported into the application.
- [ ] Responsive rules are wrapped in standard media queries (e.g., `@media (max-width: 768px)`).
- [ ] No new components, conditional JSX branching, or duplicate mobile-specific DOM nodes are created.
- [ ] The desktop view (> 1024px) remains 100% pixel-for-pixel identical to the current state because mobile CSS overrides do not apply.

### Visual Behavior on Mobile/Tablet
- [ ] Elements stack logically on smaller screens without horizontal scrolling/overflow (e.g., Dashboard stats grid, Profile forms).
- [ ] Padding, margins, gap, and font sizes are appropriately scaled down.
- [ ] Existing navigation/layout adapts for mobile purely via CSS media queries, while maintaining existing colors and icons. No visual theme changes (colors, shadows) occur.

## Follow-up — 2026-09-16T15:06:46Z

# Teamwork Project Prompt — Draft

> Status: Launched (Restarted due to capacity error)
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.

Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes
Integrity mode: development

## Requirements

### R1. CSS-driven responsiveness
Implement responsiveness through a central `responsive.css` file using media queries. Add classes where needed. Use `!important` only when required to override existing inline styles, and avoid unnecessary `!important` rules.

### R2. Strict Preservation of Assets and Structure
Keep the exact existing layout, DOM structure, components, logos, colors, and typography. Do not add, remove, or invent UI elements. Do not use generic "AI" styling (no new gradients, glassmorphism, or shadows).

### R3. Desktop Integrity
The desktop design must remain untouched and completely unaltered. Do not introduce conditional JavaScript rendering (e.g., no `isMobile` hooks) or separate mobile DOM trees. Do not remove the existing inline styles.

## Acceptance Criteria

### Implementation Constraints
- [ ] A central `responsive.css` file is created and imported into the application.
- [ ] Responsive rules are wrapped in standard media queries (e.g., `@media (max-width: 768px)`).
- [ ] No new components, conditional JSX branching, or duplicate mobile-specific DOM nodes are created.
- [ ] The desktop view (> 1024px) remains 100% pixel-for-pixel identical to the current state because mobile CSS overrides do not apply.

### Visual Behavior on Mobile/Tablet
- [ ] Elements stack logically on smaller screens without horizontal scrolling/overflow (e.g., Dashboard stats grid, Profile forms).
- [ ] Padding, margins, gap, and font sizes are appropriately scaled down.
- [ ] Existing navigation/layout adapts for mobile purely via CSS media queries, while maintaining existing colors and icons. No visual theme changes (colors, shadows) occur.

## Follow-up — 2026-09-17T01:30:47Z

# Teamwork Project Prompt — Draft

> Status: Launched (Restarted after quota reset)
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full team

Make the existing website responsive for mobile and tablet using CSS/media queries only, without redesigning or altering the desktop experience.

Working directory: c:/Users/sindh/Documents/codes/mypath/frontend/codes
Integrity mode: development

## Requirements

### R1. CSS-driven responsiveness
Implement responsiveness through a central `responsive.css` file using media queries. Add classes where needed. Use `!important` only when required to override existing inline styles, and avoid unnecessary `!important` rules.

### R2. Strict Preservation of Assets and Structure
Keep the exact existing layout, DOM structure, components, logos, colors, and typography. Do not add, remove, or invent UI elements. Do not use generic "AI" styling (no new gradients, glassmorphism, or shadows).

### R3. Desktop Integrity
The desktop design must remain untouched and completely unaltered. Do not introduce conditional JavaScript rendering (e.g., no `isMobile` hooks) or separate mobile DOM trees. Do not remove the existing inline styles.

## Acceptance Criteria

### Implementation Constraints
- [ ] A central `responsive.css` file is created and imported into the application.
- [ ] Responsive rules are wrapped in standard media queries (e.g., `@media (max-width: 768px)`).
- [ ] No new components, conditional JSX branching, or duplicate mobile-specific DOM nodes are created.
- [ ] The desktop view (> 1024px) remains 100% pixel-for-pixel identical to the current state because mobile CSS overrides do not apply.

### Visual Behavior on Mobile/Tablet
- [ ] Elements stack logically on smaller screens without horizontal scrolling/overflow (e.g., Dashboard stats grid, Profile forms).
- [ ] Padding, margins, gap, and font sizes are appropriately scaled down.
- [ ] Existing navigation/layout adapts for mobile purely via CSS media queries, while maintaining existing colors and icons. No visual theme changes (colors, shadows) occur.
