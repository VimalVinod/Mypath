# Handoff Report: Specification Mining for R2 (Account Linking & Profile Enforcement)

**Agent**: Spec Miner 2 (`teamwork_preview_spec_miner`)  
**Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2`  
**Target Milestone**: Milestone 1 (E2E Testing Track)  
**Deliverable**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2\analysis.md`  

---

## 1. Observation

Direct observations extracted from authoritative documents and source files:

1. **`ORIGINAL_REQUEST.md` lines 21-23**:
   > *"### R2. Account Linking & Profile Enforcement*  
   > *Automatically link Google accounts to existing email accounts if the emails match. If a user signs up via Google, enforce a 'Profile Completion' step where they must provide: Name, Age, a unique Username (must be checked against Firestore for uniqueness), and set a Password. If they attempt to log in via email/password before completing this profile, block them with the message: 'Email already exists. Please complete your profile to sign in with email.'"*

2. **`ORIGINAL_REQUEST.md` lines 36-38**:
   > *"### Edge Cases & Linking*  
   > *- [ ] Signing in with Google using an email that was already registered via Email/Password successfully links the accounts.*  
   > *- [ ] Google users are forced to set a unique username, age, and password during profile completion.*  
   > *- [ ] Incomplete Google profiles trying to use Email/Password login are blocked with the correct error message."*

3. **`PROJECT.md` lines 21-24**:
   > *"| 8 | Google Profile Completion Step | Enforce Name, Age, unique Username, and set Password | M2 | ORIGINAL_REQUEST R2 |*  
   > *| 9 | Unique Username Verification | Check and atomically reserve username in Firestore `usernames` | M2 | ORIGINAL_REQUEST R2 |*  
   > *| 10 | Incomplete Profile Email Login Block | Block email login with exact error: 'Email already exists. Please complete your profile to sign in with email.' | M2 | ORIGINAL_REQUEST R2 |*  
   > *| 11 | Google & Email Account Linking | Automatically link Google account to existing email/password account | M2 | ORIGINAL_REQUEST R2 |"*

4. **`PROJECT.md` lines 74-83**:
   > *"### Exact Error Messages Required*  
   > *- Incomplete Google Profile Block on Email Login:*  
   > *  `'Email already exists. Please complete your profile to sign in with email.'`*  
   > *- Passwords mismatch on signup:*  
   > *  `'Passwords do not match.'`*  
   > *- Unverified email login:*  
   > *  `'Please verify your email address before logging in. A verification link has been sent to your email.'`*  
   > *- Username taken:*  
   > *  `'Username is already taken. Please choose another.'`"*

5. **`PROJECT.md` lines 58-73**:
   > *"### Firestore Schema*  
   > *1. `users/{userId}`: `uid`, `email` (lowercase), `name`, `username` (lowercase), `age`, `isProfileComplete`, `isEmailVerified`, `authProviders`, `createdAt`, `updatedAt`*  
   > *2. `usernames/{username}`: `uid`, `createdAt`"*

6. **`TEST_INFRA.md` lines 14-16 & lines 31-43**:
   > Defines the test mapping for R2:  
   > - Feature 3 (Google Sign-In & Linking): `TC-F04`, `TC-F06`, `TC-B07`, `TC-C01`, `TC-R02`, `TC-R03`  
   > - Feature 4 (Profile Completion Enforcement): `TC-F05`, `TC-B04`, `TC-B05`, `TC-B06`, `TC-C02`, `TC-C03`, `TC-R02`, `TC-R03`  
   > - Feature 5 (Block Incomplete Google Profile on Email Login): `TC-F05`, `TC-C02`, `TC-R03`

7. **`frontend/codes/src/context/AppContext.tsx` lines 162-181**:
   > `loginWithGoogle` currently executes `signInWithPopup(auth, googleProvider)` and directly redirects to `/dashboard` upon receiving a user credential, bypassing any profile completion check or password setting.

8. **`frontend/codes/src/pages/LoginPage.tsx` lines 21-31**:
   > `handleEmailLogin` executes `loginWithEmail(email, password)` without checking for an incomplete Google profile, displaying generic `err.message` or Firebase error translations.

---

## 2. Logic Chain

1. **Mandatory Profile Completion Interception (Obs 1, 2, 7)**:
   Because `ORIGINAL_REQUEST.md` mandates that Google signups must be forced through a Profile Completion step before accessing the app, and the current codebase unconditionally navigates to `/dashboard` (Obs 7), test scenario **`TC-F04`** must assert that a new Google user (`isProfileComplete: false`) is intercepted and redirected to `/complete-profile`, with route guards preventing dashboard access.

2. **Profile Submission & Account Password Linkage (Obs 1, 3, 5)**:
   Submitting the profile completion form requires Name, Age, unique Username, and Password. Upon submission, the system must atomically reserve `usernames/{username.toLowerCase()}` in Firestore, update `users/{uid}` with `isProfileComplete: true`, link an email/password credential to Firebase Auth (`linkWithCredential`), and navigate to `/dashboard`. This is tested via **`TC-F05`**. Returning users with `isProfileComplete: true` must bypass `/complete-profile` directly to `/dashboard` as tested in **`TC-F06`**.

3. **Username Format & Collision Invariants (Obs 1, 4, 5)**:
   Usernames must be case-insensitively indexed in Firestore `usernames/{username}`. Boundary tests (**`TC-B04`**, **`TC-B05`**) verify rejection of invalid ages (<= 0, > 120, non-numeric) and invalid usernames (empty, < 3 characters, special characters/spaces). When a user enters a taken username, the system must display the exact string: `"Username is already taken. Please choose another."` as verified in **`TC-B06`** and real-world scenario **`TC-R02`**.

4. **Incomplete Profile Blocking on Email Login (Obs 1, 4, 8)**:
   When an abandoned Google account (`isProfileComplete === false`) attempts an email login, `loginWithEmail` must query Firestore by email and block authentication before session establishment, displaying the verbatim error string: `"Email already exists. Please complete your profile to sign in with email."`. This is verified in cross-feature test **`TC-C02`** and recovery workload scenario **`TC-R03`**.

5. **Automatic Account Linking & Dual Authentication (Obs 1, 2, 3, 5)**:
   When an email/password user later logs in with Google using the identical email address, Firebase Auth must link the Google credential, updating `users/{uid}.authProviders` to `['password', 'google.com']` without generating duplicate records (**`TC-C01`**). Once linked or completed, the user can log in via both Google and email/password (**`TC-C03`**).

---

## 3. Caveats

1. **Firestore Security Rules**: Checking for an incomplete profile when an unauthenticated user submits the email login form requires Firestore rules that permit reading `users` by email or public read of user profiles. In M1 test execution, the in-memory mock harness handles this directly.
2. **Password Strength on Profile Completion**: In addition to length validation (>= 6 characters), standard security checks should be supported by the mock harness (e.g. `auth/weak-password`).
3. No other caveats.

---

## 4. Conclusion

Requirement R2 (Account Linking & Profile Enforcement) is fully probed, structured, and specified:
- **12 Discovered Features** and **20 Edge Cases** documented.
- **11 Concrete Opaque-Box Test Scenarios** defined with explicit preconditions, initial mock state, execution steps, expected assertions, and post-execution state:
  - **Tier 1**: `TC-F04`, `TC-F05`, `TC-F06`
  - **Tier 2**: `TC-B04`, `TC-B05`, `TC-B06`, `TC-B07`
  - **Tier 3**: `TC-C01`, `TC-C02`, `TC-C03`, `TC-C04`
  - **Tier 4**: `TC-R02`, `TC-R03`
- The exact required error strings are locked:
  - `"Username is already taken. Please choose another."`
  - `"Email already exists. Please complete your profile to sign in with email."`
- Complete findings and specifications are available in `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2\analysis.md`.

---

## 5. Verification Method

1. **File Inspection**:
   - Open and review `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2\analysis.md`.
   - Verify that all 12 discovered features and 20 edge cases are listed in the required table format.
   - Verify that all 11 test scenarios specify preconditions, initial mock state, execution steps, expected assertions, and post-execution state.
2. **String Matching**:
   - Verify that the error strings in `analysis.md` match `ORIGINAL_REQUEST.md` and `PROJECT.md` character-for-character.
3. **Invalidation Conditions**:
   - Any omission of the required error message strings.
   - Failure to specify both Firestore and Firebase Auth mock state for any scenario.
   - Lack of boundary cases for username or age.
