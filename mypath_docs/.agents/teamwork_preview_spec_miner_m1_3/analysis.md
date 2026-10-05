# Specification Mining Analysis: R3 (Dummy Dashboard, Account Deletion & Session Persistence)

**Agent**: Spec Miner 3 (`teamwork_preview_spec_miner`)  
**Scope**: Milestone 1 — Requirement 3 (R3) Test Specification  
**Authoritative Sources**:
- `c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md` (Requirements §R3, Acceptance Criteria)
- `c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md` (Features 7, 13, 14, 15; AppContext Interface Contract, Firestore Schema)
- `c:\Users\sindh\Documents\codes\mypath\.agents\TEST_INFRA.md` (Features 6, 7, 8, 9; Tiers 1-4 Test Mapping)
- Existing Codebase: `frontend/codes/src/pages/DashboardPage.tsx`, `frontend/codes/src/context/AppContext.tsx`, `frontend/codes/src/App.tsx`, `frontend/codes/src/firebase.ts`

---

## 1. Executive Summary

Requirement R3 mandates replacing the main dashboard with a temporary testing interface that displays the authenticated user's name, provides session teardown via a "Sign Out" button, and provides permanent user eradicating via a "Delete Account" button. It also mandates strict route protection so that unauthorized or unverified users can never view dashboard content, and guarantees session persistence across page reloads.

This document establishes the opaque-box test specifications, boundary conditions, edge cases, and concrete execution steps required to rigorously verify R3 across Tiers 1–4 of the test harness.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Dummy Dashboard | Authenticated User Greeting | Displays the authenticated user's name prominently formatted as `"Logged in as: {name}"`. | Authenticated user session with profile data (`userProfile.name` or `currentUser.displayName`). | Rendered DOM containing string matching `Logged in as: {name}`. | Fallback to "Candidate" or "User" if name is null/empty; never crash or render blank. | ORIGINAL_REQUEST §R3, PROJECT.md §Feature 13 |
| 2 | Dummy Dashboard | Action Controls Rendering | Renders distinct "Sign Out" and "Delete Account" action buttons for session management and testing. | User navigation to `/dashboard` with valid session. | Rendered buttons: `Sign Out` and `Delete Account` accessible via text/role. | If unauthenticated, elements are never mounted or exposed to DOM. | ORIGINAL_REQUEST §R3, PROJECT.md §Feature 13 |
| 3 | Session Management | Sign Out Session Teardown | Terminates active Firebase Auth session, clears local memory and browser storage, and redirects to landing or login. | User click on `Sign Out` button. | Invokes `signOut(auth)`, resets `currentUser` to `null`, clears `userProfile`, navigates to `/` or `/login`. | Network error logged/alerted; UI safely defaults to unauthenticated state. | ORIGINAL_REQUEST §R3, PROJECT.md §Feature 14 |
| 4 | Account Management | Cascading Account Deletion | Permanently removes user record from Firebase Auth (`deleteUser`) and Firestore (`users/{uid}` and `usernames/{username}`), redirecting to landing page. | User click on `Delete Account` button (and confirmation if modal present). | Deletes Firestore `usernames/{username}`, deletes `users/{uid}`, deletes Auth user via `deleteUser()`, resets local state, navigates to `/`. | If `auth/requires-recent-login` encountered, displays re-auth prompt; does not leave orphan DB records. | ORIGINAL_REQUEST §R3, PROJECT.md §Feature 15 |
| 5 | Account Management | Username Reclaimability | Deletion of account frees up the associated unique username in Firestore `usernames/{username}` so another account can claim it. | Post-deletion signup/profile completion requesting previously claimed username. | `usernames/{username}` is available; registration succeeds. | Rejection if username was not properly purged during deletion. | ORIGINAL_REQUEST §R2 & §R3, PROJECT.md §Firestore Schema |
| 6 | Route Protection | Unauthenticated Redirect | Direct access to `/dashboard` by unauthenticated visitor (`currentUser === null`) immediately redirects to `/login`. | Navigation to `/dashboard` without session. | Immediate redirection to `/login`; dashboard content is NOT rendered. | No flash of dashboard content (FOUC / content leak). | ORIGINAL_REQUEST §R3, PROJECT.md §Feature 7 |
| 7 | Route Protection | Auth Initialization Guard | While Firebase Auth evaluates initial token (`authLoading === true`), dashboard content is withheld until resolved. | Initial app mount or page reload. | Displays neutral loading indicator or blank screen until `authLoading` becomes `false`. | Never prematurely render dashboard before session verification completes. | ORIGINAL_REQUEST §R3, PROJECT.md §Feature 7 |
| 8 | Route Protection | Unverified Email Access Gating | User registered via email/password whose email is not verified (`emailVerified === false`) is denied access to `/dashboard`. | Direct access to `/dashboard` with unverified email credentials. | Redirected to `/login` with verification required alert. | Access strictly denied; cannot bypass via direct URL manipulation. | ORIGINAL_REQUEST §R1 & §R3, PROJECT.md §Feature 7 |
| 9 | Route Protection | Incomplete Profile Gating | Google-authenticated user who has not completed profile (`isProfileComplete === false`) is redirected away from `/dashboard`. | Direct access to `/dashboard` with incomplete profile. | Redirected to `/complete-profile`. | Access denied until required profile fields (name, age, username, password) are set. | ORIGINAL_REQUEST §R2 & §R3, PROJECT.md §Feature 7 |
| 10 | Session Persistence | Page Reload State Retention | Authenticated user remains on `/dashboard` with session intact upon browser reload. | Browser reload / re-mounting `<App />` while valid Firebase session / token exists. | `onAuthStateChanged` restores `currentUser` and `userProfile`; route remains `/dashboard`; user greeting rendered. | If token is expired or revoked, clean redirect to `/login`. | ORIGINAL_REQUEST §Acceptance Criteria, PROJECT.md §Feature 7 |
| 11 | Session Persistence | Post-Signout Reload Persistence | Once signed out, page reload maintains unauthenticated state; user cannot regain dashboard access by refreshing. | User signs out, then page reloads at `/dashboard` or `/`. | Auth state remains `null`; navigation to `/dashboard` redirects to `/login`. | Stale session tokens in storage must not restore unauthorized access. | ORIGINAL_REQUEST §Acceptance Criteria, PROJECT.md §Feature 14 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Dummy Dashboard | User name is empty string `""` or whitespace `"   "` | Dashboard renders fallback greeting: `"Logged in as: Candidate"` or `"Logged in as: User"`, preserving UI layout without breaking string template. |
| 2 | Dummy Dashboard | User name contains special characters (e.g., `O'Connor-Smith & Co. <script>`) | Display properly escapes string and renders exact sanitized name: `"Logged in as: O'Connor-Smith & Co. <script>"` without XSS or template interpolation distortion. |
| 3 | Dummy Dashboard | User has extremely long name (100+ characters) | UI handles text wrap cleanly without clipping action buttons or breaking responsive container. |
| 4 | Sign Out | Rapid double-click on "Sign Out" button | First click triggers `signOut(auth)` and initiates redirect; button is disabled or subsequent clicks are idempotent no-ops; no unhandled promise rejections. |
| 5 | Sign Out | Sign out when offline / simulated network error | Client-side tokens and local state are cleared regardless of remote network timeout, ensuring user is logged out locally and redirected to `/login`. |
| 6 | Delete Account | Stale authentication session (`auth/requires-recent-login`) | Catch block catches error code, shows user-facing message asking user to re-log in to confirm identity, and avoids partial Firestore deletion. |
| 7 | Delete Account | User has no username record in `usernames/` (e.g. legacy or minimal email user) | Deletion logic checks if `userProfile.username` exists; deletes `usernames/{username}` only if present, then successfully deletes `users/{uid}` and Auth user without crashing on non-existent document. |
| 8 | Delete Account | Order of execution failure: Auth deleted before Firestore | If `deleteUser()` were executed before `deleteDoc()`, client loses auth credentials and Firestore security rules reject `deleteDoc(users/{uid})`. Order MUST be: delete Firestore docs first, then delete Auth user. |
| 9 | Delete Account | Rapid double-click on "Delete Account" button | Button disables upon first click with loading indicator (e.g. "Deleting..."); subsequent clicks ignored; prevents duplicate `deleteUser` execution on already-deleted UID. |
| 10 | Route Protection | Fast URL manipulation: direct pushState to `/dashboard` while unauthenticated | App route listener detects `currentUser === null` and immediately rewrites route back to `/login`; no transient dashboard DOM elements are mounted. |
| 11 | Route Protection | Reload while `authLoading === true` | App displays loading spinner; `/dashboard` route is preserved in state; once `onAuthStateChanged` emits user, dashboard renders smoothly without intermediate redirect to `/login`. |
| 12 | Route Protection | Authenticated user logs out and presses Browser Back button | History navigation back to `/dashboard` is caught by route guard; user is forced back to `/login`; no cached dashboard state is shown. |
| 13 | Session Persistence | Storage cleared externally while session is active | Firebase Auth in-memory listener (`onAuthStateChanged`) retains active session until explicitly signed out or window closed, depending on persistence type. |
| 14 | Cascading Deletion | Immediate re-registration with same email and username | After deleting account with email `test@user.com` and username `testuser`, fresh signup with `test@user.com` and claiming `testuser` succeeds with completely new UID and fresh Firestore documents. |

---

## 3. Concrete Opaque-Box Test Scenarios

### 3.1 TC-F07: Temporary Testing Dummy Dashboard Display (Tier 1)
- **Target Requirement**: ORIGINAL_REQUEST §R3, PROJECT.md §Feature 13
- **Objective**: Verify that an authenticated user navigating to `/dashboard` sees the temporary testing interface displaying their name, a Sign Out button, and a Delete Account button.
- **Preconditions**:
  - Firebase Mock has authenticated user initialized:
    - `uid: "user_f07_123"`
    - `email: "alex.kumar@example.com"`
    - `displayName: "Alex Kumar"`
    - `emailVerified: true`
  - Firestore document `users/user_f07_123` exists with `{ name: "Alex Kumar", username: "alexkumar", isProfileComplete: true }`.
- **Execution Steps**:
  1. Mount `<App />` with initial route `/dashboard` (or navigate to `/dashboard` as authenticated user).
  2. Wait for `authLoading` to resolve.
- **Assertions**:
  - `expect(screen.getByText(/Logged in as: Alex Kumar/i)).toBeInTheDocument()`.
  - `expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument()`.
  - `expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument()`.
  - Verify that the old complex dashboard widgets (e.g., "Matched Exams", "Upcoming Deadlines", "Applications In Progress") are NOT rendered.

---

### 3.2 TC-F08: Sign Out Clears Session and Redirects (Tier 1)
- **Target Requirement**: ORIGINAL_REQUEST §R3, PROJECT.md §Feature 14
- **Objective**: Verify that clicking "Sign Out" terminates the Firebase session, clears local storage, and redirects to the landing page or login page, preventing subsequent access to `/dashboard`.
- **Preconditions**:
  - User is logged in and currently on `/dashboard` viewing "Logged in as: Alex Kumar".
- **Execution Steps**:
  1. Locate the "Sign Out" button: `const signOutBtn = screen.getByRole('button', { name: /Sign Out/i })`.
  2. Simulate click: `await userEvent.click(signOutBtn)`.
  3. Wait for async session teardown and navigation.
- **Assertions**:
  - Firebase Auth `signOut` method has been invoked.
  - Active session in context is cleared (`currentUser === null`).
  - Current view is redirected to either Landing Page (`/`) or Login Page (`/login`).
  - Attempting to navigate back to `/dashboard`:
    - Dispatch `navigate('/dashboard')`.
    - Router immediately intercepts and redirects to `/login`.
    - Dashboard content ("Logged in as: Alex Kumar") is NOT displayed in DOM.

---

### 3.3 TC-F09: Delete Account Permanently Removes User (Tier 1)
- **Target Requirement**: ORIGINAL_REQUEST §R3, PROJECT.md §Feature 15
- **Objective**: Verify that clicking "Delete Account" permanently deletes the user from Firebase Auth and deletes documents from Firestore `users/{uid}` and `usernames/{username}`, then redirects to landing page.
- **Preconditions**:
  - Authenticated user `uid: "user_f09_del"`, `username: "del_target"`, `email: "delete.me@example.com"`.
  - Firestore doc `users/user_f09_del` exists.
  - Firestore doc `usernames/del_target` exists with `{ uid: "user_f09_del" }`.
- **Execution Steps**:
  1. On `/dashboard`, click "Delete Account": `await userEvent.click(screen.getByRole('button', { name: /Delete Account/i }))`.
  2. If confirmation dialog/button appears, click confirm: `await userEvent.click(screen.getByRole('button', { name: /Confirm|Yes|Delete/i }))`.
  3. Await completion of deletion promises.
- **Assertions**:
  - Firestore `getDoc(doc(db, 'users', 'user_f09_del'))` resolves with `exists() === false`.
  - Firestore `getDoc(doc(db, 'usernames', 'del_target'))` resolves with `exists() === false`.
  - Firebase Auth: user is deleted (`deleteUser` invoked; user cannot be fetched or signed in).
  - Current view redirects to Landing Page (`/`).
  - `currentUser` in context is `null`.
  - Direct navigation to `/dashboard` redirects to `/login`.

---

### 3.4 TC-B08: Unauthorized Dashboard Access Redirect (Tier 2)
- **Target Requirement**: ORIGINAL_REQUEST §R3, PROJECT.md §Feature 7
- **Objective**: Verify strict route protection: accessing `/dashboard` without authentication immediately redirects to `/login` without exposing dashboard content.
- **Preconditions**:
  - Unauthenticated visitor (`currentUser === null`).
  - Browser/router initialized with route `/dashboard`.
- **Execution Steps**:
  1. Mount `<App />` with `window.location.pathname = '/dashboard'`.
  2. Render component.
- **Assertions**:
  - Route is immediately updated to `/login`.
  - DOM contains login elements (e.g. `screen.getByRole('heading', { name: /Log In/i })`, email input, password input).
  - DOM does NOT contain `"Logged in as:"`, `"Sign Out"`, or `"Delete Account"`.
  - Zero dashboard content leaked during render lifecycle.

---

### 3.5 TC-B09: Unverified User Direct Dashboard Access Blocked (Tier 2)
- **Target Requirement**: ORIGINAL_REQUEST §R1 & §R3, PROJECT.md §Feature 7
- **Objective**: Verify that an authenticated user who has NOT verified their email cannot access `/dashboard`.
- **Preconditions**:
  - User signed up via email/password: `emailVerified: false`.
- **Execution Steps**:
  1. User session has `emailVerified === false`.
  2. User attempts to navigate to `/dashboard`.
- **Assertions**:
  - Router intercepts access.
  - User redirected to `/login` (or verification prompt page).
  - UI displays alert: `"Please verify your email address before logging in. A verification link has been sent to your email."` (or similar verification banner).
  - Dashboard content is NOT rendered.

---

### 3.6 TC-B10: Auth Loading State Prevents Dashboard Flash (Tier 2)
- **Target Requirement**: ORIGINAL_REQUEST §R3, PROJECT.md §Feature 7
- **Objective**: Verify that during initial auth resolution (`authLoading === true`), neither premature dashboard exposure nor false unauthenticated redirect occurs.
- **Preconditions**:
  - App mounted with an unresolved `onAuthStateChanged` promise (simulating network or token exchange latency).
  - Route is `/dashboard`.
- **Execution Steps**:
  1. Mount `<App />` while `authLoading` is held in `true`.
- **Assertions**:
  - Dashboard text `"Logged in as:"` is NOT present.
  - Login page heading `"Log In"` is NOT present.
  - Loading indicator (e.g. `role="status"` or spinner or neutral placeholder) is present.
  - When auth promise resolves to authenticated user, dashboard renders.
  - When auth promise resolves to null, redirects to `/login`.

---

### 3.7 TC-C04: Cascading Account Deletion Releases Username (Tier 3)
- **Target Requirement**: ORIGINAL_REQUEST §R2 & §R3, PROJECT.md §Feature 15
- **Objective**: Verify cross-feature interaction between Account Deletion and Username Reservation: deleting an account completely purges the username doc so a subsequent user can register that exact username.
- **Preconditions**:
  - User 1 ("User Alpha") has registered with username `"alpha_warrior"` and completed profile.
  - Firestore `usernames/alpha_warrior` exists.
- **Execution Steps**:
  1. User 1 logs in, arrives at `/dashboard`.
  2. User 1 clicks "Delete Account" and confirms.
  3. Verify User 1 is logged out and redirected to `/`.
  4. User 2 ("User Beta") initiates Google Sign-In or Email Signup.
  5. User 2 reaches Profile Completion page (`/complete-profile`).
  6. User 2 enters username `"alpha_warrior"` and submits.
- **Assertions**:
  - Username check for `"alpha_warrior"` returns available (`true`).
  - Submission succeeds without `"Username is already taken. Please choose another."` error.
  - Firestore document `usernames/alpha_warrior` is now owned by User 2's UID.

---

### 3.8 TC-C05: Stale Session Deletion Re-authentication Handling (Tier 3)
- **Target Requirement**: ORIGINAL_REQUEST §R3, Firebase Auth Security Specification
- **Objective**: Verify behavior when Firebase Auth requires recent login before permitting account deletion (`auth/requires-recent-login`).
- **Preconditions**:
  - Authenticated user on `/dashboard`.
  - Mock Firebase Auth configured to throw `auth/requires-recent-login` on `deleteUser()`.
- **Execution Steps**:
  1. User clicks "Delete Account".
  2. `deleteUser` throws `auth/requires-recent-login`.
- **Assertions**:
  - App catches the error and does NOT crash.
  - User is notified with an explanatory message (e.g. "This operation is sensitive and requires recent authentication. Please log in again before deleting your account.").
  - Firestore user document `users/{uid}` and `usernames/{username}` remain intact (no partial/corrupt deletion).
  - User remains on the page or is redirected to `/login` to refresh credentials.

---

### 3.9 TC-R01: Aspirant Email/Password Journey (Tier 4 Workload Scenario)
- **Target Requirement**: ORIGINAL_REQUEST §Acceptance Criteria (Authentication & Sessions)
- **Objective**: Full end-to-end user lifecycle from signup to verification, login, dummy dashboard inspection, and clean sign out.
- **Execution Flow**:
  1. **Landing**: Visitor starts at `/`, clicks "Sign Up Free" -> routes to `/signup`.
  2. **Registration**: Fills email `rahul@aspirant.in`, password `SuperPass2026!`, confirm password `SuperPass2026!`. Clicks submit.
  3. **Verification Notification**: Account created, verification email dispatched, user is not logged in yet.
  4. **Premature Login Check**: Attempts to log in before verification -> blocked with unverified message.
  5. **Verification Simulation**: Token verified (`emailVerified = true`).
  6. **Login**: Logs in at `/login` with credentials -> redirected to `/dashboard`.
  7. **Dashboard Verification**:
     - Displays `"Logged in as: Rahul"` (or email prefix/name).
     - Action buttons `"Sign Out"` and `"Delete Account"` visible.
  8. **Sign Out**:
     - Clicks `"Sign Out"`.
     - Redirected to `/` or `/login`.
  9. **Session Revocation**:
     - User attempts direct navigation to `/dashboard` -> redirected to `/login`.

---

### 3.10 TC-R02: Google Onboarding, Session Persistence & Account Deletion (Tier 4 Workload Scenario)
- **Target Requirement**: ORIGINAL_REQUEST §Acceptance Criteria (Account Management & Persistence)
- **Objective**: Full end-to-end lifecycle including Google popup, profile completion, dummy dashboard display, reload session persistence, and permanent account deletion.
- **Execution Flow**:
  1. **Google Auth**: Clicks "Google Sign In" -> popup resolves with new user `priya@gmail.com`, displayName "Priya Sharma".
  2. **Profile Completion**: Redirected to `/complete-profile`.
  3. **Collision & Recovery**:
     - Tries username `existing_user` -> blocked with `"Username is already taken. Please choose another."`.
     - Enters unique username `priya_ias`, age `23`, password `PriyaPass2026!`. Submits.
  4. **Dashboard Entry**: Redirected to `/dashboard`.
     - Heading displays: `"Logged in as: Priya Sharma"`.
  5. **Session Persistence Check**:
     - Simulate browser reload (re-mount `<App />` maintaining persistent mock storage / Auth state).
     - `authLoading` resolves.
     - User remains on `/dashboard`.
     - Greeting `"Logged in as: Priya Sharma"` remains visible.
     - NO redirection to `/login` occurs.
  6. **Permanent Deletion**:
     - Clicks `"Delete Account"`.
     - Confirms deletion.
     - Redirected to Landing Page (`/`).
  7. **Post-Deletion Verification**:
     - Firestore `users/{priya_uid}` does not exist.
     - Firestore `usernames/priya_ias` does not exist.
     - Firebase Auth has no user for `priya@gmail.com`.
     - Attempting to log in with `priya@gmail.com` fails (account does not exist).
     - Direct access to `/dashboard` redirects to `/login`.

---

## 4. Architectural & Implementation Insights for Downstream Agents

### 4.1 Order of Operations for Permanent Account Deletion
In Firebase Web SDK, calling `deleteUser(auth.currentUser)` immediately invalidates the user's ID token and signs the user out.
If Firestore security rules require `request.auth != null` (as specified in `firestore.rules`), any Firestore calls made *after* `deleteUser()` will fail with a `permission-denied` error!

Therefore, the account deletion function in `AppContext.tsx` (`deleteAccount`) **must** follow this strict sequential order:
```typescript
const deleteAccount = async () => {
  if (!currentUser) return;
  const uid = currentUser.uid;
  const username = userProfile?.username;

  try {
    // 1. Delete username reservation document first (while still authenticated)
    if (username) {
      await deleteDoc(doc(db, 'usernames', username.toLowerCase()));
    }

    // 2. Delete user profile document (while still authenticated)
    await deleteDoc(doc(db, 'users', uid));

    // 3. Delete Firebase Auth user record
    await deleteUser(currentUser);

    // 4. Clear local state and browser storage
    localStorage.clear();
    sessionStorage.clear();
    setCurrentUser(null);
    setUserProfile(EMPTY_NEW_PROFILE);

    // 5. Redirect to Landing Page
    navigate('/');
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please re-login before deleting your account.');
    }
    throw error;
  }
};
```

### 4.2 Dummy Dashboard UI Contract
The component in `src/pages/DashboardPage.tsx` (or a dedicated `DummyDashboardPage.tsx`) must render:
- Container with testing header / badge (e.g. `TESTING DUMMY DASHBOARD`).
- User Greeting:
  ```tsx
  <h2>Logged in as: {userProfile?.name || currentUser?.displayName || 'Candidate'}</h2>
  ```
- Sign Out Button:
  ```tsx
  <button onClick={logoutUser} className="btn btn-secondary">
    Sign Out
  </button>
  ```
- Delete Account Button:
  ```tsx
  <button onClick={handleDeleteAccount} className="btn btn-danger">
    Delete Account
  </button>
  ```

### 4.3 Route Protection Contract in `App.tsx`
`App.tsx` must wrap `/dashboard` with an authentication guard:
```tsx
const MainRouter: React.FC = () => {
  const { currentPath, currentUser, authLoading, userProfile, navigate } = useApp();

  useEffect(() => {
    if (authLoading) return;

    if (currentPath === '/dashboard') {
      if (!currentUser) {
        navigate('/login');
      } else if (!userProfile?.isProfileComplete && currentUser.providerData.some(p => p.providerId === 'google.com')) {
        navigate('/complete-profile');
      }
    }
  }, [currentPath, currentUser, authLoading, userProfile, navigate]);

  if (authLoading) {
    return <div role="status">Loading authentication...</div>;
  }

  // Render currentPath
  ...
};
```

---

## 5. Summary of Test Traceability Matrix for R3

| Test Identifier | Test File | Requirement | Coverage Scope |
|---|---|---|---|
| `TC-F07` | `src/test/tier1-feature-coverage.test.tsx` | R3 Dummy Dashboard | User name display ("Logged in as: {name}"), Sign Out & Delete Account buttons |
| `TC-F08` | `src/test/tier1-feature-coverage.test.tsx` | R3 Sign Out | Session clearance, storage wipe, redirect to `/` or `/login`, route block on return |
| `TC-F09` | `src/test/tier1-feature-coverage.test.tsx` | R3 Account Deletion | Deletion of `users/{uid}`, `usernames/{username}`, `deleteUser()`, redirect to `/` |
| `TC-B08` | `src/test/tier2-boundary-cases.test.tsx` | R3 Route Protection | Unauthenticated visitor direct access to `/dashboard` redirects to `/login` |
| `TC-B09` | `src/test/tier2-boundary-cases.test.tsx` | R1 & R3 Gating | Unverified user direct access to `/dashboard` blocked |
| `TC-B10` | `src/test/tier2-boundary-cases.test.tsx` | R3 Loading Guard | `authLoading` state hides dashboard content without false redirect |
| `TC-C04` | `src/test/tier3-cross-feature-linking.test.tsx` | R2 & R3 Username Cycle | Account deletion frees username for subsequent user registration |
| `TC-C05` | `src/test/tier3-cross-feature-linking.test.tsx` | R3 Security / Re-auth | Graceful error handling on `auth/requires-recent-login` |
| `TC-R01` | `src/test/tier4-real-world-scenarios.test.tsx` | R1 & R3 End-to-End | Email user lifecycle: Signup -> Verify -> Login -> Dummy Dashboard -> Sign Out |
| `TC-R02` | `src/test/tier4-real-world-scenarios.test.tsx` | R2 & R3 End-to-End | Google user lifecycle: Onboard -> Dashboard -> Reload persist -> Delete account |
