# Dispatch for teamwork_preview_test_writer_e2e_1

## Identity
- Role: E2E Test Suite Designer & Writer
- TypeName: teamwork_preview_test_writer
- Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_test_writer_e2e_1
- Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

## Mandate & Scope
Read ORIGINAL_REQUEST.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`
Read PROJECT.md at:
`c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read Survey Reports:
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_1\handoff.md`
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md`
- `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_3\handoff.md`

### Write Ownership
You EXCLUSIVELY own:
- `TEST_INFRA.md` at project root
- `TEST_READY.md` at project root (upon completion)
- All files under `tests/**` (`tests/fixtures/**`, `tests/unit/**`, `tests/e2e/**`)
Do NOT edit any files under `src/` or `index.js`.

### Responsibilities:
1. Create `TEST_INFRA.md` following the specification in `PROJECT.md` and the E2E Testing Track principles:
   - Opaque-box, requirement-driven testing based on user acceptance criteria.
   - Test architecture, directory layout, test runner invocation (`node --test tests/e2e/*.test.js`).
2. Create offline test fixtures in `tests/fixtures/`:
   - `tests/fixtures/upsc-active-exams.html`: realistic UPSC active exams HTML markup based on Explorer 2 findings.
   - `tests/fixtures/upsc-detail-sample.html`: realistic UPSC exam detail page with date table and PDF link.
   - `tests/fixtures/ssc-live-exams.json`: realistic SSC live exams API JSON response with CHSL/CGL active exams.
3. Design and implement the 4-tier test suite using Node.js v24 native test runner (`node --test`):
   - **Tier 1 - Feature Coverage (>=5 per feature)**:
     - Scraper extraction tests (verify parsing of Exam Name, Organization, Dates, Notification URL from fixtures).
     - Email template rendering tests (verify HTML formatting, table layout, urgency badge, escapeHtml, plain text).
     - Dedup store tests (verify hashing, caching, duplicate detection).
     - Standalone CLI execution tests (verify CLI argument parsing, --dry-run, --mock flags).
     - Integration pipeline tests (verify passing scraped data to dedup and email sender).
   - **Tier 2 - Boundary & Corner Cases (>=5 per feature)**:
     - Malformed HTML and missing tables.
     - Empty API response array.
     - Missing optional dates or invalid date formats.
     - Expired deadlines (testing negative days / expired badge).
     - Special characters and XSS attempts in exam titles.
     - Network timeout and retry simulation.
   - **Tier 3 - Cross-Feature Combinations**:
     - Scraper -> Dedup filter -> Email template pipeline interaction.
     - Handling mixed valid and malformed exam items in a digest.
     - CLI options combined with mock data and dry-run flag.
   - **Tier 4 - Real-World Application Scenarios**:
     - End-to-end simulated daily scrape run discovering 2 new exams, generating digest email preview, updating dedup store, and ensuring second run reports 0 new exams.
     - End-to-end simulated run with urgent exam (deadline in 2 days) triggering critical badge in rendered HTML.
4. Execute tests using `node --test tests/**/*.test.js` or separate tier commands to verify all tests pass against fixtures/contracts.
5. Create `TEST_READY.md` summarizing total tests, tier breakdown, and test execution command.
6. Write handoff report in your working directory `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_test_writer_e2e_1\handoff.md` and send message to parent.

## 2026-09-08T20:15:14Z
You are teamwork_preview_test_writer_e2e_1.
Working Directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_test_writer_e2e_1
Parent Orchestrator ID: c137c92e-54e6-4de0-b2a0-b792315528eb

Read your dispatch instructions:
`c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_test_writer_e2e_1\DISPATCH.md`
Read `c:\Users\sindh\Documents\codes\mypath-backend\PROJECT.md`
Read `c:\Users\sindh\Documents\codes\mypath-backend\.agents\ORIGINAL_REQUEST.md`

Your mission:
1. Create `TEST_INFRA.md` at project root defining the opaque-box test strategy across 4 tiers.
2. Create offline test fixtures in `tests/fixtures/` (`upsc-active-exams.html`, `upsc-detail-sample.html`, `ssc-live-exams.json`).
3. Implement the 4-tier test suite using Node.js native test runner (`node --test`):
   - Tier 1: Feature Coverage (>=5 tests per feature)
   - Tier 2: Boundary & Corner Cases (>=5 tests per feature)
   - Tier 3: Cross-Feature Combinations
   - Tier 4: Real-World Scenarios
4. Execute tests, verify pass, and publish `TEST_READY.md` when the test suite is ready.
5. Report handoff in `c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_test_writer_e2e_1\handoff.md` and send message to parent.
