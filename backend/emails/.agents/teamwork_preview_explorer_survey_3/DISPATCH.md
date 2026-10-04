# Dispatch for teamwork_preview_explorer_survey_3

## Identity
- Role: Resend Email Integration & Standalone Architecture Specialist
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read ORIGINAL_REQUEST.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`

Survey Resend API integration and standalone execution design:
1. Resend API specs: Node SDK (`resend`), authentication via `RESEND_API_KEY`, sending options, sandbox domain (`onboarding@resend.dev`), target recipient handling, error responses, and rate limits.
2. Email notification design: Beautiful, responsive HTML email template for exam notifications (displaying Exam Name, Organization, Important Dates, Deadline warnings, official notification link CTA button, and clear fallback text version).
3. Standalone execution & CLI design: How to structure `npm run scrape` and test scripts so that:
   - Scraper can run standalone and output structured JSON to console or file.
   - Email sender can run standalone with mock exam data.
   - Full pipeline integrates scraper output directly into email notification sender with filtering (e.g., only upcoming/new exams, avoiding duplicate alerts).
4. Define interface contracts for Email Service and CLI Runner, including CLI arguments/flags (e.g. `--dry-run`, `--email=recipient@example.com`, `--source=upsc`).

## Deliverable
Write your comprehensive investigation report to:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3\handoff.md`
and send a notification message back to parent.

## 2026-09-08T19:55:00Z
Received task dispatch:
Survey Resend API integration and standalone execution design:
1. Resend API specs, Node SDK (`resend`), authentication via `RESEND_API_KEY`, testing with default domain/address (`onboarding@resend.dev` or verified domain), error handling, and response structure.
2. Design responsive, clean HTML email template for exam notifications (displaying Exam Name, Organization, Important Dates, Deadline warnings, official notification link CTA).
3. Standalone CLI execution (`npm run scrape`, CLI args/flags, mock testing script, integration pipeline passing scraper output directly to email sender).
4. Interface contracts for Email Service and CLI runner.
