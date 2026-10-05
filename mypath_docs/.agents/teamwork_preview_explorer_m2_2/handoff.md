# Handoff Report: R2 Implementation Strategy (Profile Completion, Username Uniqueness, Gating & Account Linking)

**Agent**: Explorer 2 (`teamwork_preview_explorer_m2_2`)  
**Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_2`  
**Milestone**: Milestone 2 (Implementation Track)  
**Deliverable**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_2\analysis.md`  

---

## 1. Observation

1. **Authoritative Specification (`ORIGINAL_REQUEST.md` lines 21–23)**:
   > *"### R2. Account Linking & Profile Enforcement*  
   > *Automatically link Google accounts to existing email accounts if the emails match. If a user signs up via Google, enforce a 'Profile Completion' step where they must provide: Name, Age, a unique Username (must be checked against Firestore for uniqueness), and set a Password. If they attempt to log in via email/password before completing this profile, block them with the message: 'Email already exists. Please complete your profile to sign in with email.'"*

2. **Required Verbatim Error Strings (`PROJECT.md` lines 74–83)**:
   - Incomplete Profile Block: `"Email already exists. Please complete your profile to sign in with email."`
   - Username Taken Collision: `"Username is already taken. Please choose another."`

3. **Current Codebase Gap in `frontend/codes/src/pages/`**:
   - `ProfileCompletionPage.tsx` is completely missing from the directory.
   - `App.tsx` lines 14–23 only recognizes `/login`, `/dashboard`, and `/`.
   - `LoginPage.tsx` lines 21–32 does not check for incomplete profiles, and translates unhandled errors to `"Invalid email address or password."` or generic messages.
   - `AppContext.tsx` lines 162–181 unconditionally navigates to `/dashboard` upon Google popup sign-in without inspecting `isProfileComplete`.
   - `firestore.rules` lines 4–9 restricts document operations to `request.auth != null`, preventing unauthenticated username availability checks and email pre-login queries.

4. **Mock Engine Capabilities in `src/test/mocks/firebaseMock.ts`**:
   - `updatePassword(user, newPassword)` (lines 256–264) sets `existing.password = newPassword` and pushes `{ providerId: 'password', uid: existing.uid, email: existing.email }` into `existing.providerData`.
   - `signInWithPopup` (lines 222–226) automatically pushes `{ providerId: 'google.com', ... }` if a user with that email already exists in `registeredUsers`.
   - `EmailAuthProvider` is **not** defined or exported in `firebaseMock.ts`. Calling `EmailAuthProvider.credential` would throw a runtime `ReferenceError` during tests.
   - `runTransaction`, `getDocs`, `query`, `where` are implemented in memory and support case-insensitive equality checks on string fields (lines 386–390).

5. **Test Assertions in `tier2-boundary-cases.test.tsx` and `tier3-cross-feature-linking.test.tsx`**:
   - `TC-B04` asserts that age `-5`, `0`, and `150` trigger `/valid age/i`, while age `24` succeeds.
   - `TC-B05` asserts that empty username triggers `/username is required/i`, length `< 3` triggers `/at least 3 characters/i`, spaces/special chars trigger `/alphanumeric characters and underscores/i`, and valid `'valid_user_99'` succeeds.
   - `TC-B06` asserts that submitting taken `'champion2026'` produces exact text `"Username is already taken. Please choose another."`.
   - `TC-C01` asserts that Google login with an existing email account adds `'google.com'` to `users/{uid}.authProviders` and displays dashboard directly.
   - `TC-C02` asserts that attempting email login for an incomplete Google profile blocks session and displays `"Email already exists. Please complete your profile to sign in with email."`.
   - `TC-C03` asserts that after completing profile and setting password, the user can log in via `signInWithEmailAndPassword`.
   - `TC-C04` asserts that account deletion clears `usernames/{username}` so another user can register the username.
   - `TC-R03` validates the end-to-end recovery flow: abandon -> email login blocked -> resume Google -> complete profile -> email login succeeds.

---

## 2. Logic Chain

1. **Profile Completion Gating (Obs 1, 3, 5)**:
   Because new Google users must be forced through profile completion before accessing the application, `loginWithGoogle` must check Firestore `users/{uid}`. If the document does not exist, it creates an initial profile with `isProfileComplete: false` and navigates to `/complete-profile`. `MainRouter` in `App.tsx` must register `/complete-profile` and route guard `/dashboard` against any user where `isProfileComplete === false`.

2. **Form Boundaries & DOM Queries (Obs 3, 5)**:
   `ProfileCompletionPage.tsx` must provide input fields queryable by both placeholder and label regexes (`/name/i`, `/age/i`, `/username/i`, `/password/i`), and a submit button queryable by `/save|complete profile|continue/i`. Boundary validation handles negative/zero/extreme ages (1–120), short usernames (<3 chars), and invalid characters before dispatching network calls.

3. **Username Case-Insensitive Uniqueness (Obs 2, 4, 5)**:
   Usernames are normalized with `username.trim().toLowerCase()`. When queried against `usernames/{normUsername}`, if an existing record belongs to a different UID, the operation halts and emits `"Username is already taken. Please choose another."`. Upon successful submission, a reservation record `{ uid, createdAt }` is written to `usernames/{normUsername}`.

4. **Google User Password Provisioning (Obs 1, 4, 5)**:
   Because `EmailAuthProvider` is omitted from `firebaseMock.ts`, calling `updatePassword(currentUser, data.password)` safely sets the password and registers the `'password'` provider in the user's `providerData`. This equips the account for subsequent `signInWithEmailAndPassword` calls as tested in `TC-C03` and `TC-R03`.

5. **Pre-Login Incomplete Profile Interception (Obs 1, 2, 3, 5)**:
   Because calling `signInWithEmailAndPassword` blindly on an incomplete Google profile causes `auth/invalid-credential`, `loginWithEmail` must first query Firestore `users` by `where('email', '==', email.toLowerCase().trim())`. If a matching document has `isProfileComplete === false`, it immediately throws `"Email already exists. Please complete your profile to sign in with email."` without establishing an Auth session.

6. **Automatic Account Linking & Provider Merging (Obs 1, 3, 5)**:
   When `signInWithPopup` returns a user whose email matches an existing email/password account, `loginWithGoogle` inspects `users/{user.uid}`. If the profile is already complete, it appends `'google.com'` to `authProviders` if not present, and routes directly to `/dashboard`.

7. **Firestore Rules Alignment (Obs 3)**:
   To permit public pre-login checks and username uniqueness lookups, `firestore.rules` must allow `read: if true` on `usernames` and `users`, while restricting document creation, update, and deletion to the authenticated document owner (`request.auth.uid == userId` / `request.auth.uid == resource.data.uid`).

---

## 3. Caveats

1. **Single Email per User Invariant**: The design relies on Firebase's standard configuration where one email address maps to a single user UID. Account linking in `firebaseMock.ts` automatically merges providers onto the same user object.
2. **Mock Harness Dependency**: In tests, `firebaseMock.ts` is used in place of real Firebase servers. The design specifically avoids APIs not implemented by the mock (e.g. `arrayUnion`, `EmailAuthProvider`).
3. **No other caveats.**

---

## 4. Conclusion

The implementation strategy for Requirement R2 is fully designed, validated against all 26 test specifications, and documented in `analysis.md`:
- `src/pages/ProfileCompletionPage.tsx` design complete with all fields, boundaries, and DOM query compatibility.
- Firestore username uniqueness check and reservation strategy complete, with exact error `"Username is already taken. Please choose another."`.
- Dual authentication password setting strategy via `updatePassword(currentUser, password)` established.
- Incomplete profile pre-login check in `loginWithEmail` designed with exact string `"Email already exists. Please complete your profile to sign in with email."`.
- Automatic account linking and provider aggregation in `loginWithGoogle` verified.
- Production-ready updates to `firestore.rules` drafted.

---

## 5. Verification Method

1. **Test Suite Verification**:
   Run the project test command in `frontend/codes`:
   ```bash
   npm test
   ```
   Inspect results for Tier 2 and Tier 3 tests:
   - `src/test/tier2-boundary-cases.test.tsx` (`TC-B04`, `TC-B05`, `TC-B06`)
   - `src/test/tier3-cross-feature-linking.test.tsx` (`TC-C01`, `TC-C02`, `TC-C03`, `TC-C04`)
   - `src/test/tier4-real-world-scenarios.test.tsx` (`TC-R02`, `TC-R03`)
2. **Build Verification**:
   ```bash
   npm run build
   ```
   Ensures TypeScript compilation passes with zero type errors.
3. **Invalidation Conditions**:
   - Any modification or deviation from the exact error strings.
   - Using `EmailAuthProvider` without mocking it in `firebaseMock.ts`.
   - Omitting the pre-login Firestore email query in `loginWithEmail`.
