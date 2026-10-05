## 2026-09-08T22:07:06Z

You are teamwork_preview_reviewer_m3_2.
Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_reviewer_m3_2
Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

MANDATORY FIRST STEP:
Read c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md before starting any work.

Other Required Readings:
- c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md
- c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_worker_m3_1\handoff.md

Your Mission:
Review Milestone 3 CLI execution, package.json scripts, and environment configuration against R3 (Standalone Execution) and Acceptance Criteria 3:
- src/scripts/scrape.js
- package.json
- .env.example

Review Checks:
1. Verify "npm run scrape" runs cleanly in dry-run mode, scraping target portals or returning structured JSON (Exam Name, Organization, Deadline) without crashing or blocking.
2. Verify "npm run test:notify" runs cleanly and outputs email preview.
3. Verify CLI arguments parsing via node:util.parseArgs:
   - node src/scripts/scrape.js --help (exits code 0 with usage guide)
   - node src/scripts/scrape.js --dry-run --mock (runs mock fixtures offline)
   - node src/scripts/scrape.js --dry-run --source upsc
   - node src/scripts/scrape.js --dry-run --source ssc
4. Verify .env.example thoroughly documents all environment variables (RESEND_API_KEY, SENDER_EMAIL, NOTIFICATION_RECIPIENT_EMAIL, PORT) and explains Resend sandbox constraints.
5. Verify index.js and vercel serverless compatibility are intact.

Write your structured handoff report with a binary verdict (APPROVE / REQUEST_CHANGES) to:
c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_reviewer_m3_2\handoff.md
Send a completion message with your verdict to parent (Recipient: c137c92e-54e6-4de0-b2a0-b792315528eb).
