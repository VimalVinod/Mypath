# Dispatch for teamwork_preview_worker_m2_1

## Identity
- Role: Milestone 2 Implementation Worker (Resend Email Service)
- TypeName: teamwork_preview_worker
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read ORIGINAL_REQUEST.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
Read PROJECT.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read Explorer Survey Report 3 at:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3\handoff.md`

### Write Ownership
You EXCLUSIVELY own:
- `src/services/email/**` (`src/services/email/template.js`, `src/services/email/email-service.js`)
- `src/scripts/test-email.js`
- `package.json` (add `"test:notify": "node src/scripts/test-email.js"` script)
Do NOT modify files in `src/scrapers/**` or `tests/**`.

### Responsibilities:
1. Implement `src/services/email/template.js`:
   - `renderFullEmailHtml(exams, options)`: Responsive table-based 600px container, urgency badge calculation (`critical` <=3d red, `warning` <=7d amber, `open` >7d green, `expired` muted), exam cards with organization pill, dates grid, high-contrast PDF CTA button, HTML escaping (`escapeHtml`), and multi-exam digest support.
   - `renderEmailText(exams, options)`: Clean ASCII/Markdown plain-text fallback.
   - `generateSubject(exams)`: Clear, actionable subject lines (`🔔 New Exam Alert: ...` or `🔔 New Exam Alerts: N New Government Exams Announced`).
   - Export: `renderFullEmailHtml`, `renderEmailText`, `generateSubject`, `calculateUrgency`, `escapeHtml`.
2. Implement `src/services/email/email-service.js`:
   - `EmailService` class initializing Resend client via `process.env.RESEND_API_KEY`.
   - Sender hierarchy: `process.env.SENDER_EMAIL || process.env.RESEND_FROM_EMAIL || 'ExamGo Alerts <onboarding@resend.dev>'`.
   - `sendExamNotification(exams, options)`: Sends email via `resend.emails.send()`. Intercepts Resend sandbox 403 `validation_error` and logs actionable diagnostic instructions. Supports `--dry-run` saving preview to `output/email-preview.html`.
   - `sendTestNotification(options)`: Sends a mock exam alert (UPSC CSE 2026).
3. Implement `src/scripts/test-email.js`:
   - Standalone CLI script runnable via `npm run test:notify` or `node src/scripts/test-email.js`.
   - Uses native `node:util.parseArgs` with flags: `--email=<recipient>`, `--dry-run`, `--help`.
   - Executes mock exam email send, prints success response and messageId (or dry-run confirmation).
4. Verify your implementation:
   - Run `node src/scripts/test-email.js --dry-run` to verify preview generation.
   - Run `node --test tests/unit/template.test.js`.
   - Run `node --test` across the entire repository to ensure 0 regressions.
5. Document all commands and verified outputs in `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_1\handoff.md` and notify parent.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-08T20:46:00Z
Received invocation:
Implement Milestone 2: Resend Email Notification Service
1. `src/services/email/template.js` (responsive 600px HTML template with urgency badges, plain-text fallback, subject generator, escapeHtml).
2. `src/services/email/email-service.js` (Resend client wrapper, error diagnosis, dry-run HTML export).
3. `src/scripts/test-email.js` (Standalone CLI verification script runnable via `npm run test:notify` or `node src/scripts/test-email.js --dry-run`).
4. Update `package.json` to add `"test:notify": "node src/scripts/test-email.js"`.
5. Verify tests: `node src/scripts/test-email.js --dry-run`, `node --test tests/unit/template.test.js`, and `node --test`.
Write handoff report to `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_1\handoff.md` and notify parent.
