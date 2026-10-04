# Progress — teamwork_preview_explorer_survey_2

Last visited: 2026-09-08T20:13:00Z

- [x] Initialized workspace and briefing
- [x] Test connectivity and examine responses for UPSC portals (active examinations, forthcoming examinations, RSS feed)
  - Discovered apex redirect drop issue (`upsc.gov.in` 307 to root vs `www.upsc.gov.in/examinations/active-exams`)
  - Discovered 2-tier structure: `/examinations/active-exams` has 20 active exam listings, detail pages have structured tables with dates and PDF notices
  - Discovered RSS feed at `/rss.php`
- [x] Test connectivity and examine responses for SSC portals (ssc.gov.in)
  - Discovered SSC uses Angular SPA, reverse-engineered `main.*.js` to find public REST endpoints
  - Successfully fetched `https://ssc.gov.in/api/admin/5.1/liveExams` (returns pure JSON array of active exams with start, end, fee dates, code)
  - Successfully fetched `https://ssc.gov.in/api/admin/5.1/allExams` (39 exams catalog)
  - Successfully fetched `https://ssc.gov.in/api/general-website/portal/lastUpdates` (fast change-detection timestamp)
- [x] Test connectivity and examine responses for NTA portals (nta.ac.in)
  - Diagnosed connection failure: NTA DNS has 2 A-records (`20.219.187.119` working, `45.127.74.142` dead). Dual-IP retry required.
  - Successfully extracted notices and `/Download/Notice/Notice_YYYYMMDDHHMMSS.pdf` direct URLs
- [x] Test connectivity and examine secondary/banking/state portals (IBPS, TNPSC)
  - Diagnosed IBPS intermediate SSL certificate verification issue (`rejectUnauthorized: false` requirement)
  - Evaluated state PSCs (TNPSC ASPX tables vs BPSC timeout)
- [x] Synthesized findings with Explorer 1 and Explorer 3 reports
- [ ] Write comprehensive handoff report to `handoff.md` and notify parent
