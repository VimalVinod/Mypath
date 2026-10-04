# Orchestration Plan — PDF Parsing and Validation Pipeline

## Objective
Build a standalone Node.js backend pipeline that parses PDF files, extracts specific pages/sentences based on keyword matching, and uses the Gemini API (@google/genai) to cross-reference (unity check) the extracted data against database criteria, with local standalone execution via `parse-demo.js`.

## Phases

### Phase 0: Survey & Codebase Investigation
- Spawn 3 parallel Explorers:
  1. `explorer_survey_codebase`: Investigate existing repository structure, package.json, Node.js environment, installed dependencies, PDF samples, and current modules.
  2. `explorer_survey_pdf`: Investigate PDF parsing options in Node.js (e.g., pdf-parse or pdfjs-dist), keyword search/page filtering strategies, and sentence-level boundary extraction.
  3. `explorer_survey_gemini_unity`: Investigate `@google/genai` SDK usage patterns, structured output schemas/JSON mode, unity check criteria comparison logic, and mock database criteria format.

### Phase 1: PROJECT.md & Decomposition
- Synthesize findings into `PROJECT.md` (Feature Inventory, Architecture, Interface Contracts, Milestones).
- Set up E2E Test infrastructure specification.

### Phase 2: Milestone 1 — Targeted PDF Parsing Module
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.
- Implement utility to read PDF, search keywords, extract relevant pages and sentences.

### Phase 3: Milestone 2 — Gemini API Integration (@google/genai)
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.
- Implement Gemini model prompt & structured schema parser to extract criteria from targeted text.

### Phase 4: Milestone 3 — Unity Checking & Database Verification Module
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.
- Implement verification logic comparing extracted data against database criteria or schema rules.

### Phase 5: Milestone 4 — Standalone Execution (`parse-demo.js`)
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor -> Gate.
- Implement standalone demo script reading PDF, invoking extraction, running unity check, logging results without Firestore or email dependencies.

### Phase 6: Milestone 5 — E2E Testing & Hardening
- Run comprehensive test suite and adversarial validation.

### Phase 7: Completion & Reporting
- Final audit and handoff report to Sentinel parent.
