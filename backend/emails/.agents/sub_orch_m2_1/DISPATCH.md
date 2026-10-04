# Dispatch: Milestone 2 Sub-Orchestrator (Resend Email Service)

## Identity
- Role: Milestone 2 Sub-Orchestrator (Resend Email Service)
- TypeName: teamwork_preview_orchestrator
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\sub_orch_m2_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
You are the Sub-Orchestrator for **Milestone 2: Resend Email Service** in `mypath-backend`.
Read the following authoritative documents:
- Original Request: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
- Project Master Plan: `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
- Survey Reports:
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_1\handoff.md`
  - `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3\handoff.md`

### Responsibilities:
1. Implement `src/services/email/template.js`:
   - `renderFullEmailHtml(exams, options)`: Responsive table-based 600px container, urgency badge calculation (`critical` <=3d, `warning` <=7d, `open` >7d, `expired`), exam cards with organization pill, dates grid, high-contrast PDF CTA button, HTML escaping (`escapeHtml`), and multi-exam digest support.
   - `renderEmailText(exams, options)`: Clean ASCII/Markdown plain-text fallback.
   - `generateSubject(exams)`: Clear, actionable subject lines.
2. Implement `src/services/email/email-service.js`:
   - Wraps `resend.emails.send()`.
   - Sender hierarchy: `process.env.SENDER_EMAIL || process.env.RESEND_FROM_EMAIL || 'ExamGo Alerts <onboarding@resend.dev>'`.
   - Intercepts Resend sandbox 403 `validation_error` and logs actionable diagnostic instructions.
   - Supports `--dry-run` option writing HTML preview to `output/email-preview.html`.
3. Implement `src/scripts/test-email.js`:
   - Standalone script for testing email notifications with mock exam data.
   - Accepts `--email=<recipient>`, `--dry-run`.
4. Exclusively own: `src/services/email/**`, `src/scripts/test-email.js`.
5. Verify template rendering and Resend client with unit tests and dry-run executions.
6. Run the sub-orchestrator iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor) to ensure quality and integrity.

Write your milestone handoff report to:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\sub_orch_m2_1\handoff.md`
and notify parent.
