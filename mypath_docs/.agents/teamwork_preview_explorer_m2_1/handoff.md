# Handoff Report: R1 & Route Synchronization Fix Strategy

**Agent**: Explorer 1 (`teamwork_preview_explorer`)  
**Milestone**: Milestone 2 (Implementation Track)  
**Target Area**: R1 Authentication Methods & Verification, Route Synchronization, and Route Guards  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_1`  
**Target File**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_1\handoff.md`  

---

## 1. Observation

1. **Missing Component**:
   - `c:\Users\sindh\Documents\codes\mypath\frontend\codes\src\pages\` contains only `DashboardPage.tsx`, `LandingPage.tsx`, and `LoginPage.tsx`. `SignupPage.tsx` does not exist.
   - Tests `src/test/tier1-feature-coverage.test.tsx` (TC-F01) and `src/test/tier2-boundary-cases.test.tsx` (TC-B01, TC-B02, TC-B03) invoke `await goTo('/signup')`, which looks for `<h2 ...>Create Account</h2>` (or `/sign up|create account/i`), inputs matching `/email/i` and `/password/i`, and submit buttons matching `/sign up|create account|register/i`.

2. **Verbatim Error String Mismatch in AppContext**:
   - In `frontend/codes/src/context/AppContext.tsx:194`:
     ```typescript
     throw new Error('Email not verified. A verification link has been sent to your Gmail inbox. Please click the link to verify before logging in.');
     ```
   - In `src/test/tier1-feature-coverage.test.tsx:96-100` (TC-F02) and `src/test/tier2-boundary-cases.test.tsx:340-344` (TC-B09):
     ```typescript
     expect(
       screen.getByText(
         'Please verify your email address before logging in. A verification link has been sent to your email.'
       )
     ).toBeInTheDocument();
     ```

3. **Static Route State without Browser Synchronization**:
   - In `frontend/codes/src/context/AppContext.tsx:70`:
     ```typescript
     const [currentPath, setCurrentPath] = useState<string>('/');
     ```
   - No `popstate` event listener is installed, and `currentPath` is not initialized from `window.location.pathname`.
   - In all test files, navigation is performed via `goTo(path)` which calls:
     ```typescript
     window.history.pushState({}, '', path);
     window.dispatchEvent(new PopStateEvent('popstate'));
     ```
   - Consequently, `AppContext` remains locked on `'/'`, never switching to `/signup`, `/dashboard`, `/login`, or `/complete-profile`.

4. **Missing Route Guards in MainRouter**:
   - In `frontend/codes/src/App.tsx:14-22`:
     ```typescript
     switch (currentPath) {
       case '/login':
         return <LoginPage />;
       case '/dashboard':
         return <DashboardPage />;
       case '/':
       default:
         return <LandingPage />;
     }
     ```
   - `/signup` and `/complete-profile` are not handled and fall through to `LandingPage`.
   - `/dashboard` contains no authentication or email verification checks; visiting `/dashboard` while unauthenticated or unverified does not redirect to `/login`.

5. **Test Runner Baseline Execution**:
   - Executing `npm test` via `run_command` in `frontend/codes` produced:
     ```
     Test Files  4 failed (4)
          Tests  25 failed | 1 passed (26)
       Duration  15.38s
     ```

---

## 2. Logic Chain

1. **Step 1 (Signup Route & UI)**:
   - Observations 1 and 4 show that `/signup` fails to render a registration form because `SignupPage.tsx` does not exist and `App.tsx` lacks a `/signup` route branch.
   - Creating `SignupPage.tsx` with email input, two password inputs (`placeholder="Enter your password"` and `placeholder="Confirm your password"`), submit button (`"Create Account"`), and heading (`"Create Account"`), and routing `/signup` to `<SignupPage />` in `App.tsx`, directly enables TC-F01, TC-B01, TC-B02, and TC-B03 to find their target elements.

2. **Step 2 (Client-side Validation for Password Mismatch & Constraints)**:
   - TC-B01 specifically asserts `expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()` and `expect(createUserWithEmailAndPassword).not.toHaveBeenCalled()`.
   - Adding a client-side check `if (password !== confirmPassword)` in `SignupPage.tsx` that sets `errorMsg = 'Passwords do not match.'` halts submission before invoking Firebase auth and displays the exact banner.
   - Adding `if (password.length < 6)` that sets `errorMsg = 'Password must be at least 6 characters.'` satisfies TC-B02 (`/at least 6 characters|weak password/i`).

3. **Step 3 (Email Verification Flow & Immediate Signout)**:
   - TC-F01 requires `createUserWithEmailAndPassword`, `sendEmailVerification`, and `signOut` to all be called, and `currentUser` to be null.
   - In `signupWithEmail`, after awaiting `createUserWithEmailAndPassword` and `sendEmailVerification(res.user)`, calling `await signOut(auth)` and `setCurrentUser(null)` guarantees that no active session persists prior to email verification.

4. **Step 4 (Unverified Login Interception & Error Alignment)**:
   - Observation 2 demonstrates that `loginWithEmail` currently throws an error mentioning `Gmail inbox`, causing TC-F02 to fail.
   - Updating `AppContext.tsx` so that when `!res.user.emailVerified`, it calls `await sendEmailVerification(res.user)`, calls `await signOut(auth)`, and throws `new Error('Please verify your email address before logging in. A verification link has been sent to your email.')` satisfies TC-F02.
   - Wiring `authError` into `LoginPage.tsx` allows the unverified notice to be displayed whenever route guards redirect an unverified user from `/dashboard` (TC-B09).

5. **Step 5 (Route Synchronization & Protection)**:
   - Observations 3 and 4 explain why test navigations (`goTo('/dashboard')`, `goTo('/signup')`) fail to change the rendered page.
   - Initializing `currentPath` with `window.location.pathname || '/'` and listening for the `popstate` event to update `currentPath` ensures the router responds to `pushState` + `dispatchEvent(new PopStateEvent('popstate'))`.
   - Implementing route guards in `App.tsx` for `/dashboard` that check `currentUser` (redirect to `/login` if null, satisfying TC-B08) and `currentUser.emailVerified` (set verification error and redirect to `/login` if false, satisfying TC-B09) enforces session integrity.

---

## 3. Caveats

1. **R2 and R3 Feature Scope**:
   - `ProfileCompletionPage.tsx` and username availability check logic are scoped under Requirement R2 (Explorer 2).
   - Permanent account deletion and dummy testing dashboard contents are scoped under Requirement R3 (Explorer 3).
   - This handoff coordinates the foundational routing and auth methods that integrate with R2 and R3 components.
2. **Synchronous Test Assertions**:
   - Certain tests (e.g. TC-F05) make assertions on form elements synchronously immediately after `goTo('/complete-profile')` without wrapping them in `waitFor`. Therefore, the router in `App.tsx` must render target pages synchronously and avoid rendering full-page loading screens during initial mount.

---

## 4. Conclusion

All 5 gaps preventing R1 compliance and route synchronization have been identified, root-caused, and resolved via concrete design specifications detailed in `analysis.md`:
1. `SignupPage.tsx` must be added with email, password, confirmPassword inputs, client-side validation for `"Passwords do not match."`, weak passwords (< 6 chars), and invalid email format.
2. `AppContext.tsx` must update `signupWithEmail` to populate top-level Firestore fields, dispatch `sendEmailVerification`, and immediately `signOut`.
3. `loginWithEmail` must intercept unverified users, re-dispatch verification, sign out, and throw `"Please verify your email address before logging in. A verification link has been sent to your email."`.
4. `AppContext.tsx` must initialize `currentPath` from `window.location.pathname` and register a `popstate` event listener.
5. `App.tsx` must guard `/dashboard` against unauthenticated and unverified visitors, redirecting them to `/login` and displaying the unverified notice when applicable.

---

## 5. Verification Method

### How to Independently Verify:

1. **Execute Vitest Test Suite for R1 and Boundary Tests**:
   ```bash
   cd c:\Users\sindh\Documents\codes\mypath\frontend\codes
   npx vitest run src/test/tier1-feature-coverage.test.tsx
   npx vitest run src/test/tier2-boundary-cases.test.tsx
   ```

2. **Inspect Specific Test Cases**:
   - `TC-F01`: Verifies Email/Password Signup dispatches link and signs out immediately.
   - `TC-F02`: Verifies Unverified Email Login Interception re-dispatches link and renders exact message.
   - `TC-B01`: Verifies Password Confirmation Mismatch renders `"Passwords do not match."` and aborts signup.
   - `TC-B02`: Verifies Password length < 6 renders weak password warning.
   - `TC-B03`: Verifies malformed email does not create auth user.
   - `TC-B07`: Verifies Google popup closed error handling.
   - `TC-B08`: Verifies unauthenticated `/dashboard` visitor redirects to `/login`.
   - `TC-B09`: Verifies unverified `/dashboard` visitor redirects to `/login` with exact verification prompt.

3. **Invalidation Conditions**:
   - If `SignupPage.tsx` has fewer than two password inputs matching `/password/i`, TC-B01 will fail.
   - If the unverified error string deviates by even a single character or punctuation mark from `"Please verify your email address before logging in. A verification link has been sent to your email."`, TC-F02 and TC-B09 will fail.
   - If `currentPath` does not respond to `popstate` events, all `goTo(path)` test navigations will fail.
