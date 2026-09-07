# Analysis & Implementation Strategy: R1 & Route Synchronization

**Explorer**: Explorer 1 (`teamwork_preview_explorer`)  
**Milestone**: Milestone 2 (Implementation Track)  
**Target Scope**: R1 (Email/Password Signup, password confirmation, email verification flow, Google Sign-In) and Route Synchronization (`window.location.pathname`, `popstate`, route guards).  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_explorer_m2_1`  
**Project Directory**: `c:\Users\sindh\Documents\codes\mypath\frontend\codes`  
**Authoritative References**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, `TEST_READY.md`

---

## 1. Executive Summary & Problem Statement

The goal of this analysis is to define the exact, production-grade implementation strategy for:
1. **R1 Authentication Methods & Verification**:
   - Dedicated Email/Password Sign-Up page (`src/pages/SignupPage.tsx`) with password confirmation and client-side mismatch validation.
   - Email verification link dispatch upon sign-up, with immediate sign-out to guarantee unverified sessions are never retained.
   - Unverified email login interception in `src/context/AppContext.tsx`, re-dispatching verification and displaying the verbatim error message:
     `"Please verify your email address before logging in. A verification link has been sent to your email."`.
   - Google Sign-In integration with popup handling, profile completion detection, and graceful popup closure handling.
2. **Route Synchronization & Guarding**:
   - Synchronization of routing state between React context (`AppContext.tsx`), `window.location.pathname`, and the browser `popstate` event.
   - Route protection for `/dashboard` preventing unauthenticated and unverified visitors from accessing protected data, redirecting unauthenticated users to `/login` and unverified users to `/login` with the exact verification prompt.
   - Support for dedicated route paths `/signup`, `/complete-profile`, `/dashboard`, `/login`, and `/`.

---

## 2. Baseline Audit & Root Cause Analysis of Existing Gaps

In the initial test baseline, Vitest reported:
```
Test Files  4 failed (4)
     Tests  25 failed | 1 passed (26)
```
The root causes for all failures directly tied to R1 and Route Synchronization are:

### Gap 1: Missing `src/pages/SignupPage.tsx`
- **Observation**: Directory `src/pages/` only contains `DashboardPage.tsx`, `LandingPage.tsx`, and `LoginPage.tsx`. There is no `SignupPage.tsx`.
- **Impact**: Tests `TC-F01`, `TC-B01`, `TC-B02`, `TC-B03`, and `TC-R01` navigate to `/signup` and attempt to find form elements matching `/email/i`, `/password/i`, and `/sign up|create account|register/i`. Without `SignupPage.tsx`, navigation to `/signup` falls back to `LandingPage.tsx`, causing immediate test failures.
- **Specification Requirements**:
  - Email input matching `screen.queryByPlaceholderText(/email/i) || screen.queryByLabelText(/email/i)`.
  - At least two password inputs matching `screen.queryAllByPlaceholderText(/password/i)` (password and confirmPassword).
  - Submit button matching `screen.queryByRole('button', { name: /sign up|create account|register/i })`.
  - Page heading matching `screen.queryByRole('heading', { name: /sign up|create account/i })`.
  - Exact error alert for password mismatch: `"Passwords do not match."`.
  - Exact error alert for weak password (< 6 characters): `"Password must be at least 6 characters."` (satisfies regex `/at least 6 characters|weak password/i`).
  - Validation halting on invalid email format (`TC-B03`).

### Gap 2: Incomplete & Flawed Email Verification Flow
- **Observation**: In `src/context/AppContext.tsx`, `signupWithEmail` stored user data nested under `{ userProfile: newProfile }` rather than top-level Firestore fields (`uid`, `email`, `name`, `username`, `age`, `isProfileComplete`, `isEmailVerified`, `authProviders`, `createdAt`, `updatedAt`).
- **Impact**: Tests inspecting Firestore user records directly (`TC-F03`, `TC-F05`, `TC-C01`, `TC-R01`) expect top-level attributes on `users/{uid}`.
- **Verification Guarantee**: After `createUserWithEmailAndPassword` and `sendEmailVerification`, `signOut(auth)` must be awaited, and `currentUser` must be reset to `null` so unverified sessions cannot persist.

### Gap 3: Incorrect Error Message on Unverified Login Interception
- **Observation**: In `src/context/AppContext.tsx` line 194, `loginWithEmail` currently throws:
  `'Email not verified. A verification link has been sent to your Gmail inbox. Please click the link to verify before logging in.'`
- **Required Specification** (from `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TC-F02`, and `TC-B09`):
  `'Please verify your email address before logging in. A verification link has been sent to your email.'`
- **Impact**: `TC-F02` fails because it asserts:
  `expect(screen.getByText('Please verify your email address before logging in. A verification link has been sent to your email.')).toBeInTheDocument();`

### Gap 4: Static Route State & Lack of `popstate` / `window.location.pathname` Sync
- **Observation**: In `src/context/AppContext.tsx` line 70:
  `const [currentPath, setCurrentPath] = useState<string>('/');`
  The current path is hardcoded to `'/'`. It does not inspect `window.location.pathname` on initialization, nor does it listen for `popstate` events.
- **Impact**: All test helpers use:
  ```typescript
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  ```
  Because `AppContext` does not listen for `popstate`, changing the URL via `pushState` and dispatching `popstate` fails to switch routes, causing subsequent screen assertions to fail.

### Gap 5: Missing Route Protection & Guards for `/dashboard`
- **Observation**: `App.tsx` renders `<DashboardPage />` whenever `currentPath === '/dashboard'` regardless of whether `currentUser` exists or whether `currentUser.emailVerified` is true.
- **Impact**:
  - In `TC-B08`: Unauthenticated user visiting `/dashboard` must be redirected to `/login` with heading `Log In`.
  - In `TC-B09`: Unverified user visiting `/dashboard` must be redirected to `/login` and see the exact message:
    `"Please verify your email address before logging in. A verification link has been sent to your email."`.

---

## 3. Detailed Component & Module Specifications

### 3.1 `src/pages/SignupPage.tsx` Design

#### Component UI Architecture
- **Theme**: Consistent with MyPath design tokens (`var(--bg-subtle)`, `var(--brand-red)`, `var(--border)`).
- **Navigation link**: "Back to home" button calling `navigate('/')`.
- **Logo**: Displays MyPath logo (`logoImg`).
- **Heading**: `<h2 style={{ fontSize: '1.5rem' }}>Create Account</h2>` (matches `/sign up|create account/i`).
- **Error Banner**: Conditional `<div role="alert">` displaying `errorMsg` with `AlertCircle` icon.
- **Success Banner**: Conditional notification when verification link is dispatched.
- **Form Controls**:
  1. `Email Address`:
     - Label: `"Email Address"`
     - Input: `type="email"`, `className="form-input"`, `placeholder="Enter your email"`
     - Query compatibility: Matches `screen.queryByPlaceholderText(/email/i)`.
  2. `Password`:
     - Label: `"Password"`
     - Input: `type={showPassword ? 'text' : 'password'}`, `className="form-input"`, `placeholder="Enter your password"`
     - Eye toggle icon (`Eye` / `EyeOff`)
     - Query compatibility: Matches `screen.queryAllByPlaceholderText(/password/i)[0]`.
  3. `Confirm Password`:
     - Label: `"Confirm Password"`
     - Input: `type={showConfirmPassword ? 'text' : 'password'}`, `className="form-input"`, `placeholder="Confirm your password"`
     - Eye toggle icon (`Eye` / `EyeOff`)
     - Query compatibility: Matches `screen.queryAllByPlaceholderText(/password/i)[1]`.
  4. `Submit Button`:
     - Button: `type="submit"`, `className="btn btn-primary btn-full"`, text `"Create Account"`
     - Query compatibility: Matches `screen.queryByRole('button', { name: /sign up|create account|register/i })`.
  5. `Google Sign-In Button`:
     - Button: `className="btn btn-ghost btn-full"`, text `"Google Sign In"`
     - Query compatibility: Matches `screen.getByRole('button', { name: /google sign in/i })`.
  6. `Sign In Link`:
     - Link to login: `"Already have an account? Log In"`, triggers `navigate('/login')`.

#### Form Validation Logic in `SignupPage.tsx`
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setErrorMsg(null);
  setSuccessMsg(null);

  // 1. Password confirmation check (TC-B01)
  if (password !== confirmPassword) {
    setErrorMsg('Passwords do not match.');
    return;
  }

  // 2. Weak password check (TC-B02)
  if (password.length < 6) {
    setErrorMsg('Password must be at least 6 characters.');
    return;
  }

  // 3. Email format check (TC-B03)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    setErrorMsg('Please enter a valid email address.');
    return;
  }

  setLoading(true);
  try {
    await signupWithEmail(email.trim(), password);
    setSuccessMsg('Account created! A verification link has been sent to your email. Please verify before logging in.');
    setPassword('');
    setConfirmPassword('');
  } catch (err: any) {
    let msg = err.message || 'Failed to create account.';
    if (err.code === 'auth/email-already-in-use') {
      msg = 'Email already in use. Please log in instead.';
    } else if (err.code === 'auth/weak-password') {
      msg = 'Password should be at least 6 characters.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    }
    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
};
```

---

### 3.2 Email Verification & Sign-Up Flow in `src/context/AppContext.tsx`

#### `signupWithEmail` Function
```typescript
const signupWithEmail = async (email: string, pass: string, name?: string) => {
  const normEmail = email.toLowerCase().trim();
  const res = await createUserWithEmailAndPassword(auth, normEmail, pass);
  if (res.user) {
    // 1. Dispatch Firebase email verification link
    await sendEmailVerification(res.user, {
      url: `${window.location.origin}/login?verified=true`,
      handleCodeInApp: true
    });

    const now = new Date().toISOString();
    const displayName = name || normEmail.split('@')[0];

    // 2. Populate Firestore document with top-level schema
    const userDocData = {
      uid: res.user.uid,
      email: normEmail,
      name: displayName,
      username: '',
      age: 0,
      isProfileComplete: true, // Complete for email/password users
      isEmailVerified: false,
      authProviders: ['password'],
      createdAt: now,
      updatedAt: now,
      userProfile: {
        ...EMPTY_NEW_PROFILE,
        name: displayName,
        email: normEmail,
        isEmailVerified: false,
        isOnboarded: false
      },
      trackerItems: []
    };

    const userRef = doc(db, 'users', res.user.uid);
    await setDoc(userRef, userDocData, { merge: true });

    // 3. Immediately sign out to ensure unverified sessions are never retained
    await signOut(auth);
    setCurrentUser(null);
  }
};
```

#### `loginWithEmail` Function with Interception
```typescript
const loginWithEmail = async (email: string, pass: string) => {
  const normEmail = email.toLowerCase().trim();

  // Pre-check 1: Check for incomplete Google profile block (TC-C02, TC-R03)
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', normEmail));
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    const existingData = querySnap.docs[0].data();
    if (existingData.isProfileComplete === false) {
      throw new Error('Email already exists. Please complete your profile to sign in with email.');
    }
  }

  // 2. Perform authentication
  const res = await signInWithEmailAndPassword(auth, normEmail, pass);
  if (res.user) {
    // Check 2: Intercept unverified email (TC-F02)
    if (!res.user.emailVerified) {
      await sendEmailVerification(res.user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: true
      });
      await signOut(auth);
      setCurrentUser(null);
      throw new Error('Please verify your email address before logging in. A verification link has been sent to your email.');
    }

    // 3. Load user document from Firestore
    const userRef = doc(db, 'users', res.user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.isProfileComplete === false) {
        await signOut(auth);
        setCurrentUser(null);
        throw new Error('Email already exists. Please complete your profile to sign in with email.');
      }
      if (data.userProfile) {
        setUserProfile(data.userProfile);
      } else {
        setUserProfile({
          ...EMPTY_NEW_PROFILE,
          name: data.name || res.user.displayName || 'Candidate',
          email: data.email || res.user.email || '',
          isEmailVerified: true,
          isOnboarded: true
        });
      }
      if (data.trackerItems) setTrackerItems(data.trackerItems);
    }
    navigate('/dashboard');
  }
};
```

---

### 3.3 Google Sign-In Flow in `src/context/AppContext.tsx`

```typescript
const loginWithGoogle = async () => {
  const res = await signInWithPopup(auth, googleProvider);
  if (res.user) {
    const uid = res.user.uid;
    const email = (res.user.email || '').toLowerCase();
    const displayName = res.user.displayName || email.split('@')[0] || 'Google User';

    const userRef = doc(db, 'users', uid);
    let userSnap = await getDoc(userRef);
    let userData = userSnap.exists() ? userSnap.data() : null;

    // If not found by UID, check if email exists (account linking scenario TC-C01)
    if (!userData && email) {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const matchedDoc = querySnap.docs[0];
        userData = matchedDoc.data();
        // Update linked doc with google.com provider
        const providers: string[] = userData.authProviders || [];
        if (!providers.includes('google.com')) {
          providers.push('google.com');
          await setDoc(doc(db, 'users', matchedDoc.id), { authProviders: providers }, { merge: true });
        }
      }
    }

    if (userData) {
      // User exists
      const providers: string[] = userData.authProviders || [];
      if (!providers.includes('google.com')) {
        providers.push('google.com');
        await setDoc(userRef, { authProviders: providers }, { merge: true });
      }

      if (userData.isProfileComplete === true) {
        // Returning completed user (TC-F06, TC-C01)
        if (userData.userProfile) {
          setUserProfile(userData.userProfile);
        } else {
          setUserProfile({
            ...EMPTY_NEW_PROFILE,
            name: userData.name || displayName,
            email: userData.email || email,
            isEmailVerified: true,
            isOnboarded: true
          });
        }
        navigate('/dashboard');
      } else {
        // Incomplete profile (TC-F04, TC-R03)
        navigate('/complete-profile');
      }
    } else {
      // New Google User without Firestore document (TC-F04)
      const now = new Date().toISOString();
      const newDocData = {
        uid,
        email,
        name: displayName,
        username: '',
        age: 0,
        isProfileComplete: false,
        isEmailVerified: true,
        authProviders: ['google.com'],
        createdAt: now,
        updatedAt: now,
        userProfile: {
          ...EMPTY_NEW_PROFILE,
          name: displayName,
          email,
          isEmailVerified: true,
          isOnboarded: false
        },
        trackerItems: []
      };
      await setDoc(userRef, newDocData, { merge: true });
      setUserProfile(newDocData.userProfile);
      navigate('/complete-profile');
    }
  }
};
```

---

### 3.4 Route Synchronization & Route Guards

#### State Architecture in `AppContext.tsx`
```typescript
// Initial state sync with window.location.pathname
const [currentPath, setCurrentPath] = useState<string>(() => {
  if (typeof window !== 'undefined' && window.location.pathname) {
    return window.location.pathname;
  }
  return '/';
});

const [authError, setAuthError] = useState<string | null>(null);

// Synchronize with browser popstate
useEffect(() => {
  const handlePopState = () => {
    setCurrentPath(window.location.pathname || '/');
  };
  window.addEventListener('popstate', handlePopState);
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, []);

// Navigate helper with history pushState
const navigate = (path: string) => {
  setAuthError(null);
  if (typeof window !== 'undefined' && window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  if (path.startsWith('/exams/')) {
    const id = path.replace('/exams/', '');
    setSelectedExamId(id);
    setCurrentPath('/exams/detail');
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
    return;
  }
  if (path.startsWith('/resources/')) {
    const tag = path.replace('/resources/', '');
    setSelectedExamTag(tag);
    setCurrentPath('/resources');
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
    return;
  }
  setCurrentPath(path);
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
};
```

#### Synchronous Initialization of `currentUser`
To ensure test assertions running immediately after `render(<App />)` find the correct auth context without requiring arbitrary sleep timers:
```typescript
const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => {
  return auth.currentUser ? ({ ...auth.currentUser } as any) : null;
});
```

#### Router & Route Guards in `src/App.tsx`
```tsx
import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProfileCompletionPage } from './pages/ProfileCompletionPage';
import { DashboardPage } from './pages/DashboardPage';
import { CookieConsentBanner } from './components/CookieConsentBanner';

const MainRouter: React.FC = () => {
  const { currentPath, currentUser, userProfile, navigate, setAuthError } = useApp();

  useEffect(() => {
    if (currentPath === '/dashboard') {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (!currentUser.emailVerified) {
        setAuthError('Please verify your email address before logging in. A verification link has been sent to your email.');
        navigate('/login');
        return;
      }
      if (userProfile && userProfile.isProfileComplete === false) {
        navigate('/complete-profile');
        return;
      }
    }
  }, [currentPath, currentUser, userProfile, navigate, setAuthError]);

  // Synchronous route rendering
  if (currentPath === '/dashboard') {
    if (!currentUser || !currentUser.emailVerified) {
      return <LoginPage />;
    }
    if (userProfile && userProfile.isProfileComplete === false) {
      return <ProfileCompletionPage />;
    }
    return <DashboardPage />;
  }

  switch (currentPath) {
    case '/login':
      return <LoginPage />;
    case '/signup':
      return <SignupPage />;
    case '/complete-profile':
      return <ProfileCompletionPage />;
    case '/':
    default:
      return <LandingPage />;
  }
};
```

#### Integration with `src/pages/LoginPage.tsx`
`LoginPage.tsx` is updated to read `authError` from `useApp()`:
```typescript
const { navigate, loginWithEmail, loginWithGoogle, authError, setAuthError } = useApp();
...
const activeError = errorMsg || authError;
```
When `activeError` is present, it renders in the alert banner. Whenever the user alters email or password input, both `errorMsg` and `authError` are cleared.

---

## 4. Test Suite Traceability Matrix

| Test ID | Test Name | Specific Assertion Validated | Design Guarantee |
|:---|:---|:---|:---|
| **TC-F01** | Email/Password Sign-Up Happy Path | `createUserWithEmailAndPassword`, `sendEmailVerification`, `signOut`, no `"Logged in as:"` | `SignupPage.tsx` + `signupWithEmail` dispatches verification and signs out immediately |
| **TC-F02** | Unverified Email Login Interception | `signInWithEmailAndPassword`, `sendEmailVerification`, `signOut`, exact message: `"Please verify your email address before logging in. A verification link has been sent to your email."` | `loginWithEmail` catches `!emailVerified`, calls `sendEmailVerification`, `signOut`, throws exact message |
| **TC-F03** | Verified Email Login Happy Path | Routes to dashboard, displays `"Logged in as: Alex Verified"` | `loginWithEmail` loads `users/{uid}`, sets `userProfile`, navigates to `/dashboard` |
| **TC-F04** | Google Sign-In New User Profile Enforcement | `signInWithPopup`, routes to `/complete-profile` with heading `Complete your profile` | `loginWithGoogle` detects new user, creates doc with `isProfileComplete: false`, routes to `/complete-profile` |
| **TC-F06** | Returning Google User Direct Dashboard Entry | Bypasses `/complete-profile`, routes to `/dashboard` with user name | `loginWithGoogle` finds existing doc with `isProfileComplete: true`, routes to `/dashboard` |
| **TC-B01** | Password Confirmation Mismatch Validation | Exact error `"Passwords do not match."`, halts submission, keeps email value | `SignupPage.tsx` validates `password !== confirmPassword`, sets `errorMsg`, aborts submission |
| **TC-B02** | Weak Password Validation (< 6 chars) | Matches `/at least 6 characters\|weak password/i`, halts submission | `SignupPage.tsx` checks `password.length < 6`, sets `"Password must be at least 6 characters."` |
| **TC-B03** | Invalid Email Format Handling | Rejects `not-an-email`, no auth user, halts submission | `SignupPage.tsx` regex checks email format before calling auth |
| **TC-B07** | Google Popup Closed by User | Displays `"Google Sign-In popup was closed."`, button remains enabled | `LoginPage.tsx` catches `auth/popup-closed-by-user`, sets specific error |
| **TC-B08** | Unauthorized Dashboard Access Redirect | Unauthenticated visitor to `/dashboard` redirected to `/login` | `App.tsx` guard detects `!currentUser`, renders `LoginPage` and navigates to `/login` |
| **TC-B09** | Direct URL Guard for Unverified Users | Unverified visitor to `/dashboard` redirected to `/login` with exact message | `App.tsx` guard detects `!currentUser.emailVerified`, sets `authError`, renders `LoginPage` |
| **TC-C01** | Google Sign-In with Existing Email Linking | Links Google provider to existing email account, routes to dashboard | `loginWithGoogle` queries by email, updates `authProviders: ['password', 'google.com']` |
| **TC-C02** | Incomplete Google Profile Blocked on Email Login | Exact error: `"Email already exists. Please complete your profile to sign in with email."` | `loginWithEmail` queries Firestore for email before signin, blocks if `isProfileComplete === false` |
| **TC-R01** | Aspirant Email/Password Lifecycle | Signup -> verify -> premature block -> login -> dashboard -> signout | End-to-end integration of all R1 methods and guards |
| **TC-R03** | Incomplete Profile Recovery | Google -> abandon -> email login blocked -> Google re-entry -> complete -> email works | Seamless coordination of incomplete profile gating and provider linking |

---

## 5. Implementation Instructions for Implementer Agent

1. **Create `frontend/codes/src/pages/SignupPage.tsx`**:
   - Implement the complete form with email, password, confirmPassword, eye toggles, error banner, submit button, and Google Sign-In button as specified in Section 3.1.
2. **Update `frontend/codes/src/firebase.ts`**:
   - Export missing modular methods required across the app (`deleteUser`, `updatePassword`, `linkWithCredential`, `deleteDoc`, `runTransaction`).
3. **Update `frontend/codes/src/context/AppContext.tsx`**:
   - Add `currentPath` initial sync and `popstate` listener.
   - Add `authError` and `setAuthError` to context.
   - Update `signupWithEmail` with top-level Firestore schema and immediate `signOut`.
   - Update `loginWithEmail` with incomplete Google profile pre-check and unverified error message.
   - Update `loginWithGoogle` with account linking and profile completion redirection.
4. **Update `frontend/codes/src/App.tsx`**:
   - Add routes for `/signup` (`<SignupPage />`) and `/complete-profile` (`<ProfileCompletionPage />`).
   - Implement route guards in `MainRouter` for `/dashboard` enforcing authentication and verification.
5. **Update `frontend/codes/src/pages/LoginPage.tsx`**:
   - Wire `authError` from `useApp()` into error banner display and clear on user input.
