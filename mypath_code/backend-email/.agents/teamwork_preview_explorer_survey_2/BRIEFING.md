# BRIEFING — 2026-09-08T20:13:30Z

## Mission
Investigate official government exam notification portals (UPSC, SSC, NTA, etc.) and design a robust scraping strategy, interface contract, and data schema.

## 🔒 My Identity
- Archetype: explorer
- Roles: Government Exam Web Portals and Scraping Specialist
- Working directory: c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2
- Original parent: c137c92e-54e6-4de0-b2a0-b792315528eb
- Milestone: Survey official government exam websites and portals to design a robust scraping strategy

## 🔒 Key Constraints
- Read-only investigation — do NOT implement source code files
- Output handoff report to c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md
- Send message to parent (c137c92e-54e6-4de0-b2a0-b792315528eb) when done

## Current Parent
- Conversation ID: c137c92e-54e6-4de0-b2a0-b792315528eb
- Updated: 2026-09-08T20:10:43Z

## Investigation State
- **Explored paths**:
  - UPSC (`www.upsc.gov.in/examinations/active-exams`, detail pages, `/rss.php`)
  - SSC (`ssc.gov.in` Angular app, `/api/admin/5.1/liveExams`, `/api/admin/5.1/allExams`, `/api/general-website/portal/lastUpdates`, `records`, `notice-boards`)
  - NTA (`nta.ac.in` notices, dual A-record DNS failure analysis)
  - Secondary portals (IBPS SSL certificate leaf error, TNPSC ASPX, BPSC)
- **Key findings**:
  1. UPSC: Static Drupal HTML, apex `upsc.gov.in` 307 drops URL path, must use `www.upsc.gov.in/examinations/active-exams`. Detail page has strict 6-row table with notification date, exam date, deadline, and direct PDF download link.
  2. SSC: Angular SPA, no need for heavy headless browser! Direct public JSON REST API available at `https://ssc.gov.in/api/admin/5.1/liveExams` returning exact structured exam dates, fees, age limits, and `lastUpdates` endpoint for instant change detection.
  3. NTA: DNS contains dual A-records (`20.219.187.119` working, `45.127.74.142` dead). Dual-IP retry is required. Notices contain exact timestamped PDF URLs.
  4. IBPS: Requires SSL tolerance (`rejectUnauthorized: false` or adding intermediate CA).
  5. Architecture: Adapter pattern (`BaseScraper`) with multi-IP fallback, polite rate-limiting, standardized `NormalizedExamRecord` schema.
- **Unexplored areas**: None. Ready for final report.

## Key Decisions Made
- Recommend lightweight HTTP scraping (native Node.js `fetch` + `cheerio`) rather than heavy headless browser (Puppeteer/Playwright).
- Use direct REST API for SSC and static HTML crawler for UPSC.
- Implement dual-IP DNS fallback and SSL certificate handling for NIC/government server anomalies.

## Artifact Index
- c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\BRIEFING.md — Persistent situational awareness
- c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\progress.md — Liveness heartbeat and progress tracker
- c:\Users\sindh\Documents\codes\mypath-backend\.agents\teamwork_preview_explorer_survey_2\handoff.md — Final comprehensive handoff report
