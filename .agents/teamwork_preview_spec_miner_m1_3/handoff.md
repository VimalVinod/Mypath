# Handoff Report: R3 Test Specification (Dummy Dashboard, Account Deletion & Session Persistence)

**Agent**: Spec Miner 3 (`teamwork_preview_spec_miner`)  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_3`  
**Milestone**: Milestone 1 (R3 Specification Mining)  
**Date**: 2026-09-07  
**Status**: Hard Handoff (Task Complete)

---

## 1. Observation

1. **`ORIGINAL_REQUEST.md` (lines 24-26)**:
   > "### R3. Dummy Dashboard & Account Deletion"  
   > "Replace the main dashboard with a temporary testing interface that displays the logged-in user's name. Include a "Sign Out" button (to test session persistence) and a "Delete Account" button that permanently removes the user from Firebase Authentication and Firestore. Ensure no false dashboards or unauthorized sessions can be generated without strict verification."

2. **`ORIGINAL_REQUEST.md` (lines 32-33, 41)**:
   > "- Session persists across page reloads (signing out is required to clear the session)."  
   > "- Attempting to access the dashboard without authentication redirects to the login page."  
   > "- Clicking "Delete Account" permanently removes the user record from Firebase Authentication and Firestore, and redirects to the landing page."

3. **`PROJECT.md` (lines 20, 26-28, 42-55, 58-73)**:
   > Feature 7: "Route Sync & Route Protection: URL sync, authLoading guard, redirect unauth to /login" (M2)  
   > Feature 13: "Temporary Testing Dummy Dashboard: Dashboard displaying user's name with Sign Out & Delete Account" (M2)  
   > Feature 14: "Sign Out Action: Button clearing session and redirecting to landing/login" (M2)  
   > Feature 15: "Permanent Account Deletion: Deletes Firestore doc and Firebase Auth user permanently" (M2)  
   > AppContext interface mandates: `currentUser: User | null`, `userProfile: UserProfile | null`, `authLoading: boolean`, `currentPath: string`, `navigate: (path: string) => void`, `logoutUser: () => Promise<void>`, `deleteAccount: () => Promise<void>`.  
   > Firestore schema requires: `users/{userId}` (uid, email, name, username, age, isProfileComplete, isEmailVerified) and `usernames/{username}` (uid, createdAt).

4. **`TEST_INFRA.md` (lines 17-20, 31-43)**:
   > Maps R3 features to test IDs:
   > - Feature 6 (Dummy Dashboard Display): `TC-F07`, `TC-R01`, `TC-R02`
   > - Feature 7 (Sign Out Session Teardown): `TC-F08`, `TC-R01`, `TC-R02`
   > - Feature 8 (Permanent Account Deletion): `TC-F09`, `TC-C04`, `TC-C05`, `TC-R02`
   > - Feature 9 (Strict Route Guards & Session Persistence): `TC-F07`, `TC-F08`, `TC-B08`, `TC-B09`, `TC-R01`, `TC-R02`

5. **Existing Codebase State**:
   - `frontend/codes/src/pages/DashboardPage.tsx` (lines 9-234): Currently implements the full competitive exam dashboard (Matched Exams, Upcoming Deadlines, Tracker, Career Quiz), NOT the temporary testing dummy dashboard.
   - `frontend/codes/src/App.tsx` (lines 11-23): Switch router renders `DashboardPage` directly upon `currentPath === '/dashboard'` with zero route guards or unauthenticated redirect protection.
   - `frontend/codes/src/context/AppContext.tsx` (lines 87-123, 230-237): Contains `logoutUser` calling `signOut(auth)` and clearing storage, but lacks `deleteAccount()`, `authLoading` state, and route protection checks.
   - `frontend/codes/src/firebase.ts` (lines 43-60): Does NOT yet export `deleteUser` from `firebase/auth` or `deleteDoc` from `firebase/firestore`.
   - `frontend/codes/firestore.rules` (lines 4-9): Enforces `allow read, write: if request.auth != null;`.

---

## 2. Logic Chain

1. From Observation 1, the product requirement explicitly calls for replacing the main dashboard with a temporary testing dummy dashboard that displays the authenticated user's name (`"Logged in as: {name}"`), plus "Sign Out" and "Delete Account" buttons.
2. From Observation 5 (`DashboardPage.tsx`), the current dashboard has not been replaced yet; downstream test suites (Milestone 1) and implementation (Milestone 2) must target the dummy dashboard component rather than the complex exam UI.
3. From Observation 3 and Observation 5 (`firestore.rules`), security rules mandate `request.auth != null`. Calling `deleteUser(currentUser)` immediately revokes auth tokens. Therefore, if `deleteAccount()` executes `deleteUser()` prior to deleting Firestore documents `users/{uid}` and `usernames/{username}`, the subsequent Firestore deletes will be rejected as unauthenticated. The deletion operation must strictly sequence: (1) `deleteDoc(usernames/{username})`, (2) `deleteDoc(users/{uid})`, (3) `deleteUser(currentUser)`, (4) state reset and redirect to `/`.
4. From Observation 2 and Observation 5 (`App.tsx`), `App.tsx` currently has no router guard; any visitor can load `/dashboard`. Strict route protection requires checking both `authLoading` and `currentUser`: if `authLoading` is true, render a neutral loading placeholder; if `authLoading` is false and `currentUser === null`, immediately redirect to `/login` without rendering dashboard DOM elements.
5. From Observation 2 and Observation 4 (`TEST_INFRA.md`), session persistence across page reloads requires verifying that when `<App />` is re-mounted with pre-existing auth tokens, `onAuthStateChanged` restores the session and the user remains on `/dashboard` without an erroneous flash or redirect to `/login`.
6. From Observation 4, R3 encompasses 10 distinct test scenarios across all 4 tiers:
   - Tier 1: `TC-F07` (Dummy Dashboard Display), `TC-F08` (Sign Out Teardown), `TC-F09` (Account Deletion)
   - Tier 2: `TC-B08` (Unauthorized Redirect), `TC-B09` (Unverified User Block), `TC-B10` (Auth Loading Guard)
   - Tier 3: `TC-C04` (Username Release Post-Deletion), `TC-C05` (Stale Session Re-authentication Handling)
   - Tier 4: `TC-R01` (Email Aspirant Journey), `TC-R02` (Google Onboarding, Reload Persistence & Deletion)

---

## 3. Caveats

- **Visual Confirmation Dialog**: While the prompt specifies clicking "Delete Account" permanently removes the user, standard UX often includes a modal/confirmation step. Test scenarios in `analysis.md` account for both direct click and confirm dialog interactions (`screen.getByRole('button', { name: /Confirm|Yes|Delete/i })`).
- **Name Resolution Fallback**: If a user logs in via email/password without having set a display name, the dashboard display must gracefully fall back to `"Logged in as: Candidate"` or `"Logged in as: User"` rather than displaying `"Logged in as: null"` or `"Logged in as: undefined"`.
- **Read-Only Constraint**: In accordance with the Spec Miner role constraints, no application or test code was modified during this turn.

---

## 4. Conclusion

Requirement R3 has been fully decomposed into 11 discovered features and 14 edge cases, documented in `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_3\analysis.md`. The exact opaque-box testing requirements, input parameters, execution steps, expected assertions, and architectural sequencing rules (especially deletion order of operations) are defined and ready for immediate test authoring by the test implementation agents in Milestone 1.

---

## 5. Verification Method

To verify the findings and analysis:
1. Inspect the detailed analysis file:
   ```bash
   # View analysis document
   cat "c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_3\analysis.md"
   ```
2. Verify all required tables are present:
   - `## Features Discovered` (11 features detailed)
   - `## Edge Cases` (14 edge cases detailed)
   - `## 3. Concrete Opaque-Box Test Scenarios` (Tiers 1–4 test cases detailed)
3. Invalidation condition:
   - If `analysis.md` lacks exact opaque-box inputs/assertions for `TC-F07`, `TC-F08`, `TC-F09`, `TC-B08`, `TC-B09`, `TC-C04`, or `TC-R02`, or fails to mandate the deletion order of operations, this handoff is invalidated.
