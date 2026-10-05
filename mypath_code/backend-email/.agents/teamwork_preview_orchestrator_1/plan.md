# Project Orchestration Plan: Exam Scraper & Notification Service

## Objective
Build a robust backend service in `mypath-backend` that scrapes government websites for new exam notifications and notifies users via email using Resend, runnable standalone and modular.

## Steps
1. **Survey Phase (Step 0)**:
   - Spawn 3 Explorers to survey:
     - Existing codebase structure, dependencies, runtime environment (Node.js/npm, `.env`, `package.json`, `index.js`).
     - Target government exam websites, URL endpoints, HTML/data structures, anti-bot mechanisms, and reliable scraping targets.
     - Resend API integration requirements, environment configuration, email formatting/templates, error handling, and test email sending.
   - Merge findings into `PROJECT.md` (Architecture, Feature Inventory, Milestones, Interface Contracts, Code Layout).

2. **Dual-Track Decomposition**:
   - **Track 1: E2E Testing Track**:
     - Spawn E2E test writers to create comprehensive opaque-box test suite (Tiers 1-4: Unit/Feature coverage, boundary/corner cases, cross-feature combinations, real-world execution).
     - Produce `TEST_INFRA.md` and `TEST_READY.md`.
   - **Track 2: Implementation Track**:
     - Milestone 1: Exam Scraping Engine (modular scrapers for official government portals, structured field extraction: Exam Name, Organization, Dates, Notification Link).
     - Milestone 2: Resend Email Notification Service (Resend client, HTML/text templates, mock/real notification dispatch).
     - Milestone 3: Standalone Execution & CLI Integration (`npm run scrape`, CLI runner, error logging, parameterization).
     - Milestone 4: Final E2E Verification & Adversarial Coverage Hardening (100% test pass, Challenger review, Forensic Auditor verification).

3. **Gating & Integrity Enforcement**:
   - Every milestone undergoes Worker -> Reviewers -> Challengers -> Forensic Auditor.
   - Binary veto on integrity violations.
   - Verified pass before declaring victory to Sentinel.
