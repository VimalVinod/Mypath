# Comprehensive Analysis & Fix Strategy: Requirement R3
**Component**: Dummy Dashboard, Sign Out, Cascading Account Deletion, Session Persistence & Strict Route Guards  
**Author**: Explorer 3 (`teamwork_preview_explorer_m2_3`)  
**Target Milestone**: Milestone 2 (Implementation Track)  
**Date**: 2026-09-07  

---

## 1. Executive Summary

Requirement R3 mandates:
1. Replacing the production exam dashboard in `src/pages/DashboardPage.tsx` with a testing dummy interface that displays `"Logged in as: {name}"`, a `"Sign Out"` button, and a `"Delete Account"` button. No false dashboards or application widgets (e.g., "Matched Exams", "Upcoming Deadlines") may be present.
2. Implementing cascading account deletion in `AppContext.tsx`:
   - Deleting the username document from `usernames/{username}` to release it for future users.
   - Deleting the user document from `users/{uid}`.
   - Deleting the authenticated user from Firebase Auth via `deleteUser(currentUser)`.
   - Safely handling `auth/requires-recent-login` without corrupting or partially deleting Firestore documents.
   - Redirecting to the landing page `/`.
3. Implementing strict route guards and session persistence in `src/App.tsx` and `AppContext.tsx`:
   - Guarding `/dashboard` so unauthenticated visitors are immediately redirected to `/login`.
   - Guarding `/dashboard` so unverified authenticated visitors are redirected to `/login` with the exact notice: `"Please verify your email address before logging in. A verification link has been sent to your email."`.
   - Preserving sessions across page reloads via an `authLoading` spinner while `onAuthStateChanged` resolves, preventing premature redirections.
   - Synchronizing router state with `window.location.pathname` and `popstate` events.

---

## 2. Code Audit & Identified Gaps

### 2.1 `src/pages/DashboardPage.tsx`
* **Current State**:
  - Full production UI with 235 lines containing `Matched Exams`, `Upcoming Deadlines`, `Take the 5-Min Career Quiz`, and application tracker widgets.
  - No `"Logged in as: {name}"` header.
  - No `"Sign Out"` button calling `logoutUser()`.
  - No `"Delete Account"` button calling `deleteAccount()`.
* **Test Failure Impact**:
  - **TC-F07** fails immediately: asserts `screen.getByText(/Logged in as:\s*Alex Kumar/i)`, `screen.getByRole('button', { name: /Sign Out/i })`, and `screen.getByRole('button', { name: /Delete Account/i })`, while asserting `screen.queryByText(/Matched Exams/i)` and `screen.queryByText(/Upcoming Deadlines/i)` are NOT in the document.
  - **TC-F08**, **TC-F09**, **TC-C04**, **TC-C05**, **TC-R01**, **TC-R02** fail because dashboard controls are missing.

### 2.2 `src/context/AppContext.tsx`
* **Current State**:
  - `deleteAccount` is NOT implemented in `AppContextType` or `AppProvider`.
  - `logoutUser` only calls `signOut(auth)`, resets local state, and sets `currentPath` to `'/'`, but does not coordinate with the router sync.
  - In `onAuthStateChanged`, line 90:
    ```typescript
    if (firebaseUser && firebaseUser.providerData.some(p => p.providerId === 'password') && !firebaseUser.emailVerified) {
      setCurrentUser(null);
      return;
    }
    ```
    This immediately clears `currentUser` when unverified, which prevents the route guard from distinguishing between an unauthenticated user (TC-B08) and an unverified user attempting direct access to `/dashboard` (TC-B09).
  - Lines 98-115 look for nested `data.userProfile`:
    ```typescript
    if (snap.exists()) {
      const data = snap.data();
      if (data.userProfile) setUserProfile(data.userProfile);
    }
    ```
    However, the specification in `PROJECT.md` and the test fixtures across all tiers store user fields directly on `users/{userId}` (`name`, `username`, `age`, `isProfileComplete`, `isEmailVerified`). Because `data.userProfile` is undefined on flat documents, `userProfile` is never hydrated with `username` or `name` from Firestore!
  - Lines 126-136 execute a background `useEffect` that writes `{ userProfile }` to Firestore on every profile update. If `deleteAccount()` resets state, this effect risks resurrecting the deleted user document in Firestore.
  - `currentPath` is initialized to `'/'`, ignoring `window.location.pathname`, and does not subscribe to `window.addEventListener('popstate', ...)`.
  - `authLoading` is not exposed in `AppContextType` or tracked in state.

### 2.3 `src/App.tsx`
* **Current State**:
  - Bare router (35 lines) without route guards or protection.
  - Directly switches on `currentPath` with only `/login`, `/dashboard`, and `/`. Missing `/signup` and `/complete-profile`.
  - Does not render an `authLoading` spinner.
  - Does not protect `/dashboard` from unauthenticated or unverified users.

### 2.4 `src/pages/LoginPage.tsx`
* **Current State**:
  - Displays `errorMsg` only from local state in response to button clicks.
  - Does not display route guard notices (such as unverified email notice from TC-B09).

---

## 3. Detailed Fix Strategy

### 3.1 Replacement of `src/pages/DashboardPage.tsx`
The dummy dashboard must be minimal, clean, and directly satisfy all opaque-box assertions:
1. Display `"Logged in as: {displayName}"` where `displayName` resolves from `userProfile?.name || currentUser?.displayName || userProfile?.username || currentUser?.email || 'User'`.
2. Render a `"Sign Out"` button that invokes `logoutUser()`.
3. Render a `"Delete Account"` button that invokes `deleteAccount()`.
4. Capture any error during deletion. If `auth/requires-recent-login` is encountered, display:
   `"This operation requires recent authentication. Please re-login before deleting your account."`
   (Matching regex `/requires recent authentication|re-login before deleting/i` in **TC-C05**).
5. Omit all legacy exam cards, quiz widgets, and deadline widgets.

#### Proposed `src/pages/DashboardPage.tsx`:
```tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const DashboardPage: React.FC = () => {
  const { currentUser, userProfile, logoutUser, deleteAccount } = useApp();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const displayName =
    userProfile?.name ||
    currentUser?.displayName ||
    userProfile?.username ||
    currentUser?.email ||
    'User';

  const handleSignOut = async () => {
    await logoutUser();
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      let msg = err?.message || 'Failed to delete account.';
      if (
        err?.code === 'auth/requires-recent-login' ||
        err?.message?.includes('requires recent authentication')
      ) {
        msg =
          'This operation requires recent authentication. Please re-login before deleting your account.';
      }
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: '2rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E2E8F0',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '1.5rem',
            color: '#0F172A',
          }}
        >
          Logged in as: {displayName}
        </h1>

        {deleteError && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #F87171',
              color: '#DC2626',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              textAlign: 'left',
            }}
          >
            {deleteError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSignOut}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#F1F5F9',
              color: '#334155',
            }}
          >
            Sign Out
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={isDeleting}
            onClick={handleDeleteAccount}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
```

---

### 3.2 Cascading Account Deletion in `AppContext.tsx`

#### Critical Ordering Constraint (TC-C05 Compliance):
In **TC-C05**, `firebaseMock.setNextDeleteUserError({ code: 'auth/requires-recent-login', message: '...' })` simulates a stale session. The test asserts:
```typescript
await waitFor(() => {
  expect(screen.getByText(/requires recent authentication|re-login before deleting/i)).toBeInTheDocument();
  // Ensure Firestore records were not partially deleted
  expect(firebaseMock.getMockDoc('users', 'user_c05_stale')).toBeDefined();
  expect(firebaseMock.getMockDoc('usernames', 'staleuser')).toBeDefined();
});
```

**Rule**: `deleteUser(currentUser)` MUST be attempted **FIRST** before deleting Firestore documents.
- If `deleteUser(currentUser)` throws `auth/requires-recent-login`:
  Execution halts, no `deleteDoc` operations are called, and both `users/{uid}` and `usernames/{username}` remain intact in Firestore.
- If `deleteUser(currentUser)` succeeds:
  Proceed to delete `usernames/{username.toLowerCase()}` and `users/{uid}`, then clear local state and navigate to `/`.

#### Username Resolution:
If `userProfile.username` is not yet in React state, fetch it directly from Firestore `users/{uid}` before executing deletion:
```typescript
const deleteAccount = async () => {
  if (!currentUser) return;
  const user = currentUser;
  const uid = user.uid;

  // 1. Resolve username to delete
  let username = userProfile?.username;
  if (!username) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        username = snap.data()?.username;
      }
    } catch (e) {
      console.error('Failed to look up username for deletion:', e);
    }
  }

  // 2. Delete user from Firebase Auth FIRST (handles auth/requires-recent-login safely)
  await deleteUser(user);

  // 3. Cascade deletion to Firestore
  if (username) {
    await deleteDoc(doc(db, 'usernames', username.toLowerCase()));
  }
  await deleteDoc(doc(db, 'users', uid));

  // 4. Teardown session and redirect
  setCurrentUser(null);
  setUserProfile(EMPTY_NEW_PROFILE);
  setTrackerItems([]);
  localStorage.clear();
  sessionStorage.clear();
  navigate('/');
};
```

---

### 3.3 Strict Route Guards, URL Synchronization & Session Persistence

#### Route Synchronization & URL Handling:
1. `currentPath` initial value:
   ```typescript
   const [currentPath, setCurrentPath] = useState<string>(() => {
     if (typeof window !== 'undefined' && window.location.pathname) {
       return window.location.pathname;
     }
     return '/';
   });
   ```
2. Listen to browser popstate:
   ```typescript
   useEffect(() => {
     const onPopState = () => {
       setCurrentPath(window.location.pathname || '/');
     };
     window.addEventListener('popstate', onPopState);
     return () => window.removeEventListener('popstate', onPopState);
   }, []);
   ```
3. In `navigate(path)`:
   ```typescript
   const navigate = (path: string) => {
     if (typeof window !== 'undefined') {
       window.history.pushState({}, '', path);
     }
     setCurrentPath(path);
     window.scrollTo(0, 0);
   };
   ```

#### `authLoading` & Session Persistence:
1. Initialize `authLoading` state to `true`.
2. In `onAuthStateChanged(auth, async (firebaseUser) => { ... })`:
   - Hydrate `currentUser` and `userProfile` from Firestore (supporting flat schema).
   - Once resolved (success or null), set `authLoading = false`.
3. In `src/App.tsx`, implement a `ProtectedRoute` wrapper:
   - While `authLoading` is `true`, render a loading spinner (`<div data-testid="auth-loading">Loading...</div>`).
   - If `!currentUser`: navigate immediately to `/login`.
   - If `currentUser && !currentUser.emailVerified`:
     - Call `setAuthNotice('Please verify your email address before logging in. A verification link has been sent to your email.')`.
     - Navigate immediately to `/login`.
   - If `currentUser` is valid and verified: render `children` (`<DashboardPage />`).

#### Proposed `ProtectedRoute` and Router in `src/App.tsx`:
```tsx
import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfileCompletionPage } from './pages/ProfileCompletionPage';
import { DashboardPage } from './pages/DashboardPage';
import { CookieConsentBanner } from './components/CookieConsentBanner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authLoading, navigate, setAuthNotice } = useApp();

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!currentUser.emailVerified) {
      setAuthNotice(
        'Please verify your email address before logging in. A verification link has been sent to your email.'
      );
      navigate('/login');
      return;
    }
  }, [currentUser, authLoading, navigate, setAuthNotice]);

  if (authLoading) {
    return (
      <div
        data-testid="auth-loading"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: '#64748B',
        }}
      >
        Loading session...
      </div>
    );
  }

  if (!currentUser || !currentUser.emailVerified) {
    return null;
  }

  return <>{children}</>;
};

const MainRouter: React.FC = () => {
  const { currentPath } = useApp();

  switch (currentPath) {
    case '/login':
      return <LoginPage />;
    case '/signup':
      return <SignupPage />;
    case '/complete-profile':
      return <ProfileCompletionPage />;
    case '/dashboard':
      return (
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      );
    case '/':
    default:
      return <LandingPage />;
  }
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainRouter />
      <CookieConsentBanner />
    </AppProvider>
  );
};

export default App;
```

---

### 3.4 Communicating Route Guard Notices to `src/pages/LoginPage.tsx`
In `AppContext.tsx`, expose:
```typescript
const [authNotice, setAuthNotice] = useState<string | null>(null);
```
In `src/pages/LoginPage.tsx`:
```tsx
const { navigate, loginWithEmail, loginWithGoogle, authNotice, setAuthNotice } = useApp();
...
const displayedError = errorMsg || authNotice;
```
And render `displayedError` in the alert banner. Whenever the user alters inputs or initiates login, clear `authNotice`:
```tsx
<input 
  type="email" 
  value={email} 
  onChange={e => { setEmail(e.target.value); setAuthNotice(null); }} 
  ... 
/>
```
This guarantees that direct unauthorized/unverified navigation to `/dashboard` (**TC-B09**) immediately shows the required verification notice upon redirecting to `/login`.

---

## 4. Test Traceability Matrix for R3

| Test Case | Condition Under Test | Expected Behavior | Implementation Mechanism |
|:---|:---|:---|:---|
| **TC-F07** | Authenticated user visits `/dashboard` | Displays `"Logged in as: {name}"`, "Sign Out", "Delete Account"; excludes exams/deadlines widgets | `DashboardPage.tsx` dummy layout |
| **TC-F08** | User clicks "Sign Out" | Calls `signOut(auth)`, clears state, revokes `/dashboard` access | `logoutUser()` -> `signOut(auth)` -> `ProtectedRoute` redirects |
| **TC-F09** | User clicks "Delete Account" | Permanently removes `usernames/{username}`, `users/{uid}`, auth user, redirects to `/` | `deleteAccount()` cascading deletion |
| **TC-B08** | Unauthenticated visitor opens `/dashboard` | Immediately redirects to `/login` with "Log In" heading | `ProtectedRoute` detects `!currentUser` |
| **TC-B09** | Unverified user opens `/dashboard` | Blocks access, redirects to `/login`, displays verification notice | `ProtectedRoute` detects `!currentUser.emailVerified`, sets `authNotice` |
| **TC-C04** | User deleted, second user claims same username | Second user successfully registers claimed username without collision error | `deleteAccount()` deletes `usernames/{username}` |
| **TC-C05** | Delete account fails with `auth/requires-recent-login` | Shows re-login error banner; Firestore records are NOT deleted | `deleteUser(currentUser)` executed first; Firestore deletes bypassed |
| **TC-R01** | Aspirant end-to-end journey | Navigates to dashboard, displays name, signs out, blocks re-entry | `DashboardPage.tsx` + `logoutUser()` + `ProtectedRoute` |
| **TC-R02** | Google onboarding, reload persist, deletion | Persists session across unmount/remount on `/dashboard`, deletes account | `authLoading` spinner + `deleteAccount()` |

---

## 5. Verification Commands

To verify all R3 requirements after implementation:

```powershell
cd c:\Users\sindh\Documents\codes\mypath\frontend\codes
# Run tier 1 tests (TC-F07, TC-F08, TC-F09)
npx vitest run src/test/tier1-feature-coverage.test.tsx

# Run tier 2 tests (TC-B08, TC-B09)
npx vitest run src/test/tier2-boundary-cases.test.tsx

# Run tier 3 tests (TC-C04, TC-C05)
npx vitest run src/test/tier3-cross-feature-linking.test.tsx

# Run tier 4 tests (TC-R01, TC-R02)
npx vitest run src/test/tier4-real-world-scenarios.test.tsx

# Run full test suite
npm test
```
