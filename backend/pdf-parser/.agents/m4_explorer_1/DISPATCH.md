## 2026-09-14T12:12:32Z

You are m4_explorer_1 (teamwork_preview_explorer).
Your parent orchestrator is teamwork_preview_orchestrator_3.
Your working directory is: c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_explorer_1
Workspace root: c:\Users\sindh\Documents\codes\mypath-scraper

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\ORIGINAL_REQUEST.md
Also read the project scope document at:
c:\Users\sindh\Documents\codes\mypath-scraper\.agents\teamwork_preview_orchestrator_3\PROJECT.md

OBJECTIVE:
Investigate and design the CLI argument parsing and execution lifecycle for Milestone 4 (`parse-demo.js`).
Scope boundaries:
- You are an exploration agent. DO NOT write or modify source code in src/, test/, or root.
- Investigate:
  1. CLI flags to support: `--pdf <path>` (defaults to fixtures/sample-notification.pdf), `--keywords <list>`, `--mock` (force mock Gemini mode), `--preset <UPSC|SSC_CGL|IBPS_PO|TECHNICAL_SERVICES>`, `--candidate <profile>`, `--json` (machine-readable JSON output), `--help`.
  2. Environment variable loading with `dotenv` (safe fallback if .env is missing).
  3. Clean error handling: friendly console error messages for missing PDF files, invalid presets, or invalid candidate profiles without raw Node stack dumps. Exit codes (0 for success, 1 for execution error).
- Write your findings to `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m4_explorer_1\handoff.md` following Handoff Protocol.
- Send a concise summary message to parent.
