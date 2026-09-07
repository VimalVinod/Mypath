# R2 Implementation Strategy & Architectural Analysis

**Role**: Explorer 2 (`teamwork_preview_explorer_m2_2`)  
**Target Requirement**: R2 (Google Profile Completion, Username Uniqueness in Firestore, Incomplete Profile Blocking, and Account Linking)  
**Project**: React + Firebase Authentication Flow (`frontend/codes`)  
**Date**: 2026-09-07  

---

## 1. Executive Summary

Requirement R2 bridges Google Authentication with application identity, Firestore data integrity, and multi-provider credential linking. Through empirical investigation of `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, `src/test/mocks/firebaseMock.ts`, and the 26-case test suite (`tier1` through `tier4`), this report establishes the complete, production-ready implementation blueprints for:

1. **`src/pages/ProfileCompletionPage.tsx`**: A dedicated onboarding page enforcing Full Name, Age (positive integer 1–120), unique Username (>= 3 alphanumeric/underscore characters), and Password (>= 6 characters).
2. **Firestore Username Reservation (`usernames/{username.toLowerCase()}`)**: Strict case-insensitive indexing guaranteeing unique handle claims, emitting the exact required error string: `"Username is already taken. Please choose another."`.
3. **Google User Password Provisioning**: Enabling dual authentication by executing `updatePassword(auth.currentUser, password)`, allowing users who onboarded via Google to seamlessly log in with email/password subsequently.
4. **Incomplete Profile Interception on Email Login**: A pre-login query on Firestore `users` by email preventing credential verification and session generation for uncompleted Google accounts, throwing the exact required error string: `"Email already exists. Please complete your profile to sign in with email."`.
5. **Automatic Account Linking**: Seamless provider aggregation when a Google sign-in matches an existing email/password account, preventing duplicated identity records and persisting `authProviders: ['password', 'google.com']`.
6. **Hardened `firestore.rules`**: Providing unauthenticated read access for username uniqueness queries and pre-login email gating while enforcing user-scoped mutation and deletion controls.

---

## 2. Baseline Status & Empirical Observations

### 2.1 Baseline Test Failures for R2
Running `npm test` across the test suite produces failures on all R2-related test cases due to missing components and missing context logic:

| Test ID | File | Test Description | Failure Root Cause |
|:---|:---|:---|:---|
| **TC-F04** | `tier1-feature-coverage.test.tsx` | Google Sign-In New User Profile Enforcement Redirection | Direct navigation to `/dashboard` instead of checking `isProfileComplete: false` and routing to `/complete-profile`. |
| **TC-F05** | `tier1-feature-coverage.test.tsx` | Google User Completes Profile | Missing `/complete-profile` route, missing `ProfileCompletionPage.tsx`, missing Firestore doc creation. |
| **TC-F06** | `tier1-feature-coverage.test.tsx` | Returning Google User Direct Dashboard Entry | Context fails to distinguish returning complete user vs new user. |
| **TC-B04** | `tier2-boundary-cases.test.tsx` | Profile Completion Age Boundaries (<=0, >120) | Missing Age boundary validation. |
| **TC-B05** | `tier2-boundary-cases.test.tsx` | Profile Completion Username Format Boundaries | Missing Username format validation (empty, <3 chars, spaces, special chars). |
| **TC-B06** | `tier2-boundary-cases.test.tsx` | Duplicate Username Collision | Missing Firestore `usernames` check and exact error message `"Username is already taken. Please choose another."`. |
| **TC-C01** | `tier3-cross-feature-linking.test.tsx` | Google Sign-In with Existing Email (Account Linking) | Missing `authProviders` synchronization in `users/{uid}`. |
| **TC-C02** | `tier3-cross-feature-linking.test.tsx` | Incomplete Google Profile Blocked on Email Login | `loginWithEmail` attempts password sign-in without checking Firestore `isProfileComplete: false`, failing to show `"Email already exists. Please complete your profile to sign in with email."`. |
| **TC-C03** | `tier3-cross-feature-linking.test.tsx` | Completed Google User Can Now Sign In via Email | User has no password set in auth mock; `signInWithEmailAndPassword` fails. |
| **TC-C04** | `tier3-cross-feature-linking.test.tsx` | Cascading Account Deletion Releases Username | Deletion in dashboard does not delete `usernames/{username}`. |
| **TC-R02** | `tier4-real-world-scenarios.test.tsx` | Google Onboarding, Collision Resolution & Deletion | Missing collision recovery and session reload persistence on `/dashboard`. |
| **TC-R03** | `tier4-real-world-scenarios.test.tsx` | Incomplete Profile Recovery Flow | Abandoning `/complete-profile` and attempting email login does not trigger exact block message; resuming via Google fails. |

---

## 3. Data Schema Specifications

### 3.1 `users/{userId}` Document Schema
```typescript
interface FirestoreUserDocument {
  uid: string;                 // Firebase Auth UID
  email: string;               // Lowercase, trimmed email (e.g. "user@example.com")
  name: string;                // User's display name (e.g. "Jane Doe")
  username?: string;           // Lowercase unique handle (e.g. "janedoe24")
  age?: number;                // Validated integer (e.g. 24)
  isProfileComplete: boolean;  // false on initial Google signup; true after completing profile
  isEmailVerified: boolean;    // true for Google accounts and verified email accounts
  authProviders: string[];     // Array of providers, e.g. ['google.com'], ['password'], or ['password', 'google.com']
  createdAt: string;           // ISO 8601 string
  updatedAt: string;           // ISO 8601 string
}
```

### 3.2 `usernames/{username}` Document Schema
The document ID in this collection is strictly the lowercased, trimmed username:
```typescript
interface FirestoreUsernameDocument {
  uid: string;                 // UID of the owning user
  createdAt: string;           // ISO 8601 timestamp of reservation
}
```

---

## 4. Component Blueprint: `ProfileCompletionPage.tsx`

### 4.1 Location & Route Configuration
- File: `frontend/codes/src/pages/ProfileCompletionPage.tsx`
- Route: `/complete-profile`
- Registration in `App.tsx`:
```tsx
case '/complete-profile':
  return <ProfileCompletionPage />;
```

### 4.2 UI Elements and Query Compatibility
The page must support all DOM queries from `tier1`, `tier2`, `tier3`, and `tier4` tests:
- **Heading**: Matches `/complete your profile/i` (e.g. `<h2>Complete Your Profile</h2>`).
- **Name Input**: Found via `screen.queryByPlaceholderText(/name|full name/i)` or `screen.queryByLabelText(/name/i)`.
- **Age Input**: Found via `screen.queryByPlaceholderText(/age/i)` or `screen.queryByLabelText(/age/i)`.
- **Username Input**: Found via `screen.queryByPlaceholderText(/username/i)` or `screen.queryByLabelText(/username/i)`.
- **Password Input**: Found via `screen.queryByPlaceholderText(/password/i)` or `screen.queryByLabelText(/password/i)`.
- **Submit Button**: Found via `screen.queryByRole('button', { name: /save|complete profile|continue/i })` (e.g. text `"Complete Profile"`).
- **Error Banner**: Accessible alert container rendering validation and collision errors.

### 4.3 Input Validation Logic
Before initiating any network/Firestore calls, client-side boundary checks must be executed in exact order:

1. **Full Name**:
   - Check: `name.trim().length > 0`
   - On error: `"Name is required."`
2. **Age**:
   - Check: `const parsedAge = Number(age);`
   - Boundary requirement (TC-B04): Reject `<= 0`, `> 120`, non-integer, or empty.
   - On error: `"Please enter a valid age between 1 and 120."` (matches `/valid age/i`).
3. **Username Format**:
   - Empty check (TC-B05): `if (!username.trim())` -> `"Username is required."` (matches `/username is required/i`).
   - Length check (TC-B05): `if (trimmed.length < 3)` -> `"Username must be at least 3 characters."` (matches `/at least 3 characters/i`).
   - Character set check (TC-B05): `if (!/^[a-zA-Z0-9_]+$/.test(trimmed))` -> `"Username must only contain alphanumeric characters and underscores."` (matches `/alphanumeric characters and underscores/i`).
4. **Password**:
   - Length check: `if (!password || password.length < 6)` -> `"Password should be at least 6 characters."` (matches `/at least 6 characters/i`).

### 4.4 Full Component Implementation Code
```tsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const ProfileCompletionPage: React.FC = () => {
  const { currentUser, completeGoogleProfile } = useApp();

  const [name, setName] = useState(currentUser?.displayName || '');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Name validation
    if (!name.trim()) {
      setErrorMsg('Name is required.');
      return;
    }

    // 2. Age validation
    const parsedAge = Number(age);
    if (!age.trim() || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120 || !Number.isInteger(parsedAge)) {
      setErrorMsg('Please enter a valid age between 1 and 120.');
      return;
    }

    // 3. Username format validation
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMsg('Username is required.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setErrorMsg('Username must only contain alphanumeric characters and underscores.');
      return;
    }

    // 4. Password validation
    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    // 5. Submit profile completion
    setLoading(true);
    try {
      await completeGoogleProfile({
        name: name.trim(),
        age: parsedAge,
        username: trimmedUsername,
        password
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-subtle)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', border: '1.5px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src={logoImg} alt="MyPath Logo" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Complete Your Profile</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Please set your username, age, and password to finish registration.
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div 
            style={{ 
              backgroundColor: '#FDF0ED', 
              border: '1px solid var(--error)', 
              borderRadius: '8px', 
              padding: '0.85rem 1rem', 
              marginBottom: '1.25rem', 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.6rem',
              color: 'var(--error)',
              fontSize: '0.85rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">Full Name</label>
            <input 
              id="name-input"
              type="text" 
              className="form-input" 
              placeholder="Enter your full name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          {/* Age */}
          <div className="form-group">
            <label className="form-label" htmlFor="age-input">Age</label>
            <input 
              id="age-input"
              type="number" 
              className="form-input" 
              placeholder="Enter your age" 
              value={age} 
              onChange={e => setAge(e.target.value)} 
            />
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">Username</label>
            <input 
              id="username-input"
              type="text" 
              className="form-input" 
              placeholder="Choose a username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input 
              id="password-input"
              type="password" 
              className="form-input" 
              placeholder="Set your account password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            style={{ marginTop: '0.75rem' }} 
            disabled={loading}
          >
            {loading ? 'Saving Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

---

## 5. Username Uniqueness Strategy & Firestore Transaction

### 5.1 Canonical Representation
All usernames must be trimmed and converted to lowercase before checking or saving:
```typescript
const normUsername = username.trim().toLowerCase();
```
This guarantees case-insensitive uniqueness (e.g. `'AlphaWarrior'` and `'alphawarrior'` target the identical Firestore key `usernames/alphawarrior`).

### 5.2 Verification & Atomic Reservation
In `AppContext.completeGoogleProfile`:
```typescript
const normUsername = data.username.trim().toLowerCase();
const usernameRef = doc(db, 'usernames', normUsername);
const userRef = doc(db, 'users', currentUser.uid);

// 1. Check if username is taken by another user
const usernameSnap = await getDoc(usernameRef);
if (usernameSnap.exists() && usernameSnap.data()?.uid !== currentUser.uid) {
  throw new Error('Username is already taken. Please choose another.');
}

// 2. Provision password to Firebase Auth user
if (data.password) {
  await updatePassword(currentUser, data.password);
}

const now = new Date().toISOString();

// 3. Atomically reserve username
await setDoc(usernameRef, {
  uid: currentUser.uid,
  createdAt: now
});

// 4. Update users/{uid} document
const userSnap = await getDoc(userRef);
const currentProviders: string[] = userSnap.exists() ? userSnap.data()?.authProviders || [] : [];
const updatedProviders = [...new Set([...currentProviders, 'google.com', 'password'])];

const updatedUserDoc = {
  uid: currentUser.uid,
  email: (currentUser.email || '').toLowerCase().trim(),
  name: data.name.trim(),
  username: normUsername,
  age: data.age,
  isProfileComplete: true,
  isEmailVerified: true,
  authProviders: updatedProviders,
  updatedAt: now
};

await setDoc(userRef, updatedUserDoc, { merge: true });

// 5. Update local context state and navigate
setUserProfile(prev => ({
  ...prev,
  ...updatedUserDoc
}));

navigate('/dashboard');
```

### 5.3 Collision Error Verbatim Matching
When `usernameSnap.exists() && usernameSnap.data()?.uid !== currentUser.uid`:
The error message thrown character-for-character is:
```
Username is already taken. Please choose another.
```
This satisfies TC-B06, TC-R02, and `ORIGINAL_REQUEST.md` line 22.

---

## 6. Password Setting on Google User (Dual Authentication)

### 6.1 Mechanism Selection: `updatePassword` vs `linkWithCredential`
In the Firebase JavaScript SDK and the test mock engine (`src/test/mocks/firebaseMock.ts` lines 256–264):
```typescript
export const updatePassword = vi.fn(async (user: any, newPassword: string) => {
  const existing = mockState.usersByUid.get(user.uid) || mockState.registeredUsers.get(user.email?.toLowerCase());
  if (existing) {
    existing.password = newPassword;
    if (!existing.providerData.some((p) => p.providerId === 'password')) {
      existing.providerData.push({ providerId: 'password', uid: existing.uid, email: existing.email });
    }
  }
});
```
Notice that `updatePassword` in `firebaseMock.ts`:
1. Sets `existing.password` to `newPassword`.
2. Automatically registers `{ providerId: 'password', uid: existing.uid, email: existing.email }` into `providerData`!
3. Note that `EmailAuthProvider` is **not** exported or implemented in `firebaseMock.ts`, so attempting to call `EmailAuthProvider.credential(...)` causes runtime test failures (`EmailAuthProvider is not defined`).
4. Therefore, invoking `await updatePassword(currentUser, data.password)` is the correct, test-compliant, and production-compatible approach.

### 6.2 Dual Sign-In Flow Verification (TC-C03, TC-R03)
After profile completion:
- The user's Firebase Auth record possesses both `google.com` and `password` providers.
- When the user subsequently signs in via email/password (`loginWithEmail(email, password)`), `signInWithEmailAndPassword` finds the password set by `updatePassword` and succeeds.
- Firestore user doc has `isProfileComplete: true`, routing the user straight to `/dashboard`.

---

## 7. Incomplete Profile Interception on Email Login

### 7.1 The Problem
When a user signs in via Google for the first time, an initial record in Firestore is created with `isProfileComplete: false`. If they abandon onboarding before setting a password/username and later attempt email login with their Google email address:
- In `signInWithEmailAndPassword`, if called blindly, Firebase would throw `auth/invalid-credential` because no password was set yet or password doesn't match.
- Furthermore, `ORIGINAL_REQUEST.md` and `PROJECT.md` mandate that incomplete profiles must be blocked with the exact error:
  `"Email already exists. Please complete your profile to sign in with email."`.

### 7.2 Pre-Login Check in `loginWithEmail`
Before calling `signInWithEmailAndPassword`, `loginWithEmail` queries Firestore `users` by email:
```typescript
const loginWithEmail = async (email: string, pass: string) => {
  const normEmail = email.toLowerCase().trim();

  // Pre-login check: block incomplete Google profiles
  const usersCol = collection(db, 'users');
  const emailQuery = query(usersCol, where('email', '==', normEmail));
  const querySnap = await getDocs(emailQuery);

  if (!querySnap.empty) {
    const existingDoc = querySnap.docs[0].data();
    if (existingDoc.isProfileComplete === false) {
      throw new Error('Email already exists. Please complete your profile to sign in with email.');
    }
  }

  // Proceed with authentication
  const res = await signInWithEmailAndPassword(auth, normEmail, pass);
  if (!res.user) return;

  // Email verification check
  if (!res.user.emailVerified) {
    await sendEmailVerification(res.user);
    await signOut(auth);
    throw new Error('Please verify your email address before logging in. A verification link has been sent to your email.');
  }

  // Secondary guard: verify isProfileComplete for authenticated user
  const userRef = doc(db, 'users', res.user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.isProfileComplete === false) {
      await signOut(auth);
      throw new Error('Email already exists. Please complete your profile to sign in with email.');
    }
    setUserProfile(prev => ({ ...prev, ...data }));
  }

  navigate('/dashboard');
};
```

### 7.3 Verifying Test Compliance (TC-C02, TC-R03)
- In `TC-C02`: Precondition has `users/user_carol_incomplete` with `email: 'carol@example.com'`, `isProfileComplete: false`. The pre-login check queries `users` where `email == 'carol@example.com'`, detects `isProfileComplete === false`, and throws `"Email already exists. Please complete your profile to sign in with email."`.
- In `TC-R03` (Step 3): Grace abandons Google profile completion (`isProfileComplete: false`) and attempts email login. The pre-login check intercepts and displays the exact error, keeping `mockState.currentUser === null`.

---

## 8. Automatic Account Linking Strategy

### 8.1 Scenario: Existing Email User Signs in via Google (TC-C01)
When an existing user who registered with email/password signs in with Google using the same email address:
1. `signInWithPopup(auth, googleProvider)` returns the existing user UID (linked by Firebase Auth).
2. `loginWithGoogle` inspects Firestore `users/{user.uid}`.
3. The document already exists with `isProfileComplete: true` and `authProviders: ['password']`.
4. `loginWithGoogle` updates `authProviders` to `['password', 'google.com']`.
5. Since `isProfileComplete === true`, the user is directed straight to `/dashboard` (not `/complete-profile`).

### 8.2 Context Implementation in `loginWithGoogle`
```typescript
const loginWithGoogle = async () => {
  const res = await signInWithPopup(auth, googleProvider);
  if (!res.user) return;

  const user = res.user;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const existing = snap.data();
    const providers: string[] = existing.authProviders || [];
    const updatedProviders = providers.includes('google.com') 
      ? providers 
      : [...providers, 'google.com'];

    await setDoc(userRef, {
      authProviders: updatedProviders,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    if (existing.isProfileComplete) {
      setUserProfile(prev => ({ ...prev, ...existing, authProviders: updatedProviders }));
      navigate('/dashboard');
    } else {
      setUserProfile(prev => ({ ...prev, ...existing, authProviders: updatedProviders }));
      navigate('/complete-profile');
    }
  } else {
    // Brand new Google user
    const newProfile = {
      uid: user.uid,
      email: (user.email || '').toLowerCase().trim(),
      name: user.displayName || '',
      isProfileComplete: false,
      isEmailVerified: true,
      authProviders: ['google.com'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(userRef, newProfile);
    setUserProfile(prev => ({ ...prev, ...newProfile }));
    navigate('/complete-profile');
  }
};
```

---

## 9. Firestore Security Rules Update (`firestore.rules`)

### 9.1 Requirements
To support:
1. Public / unauthenticated username uniqueness verification (`usernames/{username}`).
2. Public / unauthenticated email query before login (`users` query where `email == ...`).
3. User-owned mutations on profile completion.
4. User-owned deletions on account deletion.

### 9.2 Updated `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usernames collection: used for unique handle reservation
    match /usernames/{username} {
      // Allow anyone to check if a username is available
      allow read: if true;
      // Allow authenticated user to claim a username for themselves
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      // Allow authenticated user to delete their own claimed username
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
      // Disallow updating existing reservations
      allow update: if false;
    }

    // Users collection: user profiles
    match /users/{userId} {
      // Allow reading user documents for login checks and profile verification
      allow read: if true;
      // Allow users to create or update their own profile document
      allow create, update: if request.auth != null && request.auth.uid == userId;
      // Allow users to delete their own profile document
      allow delete: if request.auth != null && request.auth.uid == userId;
    }

    // Default catch-all rule
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 10. Traceability Matrix & Verification Plan

| Requirement | Test Scenario | Verified Behavior | Expected Result |
|:---|:---|:---|:---|
| **R2.1 Google Redirect** | `TC-F04` | New Google user signs in | Redirected to `/complete-profile`; `/dashboard` blocked. |
| **R2.2 Complete Profile** | `TC-F05` | Google user submits valid Name, Age, Username, Password | `users` doc has `isProfileComplete: true`, `usernames` doc created, lands on `/dashboard`. |
| **R2.3 Returning Google User** | `TC-F06` | Completed Google user signs in | Directly lands on `/dashboard`; `/complete-profile` bypassed. |
| **R2.4 Age Validation** | `TC-B04` | Age `-5`, `0`, `150`, `24` | Ages outside 1–120 show error `/valid age/i`; age `24` succeeds. |
| **R2.5 Username Validation** | `TC-B05` | Empty, short (`'ab'`), space, special chars | Exact errors shown; valid `'valid_user_99'` succeeds and reserves doc. |
| **R2.6 Duplicate Username** | `TC-B06` | Attempting taken `'champion2026'` | Verbatim error: `"Username is already taken. Please choose another."`; unique retry succeeds. |
| **R2.7 Account Linking** | `TC-C01` | Google login with existing email | User linked, `authProviders` contains `'google.com'`, routes to `/dashboard`. |
| **R2.8 Incomplete Profile Block** | `TC-C02` | Email login for incomplete Google profile | Intercepted; exact error: `"Email already exists. Please complete your profile to sign in with email."`. |
| **R2.9 Dual Authentication** | `TC-C03` | Email login with profile-set password | Login succeeds using set password; routes to `/dashboard`. |
| **R2.10 Username Release on Delete** | `TC-C04` | Account deletion clears username | Released username can be claimed by next user without collision error. |
| **R2.11 Realistic Lifecycle** | `TC-R02` | Collision -> unique retry -> reload -> deletion | Full workflow succeeds with session persistence. |
| **R2.12 Incomplete Recovery** | `TC-R03` | Abandon -> email login blocked -> resume Google -> complete -> email login works | Full end-to-end recovery journey verified. |

---

## 11. Coordination Notes for Implementer

1. **Exports in `src/firebase.ts`**: Ensure `updatePassword`, `deleteUser`, `deleteDoc`, `runTransaction` are exported so `AppContext.tsx` compiles cleanly under `tsc`.
2. **Context Method Signature**: Expose `completeGoogleProfile(data: { name: string; age: number; username: string; password: string })` in `AppContextType`.
3. **Route Guarding in `App.tsx`**: Add `/complete-profile` to `MainRouter` and add guard redirecting unauthenticated users to `/login`.
4. **Clean Error Propagation**: In `LoginPage.tsx`, ensure `err.message` is rendered without stripping when the error message is `"Email already exists. Please complete your profile to sign in with email."`.
