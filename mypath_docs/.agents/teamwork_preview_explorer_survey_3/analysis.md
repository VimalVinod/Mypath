# Comprehensive Testing & Architecture Survey Analysis: Authentication Flow

**Author**: Explorer 3 (`teamwork_preview_explorer`)  
**Date**: 2026-09-07  
**Scope**: Testing Environment, Frameworks, Build Scripts, Mocks, Emulators, and 4-Tier Test Architecture for React + Firebase Authentication  
**Working Directory**: `c:\Users\sindh\Documents\codes\mypath\frontend\codes`  
**Authoritative Reference**: `c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md`

---

## 1. Executive Summary

This survey provides an exhaustive evaluation of the testing infrastructure, build pipelines, dependencies, and architectural requirements for implementing and rigorously verifying the authentication system requested in `ORIGINAL_REQUEST.md`.

### Key Findings at a Glance:
1. **Testing Vacuum**: The repository currently has **zero tests**, **no test runner** (no Vitest, Jest, Cypress, or Playwright), **no testing utilities** (`@testing-library/react`), and **no test scripts** in `package.json`.
2. **Build Integrity**: The existing project builds cleanly with `npm run build` (`tsc && vite build`) in ~5.5 seconds with zero compilation errors on Node v24.13.0, TypeScript 5.9.3, and Vite 5.4.21.
3. **Environment Tools Available**:
   - Node.js: `v24.13.0`
   - npm: `11.6.2`
   - Java: `25.0.1 LTS` (compatible with Firebase Local Emulator Suite)
   - Firebase CLI: `15.18.0` (installed globally on the host)
4. **Current Auth Code Gaps**: The existing `AppContext.tsx` and `LoginPage.tsx` contain preliminary stubs for basic email sign-in/sign-up and Google popup sign-in, but fail to meet the specific requirements of `ORIGINAL_REQUEST.md`:
   - No password confirmation on signup.
   - No dedicated `/signup` page (routing defaults back to LandingPage).
   - No mandatory Google Profile Completion step (Name, Age, unique Username verified against Firestore, set Password).
   - No account linking between Google accounts and existing email accounts.
   - No blocking of incomplete Google profiles trying to log in via email with the exact required string: `"Email already exists. Please complete your profile to sign in with email."`.
   - Main dashboard has not been replaced with the temporary testing dummy dashboard (displaying user name, Sign Out, and permanent Delete Account).
   - No route protection in `App.tsx` (unauthenticated users can directly render `/dashboard`).
5. **Recommended Testing Architecture**: A robust **Vitest + React Testing Library + JSDOM** in-memory architecture paired with a high-fidelity Firebase Auth & Firestore mock system. This enables running 100% deterministic, ultra-fast (<3s total) tests across all 4 tiers without network flakes or Firebase quota issues.

---

## 2. Codebase Structure & Testing Environment Survey

### 2.1 Directory Structure
The repository is split into:
```
mypath/
├── .agents/                               # Agent coordination & metadata
├── ORIGINAL_REQUEST.md                    # Authoritative user requirements
└── frontend/
    ├── package.json                       # Script forwarder (runs --prefix codes)
    ├── README.md                          # Project documentation
    ├── resources/                         # SRS, banners, context
    └── codes/                             # Active Application Root
        ├── index.html                     # HTML entry point
        ├── firebase.json                  # Firebase hosting & firestore rules
        ├── firestore.rules                # Database security rules
        ├── package.json                   # Dependencies and npm scripts
        ├── tsconfig.json                  # TypeScript bundler configuration
        ├── vite.config.ts                 # Vite bundler configuration
        └── src/
            ├── App.tsx                    # Client-side router switch
            ├── main.tsx                   # React root mount
            ├── firebase.ts                # Firebase client SDK initialization
            ├── context/
            │   └── AppContext.tsx         # Global auth and app state
            ├── pages/
            │   ├── LandingPage.tsx        # Landing view
            │   ├── LoginPage.tsx          # Login view
            │   └── DashboardPage.tsx      # Main application dashboard
            ├── components/                # Navbar, Footer, ExamCard, etc.
            ├── data/                      # Mock exam and question data
            └── types/                     # TypeScript data contracts
```

### 2.2 Package.json Scripts & Dependencies Survey
In `frontend/codes/package.json`:
```json
{
  "name": "mypath",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "deploy": "npm run build && firebase deploy --only hosting"
  },
  "dependencies": {
    "firebase": "^10.8.1",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}
```
**Observations**:
- There is **no `test` script** in either `frontend/package.json` or `frontend/codes/package.json`.
- `npm list --depth=0` reveals:
  - Installed React is `18.3.1`
  - Installed Vite is `5.4.21`
  - Installed TypeScript is `5.9.3`
  - Installed Firebase is `12.17.1` (labeled invalid because `package.json` specifies `^10.8.1`, but functional)
- Zero test packages are installed (`vitest`, `jest`, `@testing-library/react`, `jsdom` are absent).

### 2.3 Firebase Configuration & Emulation Status
- In `frontend/codes/firebase.json`:
  ```json
  {
    "hosting": {
      "public": "dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    "firestore": {
      "rules": "firestore.rules"
    }
  }
  ```
  - **No `emulators` block** is configured in `firebase.json`.
  - Firebase CLI `15.18.0` is globally installed.
  - Java `25.0.1 LTS` is available on the system PATH.
- In `frontend/codes/firestore.rules`:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        allow read, write: if request.auth != null;
      }
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```
  - Rules currently allow any authenticated user to read and write any document.
  - To support unique usernames, a dedicated collection (e.g. `usernames/{username}`) can be accessed by authenticated users during Google profile completion.

---

## 3. Analysis of Existing Authentication Implementation vs. Requirements

| Requirement from ORIGINAL_REQUEST.md | Current Implementation Status | Gap / Defect |
|---|---|---|
| **R1. Email/Password Sign-Up with Password Confirmation** | `signupWithEmail` exists in `AppContext.tsx` taking only `(email, pass)`. No password confirmation field or validation exists. | No `/signup` page in router. Missing confirm password UI, client-side match check, and error messaging. |
| **R1. Firebase Email Verification Enforcement** | `sendEmailVerification` is called upon signup and user is signed out. Login checks `res.user.emailVerified`. | Partially present, but `AppContext.tsx` auth listener sets `currentUser = null` silently if unverified without clear messaging to the user during session re-evaluation. |
| **R1. Google Sign-In** | `loginWithGoogle` uses `signInWithPopup(auth, googleProvider)`. | Present, but immediately sets default profile and redirects to `/dashboard`, bypassing mandatory profile completion. |
| **R2. Account Linking (Google to Email)** | Not implemented. | If a user with an existing email/password signs in with Google, no linking logic exists (`auth/account-exists-with-different-credential` or linking existing credentials). |
| **R2. Google Profile Completion Enforcement** | Not implemented. | User is not routed to a profile completion view. Name, Age, unique Username (checked against Firestore), and Password are not collected or enforced. |
| **R2. Username Uniqueness Check in Firestore** | Not implemented. | No queries to Firestore (`usernames` collection or `query(users, where('username', '==', ...))`) exist. |
| **R2. Password Set during Google Profile Completion** | Not implemented. | No mechanism sets or links email/password credentials to the Google account (`updatePassword` or `linkWithCredential`). |
| **R2. Block Incomplete Google Profile on Email Login** | Not implemented. | Attempting email login with an incomplete Google account throws a standard Firebase error rather than the required specific message: `"Email already exists. Please complete your profile to sign in with email."`. |
| **R3. Dummy Testing Dashboard** | Not implemented. | Current `DashboardPage.tsx` is the complex government exam platform dashboard. Must be replaced with the temporary testing dummy dashboard. |
| **R3. Display Logged-in User Name** | Partial. | Shows `Welcome back, Candidate` or `userProfile.name`, but inside the full app dashboard. |
| **R3. Sign Out Button (Session Persistence Test)** | Present in `AppContext.tsx` as `logoutUser`, but in Navbar profile menu rather than prominently on the dummy dashboard. | Needs prominent placement on the dummy dashboard to test session persistence. |
| **R3. Delete Account Button (Auth + Firestore Permanent Removal)** | Not implemented. | No account deletion method exists in `AppContext.tsx` or `firebase.ts`. Must delete user record from Firestore and call `deleteUser(auth.currentUser)`. |
| **R3. Dashboard Direct Access Route Guard** | Not implemented. | In `App.tsx`, `currentPath === '/dashboard'` directly renders `DashboardPage` regardless of `currentUser` or auth state. Must redirect unauthenticated users to `/login`. |

---

## 4. Test Framework Evaluation & Selection

### 4.1 Comparison of Testing Frameworks

| Criterion | Vitest + React Testing Library | Jest + RTL | Playwright (E2E) | Cypress (E2E) |
|---|---|---|---|---|
| **Vite Integration** | Native (shares `vite.config.ts`, aliases, transforms) | Difficult (requires babel-jest / ts-jest transform duplication) | Standalone browser runner | Standalone browser runner |
| **Execution Speed** | Extremely fast (ESM workers, in-memory DOM) | Moderate to slow (CommonJS translation overhead) | Slower (spawns real browser processes) | Slowest (browser-heavy GUI runner) |
| **Setup Complexity** | Low (single package + config flag) | High (lots of config polyfills) | Medium (browser binaries required) | Medium-High (large download) |
| **Determinism** | 100% deterministic with in-memory mocks | 100% deterministic | Subject to port conflicts & timeouts | Subject to flakiness & timeouts |
| **CI Compatibility** | Lightweight, runs in any container | Lightweight | Requires browser dependencies | Requires Xvfb / heavy libs |
| **Ideal Role in Project** | **Primary Unit & Integration Framework (Tiers 1–3, simulated 4)** | Redundant with Vitest | **Secondary E2E Validation (Tier 4 live browser)** | Redundant with Playwright |

### 4.2 Recommended Tooling Architecture
1. **Primary Test Engine**: `vitest` with `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, and `jsdom`.
   - **Rationale**: The project already uses Vite 5. Vitest integrates seamlessly with Vite's build pipeline, understands React 18 JSX, ESM imports, and TypeScript out of the box.
2. **Mocking Engine**: An in-memory, high-fidelity Firebase Auth and Firestore mock harness (`src/test/mocks/firebaseMock.ts`).
   - This allows testing edge cases like network failure, unverified email states, account linking errors, and duplicate usernames in milliseconds without running live Firebase services.
3. **Optional E2E Tier**: Playwright can run against a Vite preview/dev server connected to the Firebase Emulator Suite if full multi-browser visual verification is desired. However, Vitest integration tests covering full simulated browser sessions (local storage, navigation, state transitions) provide complete verification of all acceptance criteria.

### 4.3 Dependencies Required for Automated Testing
To install in `frontend/codes/`:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 4.4 Proposed Test Scripts for `package.json`
In `frontend/codes/package.json`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "deploy": "npm run build && firebase deploy --only hosting",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```
In root `frontend/package.json`:
```json
"scripts": {
  "dev": "npm --prefix codes run dev",
  "build": "npm --prefix codes run build",
  "preview": "npm --prefix codes run preview",
  "test": "npm --prefix codes run test"
}
```

---

## 5. Mocking Strategy & Firebase Emulation Architecture

### 5.1 In-Memory Mock Architecture (Recommended for CI & Local Automated Testing)

To achieve fast, non-flaky, deterministic tests across all 4 tiers, we design an in-memory Firebase mock module.

#### Auth State Machine Mock:
```typescript
interface MockFirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  providerData: Array<{ providerId: string; uid: string; email: string | null }>;
  delete: () => Promise<void>;
  reload: () => Promise<void>;
}
```
The mock maintains:
- `currentMockUser: MockFirebaseUser | null`
- `registeredUsers: Map<string, { email: string; password: string; user: MockFirebaseUser; profileIncomplete?: boolean }>`
- `authListeners: Array<(user: MockFirebaseUser | null) => void>`
- Functions:
  - `createUserWithEmailAndPassword(auth, email, password)`
  - `signInWithEmailAndPassword(auth, email, password)`
  - `signInWithPopup(auth, provider)`
  - `sendEmailVerification(user, actionCodeSettings)`
  - `linkWithCredential(user, credential)`
  - `signOut(auth)`
  - `deleteUser(user)`
  - `onAuthStateChanged(auth, callback)`

#### Firestore In-Memory Store Mock:
- Maintains an in-memory document tree: `Map<string, Record<string, any>>` representing collections:
  - `users/{uid}`: Holds `{ userProfile, trackerItems, ... }`
  - `usernames/{username}`: Holds `{ uid, createdAt }` for instantaneous O(1) uniqueness checks
- Functions:
  - `doc(db, collectionName, id)`
  - `setDoc(docRef, data, options)`
  - `getDoc(docRef)`
  - `deleteDoc(docRef)`
  - `collection(db, collectionName)`
  - `query(collectionRef, ...constraints)`
  - `where(field, op, value)`
  - `getDocs(queryRef)`

### 5.2 Firebase Local Emulator Suite (Alternative / Staging E2E)
If the team desires to test against the real Firebase engine:
1. Update `firebase.json`:
   ```json
   {
     "hosting": { "public": "dist", ... },
     "firestore": { "rules": "firestore.rules" },
     "emulators": {
       "auth": { "port": 9099 },
       "firestore": { "port": 8080 },
       "ui": { "enabled": true, "port": 4000 }
     }
   }
   ```
2. Update `frontend/codes/src/firebase.ts`:
   ```typescript
   import { connectAuthEmulator } from 'firebase/auth';
   import { connectFirestoreEmulator } from 'firebase/firestore';

   if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
     connectAuthEmulator(auth, 'http://127.0.0.1:9099');
     connectFirestoreEmulator(db, '127.0.0.1', 8080);
   }
   ```
3. Run `firebase emulators:start --only auth,firestore`.
Since Java 25 is installed, Firestore and Auth emulators can start without dependency issues.

---

## 6. Comprehensive 4-Tier Test Suite Specification

Here is the exhaustive test suite blueprint designed to verify all requirements and edge cases.

```
========================================================================================
                                 4-TIER TEST ARCHITECTURE
========================================================================================
 [TIER 1: Feature Coverage]          -> Happy paths: Sign-up, Email Verify, Google,
                                        Dashboard, Sign-out, Account Deletion
 [TIER 2: Boundary & Corner Cases]   -> Password mismatch, weak pass, unverified login,
                                        age/username limits, duplicate username, popup cancel
 [TIER 3: Cross-Feature & Linking]   -> Google + Email account linking, incomplete profile
                                        email block with EXACT error string, cascading deletion
 [TIER 4: Real-World Scenarios]      -> Full user lifecycles, reload session persistence,
                                        abandoned onboarding recovery
========================================================================================
```

### 6.1 Tier 1: Feature Coverage (Core Functional Happy Paths)

| Test ID | Test Name | Target Requirement | Preconditions | Test Steps & Input | Expected Assertions |
|---|---|---|---|---|---|
| **TC-F01** | Email/Password Sign-Up Happy Path | R1: Email signup, verification link | User on `/signup` | 1. Enter email `test@example.com`<br>2. Enter password `Password123!`<br>3. Enter confirm password `Password123!`<br>4. Click Submit | - `createUserWithEmailAndPassword` is called<br>- `sendEmailVerification` is dispatched<br>- User is signed out immediately<br>- UI shows verification prompt banner<br>- User cannot access `/dashboard` |
| **TC-F02** | Unverified Email Login Block | R1: Email verification required | Account created but `emailVerified === false` | 1. Go to `/login`<br>2. Enter email and password<br>3. Click Log In | - Login is rejected<br>- Error alert indicates email is unverified<br>- `sendEmailVerification` is triggered again<br>- User is signed out; route remains `/login` |
| **TC-F03** | Verified Email Login Happy Path | R1: Verified login | Account exists with `emailVerified === true` | 1. Go to `/login`<br>2. Enter credentials<br>3. Click Log In | - `signInWithEmailAndPassword` succeeds<br>- User state updated in context<br>- Redirected to `/dashboard` |
| **TC-F04** | Google Sign-In New User Profile Enforcement | R1 & R2: Google sign-in & profile completion | New user clicks Google Sign-In | 1. Click "Google Sign In"<br>2. Popup succeeds returning new user | - Detects profile is incomplete<br>- Redirected to `/complete-profile`<br>- Cannot access `/dashboard` yet |
| **TC-F05** | Google User Completes Profile | R2: Profile completion | User on `/complete-profile` | 1. Enter Name "Jane Doe"<br>2. Enter Age "24"<br>3. Enter unique Username "janedoe24"<br>4. Enter Password "SecurePass123!"<br>5. Click Save & Continue | - Username checked in Firestore (`usernames/janedoe24` is free)<br>- Username reserved in Firestore<br>- Password linked/updated to account<br>- Profile status marked complete<br>- Redirected to `/dashboard` |
| **TC-F06** | Returning Google User Direct Entry | R1: Google Sign-In | Returning user with profile already completed | 1. Click "Google Sign In"<br>2. Popup succeeds | - Profile verified as complete in Firestore<br>- Redirected directly to `/dashboard` |
| **TC-F07** | Dummy Dashboard Display | R3: Dummy dashboard with user name | Authenticated user on `/dashboard` | 1. Mount `/dashboard` | - Renders dummy testing interface<br>- Displays user's name prominently<br>- Shows "Sign Out" button<br>- Shows "Delete Account" button |
| **TC-F08** | Sign Out Clears Session | R3: Sign out & session persistence | User on `/dashboard` | 1. Click "Sign Out" | - `signOut(auth)` is called<br>- Storage cleared<br>- `currentUser` reset to null<br>- Redirected to `/` or `/login` |
| **TC-F09** | Delete Account Permanent Removal | R3: Account deletion | User on `/dashboard` | 1. Click "Delete Account"<br>2. Confirm modal | - User document deleted from Firestore `users/{uid}`<br>- Username released from Firestore `usernames/{username}`<br>- `deleteUser(auth.currentUser)` called<br>- Redirected to landing page (`/`) |

---

### 6.2 Tier 2: Boundary & Corner Cases

| Test ID | Test Name | Target Requirement | Preconditions | Test Steps & Input | Expected Assertions |
|---|---|---|---|---|---|
| **TC-B01** | Password Confirmation Mismatch | R1: Password confirmation | User on `/signup` | 1. Password: `Secret123!`<br>2. Confirm: `Secret456!`<br>3. Submit | - Form blocked client-side before calling Firebase<br>- Displays error: "Passwords do not match"<br>- Form retains email |
| **TC-B02** | Weak Password Validation | R1: Auth validation | User on `/signup` or `/complete-profile` | 1. Enter password `123`<br>2. Submit | - Firebase error `auth/weak-password` or client validation catches it<br>- User-friendly error displayed<br>- User not registered |
| **TC-B03** | Invalid Email Format | R1: Auth validation | User on `/login` or `/signup` | 1. Enter email `not-an-email`<br>2. Submit | - HTML5 validation or `auth/invalid-email` triggers<br>- Clear error displayed |
| **TC-B04** | Profile Completion Age Boundaries | R2: Profile enforcement | User on `/complete-profile` | 1. Test Age: `-5`, `0`, `abc`, `150`, `18` | - Non-positive or unrealistic ages rejected with clear field error<br>- Valid age (e.g. 18–100) accepted |
| **TC-B05** | Username Format Boundaries | R2: Username rules | User on `/complete-profile` | 1. Test Username: `""`, `ab`, `user with spaces`, `user@name!` | - Usernames < 3 chars or with spaces/symbols rejected<br>- Alphanumeric and underscores accepted |
| **TC-B06** | Duplicate Username Collision | R2: Firestore uniqueness check | Username `aspirant01` already exists in `usernames` | 1. User enters `aspirant01`<br>2. Submits profile completion | - Firestore query detects conflict<br>- Form displays: "Username already taken. Please choose another."<br>- Profile completion NOT finalized |
| **TC-B07** | Google Sign-In Popup Closed by User | R1: Google Sign-In | User on `/login` | 1. Click "Google Sign In"<br>2. Mock throws `auth/popup-closed-by-user` | - Handled gracefully without app crash<br>- Error alert shows "Google Sign-In popup was closed."<br>- Loading state resets |
| **TC-B08** | Unauthorized Dashboard Access Redirect | R3: Strict session verification | User is unauthenticated (`currentUser === null`) | 1. Direct navigation to `/dashboard` | - Router guard intercepts request<br>- User redirected to `/login`<br>- No flash of dashboard content |
| **TC-B09** | Unverified User Direct Dashboard Access | R1 & R3: Strict verification | User authenticated but `emailVerified === false` | 1. Direct navigation to `/dashboard` | - Router guard intercepts request<br>- User redirected to `/login` with verification required notice |

---

### 6.3 Tier 3: Cross-Feature Combinations & Account Linking Matrix

| Test ID | Test Name | Target Requirement | Preconditions | Test Steps & Input | Expected Assertions |
|---|---|---|---|---|---|
| **TC-C01** | Google Sign-In with Existing Email (Account Linking) | R2: Automatic Account Linking | Account exists for `alex@gmail.com` via Email/Password | 1. User clicks "Google Sign In" with Google account `alex@gmail.com` | - System links Google provider to existing account (or merges profiles)<br>- User retains single consolidated account in Firestore `users/{uid}`<br>- Subsequent logins via either Google or Email/Password succeed |
| **TC-C02** | Incomplete Google Profile Blocked on Email Login | R2: Block email login for incomplete profile | User signed in via Google (`carol@gmail.com`), closed tab before `/complete-profile` | 1. User navigates to `/login`<br>2. Enters `carol@gmail.com` and attempts email login | - Login is strictly blocked<br>- UI displays EXACT message:<br>  `"Email already exists. Please complete your profile to sign in with email."`<br>- User not redirected to dashboard |
| **TC-C03** | Completed Google User Can Now Sign In via Email | R2: Profile completion sets password | Google user finished `/complete-profile` (set password `GooglePass123!`) | 1. User logs out<br>2. Enters Google email + `GooglePass123!` on `/login` | - Email/password login succeeds<br>- User directed to `/dashboard`<br>- User profile data matches |
| **TC-C04** | Cascading Account Deletion Releases Username | R3: Permanent account deletion | User `david` registered with username `david_ace` | 1. User clicks "Delete Account" on dashboard<br>2. New user signs up and requests username `david_ace` | - `users/{uid}` deleted<br>- `usernames/david_ace` deleted<br>- New user successfully claims `david_ace` without collision |
| **TC-C05** | Re-authentication Handling on Stale Session Deletion | R3: Firebase account deletion security | User session is older than re-auth window | 1. Click "Delete Account"<br>2. Mock simulates `auth/requires-recent-login` | - App catches error and prompts user to re-authenticate (or re-signs in)<br>- Deletion executes cleanly once refreshed |

---

### 6.4 Tier 4: Real-World Application Scenarios

| Test ID | Test Name | Description & Scenario Flow | Key Verifications |
|---|---|---|---|
| **TC-R01** | Full Lifecycle 1: Complete Email/Password Aspirant Journey | 1. Aspirant lands on `/`<br>2. Clicks "Get Started Free" / "Sign Up"<br>3. Fills email, password, confirm password<br>4. Sees verification instructions<br>5. Tries premature login (blocked)<br>6. Simulates clicking email verification link (`emailVerified = true`)<br>7. Logs in with credentials<br>8. Arrives at Dummy Dashboard<br>9. Verifies name displayed<br>10. Clicks "Sign Out"<br>11. Arrives at `/` | Full end-to-end state transitions verified across navigation, verification gating, and session teardown. |
| **TC-R02** | Full Lifecycle 2: Google Onboarding, Collision Resolution, Session Persistence & Deletion | 1. Aspirant clicks "Google Sign In"<br>2. Redirected to `/complete-profile`<br>3. Attempts taken username `testuser` -> Collision alert<br>4. Enters unique username `aspirant_2026`, age `22`, password `MySecretPass123!`<br>5. Enters Dummy Dashboard<br>6. Hard reload simulated (session persistence check: `onAuthStateChanged` restores user)<br>7. User remains on Dashboard without redirect<br>8. Clicks "Delete Account" -> Confirmed<br>9. Redirected to Landing Page<br>10. Attempting login again fails | Tests full user lifecycle including error recovery, persistent storage, and destructive cleanup. |
| **TC-R03** | Full Lifecycle 3: Abandoned Google Onboarding Recovery Flow | 1. User signs in with Google, closes browser at `/complete-profile`<br>2. Later returns and tries Email login with that email<br>3. Sees exact block message: `"Email already exists. Please complete your profile to sign in with email."`<br>4. Clicks "Sign in with Google"<br>5. System detects profile still incomplete -> routes back to `/complete-profile`<br>6. User completes profile with password<br>7. User can now sign in via both Google and Email | Verifies cross-feature recovery flow and exact error messaging fidelity. |

---

## 7. Concrete Implementation Roadmap for Downstream Agents

### 7.1 Dependencies to Install
In `frontend/codes/`:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 7.2 Configuration Files to Create
1. **`frontend/codes/vitest.config.ts`**:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './src/test/setup.ts',
       css: false
     }
   });
   ```
2. **`frontend/codes/src/test/setup.ts`**:
   ```typescript
   import '@testing-library/jest-dom';
   ```
3. **`frontend/codes/src/test/mocks/firebaseMock.ts`**:
   Comprehensive in-memory implementation of Firebase Auth and Firestore with state reset utilities (`resetFirebaseMockState()`).

### 7.3 Source Files to Modify / Create (Downstream Implementer Scope)
1. **`frontend/codes/src/firebase.ts`**:
   - Export missing methods: `linkWithCredential`, `EmailAuthProvider`, `deleteUser`, `deleteDoc`, `fetchSignInMethodsForEmail`, `updatePassword`, `updateProfile`.
2. **`frontend/codes/src/context/AppContext.tsx`**:
   - Update `loginWithEmail`: Add pre-check / catch for incomplete Google profiles to throw the exact required message.
   - Update `loginWithGoogle`: Check whether user profile is completed (has unique username, age, password). If not, route to `/complete-profile`.
   - Add `completeGoogleProfile(name: string, age: number, username: string, password: string)`:
     - Check username uniqueness in Firestore `usernames/{username}`.
     - Reserve username in `usernames/{username}`.
     - Set password on user account (`updatePassword` or `linkWithCredential`).
     - Save profile in `users/{uid}`.
     - Route to `/dashboard`.
   - Add `deleteAccount()`:
     - Delete `usernames/{userProfile.username}`.
     - Delete `users/{currentUser.uid}`.
     - Call `deleteUser(currentUser)`.
     - Sign out and redirect to `/`.
3. **`frontend/codes/src/pages/SignupPage.tsx`** (New File):
   - Email, Password, Confirm Password fields.
   - Client-side validation: Password match, minimum length.
   - Dispatches `signupWithEmail`, shows verification sent confirmation.
4. **`frontend/codes/src/pages/ProfileCompletionPage.tsx`** (New File):
   - Mandatory form for Google signups: Name, Age, Username, Password.
   - Real-time / submit-time username uniqueness validation against Firestore.
5. **`frontend/codes/src/pages/DummyDashboardPage.tsx`** (Replace or wrap Dashboard):
   - Displays logged-in user's name: "Logged in as: {name}".
   - "Sign Out" button (clears session and redirects).
   - "Delete Account" button (confirms, deletes from Auth + Firestore, redirects to `/`).
6. **`frontend/codes/src/App.tsx`**:
   - Add routes: `/signup`, `/complete-profile`.
   - Enforce route protection: `/dashboard` redirects to `/login` if `currentUser === null`.
   - `/complete-profile` accessible only if user is logged in with incomplete profile.

### 7.4 Test Files to Create
- `src/test/tier1-feature-coverage.test.tsx`
- `src/test/tier2-boundary-cases.test.tsx`
- `src/test/tier3-cross-feature-linking.test.tsx`
- `src/test/tier4-real-world-scenarios.test.tsx`

---

## 8. Conclusion
The codebase is in a stable, cleanly compilable state with modern Vite and React tooling, making it exceptionally well-suited for a lightweight, blazingly fast Vitest testing architecture. By introducing high-fidelity in-memory Firebase mocks, the team can verify all 4 tiers of requirements and boundary cases with 100% reliability and speed.
