# Milestone 1: E2E Test Suite Analysis & Infrastructure Report

**Author**: Test Writer (`teamwork_preview_test_writer_m1`)  
**Scope**: Milestone 1 (E2E Testing Track)  
**Date**: 2026-09-07  

---

## 1. Context and Objectives

Milestone 1 establishes the E2E test infrastructure and a comprehensive 4-tier test suite (26 test cases) validating all requirements from `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, and the Spec Miner reports:
- **R1 (Authentication & Verification)**: Email/Password signup with confirmation, verification link dispatch, unverified login interception, verified login, and Google sign-in.
- **R2 (Account Linking & Profile Enforcement)**: Google profile completion enforcement (Name, Age, unique Username, Password), username collision handling, incomplete profile email login blocking, and automatic account linking.
- **R3 (Dummy Dashboard & Account Management)**: Testing dashboard with `"Logged in as: {name}"`, Sign Out session teardown, permanent account deletion (Auth + Firestore), route protection, and reload session persistence.

---

## 2. Infrastructure Setup & Architecture

### 2.1 Dependencies
Installed Vitest 2.1.9, `@testing-library/react` (v16.3.3), `@testing-library/jest-dom` (v7.0.1), `@testing-library/user-event` (v14.6.7), and `jsdom` (v29.1.1) in `frontend/codes/`.
Updated `frontend/codes/package.json` with `"test": "vitest run"`.

### 2.2 Configuration & Setup
- `vitest.config.ts`: Configured Vitest to run with `globals: true`, environment `jsdom`, and test setup `src/test/setup.ts`.
- `src/test/setup.ts`: Polyfilled DOM globals (`window.scrollTo`, `window.alert`, `window.confirm`), and configured Vitest module mocking for Firebase SDKs (`firebase/app`, `firebase/auth`, `firebase/firestore`) and internal `firebase.ts` module exports.

### 2.3 In-Memory Firebase Mock Engine (`src/test/mocks/firebaseMock.ts`)
A zero-external-dependency in-memory mock harness was created:
- **Authentication**:
  - `createUserWithEmailAndPassword`: Validates format, enforces minimum password length (>= 6), checks uniqueness, registers user.
  - `sendEmailVerification`: Tracks verification link dispatch.
  - `signInWithEmailAndPassword`: Validates credentials, tracks login attempts.
  - `signInWithPopup`: Simulates Google auth, automatic account linking for existing emails, customizable user or error responses.
  - `linkWithCredential` & `updatePassword`: Attaches password credentials to Google users for dual auth.
  - `signOut`: Terminates active session.
  - `deleteUser`: Permanently deletes user from in-memory user registry; supports `auth/requires-recent-login` simulation.
  - `onAuthStateChanged`: Emits current user to listeners asynchronously.
  - `verifyUserEmail`: Test helper to simulate user clicking email verification link.
- **Firestore**:
  - `doc`, `collection`, `query`, `where`: Builds document/query references.
  - `getDoc`, `setDoc`, `updateDoc`, `deleteDoc`: Reads, merges, updates, and deletes documents in in-memory collections (`users`, `usernames`).
  - `getDocs`: Executes query constraints (e.g. `where('email', '==', ...)`).
  - `runTransaction`: Supports atomic read/write transactions.
  - `resetFirebaseMockState()`: Resets all collections, user registries, and mock spies between tests.

---

## 3. Test Suites Overview (26 Test Cases)

### Tier 1: Feature Coverage (`src/test/tier1-feature-coverage.test.tsx`) — 9 Test Cases
- `TC-F01`: Email/Password Sign-Up Happy Path
- `TC-F02`: Unverified Email Login Interception
- `TC-F03`: Verified Email Login Happy Path
- `TC-F04`: Google Sign-In New User Profile Enforcement Redirection
- `TC-F05`: Google User Completes Profile
- `TC-F06`: Returning Google User Direct Dashboard Entry
- `TC-F07`: Temporary Testing Dummy Dashboard Display
- `TC-F08`: Sign Out Session Teardown
- `TC-F09`: Permanent Account Deletion

### Tier 2: Boundary & Corner Cases (`src/test/tier2-boundary-cases.test.tsx`) — 9 Test Cases
- `TC-B01`: Password Confirmation Mismatch Validation (`"Passwords do not match."`)
- `TC-B02`: Weak Password Validation (< 6 chars)
- `TC-B03`: Invalid Email Format Handling
- `TC-B04`: Profile Completion Age Boundaries (negative, zero, 150, valid)
- `TC-B05`: Profile Completion Username Format Boundaries (empty, <3 chars, spaces, special chars, valid)
- `TC-B06`: Duplicate Username Collision (`"Username is already taken. Please choose another."`)
- `TC-B07`: Google Sign-In Popup Closed by User Handling
- `TC-B08`: Unauthorized Dashboard Access Redirect
- `TC-B09`: Direct URL Guard for Unverified Users

### Tier 3: Cross-Feature Linking (`src/test/tier3-cross-feature-linking.test.tsx`) — 5 Test Cases
- `TC-C01`: Google Sign-In with Existing Email (Automatic Account Linking)
- `TC-C02`: Incomplete Google Profile Blocked on Email Login (`"Email already exists. Please complete your profile to sign in with email."`)
- `TC-C03`: Completed Google User Dual Authentication (Email + Profile-set Password)
- `TC-C04`: Cascading Account Deletion Releases Username
- `TC-C05`: Stale Session Deletion Re-authentication Handling (`auth/requires-recent-login`)

### Tier 4: Real-World Scenarios (`src/test/tier4-real-world-scenarios.test.tsx`) — 3 Test Cases
- `TC-R01`: Aspirant Email/Password Journey (Signup -> Verify -> Login -> Dummy Dashboard -> Sign Out)
- `TC-R02`: Google Onboarding, Collision Resolution, Session Persistence & Deletion
- `TC-R03`: Abandoned Google Onboarding Recovery Flow (Abandon -> Email Login Blocked -> Google Resume -> Complete -> Dual Auth)

---

## 4. Verification & Baseline Execution Results

### 4.1 Build Verification
Command: `npm run build` in `frontend/codes`
Result: Clean build (exit code 0). TypeScript compiled all application and test files without error.

### 4.2 Test Suite Execution
Command: `npm test` in `frontend/codes`
Result:
- Total Test Files: 4
- Total Tests: 26 (1 passed, 25 failed)
- Time: 50.63s

The single passing test (`TC-B07`) exercises Google popup cancellation handling which was already partially implemented in `LoginPage.tsx`. The remaining 25 tests failed precisely because Milestone 2 implementation features (dedicated `/signup`, `/complete-profile`, dummy dashboard, exact error strings, route guards) have not yet been implemented.

---

## 5. Implementation Hand-off Recommendations for Milestone 2

1. **Pages to Create**:
   - `frontend/codes/src/pages/SignupPage.tsx`
   - `frontend/codes/src/pages/ProfileCompletionPage.tsx`
2. **Pages to Update**:
   - `frontend/codes/src/pages/DashboardPage.tsx`: Replace with testing dummy dashboard containing `"Logged in as: {name}"`, `"Sign Out"`, and `"Delete Account"`.
   - `frontend/codes/src/pages/LoginPage.tsx`: Enforce incomplete profile block string.
3. **Core Context & Routing**:
   - `frontend/codes/src/context/AppContext.tsx`: Add profile completion methods, account deletion, route guard evaluation, and exact error string dispatches.
   - `frontend/codes/src/App.tsx`: Synchronize with `window.location.pathname` and enforce route guards for unauthenticated, unverified, and incomplete profiles.
