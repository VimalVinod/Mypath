# Empirical Challenge Report: Milestone 1 Test Infrastructure & Mock Harness

**Target**: rontend/codes/src/test/mocks/firebaseMock.ts and E2E Test Infrastructure  
**Evaluator**: Challenger 1 (	eamwork_preview_challenger_m1_1)  
**Date**: 2026-09-07T15:06:00Z  
**Verdict**: **APPROVE** (with documented edge-case observations)

---

## 1. Executive Summary

Milestone 1 established an in-memory Firebase Authentication and Cloud Firestore mock engine (src/test/mocks/firebaseMock.ts), Vitest test harness configuration (itest.config.ts, setup.ts), and 4 tiers of opaque-box E2E tests (26 test cases total across Tiers 1-4).

Challenger 1 conducted empirical stress-testing, state isolation probing, error simulation validation, and test suite execution. The mock harness accurately models Firebase Modular SDK v10 behaviors required for R1, R2, and R3. All 26 tests execute cleanly via 
pm test (1 PASS, 25 FAIL reflecting authentic unmet M2 features), and 
pm run build completes with 0 errors.

---

## 2. Empirical Verification Methodology & Harness

A dedicated empirical stress harness was authored and executed using Vitest directly against src/test/mocks/firebaseMock.ts. The harness tested:
1. **State Isolation**: Pre-seeding registered users, UIDs, active sessions, document collections (users, usernames, and ad-hoc collections), auth listeners, and error states; invoking spies; then calling esetFirebaseMockState() and asserting that every data structure, listener list, and Vitest spy was returned to pristine empty state. Re-verified in sequential tests to confirm zero cross-test state leakage.
2. **Error Simulation & Input Validation**: Exercising createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, and deleteUser across normal, boundary, and hostile inputs.
3. **Firestore Mock Operations**: Validating doc() multiple signatures, setDoc() with/without { merge: true }, updateDoc() non-existent error codes (
ot-found), deleteDoc(), getDocs() with case-insensitive where() filtering, and unTransaction().
4. **Baseline Execution**: Executing 
pm test and 
pm run build in rontend/codes.

---

## 3. Challenge Results & Detailed Findings

### Dimension 1: State Isolation (esetFirebaseMockState())
- **Empirical Result**: **PASS**
- **Findings**:
  - mockState.registeredUsers.clear() empties all pre-registered users.
  - mockState.usersByUid.clear() empties UID mappings.
  - mockState.currentUser and uth.currentUser reset to 
ull.
  - mockState.collections resets to { users: {}, usernames: {} }, automatically purging any dynamic collections created during tests.
  - mockState.authListeners cleared to [].
  - Pre-configured errors (
extPopupError, 
extDeleteUserError) and 
extGoogleUser reset to 
ull.
  - All 20 primary Vi spies are cleared via .mockClear().
  - **Observation**: Auxiliary exports getAuth, getFirestore, initializeApp, and signInWithPhoneNumber are vi spies not explicitly listed in esetFirebaseMockState(). Because these are singleton getters not asserted for call counts in existing tests, this causes no test bleed, but could be included in future refactoring for completeness.

---

### Dimension 2: Error Simulation & Input Validation

#### A. createUserWithEmailAndPassword
- **Empirical Result**: **PASS with Edge Caveat**
- **Verified Behaviors**:
  - Rejects empty email ", missing @ (noatsign), leading @ (@domain.com), trailing @ (user@), and whitespace-only     with { code: 'auth/invalid-email' }.
 - Rejects passwords shorter than 6 characters (, 1, 12, 123, 1234, 12345) with { code: 'auth/weak-password' }.
 - Rejects duplicate email case-insensitively with { code: 'auth/email-already-in-use' }.
 - Successfully creates new user with emailVerified: false, generates unique UID, adds user to egisteredUsers and usersByUid, and notifies auth listeners.
- **Vulnerabilities / Edge Findings**:
 - *Internal whitespace & malformed domain*: Emails like user @domain.com are accepted because validation checks !normEmail || !normEmail.includes('@') || normEmail.startsWith('@') || normEmail.endsWith('@') rather than a standard email regex.
 - *Null/Undefined inputs*: Passing 
ull or undefined as email throws an unhandled JavaScript TypeError (Cannot read properties of null (reading 'toLowerCase')) rather than an uth/invalid-email rejection.

#### B. signInWithEmailAndPassword
- **Empirical Result**: **PASS**
- **Verified Behaviors**:
 - Rejects unregistered email with { code: 'auth/invalid-credential' }.
 - Rejects incorrect password with { code: 'auth/invalid-credential' }.
 - Case-insensitive email lookup: logging in with ALICE@EXAMPLE.COM for user registered as alice@example.com succeeds.
 - Updates mockState.currentUser and invokes 
otifyAuth.

#### C. signInWithPopup
- **Empirical Result**: **PASS**
- **Verified Behaviors**:
 - Successfully throws configured error via setNextPopupError(err) (e.g. { code: 'auth/popup-closed-by-user' }).
 - **One-shot consumption verified**: Once thrown, mockState.nextPopupError is cleared to 
ull, ensuring subsequent popup attempts succeed without error persistence.
 - **Automatic account linking**: When email matches an existing email/password account, Google provider { providerId: 'google.com', uid, email } is appended to the existing user's providerData without overwriting the original user or creating duplicate accounts.
 - Correctly creates new Google user with emailVerified: true and defaults displayName when not pre-existing.

#### D. deleteUser
- **Empirical Result**: **PASS with Edge Caveat**
- **Verified Behaviors**:
 - Successfully throws configured error via setNextDeleteUserError(err) (e.g. { code: 'auth/requires-recent-login' }).
 - **One-shot consumption verified**: Error is cleared to 
ull on throw; subsequent deletion attempts succeed.
 - Atomic failure: If 
extDeleteUserError triggers, no user records are deleted.
 - Purges user from egisteredUsers, usersByUid, and resets currentUser to 
ull if active.
 - Handles 
ull / undefined argument safely without throwing.
- **Vulnerabilities / Edge Findings**:
 - *Partial User Argument*: If deleteUser({ uid: 'u1' }) is passed without an email property, usersByUid is deleted, but egisteredUsers is not cleared because line 278 checks if (user.email). In real Firebase, passing uth.currentUser always supplies email.

---

### Dimension 3: Firestore Mock Operations
- **Empirical Result**: **PASS**
- **Verified Behaviors**:
 - setDoc() correctly creates documents, and correctly supports { merge: true } shallow property merging.
 - updateDoc() successfully modifies existing documents; throws { code: 'not-found' } when target document does not exist.
 - deleteDoc() permanently removes document key from collection map.
 - getDocs() with query(col, where('email', '==', val)) performs case-insensitive equality matching on string fields.
 - doc() correctly handles 3 overloaded signatures:
 1. doc(db, 'collection', 'id')
 2. doc(db, 'collection/id')
 3. doc(collectionRef, 'id')
 - unTransaction() correctly wraps get, set, update, delete operations in an atomic execution block.

---

### Dimension 4: Test Infrastructure & Suite Execution

- **
pm test**:
 `
 Test Files 4 failed (4)
 Tests 25 failed | 1 passed (26 total)
 Duration 15.31s
 `
 All 26 test cases across Tiers 1-4 execute cleanly under Vitest 2.1.9 with JSDOM. The 25 failures reflect authentic missing application features scheduled for Milestone 2 (e.g. dedicated /signup page, email verification gating, /complete-profile form, testing dummy dashboard, and account deletion). 1 test passes (TC-B07 Google popup closed by user alert handling).

- **
pm run build**:
 `
 tsc && vite build
 ✓ 1502 modules transformed.
 ✓ built in 4.00s
 `
 TypeScript compilation passes with 0 type errors.

---

## 4. Challenge Summary Matrix

| Dimension | Challenge Target | Status | Risk | Mitigation / Note |
|---|---|:---:|:---:|---|
| State Isolation | esetFirebaseMockState() | VERIFIED | LOW | Robust across all storage maps and spies |
| Error Simulation | createUserWithEmailAndPassword | VERIFIED | LOW | Add email regex in M2/M3 hardening |
| Error Simulation | signInWithEmailAndPassword | VERIFIED | LOW | Fully conformant to Firebase v10 |
| Error Simulation | signInWithPopup | VERIFIED | LOW | One-shot error consumption verified |
| Error Simulation | deleteUser | VERIFIED | LOW | One-shot error consumption & teardown verified |
| Account Linking | Provider data linking | VERIFIED | LOW | Correctly links Google to email accounts |
| Firestore Engine | CRUD & Transactions | VERIFIED | LOW | High fidelity in-memory engine |
| Test Runner | Vitest + JSDOM | VERIFIED | LOW | Fast, stable execution (15s for 26 tests) |
| Production Build | 
pm run build | VERIFIED | LOW | Clean build with zero TypeScript warnings |

---

## 5. Recommendation to Orchestrator

The test harness and mock infrastructure provide an authoritative, high-fidelity testing substrate for Milestone 2. No blocking defects were found.

**Verdict**: **APPROVE**. Milestone 2 (Implementation Track) may proceed immediately.
