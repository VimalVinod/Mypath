# Context — teamwork_preview_orchestrator_1

## User Requirements & Boundaries
- Target: Standalone Node.js backend pipeline.
- Key Components:
  1. Targeted PDF Parsing (keyword-based page/sentence filtering to save tokens and noise).
  2. Gemini API Integration using official `@google/genai` SDK for structured extraction.
  3. Unity / Database Checking module (comparing extracted data against criteria/schema).
  4. Standalone Execution via `parse-demo.js` (no Firestore, no email/Resend).

## Constraints
- Windows OS environment.
- Root directory: `c:\Users\sindh\Documents\codes\mypath-scraper`.
- Metadata folder: `.agents\`.
- All code implementation, testing, and exploration must be delegated to specialized subagents.
- Orchestrator maintains state in `.agents/teamwork_preview_orchestrator_1/`.
