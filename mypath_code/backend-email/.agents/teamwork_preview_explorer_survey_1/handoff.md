# Investigation & Survey Handoff Report

**Agent**: `teamwork_preview_explorer_survey_1`  
**Date**: 2026-09-08T20:10:00Z  
**Target Repository**: `c:\Users\sindh\Documents\codes\mypath-backend`  
**Parent Orchestrator ID**: `c137c92e-54e6-4de0-b2a0-b792315528eb`  

---

## 1. Observation

### 1.1 Environment & Runtime
- **Node.js runtime version**: `v24.13.0` (checked via `node -v`).
- **npm package manager**: `11.6.2` (checked via `npm -v`).
- **`node_modules` directory**: Does NOT exist (`Test-Path node_modules` returned `False`). Dependencies have not yet been installed locally.
- **`package-lock.json`**: Does not exist in the root repository.

### 1.2 Existing Files & Configuration
Root directory file list (`c:\Users\sindh\Documents\codes\mypath-backend`):
- `.gitignore` (size 19 B)
- `index.js` (size 5,491 B)
- `package.json` (size 379 B)
- `vercel.json` (size 181 B)
- `.git/` (git repo on branch `main`, clean status)
- `.agents/` (agent metadata)

#### `package.json` (`c:\Users\sindh\Documents\codes\mypath-backend\package.json:1-18`)
```json
{
  "name": "mypath-backend",
  "version": "1.0.0",
  "description": "Backend for MyPath to handle custom email sending",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "firebase-admin": "^12.1.0",
    "resend": "^3.2.0"
  }
}
```
*Discrepancies identified*:
1. Script `"dev": "nodemon index.js"` references `nodemon`, but `nodemon` is missing from both `dependencies` and `devDependencies`.
2. No `devDependencies` block exists.
3. No scraping libraries (`cheerio`, `axios`) exist.
4. No `"scrape"` script exists (required by R3).
5. Module system is CommonJS (default, `"main": "index.js"`, no `"type": "module"`).

#### `index.js` (`c:\Users\sindh\Documents\codes\mypath-backend\index.js:1-137`)
- Uses CommonJS (`require`).
- Imports: `express`, `cors`, `firebase-admin`, `resend`, `dotenv`.
- Line 5: `require('dotenv').config();`
- Line 10-12: `cors({ origin: ['https://mypath0.web.app', 'http://localhost:5173'] })`
- Line 16-26: Initializes Firebase Admin if `process.env.FIREBASE_SERVICE_ACCOUNT` is present (wrapped in try/catch).
- Line 29: `const resend = new Resend(process.env.RESEND_API_KEY);`
- Line 31-33: Endpoint `GET /ping` returns `"Server is awake and ready!"`.
- Line 35-126: Endpoint `POST /send-verification` generates an auth verification link and sends a branded HTML email using `resend.emails.send` with:
  - `from: process.env.SENDER_EMAIL || 'MyPath Team <noreply@wildcodestudios.in>'`
  - HTML branding includes WildCode Studios (`https://mypath0.web.app/wildcode-logo.png`) and MyPath logo (`https://mypath0.web.app/mypath-logo.png`).
- Line 129: `module.exports = app;` (exported for Vercel serverless functions).
- Line 131-136: Listens on `PORT = process.env.PORT || 10000` when `process.env.NODE_ENV !== 'production' || !process.env.VERCEL`.

#### `vercel.json` (`c:\Users\sindh\Documents\codes\mypath-backend\vercel.json:1-16`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```
- Routes all incoming traffic to `index.js` under `@vercel/node`.
- Any modification must preserve `index.js`'s export so existing Vercel deployments do not break.

### 1.3 `.env` File and Secret Status
- Checked `Test-Path "c:\Users\sindh\Documents\codes\mypath-backend\.env"`: Result was `False`.
- Checked all `.env*` files in `mypath-backend`: None found.
- Checked User/Machine/Process environment variables for `RESEND_API_KEY`: Result was empty.
- Checked `.gitignore`: Line 2 contains `.env`.
- Observation on `ORIGINAL_REQUEST.md`: Line 30 states *"You have access to the .env file in the backend directory containing the RESEND_API_KEY."* This statement is factually inaccurate in the current workspace state; the file `.env` is absent.

### 1.4 Target Portal Connectivity & Markup Inspection
- Tested live connectivity to government exam portals:
  1. **UPSC (`https://www.upsc.gov.in/examinations/active-exams`)**:
     - Returned `HTTP/1.1 200 OK` (Content-Length: 37,483 B).
     - Does NOT block standard HTTP GET requests (tested with standard User-Agent).
     - Markup contains `<div class="view-content">` with rows containing exam titles and relative links (e.g. `/examinations/Combined%20Geo-Scientist...`).
     - Detail pages contain `<table class="views-table cols-6">` with clean structured data:
       - Caption: `Name of Examination: Combined Geo-Scientist (Preliminary) Examination, 2027`
       - Date of Notification: `02/09/2026`
       - Commencement Date: `10/01/2027`
       - Last Date for Receipt of Applications: `22/09/2026 - 6:00pm`
       - Notification PDF: Direct link to PDF (e.g., `https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf`).
  2. **SSC (`https://ssc.gov.in`)**:
     - Returned `HTTP/1.1 200 OK` (Content-Length: 80,649 B).

---

## 2. Logic Chain

1. **Dependency Analysis**:
   - The original request requires scraping government portals (R1) and notifying via Resend (R2) via standalone scripts (R3).
   - Currently, `package.json` contains `resend` and `dotenv`, but lacks any HTML parsing or HTTP request utilities suitable for scraping.
   - `cheerio` is the industry standard for server-side HTML DOM querying using jQuery-like selectors (`$('table.views-table')`). It is fast, lightweight, and has no headless browser overhead.
   - `axios` provides reliable HTTP client capabilities with customizable timeout, headers (such as `User-Agent`), and response handling.
   - `nodemon` is specified in `npm run dev` but not in dependencies; it should be added to `devDependencies`.
   - Node.js v24 includes native test runner (`node --test`), which allows zero-dependency unit tests without extra heavyweight frameworks, though `jest` is also an option if mock suites are required.

2. **Configuration & Credentials Analysis**:
   - The original request assumes `.env` is present with `RESEND_API_KEY`.
   - Inspection proves `.env` is missing and no environment variable is set.
   - Because `.gitignore` already ignores `.env`, an `.env.example` file should be committed with placeholder keys:
     ```env
     RESEND_API_KEY=re_your_api_key_here
     SENDER_EMAIL=MyPath Team <noreply@wildcodestudios.in>
     PORT=10000
     ```
   - Test scripts and CLI runners must gracefully handle missing keys (e.g., provide descriptive errors or allow mock dry-runs without failing unexpectedly).

3. **Vercel & Architectural Analysis**:
   - `vercel.json` deploys `index.js` as a serverless function.
   - Serverless functions have hard execution timeouts (10–15 seconds). Running long web scraping routines during a user-facing HTTP request is an anti-pattern on Vercel.
   - Therefore, the architecture must decouple:
     a. **Scraper modules**: Independent functions returning normalized JavaScript data objects.
     b. **Email notification service**: Independent function formatting and sending emails via Resend.
     c. **Standalone execution scripts**: CLI entry points (`src/scripts/runScraper.js` and `npm run scrape`) that can be executed locally, in CI/CD, or via cron.
     d. **HTTP API endpoints**: `index.js` can import the scraper and notification services to expose a secured webhook (e.g. `POST /api/scrape`) for Vercel Cron jobs if desired, while leaving the existing `/send-verification` and `/ping` endpoints completely untouched.

---

## 3. Caveats

1. **Absence of Real Resend API Key in `.env`**:
   - Live email dispatch cannot succeed until the user or developer provides a valid `RESEND_API_KEY` in `c:\Users\sindh\Documents\codes\mypath-backend\.env`.
   - Test scripts should include a dry-run or mock mode so that the notification pipeline can be validated even before the real API key is configured.
2. **Website Selector Fragility**:
   - Government portals (UPSC, SSC) may periodically change HTML structures or update their layout.
   - The scraper implementation should be written with resilient fallback selectors and return clean error messages when selectors fail to match.
3. **CommonJS vs ES Modules**:
   - The current codebase uses CommonJS (`require`, `module.exports`). While Node v24 supports ESM, switching the existing codebase to `"type": "module"` could impact the Vercel `@vercel/node` build configuration. It is recommended to maintain CommonJS for stability and compatibility with the existing `index.js`.

---

## 4. Conclusion & Recommendations

### 4.1 Dependency Updates Required in `package.json`
- **Add to `dependencies`**:
  - `"axios": "^1.7.9"`
  - `"cheerio": "^1.0.0"`
- **Add to `devDependencies`**:
  - `"nodemon": "^3.1.7"`
- **Add to `scripts`**:
  - `"scrape": "node src/scripts/runScraper.js"`
  - `"test:notify": "node src/scripts/testNotification.js"`
  - `"test": "node --test tests/**/*.test.js"`

### 4.2 Recommended Directory Structure
```
c:\Users\sindh\Documents\codes\mypath-backend\
├── .env.example               # Example env file with required variables
├── index.js                   # Root Express app (Vercel serverless entry point)
├── package.json               # Updated dependencies and CLI scripts
├── vercel.json                # Vercel deployment configuration
├── src/
│   ├── config/
│   │   ├── env.js             # Validates and loads environment variables
│   │   └── portals.js         # Portals config (URLs, selector maps, conducting bodies)
│   ├── scrapers/
│   │   ├── index.js           # Master runner orchestrating all portal scrapers
│   │   ├── upscScraper.js     # UPSC active exams scraper
│   │   └── sscScraper.js      # SSC notifications scraper
│   ├── services/
│   │   ├── emailService.js    # Resend API integration wrapper
│   │   └── templateService.js # Branded HTML email template builder (MyPath & WildCode)
│   └── scripts/
│       ├── runScraper.js      # Standalone CLI entrypoint for `npm run scrape`
│       └── testNotification.js# Standalone verification script for mock notification
└── tests/
    ├── fixtures/
    │   └── upsc-sample.html   # Static HTML fixture for deterministic scraper tests
    ├── scraper.test.js        # Scraper parsing logic tests
    └── email.test.js          # Email formatting and error-handling tests
```

### 4.3 Data Contract for Scraped Exams
Each scraper should return an array of normalized objects:
```json
{
  "title": "Combined Geo-Scientist (Preliminary) Examination, 2027",
  "conductingBody": "UPSC",
  "notificationDate": "2026-09-02",
  "applicationDeadline": "2026-09-22T18:00:00+05:30",
  "examDate": "2027-01-10",
  "notificationUrl": "https://www.upsc.gov.in/sites/default/files/Notif-CGSPE-2027-Engl-020926.pdf",
  "sourceUrl": "https://www.upsc.gov.in/examinations/active-exams",
  "scrapedAt": "2026-09-08T20:10:00.000Z"
}
```

---

## 5. Verification Method

To independently verify all findings in this report:

1. **Verify Node & npm versions**:
   ```powershell
   node -v   # Expected: v24.13.0
   npm -v    # Expected: 11.6.2
   ```

2. **Verify missing `.env` and `node_modules`**:
   ```powershell
   Test-Path "c:\Users\sindh\Documents\codes\mypath-backend\.env"          # Output: False
   Test-Path "c:\Users\sindh\Documents\codes\mypath-backend\node_modules"  # Output: False
   ```

3. **Verify current `package.json`**:
   ```powershell
   Get-Content "c:\Users\sindh\Documents\codes\mypath-backend\package.json"
   ```

4. **Verify UPSC Live Accessibility**:
   ```powershell
   curl.exe -I -s -A "Mozilla/5.0" "https://www.upsc.gov.in/examinations/active-exams"
   # Output: HTTP/1.1 200 OK
   ```

5. **Verify existing Express routes**:
   Inspect `c:\Users\sindh\Documents\codes\mypath-backend\index.js` lines 31-137. Notice the active `/send-verification` and `/ping` endpoints and `module.exports = app;`.

6. **Invalidation Conditions**:
   - The findings would be invalidated if `.env` was placed in a different directory mapped by a system service, or if the repository is converted to ESM (`"type": "module"`).
