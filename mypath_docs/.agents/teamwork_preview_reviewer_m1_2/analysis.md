# Review & Adversarial Analysis: Milestone 1 (E2E Testing Track)

**Reviewer**: Reviewer 2 (`teamwork_preview_reviewer_m1_2`)  
**Role**: Reviewer & Adversarial Critic  
**Date**: 2026-09-07  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_reviewer_m1_2`  
**Target Repository**: `frontend/codes`  

---

## 1. Executive Summary & Verdict

**Verdict**: **APPROVE**

Milestone 1 establishes a comprehensive, high-rigor, opaque-box E2E test suite comprising 26 test cases across 4 tiers (`tier1-feature-coverage`, `tier2-boundary-cases`, `tier3-cross-feature-linking`, `tier4-real-world-scenarios`). The test infrastructure is backed by a stateful in-memory Firebase Authentication and Cloud Firestore mock engine (`src/test/mocks/firebaseMock.ts`), configured with Vitest and JSDOM.

Independent verification confirms that:
- `npm run build` succeeds cleanly with exit code 0 (`tsc && vite build`).
- `npm test` cleanly executes all 26 test cases across 4 test suites. Exactly 1 test passes (`TC-B07`: Google Sign-In Popup Closed by User, which was already supported by the pre-M2 code) and 25 tests fail as expected against the unimplemented features of Milestone 2.
- The test suite exhibits zero integrity violations, contains no facade or dummy mocks, and exercises genuine user workflows via React Testing Library.

---

## 2. Integrity Verification

As required by the adversarial critic mandate, the test implementation and codebase were scrutinized for integrity violations:

| Check | Criteria | Assessment | Finding |
|:---|:---|:---|:---:|
| **Hardcoded Outputs** | No precomputed or hardcoded test returns embedded in source | Passed | No test fixtures bypass logic; all interactions use DOM simulation (`userEvent.type`, `userEvent.click`). |
| **Facade Mocks** | Mock engines must implement stateful logic, not dummy no-ops | Passed | `firebaseMock.ts` maintains dynamic `registeredUsers` maps, `usersByUid`, collections (`users`, `usernames`), and dispatches real asynchronous auth state changes via `notifyAuth` to `authListeners`. |
| **Shortcuts & Bypasses** | Core work implemented from scratch according to blueprint | Passed | All 26 test cases specified in `TEST_INFRA.md` are present and mapped directly to requirements R1, R2, and R3. |
| **Fabricated Verification** | Outputs independently verified in test runner | Passed | `npm run build` and `npm test` were executed directly in powershell and verified via independent process inspection. |
| **Self-Certification** | Independent execution and audit of all assertions | Passed | All assertions were verified to check external behaviors (DOM content, Firestore document mutations, Auth state changes). |

No integrity violations detected.

---

## 3. Test Rigor Assessment

### A. Exact Error String Enforcements
The test suite strictly enforces the exact error strings dictated by the project requirements:
1. **Password Mismatch**:
   - **Required**: `"Passwords do not match."`
   - **Verification in Code**: `tier2-boundary-cases.test.tsx:53`:
     ```typescript
     expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
     ```
2. **Incomplete Google Profile Block on Email Login**:
   - **Required**: `"Email already exists. Please complete your profile to sign in with email."`
   - **Verification in Code**: `tier3-cross-feature-linking.test.tsx:116` & `tier4-real-world-scenarios.test.tsx:256`:
     ```typescript
     expect(
       screen.getByText('Email already exists. Please complete your profile to sign in with email.')
     ).toBeInTheDocument();
     ```
3. **Duplicate Username Collision**:
   - **Required**: `"Username is already taken. Please choose another."`
   - **Verification in Code**: `tier2-boundary-cases.test.tsx:276` & `tier4-real-world-scenarios.test.tsx:178`:
     ```typescript
     expect(screen.getByText('Username is already taken. Please choose another.')).toBeInTheDocument();
     ```
4. **Unverified Email Login**:
   - **Required**: `"Please verify your email address before logging in. A verification link has been sent to your email."`
   - **Verification in Code**: `tier1-feature-coverage.test.tsx:97`, `tier2-boundary-cases.test.tsx:341`, and `tier4-real-world-scenarios.test.tsx:78`:
     ```typescript
     expect(
       screen.getByText(
         'Please verify your email address before logging in. A verification link has been sent to your email.'
       )
     ).toBeInTheDocument();
     ```

### B. Firestore Document Mutation Assertions
The test suite does not stop at UI error messages; it asserts actual document creation, updates, and deletions in Firestore collections:
- **`users/{userId}`**:
  - `TC-F05`: Asserts `userDoc?.isProfileComplete` is mutated to `true`.
  - `TC-B04`: Validates that invalid ages prevent `isProfileComplete` from becoming `true`, while valid age updates the record.
  - `TC-F09`: Asserts `getMockDoc('users', 'user_f09_del')` is `undefined` after deletion.
  - `TC-C01`: Asserts `userDoc?.authProviders` contains `'google.com'`.
- **`usernames/{username}`**:
  - `TC-F05` & `TC-B05`: Asserts `getMockDoc('usernames', username)?.uid` maps directly to the user's UID.
  - `TC-B06`: Asserts taken username does not overwrite the record, but retry with unique username succeeds.
  - `TC-C04`: Asserts cascading deletion releases `usernames/alpha_warrior` (`expect(...).toBeUndefined()`) and allows another candidate (`user_beta_20`) to claim it.
  - `TC-C05`: Asserts stale session error `auth/requires-recent-login` prevents premature deletion of Firestore documents.

### C. Auth Status Assertions
- `createUserWithEmailAndPassword` is called with sanitized parameters.
- `sendEmailVerification` is confirmed to dispatch on signup and on premature unverified login attempts.
- `signOut` is invoked to clear unauthorized sessions immediately upon signup and unverified login attempts.
- `mockState.currentUser` is asserted to be `null` following sign-out, deletion, and unverified sessions.
- `deleteUser` is verified during permanent account deletion.

### D. Route Transitions & Route Guards
- `/signup`: Accessible from login or navigation links.
- `/complete-profile`: Displayed when a new Google user signs in; verified via heading `/complete your profile/i`.
- `/dashboard`: Displays `"Logged in as: {name}"`, `"Sign Out"`, and `"Delete Account"`.
- Unauthorized access to `/dashboard` redirects to `/login` with `screen.getByRole('heading', { name: /Log In/i })`.

---

## 4. Adversarial Critique & Stress-Testing

### Challenge 1: Router Synchronization & Session Reload in JSDOM
- **Observation**: In `tier4-real-world-scenarios.test.tsx` (TC-R02 lines 191-198), the test unmounts the app and remounts it at `/dashboard`:
  ```typescript
  unmount();
  window.history.pushState({}, '', '/dashboard');
  const remount = render(<App />);
  ```
- **Attack Scenario**: If the implementing agent in Milestone 2 hardcodes `currentPath` initialization to `'/'` (as `AppContext.tsx:70` currently does with `useState<string>('/')`), remounting at `/dashboard` will reset the route to `'/'`, causing TC-R02 to fail.
- **Blast Radius**: Session persistence across page reloads would be broken.
- **Mitigation for M2**: M2 must initialize `currentPath` from `window.location.pathname` (e.g. `useState<string>(() => window.location.pathname || '/')`) and register a `popstate` listener in `AppContext.tsx`.

### Challenge 2: Deletion Order of Operations (Orphaned State Risk)
- **Observation**: TC-C05 simulates a stale session where `deleteUser` throws `auth/requires-recent-login`.
- **Attack Scenario**: If the implementer deletes Firestore documents (`usernames` and `users`) *before* calling `deleteUser(auth.currentUser)`, an auth failure will leave the user with deleted profile data while still authenticated in Firebase Auth.
- **Blast Radius**: Account deletion failure leaves orphaned auth users who cannot re-authenticate or restore their profile.
- **Mitigation for M2**: Either:
  1. Call `deleteUser()` first or reauthenticate if needed, then delete Firestore docs, OR
  2. Implement an atomic rollback / Cloud Function trigger, OR
  3. Re-verify the user's recent login timestamp before performing Firestore deletions.

### Challenge 3: In-Memory Firestore Query Sensitivity
- **Observation**: `firebaseMock.ts` implements `getDocs` filtering using `where('field', '==', value)`. In lines 388, string values are compared case-insensitively.
- **Assessment**: This is robust for checking username collisions and email lookups, but Milestone 2 must ensure all username writes to Firestore are uniformly lowercased (`username.toLowerCase()`) as mandated in `PROJECT.md`.

---

## 5. Build and Test Verification

### Build Verification
- Command: `npm run build` in `frontend/codes`
- Result: **Exit Code 0**
- Compiler: `tsc && vite build` completed without any syntax or type errors.

### Test Suite Verification
- Command: `npm test` in `frontend/codes`
- Result:
  ```
  Test Files  4 failed (4)
       Tests  25 failed | 1 passed (26)
    Duration  15.65s
  ```
- Breakdown:
  - `src/test/tier1-feature-coverage.test.tsx`: 9 tests (9 failed)
  - `src/test/tier2-boundary-cases.test.tsx`: 9 tests (1 passed, 8 failed)
  - `src/test/tier3-cross-feature-linking.test.tsx`: 5 tests (5 failed)
  - `src/test/tier4-real-world-scenarios.test.tsx`: 3 tests (3 failed)

The passing test (`TC-B07`: Google popup closed) passes because the baseline `LoginPage.tsx` already contains error handling for `'auth/popup-closed-by-user'`. The remaining 25 failures correspond to features scheduled for Milestone 2.

---

## 6. Conclusion

The test suite authored in Milestone 1 satisfies all requirements for test rigor, coverage, and opaque-box design. It contains zero integrity violations and provides clear, unambiguous failure feedback for the upcoming Milestone 2 implementation track.

Approval is granted to proceed to Milestone 2.
