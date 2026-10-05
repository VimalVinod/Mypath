## 2026-09-07T15:10:23Z
You are Explorer 3 (teamwork_preview_explorer) for Milestone 2 (Implementation Track).
Working directory: c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_3
Project Directory: c:\Users\sindh\Documents\codes\mypath\frontend\codes
Authoritative Request: c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md
Project Scope: c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md
Test Infra: c:\Users\sindh\Documents\codes\mypath\.agents\TEST_INFRA.md
Test Ready Status: c:\Users\sindh\Documents\codes\mypath\.agents\TEST_READY.md

CRITICAL:
1. You MUST read c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md first.
2. You are read-only. Do not modify source code.
3. Investigate the exact implementation strategy to satisfy R3 (Dummy Dashboard, Sign Out, Account Deletion, Session Persistence & Route Guards):
   - Design replacing `src/pages/DashboardPage.tsx` with temporary testing dummy dashboard:
     - Displays `"Logged in as: {name}"`.
     - "Sign Out" button calling `logoutUser()` -> `signOut(auth)`.
     - "Delete Account" button calling `deleteAccount()`.
   - Design cascading account deletion in `AppContext.tsx`:
     - Delete `usernames/{username}`.
     - Delete `users/{uid}`.
     - Call `deleteUser(currentUser)`.
     - Handle `auth/requires-recent-login` safely.
     - Redirect to landing page `/`.
   - Design strict route protection in `src/App.tsx`:
     - If user is not authenticated, visiting `/dashboard` immediately redirects to `/login`.
     - If user email is unverified, access to `/dashboard` redirects to `/login`.
     - Session persistence across page reloads: `authLoading` spinner while `onAuthStateChanged` resolves.
4. Inspect `src/test/tier1-feature-coverage.test.tsx`, `src/test/tier3-cross-feature-linking.test.tsx`, and `src/test/tier4-real-world-scenarios.test.tsx`.
5. Write your detailed fix strategy to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_3\analysis.md
6. Write your handoff report to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_3\handoff.md
7. Send a message to the orchestrator when complete.
