# Dispatch for teamwork_preview_worker_m2_rem_1

## Identity
- Role: Milestone 2 Remediation Worker (Template Hardening)
- TypeName: teamwork_preview_worker
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_rem_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read:
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
- Challenger 1 Report: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_challenger_m2_1\handoff.md`

### Write Ownership
You EXCLUSIVELY own:
- `src/services/email/template.js`
Do NOT edit files in `src/scrapers/**`, `src/services/storage/**`, or `src/scripts/**`.

### Responsibilities:
Apply the 5 hardening fixes to `src/services/email/template.js` identified in the Challenger report:
1. `calculateUrgency`:
   - Check `diffMs < 0` directly before computing `days = Math.ceil(...)`. If `diffMs < 0`, return `{ daysRemaining: Math.floor(diffMs / 86400000), status: 'expired', badgeText: 'Application Closed', badgeColor: '#4b5563', badgeBg: '#f3f4f6' }`. This fixes the IEEE-754 signed zero bug (`-0 < 0` is false) that incorrectly labeled exams expired 0-24 hours ago as "Closing Soon".
2. `renderFullEmailHtml` & `renderEmailText` options guard:
   - Handle `options = null`: `const opts = options || {}; const recipientName = opts.recipientName || 'Aspirant';`.
3. `renderEmailText` exam item guard:
   - In `examList.forEach`: `if (!exam || typeof exam !== 'object') return;`. Prevents crash when `examList` contains `null` or `undefined`.
4. `generateSubject` exam item guard:
   - If `exams.length === 1`: `const exam = exams[0] || {}; const name = exam.examName || exam.title || 'Government Examination'; const org = exam.organization || 'GOVT'; return '🔔 New Exam Alert: ' + name + ' (' + org + ')';`.
5. `renderExamCardHtml` URL protocol sanitization:
   - Sanitize notification and application URLs to only allow safe protocols (`http:`, `https:`, `/`, `#`). If URL starts with `javascript:` or `data:`, fallback to `'#'`.

### Verification:
Run:
```bash
node tests/stress-m2.js
node --test tests/unit/template.test.js
node --test
```
Ensure all 22 tests in `tests/stress-m2.js` pass, all 10 tests in `template.test.js` pass, and all repository tests pass with 0 failures.
Document your results in `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_rem_1\handoff.md` and notify parent.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-09-08T22:03:00Z
You are teamwork_preview_worker_m2_rem_1.
Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_rem_1
Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

Read your dispatch instructions:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_rem_1\DISPATCH.md`
Read `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
Read Challenger 1 Report: `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_challenger_m2_1\handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Apply the 5 hardening fixes to `src/services/email/template.js`:
1. Fix IEEE-754 signed zero in calculateUrgency (check diffMs < 0 directly before ceil).
2. Fix options null guard in renderFullEmailHtml and renderEmailText.
3. Fix exam null guard in renderEmailText.
4. Fix exam null guard in generateSubject.
5. Sanitize URI protocols in renderExamCardHtml (disallow javascript: / data:).

Verify with `node tests/stress-m2.js`, `node --test tests/unit/template.test.js`, and `node --test`.
Write handoff report to `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m2_rem_1\handoff.md` and notify parent.
