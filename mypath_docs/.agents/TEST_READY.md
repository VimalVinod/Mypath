# Test Suite Ready: React + Firebase Authentication Flow

**Milestone**: Milestone 1 (E2E Testing Track)  
**Author**: Test Writer (`teamwork_preview_test_writer_m1`)  
**Timestamp**: 2026-09-07T15:02:00Z  
**Status**: TEST_READY

---

## 1. Executive Summary

A comprehensive, opaque-box E2E test suite covering Tiers 1 through 4 (26 test cases total) has been implemented and verified. The test suite strictly validates all specifications and requirements established in `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, and the Spec Miner reports (R1, R2, R3).

A high-fidelity, in-memory Firebase Authentication and Cloud Firestore mock engine has been established in `src/test/mocks/firebaseMock.ts`, complete with reset utilities, provider simulation, Firestore transactions, collection queries, and error simulation.

---

## 2. Test Infrastructure & Configuration

- **Test Runner**: Vitest 2.1.9 (`npx vitest run` / `npm test`)
- **Environment**: JSDOM (`jsdom`) with `@testing-library/react` and `@testing-library/jest-dom`
- **Configuration File**: `frontend/codes/vitest.config.ts`
- **Setup File**: `frontend/codes/src/test/setup.ts`
- **Mock Engine**: `frontend/codes/src/test/mocks/firebaseMock.ts`

### How to Run Tests
```bash
cd frontend/codes
npm test
```

### How to Build Verification
```bash
cd frontend/codes
npm run build
```

---

## 3. Test Suite Inventory & Traceability Matrix (26 Test Cases)

### Tier 1: Feature Coverage (`src/test/tier1-feature-coverage.test.tsx`) — 9 Tests
| ID | Requirement | Test Description | Status (Pre-M2) |
|:---|:---|:---|:---:|
| **TC-F01** | R1 Sign-Up | Email/Password Sign-Up Happy Path (dispatches verification link, signs out immediately) | FAIL (M2 Pending) |
| **TC-F02** | R1 Verification | Unverified Email Login Interception (re-dispatches link, shows exact error, prevents session) | FAIL (M2 Pending) |
| **TC-F03** | R1 Login | Verified Email Login Happy Path (routes to dashboard, displays user name) | FAIL (M2 Pending) |
| **TC-F04** | R2 Google Auth | Google Sign-In New User Profile Enforcement Redirection (routes to `/complete-profile`) | FAIL (M2 Pending) |
| **TC-F05** | R2 Profile | Google User Completes Profile (submits name, age, username, password -> commits to Firestore & Auth) | FAIL (M2 Pending) |
| **TC-F06** | R2 Google Auth | Returning Google User Direct Dashboard Entry (completed profile bypasses `/complete-profile`) | FAIL (M2 Pending) |
| **TC-F07** | R3 Dashboard | Temporary Testing Dummy Dashboard Display (displays "Logged in as: {name}", Sign Out, Delete Account) | FAIL (M2 Pending) |
| **TC-F08** | R3 Session | Sign Out Session Teardown (clears session, redirects, route guard blocks dashboard access) | FAIL (M2 Pending) |
| **TC-F09** | R3 Deletion | Permanent Account Deletion (deletes Firestore docs `users` and `usernames`, deletes auth user, redirects to `/`) | FAIL (M2 Pending) |

### Tier 2: Boundary & Corner Cases (`src/test/tier2-boundary-cases.test.tsx`) — 9 Tests
| ID | Requirement | Test Description | Status (Pre-M2) |
|:---|:---|:---|:---:|
| **TC-B01** | R1 Validation | Password Confirmation Mismatch Validation (exact error `"Passwords do not match."`, halts submission) | FAIL (M2 Pending) |
| **TC-B02** | R1 Validation | Weak Password Validation (< 6 chars, halts submission) | FAIL (M2 Pending) |
| **TC-B03** | R1 Validation | Invalid Email Format Handling (halts submission, no auth record created) | FAIL (M2 Pending) |
| **TC-B04** | R2 Validation | Profile Completion Age Boundaries (rejects negative, zero, and unrealistic ages like 150) | FAIL (M2 Pending) |
| **TC-B05** | R2 Validation | Profile Completion Username Format Boundaries (enforces non-empty, min 3 chars, alphanumeric & underscores) | FAIL (M2 Pending) |
| **TC-B06** | R2 Collision | Duplicate Username Collision (displays exact error `"Username is already taken. Please choose another."`, allows retry) | FAIL (M2 Pending) |
| **TC-B07** | R1 Popup Error | Google Sign-In Popup Closed by User Graceful Handling (displays alert, recovers loading state) | **PASS** |
| **TC-B08** | R3 Route Guard | Unauthorized Dashboard Access Redirect (unauthenticated user visiting `/dashboard` redirected to `/login`) | FAIL (M2 Pending) |
| **TC-B09** | R1/R3 Guard | Direct URL Guard for Unverified Users (unverified user visiting `/dashboard` redirected to `/login`) | FAIL (M2 Pending) |

### Tier 3: Cross-Feature Linking (`src/test/tier3-cross-feature-linking.test.tsx`) — 5 Tests
| ID | Requirement | Test Description | Status (Pre-M2) |
|:---|:---|:---|:---:|
| **TC-C01** | R2 Linking | Google Sign-In with Existing Email (automatically links Google provider to existing email/password account) | FAIL (M2 Pending) |
| **TC-C02** | R2 Gating | Incomplete Google Profile Blocked on Email Login (exact error `"Email already exists. Please complete your profile to sign in with email."`) | FAIL (M2 Pending) |
| **TC-C03** | R2 Dual Auth | Completed Google User Can Now Sign In via Email (can log in with email and profile-set password) | FAIL (M2 Pending) |
| **TC-C04** | R2/R3 Lifecycle | Cascading Account Deletion Releases Username (deleting account frees username for subsequent user registration) | FAIL (M2 Pending) |
| **TC-C05** | R3 Security | Stale Session Deletion Re-authentication Handling (gracefully catches `auth/requires-recent-login` without data corruption) | FAIL (M2 Pending) |

### Tier 4: Real-World Scenarios (`src/test/tier4-real-world-scenarios.test.tsx`) — 3 Tests
| ID | Scenario Name | Workflow Steps Covered | Status (Pre-M2) |
|:---|:---|:---|:---:|
| **TC-R01** | Aspirant Email/Password Journey | Landing -> `/signup` -> Verification Email Sent -> Premature Login Blocked -> Email Verified -> Login -> Dummy Dashboard -> Sign Out -> Access Blocked | FAIL (M2 Pending) |
| **TC-R02** | Google Onboarding & Account Deletion | Google Auth -> `/complete-profile` -> Username Collision -> Unique Retry -> Dummy Dashboard -> Reload Session Persistence -> Delete Account -> Username Released | FAIL (M2 Pending) |
| **TC-R03** | Incomplete Profile Recovery | Google Auth -> Abandon Onboarding -> Email Login Blocked with Exact String -> Resume via Google -> Complete Profile -> Sign Out -> Email Login Succeeds | FAIL (M2 Pending) |

---

## 4. Current Baseline Execution Results

```
 RUN  v2.1.9 C:/Users/sindh\Documents/codes/mypath/frontend/codes

 Test Files  4 failed (4)
      Tests  25 failed | 1 passed (26 total)
   Duration  50.63s
```

All 26 tests were parsed and executed cleanly by Vitest. The 25 failures reflect authentic unmet requirements in the baseline application that are scheduled for implementation in Milestone 2 (M2).

---

## 5. Escalation: Discovered Implementation Gaps for Milestone 2 (M2)

The implementing agent in Milestone 2 must address the following implementation gaps to achieve 100% test passing:

1. **Dedicated Sign-Up Page (`/signup`)**:
   - Implement `SignupPage.tsx` with email, password, and confirm password fields.
   - Enforce exact mismatch error: `"Passwords do not match."`.
   - Dispatch `sendEmailVerification()` and immediately call `signOut()`.

2. **Unverified Email Login Interception**:
   - In `loginWithEmail`, enforce email verification check before allowing session creation.
   - Display exact message: `"Please verify your email address before logging in. A verification link has been sent to your email."`.

3. **Google Profile Completion Flow (`/complete-profile`)**:
   - Check `isProfileComplete` upon Google login; if false, navigate to `/complete-profile`.
   - Enforce Name, Age (positive, realistic), unique Username, and Password fields.
   - For taken usernames, display exact string: `"Username is already taken. Please choose another."`.
   - Atomically create reservation in `usernames/{username.toLowerCase()}` and update `users/{uid}`.

4. **Incomplete Profile Blocking on Email Login**:
   - When email matches an incomplete Google account, block login with exact string: `"Email already exists. Please complete your profile to sign in with email."`.

5. **Temporary Testing Dummy Dashboard (`/dashboard`)**:
   - Replace main dashboard with testing interface displaying `"Logged in as: {name}"`.
   - Include distinct `"Sign Out"` and `"Delete Account"` action buttons.
   - Implement cascading account deletion: delete `usernames/{username}`, delete `users/{uid}`, delete Auth user, and redirect to `/`.

6. **Route Synchronization & Route Protection**:
   - Synchronize router with `window.location.pathname` and `popstate` events.
   - Guard `/dashboard` against unauthenticated and unverified users, redirecting to `/login`.
