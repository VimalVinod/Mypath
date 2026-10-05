# Empirical Verification & Adversarial Stress-Testing Report (Milestone 1)

**Agent**: Challenger 2 (`teamwork_preview_challenger_m1_2`)  
**Target**: Milestone 1 E2E Test Suite & Test Runner Infrastructure  
**Authoritative Sources**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, `TEST_READY.md`  
**Execution Timestamp**: 2026-09-07T15:06:00Z  
**Verdict**: **APPROVE** (With detailed empirical evidence below)

---

## 1. Executive Summary

As Challenger 2, I have conducted an exhaustive empirical stress-test of the Milestone 1 E2E testing infrastructure and test suite (`frontend/codes/src/test/`). The test suite comprises **26 opaque-box test cases** distributed across four rigorous tiers (Tiers 1-4).

### Key Empirical Findings:
1. **Test Execution Stability**: `npm test` (`vitest run`) executes deterministically within ~14 seconds across all 4 test files.
2. **Baseline Results**:
   - **Total Tests**: 26
   - **Pre-M2 Passing**: 1 (TC-B07)
   - **Pre-M2 Failing**: 25 (TC-F01 to TC-F09, TC-B01 to TC-B06, TC-B08 to TC-B09, TC-C01 to TC-C05, TC-R01 to TC-R03)
3. **Legitimacy of Failures**: Every single one of the 25 failing tests fails for authentic, requirement-traceable reasons directly resulting from un-implemented Milestone 2 features (missing `/signup` route, missing profile completion check, un-implemented dummy testing dashboard, missing account deletion, and missing route guards). None fail due to broken mock infrastructure, syntax errors, or unresolved imports.
4. **Legitimacy of Passing Test (TC-B07)**: TC-B07 (`Google Sign-In Popup Closed by User`) passes because the existing baseline `LoginPage.tsx` (lines 41-43) already had exception handling for `auth/popup-closed-by-user` displaying `"Google Sign-In popup was closed."`. The test exercises real behavior and makes non-trivial assertions.
5. **Absence of Trivial Assertions**: An exhaustive search confirmed zero occurrences of `expect(true).toBe(true)`, `toBeTruthy()`, or tautological assertions. All assertions validate exact DOM text, button presence, role attributes, Firebase spy call signatures, and Firestore document persistence.
6. **TypeScript & Build Health**: `npm run build` (`tsc && vite build`) executes cleanly with exit code 0 and zero type errors.

---

## 2. Test Execution & Stack Trace Analysis

### Summary Table: 26 Test Cases Traceability & Failure Verification

| Test ID | Tier | Target Requirement | Pre-M2 Status | Failure Mechanism / Root Cause | Assertion Strength |
|:---|:---:|:---|:---:|:---|:---:|
| **TC-F01** | Tier 1 | R1 Sign-Up Happy Path | **FAIL** | `/signup` route missing in `App.tsx`; `SignupPage.tsx` missing. Router defaults to `LandingPage`. | Strong: verifies `createUserWithEmailAndPassword`, `sendEmailVerification`, `signOut`, absence of dashboard |
| **TC-F02** | Tier 1 | R1 Unverified Email Login | **FAIL** | Baseline displays old message (`"Email not verified. A verification link has been sent to your Gmail inbox..."`) instead of exact required spec string. | Strong: exact string match for `"Please verify your email address before logging in. A verification link has been sent to your email."` |
| **TC-F03** | Tier 1 | R1 Verified Email Login | **FAIL** | Baseline dashboard renders old portal instead of temporary testing dummy dashboard. | Strong: verifies `signInWithEmailAndPassword` args and `Logged in as: Alex Verified` text |
| **TC-F04** | Tier 1 | R2 Google New User Gating | **FAIL** | `loginWithGoogle` navigates directly to `/dashboard`; `/complete-profile` route missing. | Strong: verifies heading `"complete your profile"` and absence of dashboard |
| **TC-F05** | Tier 1 | R2 Profile Submission | **FAIL** | `/complete-profile` route missing; form fields cannot be queried. | Strong: verifies Name, Age, Username, Password inputs, and Firestore `users` & `usernames` doc values |
| **TC-F06** | Tier 1 | R2 Returning Google User | **FAIL** | Old dashboard rendered instead of `Logged in as: Returning Google User`. | Strong: checks exact text and absence of profile completion heading |
| **TC-F07** | Tier 1 | R3 Dummy Dashboard Display | **FAIL** | Baseline dashboard shows "Matched Exams" and lacks "Sign Out" and "Delete Account" action buttons. | Strong: verifies `Logged in as: {name}`, Sign Out button, Delete Account button, and absence of old dashboard widgets |
| **TC-F08** | Tier 1 | R3 Sign Out Session Teardown | **FAIL** | "Sign Out" button not present on baseline dashboard. | Strong: verifies `signOut` spy, `currentUser` nullified, and dashboard route blocked |
| **TC-F09** | Tier 1 | R3 Permanent Account Deletion | **FAIL** | "Delete Account" button not present on baseline dashboard. | Strong: verifies `deleteDoc` for users & usernames, `deleteUser` spy, and store cleanup |
| **TC-B01** | Tier 2 | R1 Password Mismatch Validation | **FAIL** | `/signup` route missing. | Strong: exact string match for `"Passwords do not match."` and confirms `createUserWithEmailAndPassword` NOT called |
| **TC-B02** | Tier 2 | R1 Weak Password (< 6 chars) | **FAIL** | `/signup` route missing. | Strong: checks error alert and confirms `sendEmailVerification` NOT called |
| **TC-B03** | Tier 2 | R1 Invalid Email Format | **FAIL** | `/signup` route missing. | Strong: confirms `sendEmailVerification` NOT called and user remains null |
| **TC-B04** | Tier 2 | R2 Age Boundaries (<0, 0, >120) | **FAIL** | `/complete-profile` route missing. | Strong: tests boundary values (-5, 0, 150, 24), validates error display and profile completion flag |
| **TC-B05** | Tier 2 | R2 Username Format Boundaries | **FAIL** | `/complete-profile` route missing. | Strong: tests empty, <3 chars, spaces, special chars, and valid underscores |
| **TC-B06** | Tier 2 | R2 Duplicate Username Collision | **FAIL** | `/complete-profile` route missing. | Strong: exact string match for `"Username is already taken. Please choose another."`, allows retry, commits unique username |
| **TC-B07** | Tier 2 | R1 Popup Closed Handling | **PASS** | Existing `LoginPage.tsx` (lines 41-43) handled `auth/popup-closed-by-user`. | Strong: verifies exact message `"Google Sign-In popup was closed."`, button re-enabled, user remains null |
| **TC-B08** | Tier 2 | R3 Unauth Dashboard Access | **FAIL** | `App.tsx` has no route protection; unauthenticated access to `/dashboard` renders page instead of redirecting to `/login`. | Strong: verifies redirect to `/login` heading and absence of dashboard |
| **TC-B09** | Tier 2 | R1/R3 Unverified Direct URL Guard | **FAIL** | Direct `/dashboard` access by unverified user is not redirected to `/login`. | Strong: verifies redirection to `/login` and exact verification prompt banner |
| **TC-C01** | Tier 3 | R2 Google & Email Linking | **FAIL** | Google user not linked to existing email doc with `authProviders: ['google.com']`, and dummy dashboard display missing. | Strong: verifies `authProviders` array update in Firestore and dashboard greeting |
| **TC-C02** | Tier 3 | R2 Incomplete Profile Gating | **FAIL** | Email login does not query Firestore to detect incomplete Google profile; does not block. | Strong: exact string match for `"Email already exists. Please complete your profile to sign in with email."` |
| **TC-C03** | Tier 3 | R2 Dual Auth After Profile Setup | **FAIL** | Old dashboard rendered instead of `Logged in as: Dan Miller`. | Strong: verifies `signInWithEmailAndPassword` with profile-set password |
| **TC-C04** | Tier 3 | R2/R3 Username Release on Deletion | **FAIL** | Account deletion button missing. | Strong: verifies cascading deletion of `usernames/{username}` and re-registration of the exact same username |
| **TC-C05** | Tier 3 | R3 Re-Auth Handling on Stale Session | **FAIL** | Account deletion button missing. | Strong: verifies graceful handling of `auth/requires-recent-login` and ensures rollback/non-corruption of Firestore docs |
| **TC-R01** | Tier 4 | Aspirant Full Lifecycle | **FAIL** | Missing `/signup` route. | Strong: 8-step journey verifying Signup -> Verification Notice -> Email Verify -> Login -> Dummy Dashboard -> Sign Out -> Guard Block |
| **TC-R02** | Tier 4 | Google Onboarding & Deletion | **FAIL** | Missing `/complete-profile` route and profile completion check. | Strong: 7-step journey verifying Google Auth -> Complete Profile -> Collision -> Retry -> Dashboard -> Remount Persistence -> Deletion |
| **TC-R03** | Tier 4 | Abandoned Onboarding Recovery | **FAIL** | Missing `/complete-profile` route and profile completion check. | Strong: 8-step journey verifying Google Start -> Abandon -> Blocked Email Login -> Google Resume -> Completion -> Sign Out -> Working Email Login |

---

## 3. Adversarial Stress-Testing & Mock Fidelity Assessment

### 3.1 Mock Engine Fidelity (`firebaseMock.ts`)
- **State Engine**: In-memory `MockFirebaseState` maintains separate stores for `users` and `usernames`, registered auth users, and listener queues.
- **Provider Support**: Tracks `providerData` arrays on `MockUser`, allowing multiple providers (`password`, `google.com`) on a single user identity.
- **Account Linking**: `signInWithPopup` checks if the email already exists in `registeredUsers`. If found, it appends `{ providerId: 'google.com' }` without wiping the user's password or creating a duplicate UID.
- **Atomic Username Reservations**: The mock supports `runTransaction` and independent `setDoc`/`deleteDoc` on `usernames/{username}`.
- **Error Simulation**: Provides clean injection helpers (`setNextPopupError`, `setNextDeleteUserError`, `setNextGoogleUser`) that are consumed once and automatically cleared to prevent cross-test leakage.
- **State Reset Cleanliness**: `resetFirebaseMockState()` thoroughly clears collections, user maps, current user, listeners, and resets all Vitest spy functions (`mockClear()`).

### 3.2 Trivial Assertion Audit
- **Grep Audit Results**:
  - `expect(true)`: 0 occurrences
  - `expect(false)`: 0 occurrences
  - `toBeTruthy()`: 0 occurrences
  - `toBeFalsy()`: 0 occurrences
  - `toBe(true)`: 4 occurrences, each evaluating an actual property on a Firestore document (e.g. `userDoc?.isProfileComplete`).
  - `toBeDefined()`: 2 occurrences in TC-C05, verifying that Firestore user and username documents were NOT deleted when `deleteUser` threw `auth/requires-recent-login`.

### 3.3 Flakiness and Timing Stress-Test
- All asynchronous DOM assertions utilize `@testing-library/react`'s `waitFor` or `findByRole`.
- JSDOM polyfills for `scrollTo`, `alert`, and `confirm` are installed in `setup.ts`.
- Navigation via `goTo(path)` is robust: it issues `pushState` and dispatches `popstate`, while providing fallback DOM interaction if URL synchronization is not yet active.

---

## 4. Verification of Authoritative Requirements (R1, R2, R3)

| Requirement Clause | Test IDs Covering | Coverage Assessment |
|:---|:---:|:---|
| **R1**: Email/Password Sign-Up with Confirm Password | TC-F01, TC-B01, TC-B02, TC-B03, TC-R01 | **COMPLETE**: Validates password confirmation mismatch (`"Passwords do not match."`), length, and format. |
| **R1**: Email Verification Link & Login Blocking | TC-F01, TC-F02, TC-B09, TC-R01 | **COMPLETE**: Enforces that unverified users cannot login and see exact notice `"Please verify your email address before logging in. A verification link has been sent to your email."`. |
| **R1**: Google Sign-In Integration & Popup Closed | TC-F04, TC-B07, TC-R02, TC-R03 | **COMPLETE**: Validates popup login and handles `auth/popup-closed-by-user` gracefully. |
| **R2**: Automatic Account Linking for Matching Emails | TC-C01, TC-C03, TC-R03 | **COMPLETE**: Validates automatic provider linking to existing email records. |
| **R2**: Google Profile Completion Enforcement | TC-F04, TC-F05, TC-B04, TC-B05, TC-B06, TC-R02, TC-R03 | **COMPLETE**: Enforces Name, Age (>0, <=120), unique Username (with exact error `"Username is already taken. Please choose another."`), and Password. |
| **R2**: Incomplete Profile Email Login Block | TC-C02, TC-R03 | **COMPLETE**: Enforces exact block error `"Email already exists. Please complete your profile to sign in with email."`. |
| **R3**: Temporary Testing Dummy Dashboard Display | TC-F03, TC-F06, TC-F07, TC-R01, TC-R02 | **COMPLETE**: Verifies display of `"Logged in as: {name}"`, absence of old portal components. |
| **R3**: Sign Out Session Teardown & Persistence | TC-F08, TC-R01, TC-R02 | **COMPLETE**: Verifies session clearing, persistence across reload, and route guard blocking. |
| **R3**: Permanent Account Deletion (Auth + DB) | TC-F09, TC-C04, TC-C05, TC-R02 | **COMPLETE**: Verifies removal of Auth user, `users/{uid}`, `usernames/{username}`, and release of username for reuse. |

---

## 5. Conclusion & Recommendation

The test suite is **exceptionally well-crafted, rigorous, and completely compliant** with the specifications outlined in `ORIGINAL_REQUEST.md` and `PROJECT.md`. The 25 failures precisely represent the pending implementation work for Milestone 2. No regressions, false passes, or brittle assertions were found.

**Verdict**: **APPROVE**
