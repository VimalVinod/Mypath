## 2026-09-07T15:10:45Z
You are Explorer 2 (teamwork_preview_explorer) for Milestone 2 (Implementation Track).
Working directory: c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_2
Project Directory: c:\Users\sindh\Documents\codes\mypath\frontend\codes
Authoritative Request: c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md
Project Scope: c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md
Test Infra: c:\Users\sindh\Documents\codes\mypath\.agents\TEST_INFRA.md
Test Ready Status: c:\Users\sindh\Documents\codes\mypath\.agents\TEST_READY.md

CRITICAL:
1. You MUST read c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md first.
2. You are read-only. Do not modify source code.
3. Investigate the exact implementation strategy to satisfy R2 (Google Profile Completion, Username Uniqueness in Firestore, Incomplete Profile Blocking, and Account Linking):
   - Design `src/pages/ProfileCompletionPage.tsx` with Name, Age, Username, Password.
   - Design username uniqueness verification in Firestore (`usernames/{username.toLowerCase()}`) with error `"Username is already taken. Please choose another."`.
   - Design setting password on Google user: updating or linking password credential so they can subsequently sign in with email/password.
   - Design pre-login check or error interception in `loginWithEmail`: if user email exists with `isProfileComplete === false`, block login with exact message: `"Email already exists. Please complete your profile to sign in with email."`.
   - Design automatic account linking when Google sign-in email matches an existing email/password account.
   - Update to `firestore.rules`.
4. Inspect `src/test/tier2-boundary-cases.test.tsx` and `src/test/tier3-cross-feature-linking.test.tsx` to verify your design satisfies all R2 test assertions.
5. Write your detailed fix strategy to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_2\analysis.md
6. Write your handoff report to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_2\handoff.md
7. Send a message to the orchestrator when complete.
