# Project Execution Plan

## Objective
Implement React + Firebase authentication flow with:
- Google Sign-In & Email/Password Sign-Up/Sign-In
- Email verification requirement before email login
- Account linking (Google with existing email)
- Google profile completion enforcement (Name, Age, unique Username in Firestore, Password set)
- Blocking uncompleted profiles on email login with exact message: "Email already exists. Please complete your profile to sign in with email."
- Dummy dashboard displaying user's name, Sign Out, and Delete Account (permanent deletion from Auth & Firestore)
- Session persistence across page reloads & route protection

## Phases
1. **Phase 0: Survey (3 Parallel Explorers)**
   - Explorer 1: Project structure, dependencies, package.json, React version, existing routing/UI components.
   - Explorer 2: Firebase configuration, existing auth utilities, Firestore setup/rules, environment variables.
   - Explorer 3: Test runner, test infrastructure (Vitest/Jest/Playwright/Cypress/etc.), build scripts, linting.
2. **Phase 1: Synthesis & Decomposition (PROJECT.md)**
   - Consolidate explorer findings.
   - Map feature inventory and assign to milestones.
   - Define interface contracts and code layout.
3. **Phase 2: Dual Track Dispatch**
   - E2E Testing Track Orchestrator.
   - Implementation Track (Sub-orchestrators for milestones).
4. **Phase 3: Milestone Gate Verification**
   - Worker implementation, Reviewers, Challengers, Forensic Auditor per milestone.
5. **Phase 4: Final E2E Pass & Hardening**
   - Tier 1-4 tests 100% pass.
   - Tier 5 adversarial tests.
6. **Phase 5: Victory Report**
   - Final report to Sentinel/parent.
