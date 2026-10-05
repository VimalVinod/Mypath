# R2 Specification & Opaque-Box Test Requirements: Account Linking & Profile Enforcement

**Author**: Spec Miner 2 (`teamwork_preview_spec_miner`)  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2`  
**Milestone**: Milestone 1 (E2E Testing Track)  
**Authoritative Sources**:
- `c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md` (§R2, §Acceptance Criteria)
- `c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md` (§Feature Inventory, §Interface Contracts, §Firestore Schema, §Exact Error Messages)
- `c:\Users\sindh\Documents\codes\mypath\.agents\TEST_INFRA.md` (§Test Mapping, §Test Architecture, §Scenarios)
- Codebase inspection: `frontend/codes/src/context/AppContext.tsx`, `frontend/codes/src/pages/LoginPage.tsx`, `frontend/codes/src/App.tsx`, `frontend/codes/firestore.rules`

---

## 1. Executive Summary

This document specifies the precise, opaque-box test requirements and behavioral invariants for **Requirement R2 (Account Linking & Profile Enforcement)**.

### Core Objectives of R2:
1. **Google Signup Profile Completion Enforcement**: A first-time Google user is intercepted immediately post-authentication and directed to a mandatory **Profile Completion** step (`/complete-profile`). They cannot bypass this step or access the dashboard until they have provided a valid **Name**, **Age**, a **unique Username** (verified against Firestore), and set an account **Password**.
2. **Username Validation & Atomic Reservation**: Usernames must be validated for format and case-insensitive uniqueness against the Firestore `usernames` collection. Collisions must be intercepted with the exact error string: `"Username is already taken. Please choose another."` Upon submission, the username is atomically reserved in `usernames/{username.toLowerCase()}`.
3. **Incomplete Google Profile Blocking on Email Login**: If a user initiates Google sign-in but abandons the profile completion flow (leaving `isProfileComplete: false`), any subsequent attempt to log in using their email address in the email/password login form must be strictly blocked with the verbatim error string: `"Email already exists. Please complete your profile to sign in with email."`
4. **Dual Sign-In for Completed Google Users**: Once a Google user completes the profile and sets their password, they must be capable of signing in seamlessly via either Google popup OR email/password credentials.
5. **Automatic Google Account Linking**: When an existing email/password account holder signs in via Google using the identical email address, the system must automatically link the Google provider to the existing account without losing data, creating duplicate accounts, or generating an unlinked second user document.

---

## 2. Authoritative Specification Sources

| Requirement Item | Authoritative Source | Exact Verbatim Specification |
|---|---|---|
| **Google Signup Profile Completion** | `ORIGINAL_REQUEST.md` §R2 | *"If a user signs up via Google, enforce a 'Profile Completion' step where they must provide: Name, Age, a unique Username (must be checked against Firestore for uniqueness), and set a Password."* |
| **Username Collision Error** | `PROJECT.md` §Exact Error Messages Required | `"Username is already taken. Please choose another."` |
| **Incomplete Profile Email Login Block** | `ORIGINAL_REQUEST.md` §R2 & `PROJECT.md` §Exact Error Messages | *"If they attempt to log in via email/password before completing this profile, block them with the message: 'Email already exists. Please complete your profile to sign in with email.'"* |
| **Automatic Google Account Linking** | `ORIGINAL_REQUEST.md` §R2 & §Acceptance Criteria | *"Automatically link Google accounts to existing email accounts if the emails match."* / *"Signing in with Google using an email that was already registered via Email/Password successfully links the accounts."* |
| **Completed Google Profile Dual Auth** | `ORIGINAL_REQUEST.md` §R2 & `TEST_INFRA.md` §TC-C03, §TC-R03 | Google user sets password during profile completion; thereafter can sign in via both Google and email/password. |
| **Firestore User Schema** | `PROJECT.md` §Firestore Schema | `users/{userId}`: `uid`, `email` (lowercase), `name`, `username` (lowercase), `age`, `isProfileComplete`, `isEmailVerified`, `authProviders`, `createdAt`, `updatedAt` |
| **Firestore Username Index** | `PROJECT.md` §Firestore Schema | `usernames/{username}`: `uid`, `createdAt` |
| **AppContext Contract** | `PROJECT.md` §AppContext Contract | `completeGoogleProfile(data: { name: string; age: number; username: string; password: string }) => Promise<void>` and `checkUsernameAvailable(username: string) => Promise<boolean>` |

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Profile Enforcement | Google Signup Interception | Intercepts first-time Google signups and uncompleted profiles, redirecting to `/complete-profile` | Click "Google Sign In" -> popup resolves new user (`isProfileComplete: false`) | Navigation to `/complete-profile`, route guard blocking `/dashboard` | Throws `auth/popup-closed-by-user` if popup closed | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` #8 |
| 2 | Profile Enforcement | Mandatory Profile Data Submission | Collects Name, Age, Username, Password to finalize profile | Name: string, Age: number, Username: string, Password: string | Firestore `users/{uid}` updated (`isProfileComplete: true`), Firestore `usernames/{username}` reserved, Auth password set, navigate `/dashboard` | Client field validation errors for missing/invalid fields | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` #8 |
| 3 | Username Verification | Case-Insensitive Availability Check | Checks whether normalized username already exists in Firestore `usernames/{username}` | Username string (e.g. `"Hero2026"`) | Returns `boolean` (`true` if available, `false` if taken) | Read permission error if unauthenticated (resolved in rules) | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` #9 |
| 4 | Username Verification | Username Collision Blocking | Blocks profile completion if chosen username is already present in `usernames/{username}` | Taken username submission | Form error displayed: `"Username is already taken. Please choose another."`, submission halted | Re-enables submission with unique username | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` §Exact Errors |
| 5 | Username Verification | Atomic Username Reservation | Commits chosen username to `usernames/{username.toLowerCase()}` with UID reference | User UID, Username string | Document written to `usernames/{username}` | Write rejected if document already exists | `PROJECT.md` §Firestore Schema |
| 6 | Incomplete Profile Block | Incomplete Google Profile Email Login Block | Prevents email/password login for any email registered via Google that hasn't completed profile | Email string + Password string on `/login` form | Rejection of email login attempt, session cleared | Throws/Displays EXACT string: `"Email already exists. Please complete your profile to sign in with email."` | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` #10 |
| 7 | Incomplete Profile Block | Google Profile Onboarding Recovery | Allows user with incomplete profile to resume onboarding via Google sign in | Click "Google Sign In" with existing incomplete Google account | Navigates directly to `/complete-profile` with existing data pre-filled | None | `TEST_INFRA.md` §TC-R03 |
| 8 | Password Setting | Google Account Password Linkage | Links email/password credential to Google user account so they can use email auth | Email, Password via `linkWithCredential` or `updatePassword` | Firebase Auth user updated with `'password'` provider | Fails if password does not meet complexity | `ORIGINAL_REQUEST.md` §R2, Explorer 2 §5.3 |
| 9 | Dual Authentication | Dual Sign-In Capability | Allows completed Google user to sign in using either Google Sign-In or Email/Password | Login via Google popup OR Login via Email + Profile-set Password | Authenticated session with complete profile, navigate `/dashboard` | Standard auth errors if wrong password | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` |
| 10 | Account Linking | Automatic Google Account Linking | Automatically links Google provider when logging in with Google on an email registered via email/password | Google Sign-In with email matching verified email/password user | Google provider linked to existing `users/{uid}`, `authProviders` updated | `auth/account-exists-with-different-credential` handled | `ORIGINAL_REQUEST.md` §R2, `PROJECT.md` #11 |
| 11 | Route Protection | Profile Completion Route Guard | Guards `/complete-profile` and `/dashboard` based on auth and profile completion status | URL navigation: `/complete-profile` or `/dashboard` | Route permitted if conditions met; else redirect | Unauth -> `/login`; Incomplete -> `/complete-profile`; Complete visiting `/complete-profile` -> `/dashboard` | `PROJECT.md` #7, Explorer 2 §4.3 |
| 12 | Account Management | Cascading Username Release on Deletion | Deletes `usernames/{username}` when user executes account deletion, freeing username | Click "Delete Account" -> confirm | Document `usernames/{username}` and `users/{uid}` deleted from Firestore | If session stale, requires recent login | `ORIGINAL_REQUEST.md` §R3, `TEST_INFRA.md` §TC-C04 |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Username Collision | Username with uppercase `JohnDoe` when `johndoe` exists in `usernames` | Normalized to `johndoe`; collision detected; exact error displayed: `"Username is already taken. Please choose another."` |
| 2 | Username Boundary | Empty string `""` or whitespace `"   "` | Client validation fails: "Username is required"; form submission blocked. |
| 3 | Username Boundary | String with < 3 characters (e.g. `"ab"`, `"x"`) | Client validation fails: "Username must be at least 3 characters"; form submission blocked. |
| 4 | Username Boundary | String with spaces or invalid special characters (e.g. `"my user"`, `"user@name"`, `"user#!"`) | Client validation fails: "Username can only contain alphanumeric characters and underscores"; form submission blocked. |
| 5 | Username Boundary | Max length string (> 30 characters) | Input truncated or validation error: "Username must not exceed 30 characters". |
| 6 | Age Boundary | Negative number (e.g. `-5`, `-1`) | Validation fails: "Please enter a valid age"; submission blocked. |
| 7 | Age Boundary | Zero (`0`) | Validation fails: "Please enter a valid age"; submission blocked. |
| 8 | Age Boundary | Non-numeric text (`"twenty"`, `"abc"`) | Number input rejects non-numeric input or validation fails: "Please enter a valid age". |
| 9 | Age Boundary | Upper boundary edge (e.g. `120` vs `150`) | Realistic age validation restricts ages (e.g. 1 to 120); `150` rejected. |
| 10 | Name Boundary | Empty name `""` or whitespace-only `"   "` | Validation fails: "Full name is required"; submission blocked. |
| 11 | Password Boundary | Empty password `""` | Validation fails: "Password is required"; submission blocked. |
| 12 | Password Boundary | Weak password (< 6 characters, e.g. `"12345"`) | Validation fails: "Password must be at least 6 characters" or Firebase `auth/weak-password` caught and reported. |
| 13 | Incomplete Profile Email Login Block | Incomplete Google account enters email + password on `/login` | Pre-login check queries Firestore `users` where `email == email.toLowerCase()`. `isProfileComplete == false` detected -> login aborted with exact message: `"Email already exists. Please complete your profile to sign in with email."` |
| 14 | Incomplete Profile Email Login Case Sensitivity | Incomplete Google user registered with `User@Gmail.com`, user enters `user@gmail.com` on `/login` | Query normalizes email to lowercase; collision detected; exact error message displayed. |
| 15 | Google Sign-In Popup Cancelled | User opens Google popup and clicks 'X' or cancels | Caught gracefully: `auth/popup-closed-by-user`; alert shows "Google Sign-In popup was closed."; UI does not crash or remain in endless loading state. |
| 16 | Direct Navigation to `/complete-profile` Unauthenticated | Unauthenticated user types `/complete-profile` in browser address bar | Route guard intercepts; user redirected immediately to `/login`. |
| 17 | Direct Navigation to `/complete-profile` by Completed User | Authenticated user with `isProfileComplete === true` navigates to `/complete-profile` | Route guard detects profile is already complete; redirects user to `/dashboard`. |
| 18 | Direct Navigation to `/dashboard` by Incomplete User | Authenticated user with `isProfileComplete === false` attempts to access `/dashboard` | Route guard detects incomplete profile; redirects user to `/complete-profile`. |
| 19 | Account Linking Email Case Normalization | Email registered via email/password as `Test@Example.com`; Google sign-in provides `test@example.com` | Both normalise to `test@example.com`; accounts linked to same Firestore UID; single consolidated account. |
| 20 | Username Released Post-Deletion | User `alpha_user` deletes account; new user immediately attempts to register `alpha_user` | `usernames/alpha_user` was deleted in deletion transaction; lookup confirms availability; new user successfully registers username. |

---

## 5. Concrete Opaque-Box Test Scenarios

The following test scenarios specify the concrete inputs, preconditions, execution steps, expected assertions, and mock engine states for testing R2 across Tiers 1 through 4.

---

### Scenario TC-F04: Google Sign-In New User Profile Enforcement (Tier 1)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 (Google signup profile completion step).
- **Objective**: Verify that a new Google user is intercepted and forced to the Profile Completion step, and cannot access the dashboard until completed.
- **Preconditions**: User is on `/login` and is unauthenticated.
- **Initial Mock State**:
  - Auth: No active user (`auth.currentUser = null`).
  - Firestore `users`: Empty.
  - Firestore `usernames`: Empty.
- **Execution Steps**:
  1. Click button: `"Sign in with Google"`.
  2. Mock popup resolves new Google user:
     - `uid: "g_user_101"`
     - `email: "newgoogle@example.com"`
     - `displayName: "Google Candidate"`
     - `emailVerified: true`
     - `providerData: [{ providerId: "google.com", uid: "g_user_101", email: "newgoogle@example.com" }]`
- **Expected Assertions**:
  1. System checks Firestore `users/g_user_101` and finds `isProfileComplete !== true`.
  2. Router navigates to `/complete-profile`.
  3. URL / Path is `/complete-profile`.
  4. Header/title renders "Complete Your Profile".
  5. Form fields are present:
     - Full Name input (default value: `"Google Candidate"`).
     - Age input.
     - Username input.
     - Password input.
  6. Attempting to directly navigate to `/dashboard` redirects back to `/complete-profile`.
- **Post-Execution Mock State**:
  - Auth: `auth.currentUser.uid === "g_user_101"`.
  - Firestore: Profile not yet completed (`isProfileComplete` is false or document pending).

---

### Scenario TC-F05: Google User Completes Profile (Tier 1)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 (Submit Name, Age, unique Username, Password).
- **Objective**: Verify that submitting valid profile completion data commits to Firestore `users` and `usernames`, sets the account password, and navigates to the dashboard.
- **Preconditions**:
  - Authenticated as `g_user_101` (`newgoogle@example.com`).
  - Currently on `/complete-profile`.
- **Initial Mock State**:
  - Firestore `usernames/janedoe24`: Does not exist.
  - Firestore `users/g_user_101`: `{ isProfileComplete: false }` or null.
- **Execution Steps**:
  1. In "Full Name", enter `"Jane Doe"`.
  2. In "Age", enter `"24"`.
  3. In "Username", enter `"janedoe24"`.
  4. In "Password", enter `"SecurePass123!"`.
  5. Click submit button: `"Save & Continue"` (or `"Complete Profile"`).
- **Expected Assertions**:
  1. Username check verifies `janedoe24` is free.
  2. Document `usernames/janedoe24` is created in Firestore with `{ uid: "g_user_101" }`.
  3. Document `users/g_user_101` is updated in Firestore:
     - `name === "Jane Doe"`
     - `age === 24`
     - `username === "janedoe24"`
     - `isProfileComplete === true`
     - `authProviders` contains `"google.com"` and `"password"`.
  4. Firebase Auth credential updated with password `"SecurePass123!"`.
  5. Router navigates to `/dashboard`.
  6. Dashboard displays: `"Jane Doe"` (or `"janedoe24"`).
- **Post-Execution Mock State**:
  - Firestore `usernames/janedoe24`: `{ uid: "g_user_101" }`.
  - Firestore `users/g_user_101`: `isProfileComplete === true`.
  - Auth: User has linked password credential.

---

### Scenario TC-F06: Returning Google User Direct Entry (Tier 1)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R1 & §R2 (Returning user bypasses completion).
- **Objective**: Verify that a Google user whose profile was already completed is navigated directly to `/dashboard` without seeing `/complete-profile`.
- **Preconditions**: User is unauthenticated on `/login`.
- **Initial Mock State**:
  - Firestore `users/g_user_returning`:
    ```json
    {
      "uid": "g_user_returning",
      "email": "returning@example.com",
      "name": "Returning Google User",
      "username": "returning_pro",
      "age": 28,
      "isProfileComplete": true,
      "isEmailVerified": true,
      "authProviders": ["google.com", "password"]
    }
    ```
  - Firestore `usernames/returning_pro`: `{ uid: "g_user_returning" }`.
- **Execution Steps**:
  1. Click `"Sign in with Google"`.
  2. Mock popup resolves user with `uid: "g_user_returning"`.
- **Expected Assertions**:
  1. System checks Firestore `users/g_user_returning`, finds `isProfileComplete === true`.
  2. Router navigates directly to `/dashboard`.
  3. `/complete-profile` is NOT rendered.
  4. Dashboard displays `"Returning Google User"`.

---

### Scenario TC-B04: Profile Completion Age Boundaries (Tier 2)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 (Age field validation).
- **Objective**: Verify boundary validation for the Age field on the Profile Completion form.
- **Preconditions**: User is authenticated on `/complete-profile`.
- **Execution Steps & Verifications**:
  1. Enter Age `"-5"`, click Submit:
     - Form displays validation error: `"Please enter a valid age"` or equivalent.
     - Submission halted; no Firestore writes occur.
  2. Enter Age `"0"`, click Submit:
     - Form displays validation error.
     - Submission halted.
  3. Enter Age `"150"`, click Submit:
     - Form displays validation error for unrealistic age.
     - Submission halted.
  4. Enter valid Age `"21"`:
     - Error clears; form allows submission.

---

### Scenario TC-B05: Username Format Boundaries (Tier 2)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 (Username format validation).
- **Objective**: Verify username format boundaries (empty, min-length, allowed characters).
- **Preconditions**: User is authenticated on `/complete-profile`.
- **Execution Steps & Verifications**:
  1. Leave Username empty `""`, click Submit:
     - Form displays: `"Username is required"`.
     - Submission halted.
  2. Enter Username `"ab"` (2 characters), click Submit:
     - Form displays: `"Username must be at least 3 characters"`.
     - Submission halted.
  3. Enter Username `"user with spaces"`, click Submit:
     - Form displays: `"Username can only contain alphanumeric characters and underscores"`.
     - Submission halted.
  4. Enter Username `"user@invalid!"`, click Submit:
     - Form displays: `"Username can only contain alphanumeric characters and underscores"`.
     - Submission halted.
  5. Enter valid Username `"valid_user_99"`:
     - Format error disappears; uniqueness check proceeds.

---

### Scenario TC-B06: Duplicate Username Collision (Tier 2)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 & `PROJECT.md` §Exact Error Messages.
- **Objective**: Verify that when a user selects an already registered username, the system intercepts the collision and displays the exact specified error message.
- **Preconditions**: User is authenticated on `/complete-profile`.
- **Initial Mock State**:
  - Firestore `usernames/champion2026`: `{ uid: "existing_user_999", createdAt: "2026-01-01" }`.
- **Execution Steps**:
  1. Fill Name: `"Alice"`.
  2. Fill Age: `"22"`.
  3. Fill Username: `"champion2026"`.
  4. Fill Password: `"Password123!"`.
  5. Click Submit.
- **Expected Assertions**:
  1. Firestore query detects `usernames/champion2026` already exists.
  2. Form displays EXACT error message:
     `"Username is already taken. Please choose another."`
  3. No writes to `users/{uid}` with `isProfileComplete: true`.
  4. User remains on `/complete-profile`.
  5. User changes Username to `"champion2026_unique"` and clicks Submit.
  6. Collision message disappears.
  7. Submission succeeds; navigates to `/dashboard`.
  8. Firestore `usernames/champion2026_unique` is reserved.

---

### Scenario TC-B07: Google Sign-In Popup Closed by User (Tier 2)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R1 & §R2 (Robust Google popup error handling).
- **Objective**: Verify that closing the Google popup does not crash the UI or leave the login page in an unrecoverable loading state.
- **Preconditions**: User is on `/login`.
- **Execution Steps**:
  1. Click `"Sign in with Google"`.
  2. Mock popup rejects with `FirebaseError: auth/popup-closed-by-user`.
- **Expected Assertions**:
  1. Error banner displays: `"Google Sign-In popup was closed."` (or user-friendly alert).
  2. Loading spinner terminates.
  3. User remains on `/login` and can retry sign-in.

---

### Scenario TC-C01: Google Sign-In with Existing Email (Automatic Account Linking) (Tier 3)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 ("Automatically link Google accounts to existing email accounts if the emails match").
- **Objective**: Verify that signing in with Google using an email that already exists as an email/password account automatically links the accounts into a unified user profile.
- **Preconditions**: User previously registered via email/password.
- **Initial Mock State**:
  - Auth: User `uid: "user_alex_1"` with email `alex@example.com`, `emailVerified: true`, provider `password`.
  - Firestore `users/user_alex_1`:
    ```json
    {
      "uid": "user_alex_1",
      "email": "alex@example.com",
      "name": "Alex Smith",
      "username": "alexsmith",
      "age": 25,
      "isProfileComplete": true,
      "isEmailVerified": true,
      "authProviders": ["password"]
    }
    ```
  - Firestore `usernames/alexsmith`: `{ uid: "user_alex_1" }`.
- **Execution Steps**:
  1. Unauthenticated user on `/login`.
  2. User clicks `"Sign in with Google"`.
  3. Google popup resolves with email `"alex@example.com"`.
- **Expected Assertions**:
  1. Firebase Auth links the Google credential to `user_alex_1`.
  2. Firestore `users/user_alex_1` has `authProviders` updated to include both `"password"` and `"google.com"`.
  3. Because `isProfileComplete === true`, user is NOT forced to `/complete-profile`.
  4. Navigates directly to `/dashboard`.
  5. Dashboard displays `"Alex Smith"`.
  6. Subsequent email/password login and Google login both authenticate to `user_alex_1`.
  7. No orphan or duplicate user document created.

---

### Scenario TC-C02: Incomplete Google Profile Blocked on Email Login (Tier 3)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 & `PROJECT.md` §Exact Error Messages.
- **Objective**: Verify that attempting email/password login for an account created via Google that has not finished profile completion is strictly blocked with the exact error message.
- **Preconditions**: User created a Google account but abandoned `/complete-profile`.
- **Initial Mock State**:
  - Auth: User `uid: "user_carol_incomplete"` with email `carol@example.com`, provider `google.com`.
  - Firestore `users/user_carol_incomplete`:
    ```json
    {
      "uid": "user_carol_incomplete",
      "email": "carol@example.com",
      "isProfileComplete": false,
      "isEmailVerified": true,
      "authProviders": ["google.com"]
    }
    ```
- **Execution Steps**:
  1. User is on `/login`.
  2. Enter Email: `"carol@example.com"`.
  3. Enter Password: `"AnyPassword123!"`.
  4. Click `"Log In"`.
- **Expected Assertions**:
  1. Login attempt is strictly rejected before initiating session.
  2. `currentUser` remains `null`.
  3. User remains on `/login`.
  4. Error banner renders EXACT string:
     `"Email already exists. Please complete your profile to sign in with email."`
  5. User is NOT navigated to `/dashboard`.
- **Post-Execution State**:
  - No active authenticated session.
  - Profile remains incomplete until Google sign-in is used to resume onboarding.

---

### Scenario TC-C03: Completed Google User Can Now Sign In via Email (Tier 3)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 (Completed Google user sets password and can log in with email).
- **Objective**: Verify that a Google user who sets a password during profile completion can subsequently authenticate using standard email/password login.
- **Preconditions**:
  - User `dan@example.com` completed Google profile completion with password `"DanPass123!"`.
  - User signed out and is on `/login`.
- **Initial Mock State**:
  - Firestore `users/user_dan`:
    ```json
    {
      "uid": "user_dan",
      "email": "dan@example.com",
      "name": "Dan Miller",
      "username": "danmiller",
      "age": 30,
      "isProfileComplete": true,
      "isEmailVerified": true,
      "authProviders": ["google.com", "password"]
    }
    ```
  - Auth: Registered user `dan@example.com` with password `"DanPass123!"`.
- **Execution Steps**:
  1. On `/login`, enter Email: `"dan@example.com"`.
  2. Enter Password: `"DanPass123!"`.
  3. Click `"Log In"`.
- **Expected Assertions**:
  1. `signInWithEmailAndPassword` succeeds.
  2. `isProfileComplete === true` verified.
  3. Navigates to `/dashboard`.
  4. Dashboard renders `"Dan Miller"`.

---

### Scenario TC-R02: Google Onboarding, Collision Resolution, Session Persistence & Deletion (Tier 4)
- **Target Requirement**: Full lifecycle spanning R2 profile enforcement, collision handling, R3 dashboard, session persistence, and deletion.
- **Objective**: Verify seamless real-world flow for a Google user encountering a username collision, recovering, persisting session across simulated reload, and permanently releasing their username upon account deletion.
- **Execution Steps**:
  1. Mock existing taken username: `usernames/aspirant_pro` belongs to another user.
  2. Click `"Sign in with Google"`.
  3. Mock resolves Google user `uid: "g_flow_2"`, `email: "flow2@example.com"`.
  4. System redirects to `/complete-profile`.
  5. User inputs: Name: `"Frank Flow"`, Age: `"23"`, Username: `"aspirant_pro"`, Password: `"FlowPass123!"`.
  6. Click Submit -> Collides with taken username.
  7. Verify exact alert: `"Username is already taken. Please choose another."`
  8. User changes Username to `"frank_flow_2026"` and clicks Submit.
  9. Submission succeeds -> Navigates to `/dashboard`.
  10. Dashboard renders `"Frank Flow"` with "Sign Out" and "Delete Account" buttons.
  11. Simulate page reload (`onAuthStateChanged` re-evaluates session from storage).
  12. Verify user remains on `/dashboard` (no premature redirect to `/login`).
  13. Click `"Delete Account"` -> Confirm modal.
  14. Verify:
      - `users/g_flow_2` deleted.
      - `usernames/frank_flow_2026` deleted.
      - Auth user deleted.
      - Navigates to `/` (Landing Page).
  15. Verify that another user can now register username `"frank_flow_2026"` without collision.

---

### Scenario TC-R03: Abandoned Google Onboarding Recovery Flow (Tier 4)
- **Target Requirement**: `ORIGINAL_REQUEST.md` §R2 & §Acceptance Criteria (Cross-feature recovery).
- **Objective**: Verify the full lifecycle of an abandoned Google profile: blocked on email login, resumed via Google sign-in, completed with password setting, and verified for dual email/password login.
- **Execution Steps**:
  1. User starts Google Sign-In with `grace@example.com`.
  2. System redirects to `/complete-profile`.
  3. User abandons onboarding (simulated by navigating to `/login` without submitting).
  4. User attempts to log in with Email `"grace@example.com"` and Password `"Pass123!"`.
  5. Verify login blocked with exact string:
     `"Email already exists. Please complete your profile to sign in with email."`
  6. User clicks `"Sign in with Google"` with `grace@example.com`.
  7. System detects `isProfileComplete === false` and routes back to `/complete-profile`.
  8. User enters Name: `"Grace Hopper"`, Age: `"29"`, Username: `"grace_hopper"`, Password: `"GraceSecret999!"`.
  9. Clicks Submit -> Profile marked complete, navigates to `/dashboard`.
  10. User clicks `"Sign Out"` -> Redirected to `/` -> Navigate to `/login`.
  11. User enters Email: `"grace@example.com"` and Password: `"GraceSecret999!"`.
  12. Clicks `"Log In"` -> Email login succeeds -> Arrives at `/dashboard`.

---

## 6. Mock Harness Specification for R2

To execute these opaque-box tests deterministically in Vitest, the in-memory Firebase mock harness (`src/test/mocks/firebaseMock.ts`) must support the following capabilities:

### 6.1 Firestore In-Memory State Engine
1. **Collections Map**:
   - `users`: Map of `uid -> UserDocument`
   - `usernames`: Map of `username.toLowerCase() -> { uid: string, createdAt: string }`
2. **Operations Required**:
   - `doc(db, collectionName, id)`: Returns a reference to the document.
   - `getDoc(docRef)`: Returns snapshot with `.exists()` and `.data()`.
   - `setDoc(docRef, data, { merge?: boolean })`: Atomically sets or merges document data.
   - `deleteDoc(docRef)`: Deletes document from the map.
   - `collection(db, 'users')`: Returns collection reference.
   - `query(colRef, where('email', '==', email.toLowerCase()))`: Returns filtered query.
   - `getDocs(queryRef)`: Returns query snapshot with `.empty` and `.docs`.
   - `runTransaction`: Simulates atomic read-and-set for username reservation.
3. **Reset Utility**:
   - `resetFirestoreMockState()`: Clears all in-memory collections between test runs.

### 6.2 Firebase Auth In-Memory Engine
1. **Mock User Object**:
   ```typescript
   interface MockUser {
     uid: string;
     email: string;
     displayName: string | null;
     emailVerified: boolean;
     providerData: Array<{ providerId: string; uid: string; email: string }>;
   }
   ```
2. **Operations Required**:
   - `signInWithPopup(auth, googleProvider)`: Simulates Google authentication; can be configured to succeed or throw `auth/popup-closed-by-user` or `auth/account-exists-with-different-credential`.
   - `linkWithCredential(user, credential)`: Links an email/password credential to an existing Google user, adding `'password'` to `providerData`.
   - `updatePassword(user, newPassword)`: Updates the stored password for the user.
   - `signInWithEmailAndPassword(auth, email, password)`: Validates credentials and returns active user.
   - `signOut(auth)`: Clears `auth.currentUser`.
   - `deleteUser(user)`: Removes user from in-memory auth store.
   - `onAuthStateChanged(auth, callback)`: Triggers observer whenever auth state updates.
3. **Reset Utility**:
   - `resetAuthMockState()`: Clears registered users, active session, and error overrides.

---

## 7. Exact Required String Invariants

| Invariant Key | Exact String | Context |
|---|---|---|
| **Incomplete Profile Block** | `"Email already exists. Please complete your profile to sign in with email."` | Displayed on `/login` when an email belonging to an incomplete Google profile attempts email/password login. |
| **Username Collision Error** | `"Username is already taken. Please choose another."` | Displayed on `/complete-profile` when a user attempts to submit a username already recorded in `usernames`. |
| **Password Confirmation Mismatch** | `"Passwords do not match."` | Displayed if confirm password field is used and values differ. |
| **Email Verification Required** | `"Please verify your email address before logging in. A verification link has been sent to your email."` | Displayed on unverified email login attempt. |

---

## 8. Verification & Test Suite Mapping

The R2 requirements specified herein map to the Vitest test suite as follows:

| Test File | Test Cases for R2 | Scope |
|---|---|---|
| `src/test/tier1-feature-coverage.test.tsx` | `TC-F04`, `TC-F05`, `TC-F06` | Happy paths: Google sign-in, profile completion, direct entry |
| `src/test/tier2-boundary-cases.test.tsx` | `TC-B04`, `TC-B05`, `TC-B06`, `TC-B07` | Boundaries: Age, Username format, Collision error string, Popup cancel |
| `src/test/tier3-cross-feature-linking.test.tsx` | `TC-C01`, `TC-C02`, `TC-C03`, `TC-C04` | Linking: Auto Google linking, Incomplete profile block string, Dual auth, Cascading deletion |
| `src/test/tier4-real-world-scenarios.test.tsx` | `TC-R02`, `TC-R03` | Lifecycles: Collision retry + session persistence + deletion; Abandoned profile recovery |

This specification is 100% complete and authoritative for Milestone 1 test authoring and Milestone 2 implementation.
