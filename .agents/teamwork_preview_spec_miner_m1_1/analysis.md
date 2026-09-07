# Specification Analysis: R1 Authentication Methods & Verification

**Specification Miner**: Spec Miner 1 (`teamwork_preview_spec_miner_m1_1`)  
**Milestone**: M1 - Test Specification for R1  
**Authoritative Sources**:
- `c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md`
- `c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md`
- `c:\Users\sindh\Documents\codes\mypath\.agents\TEST_INFRA.md`
- Codebase references: `frontend/codes/src/firebase.ts`, `frontend/codes/src/context/AppContext.tsx`, `frontend/codes/src/pages/LoginPage.tsx`

---

## 1. Executive Summary

Requirement R1 mandates the implementation of Google Sign-In and Email/Password Sign-Up/Sign-In using Firebase Authentication. Specifically:
1. **Email/Password Sign-Up**: Must require password confirmation (`password` === `confirmPassword`). If passwords do not match, the exact error `"Passwords do not match."` must be displayed. On successful submission, a Firebase email verification link must be dispatched, the user must be prevented from entering the authenticated state (signed out immediately), and clear verification guidance must be presented.
2. **Email Verification Enforcement**: Verification is mandatory before login is allowed. When an unverified user attempts to log in (`emailVerified === false`), login must be strictly blocked, a new verification email must be dispatched, the user must remain signed out, and the exact required message must be displayed: `"Please verify your email address before logging in. A verification link has been sent to your email."`. Only when `emailVerified === true` is login permitted, routing the user to `/dashboard`.
3. **Google Sign-In**: Users must be able to authenticate with Google via Firebase popup (`signInWithPopup(auth, googleProvider)`). If the Google account is new or has an incomplete profile, the user must be routed to `/complete-profile`. If the user already has a completed profile, they proceed directly to `/dashboard`.

This document specifies the exact opaque-box testing requirements, test scenarios, mock expectations, boundary conditions, and state transitions to guide the test authors in creating the 4-tier test suite.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1 Sign-Up | Email/Password Sign-Up Form | Form providing email, password, and confirm password fields | `email: string`, `password: string`, `confirmPassword: string` | Account creation in Firebase Auth, initial Firestore doc creation, verification dispatch | Client validation error if inputs invalid; Firebase error if email registered | ORIGINAL_REQUEST §R1, PROJECT.md §Feature Inventory #3 |
| 2 | R1 Sign-Up | Password Confirmation Validation | Client-side check ensuring `password === confirmPassword` | `password: string`, `confirmPassword: string` | Validation passes, form proceeds to submit | If mismatch: displays `"Passwords do not match."`, halts submission before API call | ORIGINAL_REQUEST §R1, PROJECT.md §Exact Error Messages |
| 3 | R1 Sign-Up | Email Verification Link Dispatch on Sign-Up | Automatic dispatch of Firebase verification email upon user registration | `user: FirebaseUser`, `ActionCodeSettings` | `sendEmailVerification` invoked, user signed out | `auth/too-many-requests` or network failure handled gracefully | ORIGINAL_REQUEST §R1, PROJECT.md §Feature Inventory #4 |
| 4 | R1 Sign-Up | Post-Signup Session Prevention | Prevention of active authenticated session prior to email verification | `user.emailVerified === false` | `signOut(auth)` executed immediately, `currentUser === null`, route not `/dashboard` | If signout fails, app state forces `currentUser = null` | ORIGINAL_REQUEST §R1, AppContext.tsx:226 |
| 5 | R1 Sign-Up | Post-Signup Verification Notice UI | User-facing confirmation banner informing user to check inbox | Successful `signupWithEmail` | UI banner displayed explaining verification link was sent | None (success state presentation) | ORIGINAL_REQUEST §R1, Survey Explorer 1 |
| 6 | R1 Verification | Unverified Email Login Interception | Intercept login attempt when `user.emailVerified === false` | Email & Password for unverified account | Login rejected, `sendEmailVerification` re-triggered, `signOut` called, route remains `/login` | Displays exact error: `"Please verify your email address before logging in. A verification link has been sent to your email."` | ORIGINAL_REQUEST §R1, PROJECT.md §Exact Error Messages |
| 7 | R1 Verification | Verified Email Login Happy Path | Authenticate user when `user.emailVerified === true` | Email & Password for verified account | `signInWithEmailAndPassword` succeeds, user loaded into `AppContext`, navigates to `/dashboard` | Firebase invalid credentials error if wrong pass/user | ORIGINAL_REQUEST §R1, PROJECT.md §Feature Inventory #5 |
| 8 | R1 Google Auth | Google Sign-In Trigger & Popup | Authenticate using Google provider via Firebase popup | Click "Google Sign In" button | `signInWithPopup(auth, googleProvider)` triggered | Catch `auth/popup-closed-by-user`, display "Google Sign-In popup was closed." | ORIGINAL_REQUEST §R1, PROJECT.md §Feature Inventory #6 |
| 9 | R1 Google Auth | Google Sign-In New User Redirection | Route new Google sign-in users with incomplete profile to completion step | Google user with `isProfileComplete === false` | Navigate to `/complete-profile` | Route protection blocks unauthenticated users from `/complete-profile` | ORIGINAL_REQUEST §R2, PROJECT.md §Feature Inventory #8 |
| 10 | R1 Google Auth | Google Sign-In Returning User Direct Entry | Direct entry to `/dashboard` for returning Google users with completed profile | Google user with `isProfileComplete === true` | Navigate to `/dashboard`, user profile loaded | None | ORIGINAL_REQUEST §R1, TEST_INFRA.md TC-F06 |
| 11 | R1 Navigation | Login to Sign-Up Navigation Link | Navigation between auth forms | Click "Sign Up Free" link on `/login` | `navigate('/signup')`, `/signup` form rendered | Fallback to landing if route missing (fixed in M2) | LoginPage.tsx:176, App.tsx |
| 12 | R1 Navigation | Sign-Up to Login Navigation Link | Navigation back to login from signup | Click "Already have an account? Log in" on `/signup` | `navigate('/login')`, `/login` form rendered | None | PROJECT.md §Code Layout |
| 13 | R1 Route Guard | Direct Access Interception for Unverified Users | Guard preventing direct URL access to `/dashboard` when unverified | Navigate directly to `/dashboard` while `emailVerified === false` | Redirect to `/login` | Displays verification notice | TEST_INFRA.md TC-B09, PROJECT.md §Feature Inventory #7 |
| 14 | R1 Route Guard | Direct Access Interception for Unauthenticated Users | Guard preventing direct URL access to `/dashboard` when logged out | Navigate directly to `/dashboard` while `currentUser === null` | Redirect to `/login` | No flash of dashboard content | ORIGINAL_REQUEST §R3, TEST_INFRA.md TC-B08 |

---

## 3. Edge Cases

| # | Feature | Input | Observed / Required Behavior |
|---|---------|-------|------------------------------|
| 1 | Password Confirmation | Password: `Password123!`, Confirm: `password123!` (Case mismatch) | Mismatch detected. Exact error `"Passwords do not match."` displayed. `createUserWithEmailAndPassword` is NOT called. |
| 2 | Password Confirmation | Password: `Password123!`, Confirm: `""` (Empty confirm password) | HTML5 `required` constraint triggers or client validation catches empty confirm password. No API call. |
| 3 | Password Confirmation | Password: `Password123! `, Confirm: `Password123!` (Trailing space) | Mismatch detected. Exact error `"Passwords do not match."` displayed. |
| 4 | Password Validation | Password: `123`, Confirm: `123` (< 6 characters) | Rejected. Caught either by client length check (`minLength={6}`) or Firebase Auth `auth/weak-password`. Clear error displayed to user. |
| 5 | Email Format | Email: `notanemail`, Password: `Password123!`, Confirm: `Password123!` | Rejected by HTML5 email input validation or Firebase `auth/invalid-email`. Form submission blocked. |
| 6 | Email Format | Email: `user@`, Password: `Password123!`, Confirm: `Password123!` | Rejected by input validation format check. Form submission blocked. |
| 7 | Duplicate Email Signup | Email: `alreadyregistered@example.com` | Firebase throws `auth/email-already-in-use`. UI displays "Email already in use. Please log in instead." No verification link sent. |
| 8 | Unverified Login Repeat | Unverified user logs in 3 times consecutively | Every attempt rejected with `"Please verify your email address before logging in. A verification link has been sent to your email."`, `sendEmailVerification` called each time, `signOut` called each time, user never reaches `/dashboard`. |
| 9 | Email Verification Transition | User registers (`emailVerified: false`), then clicks email verification link (`emailVerified: true`), then logs in | First attempt before link click fails; second attempt after link click succeeds and redirects to `/dashboard`. |
| 10 | Google Popup Cancellation | User clicks Google button, closes browser popup window | Caught `auth/popup-closed-by-user`. Alert displayed: `"Google Sign-In popup was closed."`. Loading state cleared, remains on `/login`. |
| 11 | Google Popup Blocked | Browser blocks popup window | Caught `auth/popup-blocked`. UI displays user-friendly message indicating popup was blocked. Remains on `/login`. |
| 12 | Network Failure on Signup | Network disconnects during `createUserWithEmailAndPassword` | Caught `auth/network-request-failed`. Displays network error message, retains user input for retry. |
| 13 | Login Wrong Password | Valid email `user@example.com`, incorrect password `WrongPass` | Caught `auth/wrong-password` or `auth/invalid-credential`. Displays `"Invalid email address or password."`. |
| 14 | Login Non-Existent User | Email `nouser@example.com`, password `Password123!` | Caught `auth/user-not-found` or `auth/invalid-credential`. Displays `"Invalid email address or password."`. |

---

## 4. Concrete Opaque-Box Test Scenarios for R1

### Scenario Group 1: Email/Password Sign-Up (TC-F01, TC-B01, TC-B02, TC-B03)

#### Scenario 1.1: TC-F01 — Email/Password Sign-Up Happy Path
- **Requirement**: ORIGINAL_REQUEST §R1, PROJECT.md §Feature Inventory #3, #4
- **Preconditions**:
  - Fresh mock state: user `aspirant@example.com` does not exist in Firebase Auth or Firestore.
  - App mounted at route `/signup`.
- **Inputs**:
  - Email: `aspirant@example.com`
  - Password: `ValidPassword123!`
  - Confirm Password: `ValidPassword123!`
- **Execution Steps**:
  1. Render `<App />` with initial path `/signup`.
  2. Locate input fields for Email (`getByLabelText(/email/i)` or `getByPlaceholderText(/email/i)`).
  3. Locate input fields for Password and Confirm Password.
  4. Fill Email with `aspirant@example.com`.
  5. Fill Password with `ValidPassword123!`.
  6. Fill Confirm Password with `ValidPassword123!`.
  7. Click "Sign Up" / "Create Account" submit button.
- **Mock API Expectations**:
  - `createUserWithEmailAndPassword(auth, 'aspirant@example.com', 'ValidPassword123!')` is called exactly once.
  - Returns mock user `{ uid: 'mock-uid-aspirant', email: 'aspirant@example.com', emailVerified: false }`.
  - `sendEmailVerification(user, expect.any(Object))` is called exactly once with the new user object.
  - `signOut(auth)` is called to terminate any immediate session.
  - Firestore `setDoc(doc(db, 'users', 'mock-uid-aspirant'), expect.objectContaining({ isEmailVerified: false }), ...)` is invoked.
- **Expected Assertions**:
  - UI displays confirmation message indicating verification email has been dispatched (e.g. "A verification link has been sent to your email" or similar banner).
  - `currentUser` in `AppContext` is `null`.
  - Application does NOT navigate to `/dashboard`.

#### Scenario 1.2: TC-B01 — Password Confirmation Mismatch Validation
- **Requirement**: ORIGINAL_REQUEST §R1, PROJECT.md §Exact Error Messages Required
- **Preconditions**:
  - App mounted at route `/signup`.
- **Inputs**:
  - Email: `user@example.com`
  - Password: `PasswordOne123!`
  - Confirm Password: `PasswordTwo456!`
- **Execution Steps**:
  1. Render `<App />` at `/signup`.
  2. Fill Email with `user@example.com`.
  3. Fill Password with `PasswordOne123!`.
  4. Fill Confirm Password with `PasswordTwo456!`.
  5. Click submit button.
- **Mock API Expectations**:
  - `createUserWithEmailAndPassword` is **NEVER** called (`toHaveBeenCalledTimes(0)`).
  - `sendEmailVerification` is **NEVER** called.
- **Expected Assertions**:
  - UI displays verbatim error message: `"Passwords do not match."`
  - Error banner or field error is visible.
  - Email input value `user@example.com` is preserved in the form.
  - User remains on `/signup`.

#### Scenario 1.3: TC-B02 — Weak Password Validation
- **Requirement**: ORIGINAL_REQUEST §R1
- **Preconditions**:
  - App mounted at route `/signup`.
- **Inputs**:
  - Email: `weak@example.com`
  - Password: `123`
  - Confirm Password: `123`
- **Execution Steps**:
  1. Render `<App />` at `/signup`.
  2. Fill Email with `weak@example.com`.
  3. Fill Password with `123`.
  4. Fill Confirm Password with `123`.
  5. Click submit button.
- **Mock API Expectations**:
  - Either client blocks submission before API call, OR mock `createUserWithEmailAndPassword` throws `FirebaseError('auth/weak-password', 'Password should be at least 6 characters')`.
  - `sendEmailVerification` is **NEVER** called.
- **Expected Assertions**:
  - UI displays error message informing user that password must be at least 6 characters.
  - User account is not created; `currentUser` remains `null`.

#### Scenario 1.4: TC-B03 — Invalid Email Format Handling
- **Requirement**: ORIGINAL_REQUEST §R1
- **Preconditions**:
  - App mounted at route `/signup` or `/login`.
- **Inputs**:
  - Email: `not-an-email`
  - Password: `ValidPassword123!`
  - Confirm Password: `ValidPassword123!`
- **Execution Steps**:
  1. Render `<App />` at `/signup`.
  2. Fill Email with `not-an-email`.
  3. Fill Password with `ValidPassword123!`.
  4. Fill Confirm Password with `ValidPassword123!`.
  5. Click submit button.
- **Mock API Expectations**:
  - Either HTML5 validation prevents form submit event, OR mock `createUserWithEmailAndPassword` throws `FirebaseError('auth/invalid-email', 'The email address is badly formatted.')`.
  - `sendEmailVerification` is **NEVER** called.
- **Expected Assertions**:
  - Form submission fails; error message displayed or input validation tooltip shown.
  - User remains on `/signup`.

---

### Scenario Group 2: Email Verification Enforcement & Login (TC-F02, TC-F03, TC-B09)

#### Scenario 2.1: TC-F02 — Unverified Email Login Block
- **Requirement**: ORIGINAL_REQUEST §R1, PROJECT.md §Exact Error Messages Required
- **Preconditions**:
  - User exists in mock Auth with `email: 'unverified@example.com'`, `emailVerified: false`.
  - App mounted at route `/login`.
- **Inputs**:
  - Email: `unverified@example.com`
  - Password: `SecretPassword123!`
- **Execution Steps**:
  1. Render `<App />` at `/login`.
  2. Locate Email and Password inputs.
  3. Fill Email with `unverified@example.com`.
  4. Fill Password with `SecretPassword123!`.
  5. Click "Log In" submit button.
- **Mock API Expectations**:
  - `signInWithEmailAndPassword(auth, 'unverified@example.com', 'SecretPassword123!')` is called.
  - Mock returns user with `emailVerified: false`.
  - `sendEmailVerification(user, expect.any(Object))` is called to re-dispatch verification link.
  - `signOut(auth)` is called immediately.
- **Expected Assertions**:
  - Login attempt fails.
  - UI displays exact verbatim error message:
    `"Please verify your email address before logging in. A verification link has been sent to your email."`
  - `currentUser` in `AppContext` remains `null`.
  - Route remains `/login` (does NOT navigate to `/dashboard`).

#### Scenario 2.2: TC-F03 — Verified Email Login Happy Path
- **Requirement**: ORIGINAL_REQUEST §R1, §Acceptance Criteria
- **Preconditions**:
  - User exists in mock Auth with `email: 'verified@example.com'`, `emailVerified: true`, `uid: 'uid-verified-123'`.
  - Firestore document `users/uid-verified-123` exists with `{ name: 'Alex Verified', email: 'verified@example.com', isEmailVerified: true }`.
  - App mounted at route `/login`.
- **Inputs**:
  - Email: `verified@example.com`
  - Password: `CorrectPassword123!`
- **Execution Steps**:
  1. Render `<App />` at `/login`.
  2. Fill Email with `verified@example.com`.
  3. Fill Password with `CorrectPassword123!`.
  4. Click "Log In" button.
- **Mock API Expectations**:
  - `signInWithEmailAndPassword(auth, 'verified@example.com', 'CorrectPassword123!')` is called.
  - Returns mock user with `emailVerified: true`.
  - `sendEmailVerification` is **NOT** called.
  - `signOut` is **NOT** called.
  - Firestore `getDoc(doc(db, 'users', 'uid-verified-123'))` is called.
- **Expected Assertions**:
  - Login succeeds.
  - `currentUser` is populated in `AppContext`.
  - App navigates to `/dashboard`.
  - Dashboard renders user name: "Alex Verified".

#### Scenario 2.3: TC-B09 — Direct URL Guard for Unverified Users
- **Requirement**: ORIGINAL_REQUEST §R1, §R3 (Strict Verification)
- **Preconditions**:
  - User session simulated in mock Auth with `emailVerified: false`.
- **Inputs**:
  - User triggers direct navigation to `/dashboard`.
- **Execution Steps**:
  1. Render `<App />` attempting route `/dashboard`.
  2. Auth listener processes unverified user.
- **Mock API Expectations**:
  - `onAuthStateChanged` fires with unverified user.
  - Listener or route guard revokes session or blocks access.
- **Expected Assertions**:
  - User is immediately redirected to `/login`.
  - Dashboard contents are NOT rendered.

---

### Scenario Group 3: Google Sign-In Flows (TC-F04, TC-F06, TC-B07)

#### Scenario 3.1: TC-F04 — Google Sign-In New User Profile Enforcement Redirection
- **Requirement**: ORIGINAL_REQUEST §R1 & §R2
- **Preconditions**:
  - User does not exist in Firestore.
  - App mounted at `/login`.
- **Inputs**:
  - Click "Google Sign In" button.
- **Execution Steps**:
  1. Render `<App />` at `/login`.
  2. Click button matching `/google sign in/i`.
- **Mock API Expectations**:
  - `signInWithPopup(auth, googleProvider)` is called once.
  - Resolves with mock user `{ uid: 'google-uid-new', email: 'newgoogle@gmail.com', displayName: 'Google Newbie', emailVerified: true }`.
  - Firestore `getDoc(doc(db, 'users', 'google-uid-new'))` returns non-existent or `{ isProfileComplete: false }`.
- **Expected Assertions**:
  - User profile is recognized as incomplete.
  - Application navigates to `/complete-profile`.
  - Application does NOT navigate to `/dashboard`.

#### Scenario 3.2: TC-F06 — Returning Google User Direct Dashboard Entry
- **Requirement**: ORIGINAL_REQUEST §R1
- **Preconditions**:
  - User exists in Firestore `users/google-uid-ret` with `{ isProfileComplete: true, name: 'Returning Google User', username: 'retgoogle' }`.
  - App mounted at `/login`.
- **Inputs**:
  - Click "Google Sign In" button.
- **Execution Steps**:
  1. Render `<App />` at `/login`.
  2. Click button matching `/google sign in/i`.
- **Mock API Expectations**:
  - `signInWithPopup(auth, googleProvider)` is called once.
  - Resolves with user `{ uid: 'google-uid-ret', email: 'retgoogle@gmail.com', displayName: 'Returning Google User' }`.
  - Firestore `getDoc(doc(db, 'users', 'google-uid-ret'))` returns `{ isProfileComplete: true, name: 'Returning Google User' }`.
- **Expected Assertions**:
  - Application navigates directly to `/dashboard`.
  - Dashboard displays user's name: "Returning Google User".

#### Scenario 3.3: TC-B07 — Google Sign-In Popup Closed by User
- **Requirement**: ORIGINAL_REQUEST §R1, Robust Auth Flow
- **Preconditions**:
  - App mounted at `/login`.
- **Inputs**:
  - Click "Google Sign In" button.
- **Execution Steps**:
  1. Configure mock `signInWithPopup` to reject with error `{ code: 'auth/popup-closed-by-user', message: 'Popup closed' }`.
  2. Render `<App />` at `/login`.
  3. Click "Google Sign In" button.
- **Mock API Expectations**:
  - `signInWithPopup(auth, googleProvider)` is called once and rejects.
- **Expected Assertions**:
  - UI catches error gracefully without uncaught promise rejection.
  - Error banner displays: `"Google Sign-In popup was closed."`
  - Loading state is reset (button is not stuck in disabled/loading state).
  - User remains on `/login`.

---

## 5. Exact Error Messages and Mock Contract Specifications

### 5.1 Exact Required String Constants

The following strings must be matched verbatim in test assertions:
1. **Password Mismatch**:
   ```typescript
   export const MSG_PASSWORDS_DO_NOT_MATCH = "Passwords do not match.";
   ```
2. **Unverified Email Login**:
   ```typescript
   export const MSG_EMAIL_NOT_VERIFIED = "Please verify your email address before logging in. A verification link has been sent to your email.";
   ```
3. **Google Popup Closed**:
   ```typescript
   export const MSG_GOOGLE_POPUP_CLOSED = "Google Sign-In popup was closed.";
   ```
4. **Invalid Email or Password (Login)**:
   ```typescript
   export const MSG_INVALID_CREDENTIALS = "Invalid email address or password.";
   ```

### 5.2 Firebase Auth API Mock Contract

The in-memory mock harness must implement and record invocations for the following signatures:

```typescript
// createUserWithEmailAndPassword
createUserWithEmailAndPassword: (auth: any, email: string, pass: string) => Promise<{
  user: {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName: string | null;
    providerData: Array<{ providerId: string; uid: string; email: string | null }>;
  };
}>;

// sendEmailVerification
sendEmailVerification: (user: any, actionCodeSettings?: any) => Promise<void>;

// signInWithEmailAndPassword
signInWithEmailAndPassword: (auth: any, email: string, pass: string) => Promise<{
  user: {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName: string | null;
    providerData: Array<{ providerId: string; uid: string; email: string | null }>;
  };
}>;

// signInWithPopup
signInWithPopup: (auth: any, provider: any) => Promise<{
  user: {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName: string | null;
    providerData: Array<{ providerId: string; uid: string; email: string | null }>;
  };
}>;

// signOut
signOut: (auth: any) => Promise<void>;

// onAuthStateChanged
onAuthStateChanged: (auth: any, nextOrObserver: (user: any) => void) => (() => void);
```

### 5.3 Firestore Mock Contract for R1
```typescript
// doc
doc: (db: any, path: string, ...pathSegments: string[]) => { id: string; path: string };

// getDoc
getDoc: (docRef: { id: string; path: string }) => Promise<{
  exists: () => boolean;
  data: () => Record<string, any> | undefined;
}>;

// setDoc
setDoc: (docRef: { id: string; path: string }, data: Record<string, any>, options?: { merge?: boolean }) => Promise<void>;
```

---

## 6. Mapping to Test Tiers for Test Authors

| Test Case ID | Test Category | Target File | Description |
|:---|:---|:---|:---|
| **TC-F01** | Tier 1: Feature Coverage | `src/test/tier1-feature-coverage.test.tsx` | Email/Password Sign-Up Happy Path (with verification dispatch and auto-signout) |
| **TC-F02** | Tier 1: Feature Coverage | `src/test/tier1-feature-coverage.test.tsx` | Unverified Email Login Block (re-dispatches link, exact error message) |
| **TC-F03** | Tier 1: Feature Coverage | `src/test/tier1-feature-coverage.test.tsx` | Verified Email Login Happy Path (enters dashboard) |
| **TC-F04** | Tier 1: Feature Coverage | `src/test/tier1-feature-coverage.test.tsx` | Google Sign-In New User redirects to `/complete-profile` |
| **TC-F06** | Tier 1: Feature Coverage | `src/test/tier1-feature-coverage.test.tsx` | Google Sign-In Returning User directs to `/dashboard` |
| **TC-B01** | Tier 2: Boundary & Corner Cases | `src/test/tier2-boundary-cases.test.tsx` | Password Confirmation Mismatch (exact message `"Passwords do not match."`) |
| **TC-B02** | Tier 2: Boundary & Corner Cases | `src/test/tier2-boundary-cases.test.tsx` | Weak Password Validation (< 6 chars) |
| **TC-B03** | Tier 2: Boundary & Corner Cases | `src/test/tier2-boundary-cases.test.tsx` | Invalid Email Format Validation |
| **TC-B07** | Tier 2: Boundary & Corner Cases | `src/test/tier2-boundary-cases.test.tsx` | Google Sign-In Popup Closed by User Graceful Handling |
| **TC-B09** | Tier 2: Boundary & Corner Cases | `src/test/tier2-boundary-cases.test.tsx` | Direct Access Guard on `/dashboard` for Unverified Users |
| **TC-R01** | Tier 4: Real-World Scenarios | `src/test/tier4-real-world-scenarios.test.tsx` | Full End-to-End Aspirant Lifecycle (Sign up -> Block unverified -> Verify -> Login -> Dashboard -> Sign out) |

---

## 7. Downstream Author Verification Guidelines

When implementing test files for R1:
1. Use `@testing-library/react` methods `render`, `screen`, `fireEvent`, `waitFor`.
2. Wrap components in `<AppProvider>` or render `<App />` directly to test integrated behavior.
3. Reset mock state (`resetFirebaseMock()`) before each test (`beforeEach`).
4. Ensure all assertions on error messages use exact string matching or regex containing the exact string:
   - `expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();`
   - `expect(screen.getByText(/Please verify your email address before logging in/i)).toBeInTheDocument();`
5. Assert mock spy invocations:
   - `expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password)`
   - `expect(sendEmailVerification).toHaveBeenCalled()`
   - `expect(signOut).toHaveBeenCalled()`
