# Handoff Report — Explorer 2: Firebase & Authentication Survey

## 1. Observation
1. **Firebase Configuration (`src/firebase.ts`)**:
   - `c:\Users\sindh\Documents\codes\mypath\frontend\codes\src\firebase.ts:28-35`: Uses Firebase modular SDK `^10.8.1` configured for project `examgoo`. Fallback credentials are provided in source; no `.env` file exists.
   - `src/firebase.ts:38-60`: Initializes `auth`, `db`, and `googleProvider`. Missing required modular exports: `linkWithCredential`, `EmailAuthProvider`, `updatePassword`, `deleteUser`, `deleteDoc`, `runTransaction`, `serverTimestamp`.
2. **Security Rules (`frontend/codes/firestore.rules`)**:
   - `frontend/codes/firestore.rules:1-12`:
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
     Every read and write requires `request.auth != null`.
3. **Authentication & Routing State (`src/context/AppContext.tsx` & `src/App.tsx`)**:
   - `src/context/AppContext.tsx:70`: `const [currentPath, setCurrentPath] = useState<string>('/');` — purely in-memory state, not synced with `window.location.pathname`. Browser reloads reset the route to `'/'`.
   - `src/context/AppContext.tsx:73`: `const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);` — no `authLoading` state exists.
   - `src/App.tsx:14-23`: `MainRouter` only handles `/login`, `/dashboard`, and `/`. There is no `/signup` or `/complete-profile` route.
   - `src/pages/LoginPage.tsx:176`: Contains `navigate('/signup')`, which triggers the fallback route and renders `LandingPage`.
4. **Requirement R1 Flow**:
   - `src/context/AppContext.tsx:207-228`: `signupWithEmail` creates the user, calls `sendEmailVerification`, sets `isEmailVerified: false`, and signs out. However, there is no UI form for signup or password confirmation.
5. **Requirement R2 Flow**:
   - `src/context/AppContext.tsx:162-182`: `loginWithGoogle` signs in with popup, creates/loads profile, and immediately calls `navigate('/dashboard')`. No check exists for `isProfileComplete`.
   - `src/context/AppContext.tsx:185-204`: `loginWithEmail` does not inspect Firestore for incomplete Google accounts or emit the required message: `"Email already exists. Please complete your profile to sign in with email."`.
6. **Requirement R3 Flow**:
   - `src/pages/DashboardPage.tsx`: Contains the full production aspirant exam tracking UI. Lacks a "Sign Out" button, lacks a "Delete Account" button, and lacks route authentication guards.
7. **Build Verification**:
   - Ran `npm run build` in `frontend/codes`. Exited with code 0 (`✓ built in 6.17s`).

---

## 2. Logic Chain
1. **From Observation 1 & 2 to Security Rules conflict**:
   Requirement R2 dictates that an incomplete Google profile attempting to log in via email/password must be blocked with `"Email already exists. Please complete your profile to sign in with email."`. To check this prior to or upon email login, an unauthenticated client must read from Firestore. Under the existing `firestore.rules` (Observation 2), unauthenticated reads trigger permission-denied errors. Therefore, `firestore.rules` must be updated to permit read access on `/users` and `/usernames`.
2. **From Observation 3 to Session Persistence failure**:
   Acceptance criteria require that sessions persist across page reloads. Because `currentPath` is stored only in a React `useState` initialized to `'/'` (Observation 3), any browser reload on `/dashboard` resets the view to `LandingPage`. Furthermore, lacking an `authLoading` boolean causes race conditions between initial `null` state and the asynchronous `onAuthStateChanged` callback. Synchronizing `currentPath` with `window.location.pathname` and adding `authLoading` resolves this.
3. **From Observation 4 to R1 UI Gap**:
   Acceptance criteria state: *"User can sign up with Email/Password and receives a Firebase verification link"* and *"require password confirmation"*. Since `App.tsx` has no `/signup` route and `LoginPage.tsx` merely links to an unmapped path (Observations 3 & 4), creating `SignupPage.tsx` with password confirmation is required.
4. **From Observation 5 to R2 Linking & Enforcement Gap**:
   Acceptance criteria mandate: *"Google users are forced to set a unique username, age, and password during profile completion"* and *"Incomplete Google profiles trying to use Email/Password login are blocked with the correct error message"*. Since `loginWithGoogle` navigates directly to `/dashboard` (Observation 5), a profile completion barrier must be inserted that validates username uniqueness in Firestore and sets a password via `linkWithCredential(user, EmailAuthProvider.credential(user.email, password))`.
5. **From Observation 6 to R3 Dashboard & Deletion Gap**:
   Acceptance criteria mandate replacing the dashboard with a temporary testing interface with user name, "Sign Out", and "Delete Account" (permanently deleting from Auth & Firestore). `DashboardPage.tsx` currently has none of these (Observation 6). Implementing a dedicated testing dashboard with `deleteUser(currentUser)` and `deleteDoc(doc(db, 'users', uid))` satisfies R3.

---

## 3. Caveats
- **Firebase Project Console Settings**: Whether Email Enumeration Protection is enabled in the `examgoo` Firebase Console cannot be checked directly without GCP/Firebase Console access. To remain robust regardless of enumeration settings, checking Firestore for incomplete profiles by email is prioritized over relying exclusively on `fetchSignInMethodsForEmail`.
- **Recent Login for Deletion**: Firebase Auth's `deleteUser()` API requires recent authentication. If a session is aged, Firebase throws `auth/requires-recent-login`. In the temporary testing flow this is rarely encountered, but re-authentication handling should be noted for production hardening.

---

## 4. Conclusion
The MyPath codebase is well-structured and builds cleanly (`npm run build` code 0). However, critical gaps exist for all three requirements:
- **R1**: Requires a dedicated `SignupPage` with password confirmation, route wiring, and email verification handling.
- **R2**: Requires adding `linkWithCredential`, an interactive `ProfileCompletion` screen, username uniqueness verification in Firestore (`usernames` collection), and pre-login Firestore query to block incomplete profiles with the exact required string.
- **R3**: Requires replacing `DashboardPage.tsx` with a Dummy Dashboard displaying user name, "Sign Out", and "Delete Account" (`deleteUser` + `deleteDoc`), along with URL/popstate router synchronization and an `authLoading` route guard.
All technical details and code solutions are documented in `analysis.md`.

---

## 5. Verification Method
1. **Build Integrity**:
   Run in `frontend/codes`:
   ```powershell
   npm run build
   ```
   Must compile cleanly with code 0.
2. **Inspection of Files**:
   - Inspect `frontend/codes/src/firebase.ts` for exported APIs.
   - Inspect `frontend/codes/firestore.rules` for read permissions.
   - Inspect `frontend/codes/src/context/AppContext.tsx` for router sync and auth methods.
   - Inspect `frontend/codes/src/pages/DashboardPage.tsx` for dummy test interface elements.
3. **Runtime Invalidation Condition**:
   - If reloading the browser while on `/dashboard` redirects to `/` instead of persisting on `/dashboard`, session persistence is broken.
   - If logging in with an email linked to an incomplete Google profile does NOT show `"Email already exists. Please complete your profile to sign in with email."`, R2 acceptance is invalidated.
   - If deleting an account leaves the user record in Firebase Auth or Firestore, R3 acceptance is invalidated.
