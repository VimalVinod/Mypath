# Firebase Authentication & Firestore Architecture Survey (Explorer 2)

## 1. Executive Summary

This survey provides a comprehensive investigation of the Firebase infrastructure, authentication implementations, Firestore schemas, and security rules within the MyPath React application (`c:\Users\sindh\Documents\codes\mypath\frontend\codes`).

### Key Findings:
1. **Firebase SDK**: The project utilizes modern Firebase Modular SDK `^10.8.1` (`firebase/app`, `firebase/auth`, `firebase/firestore`). The initialization in `src/firebase.ts` connects to project `examgoo`.
2. **Current Authentication State**:
   - Basic Google popup sign-in and Email/Password sign-up/sign-in functions exist in `src/context/AppContext.tsx`.
   - **R1 Missing Elements**: There is **no UI or route for Sign-Up** (`/signup` is an unmapped route falling back to LandingPage); password confirmation is not implemented on the client; Google sign-in directly opens the dashboard without checking profile completion.
   - **R2 Missing Elements**: Account linking (`linkWithCredential`, `GoogleAuthProvider.credentialFromError`) is entirely absent; no Profile Completion modal/page exists for Google users (name, age, unique username, set password); no mechanism checks Firestore for incomplete profiles on email login to display the required blocking message.
   - **R3 Missing Elements**: The dashboard (`DashboardPage.tsx`) is currently the full application dashboard with mock exam widgets rather than the required temporary testing interface; neither a "Sign Out" nor a "Delete Account" button exists on the dashboard; session persistence across reload fails due to an in-memory routing state that resets `currentPath` to `'/'`; no route guards prevent unauthenticated users from visiting `/dashboard`.
3. **Firestore Security Rules**: The existing `firestore.rules` strictly requires `request.auth != null` for all reads and writes. This directly conflicts with the R2 requirement to check for incomplete Google profiles before an unauthenticated user logs in with email/password.

---

## 2. Firebase Configuration & Environment

### 2.1 Configuration File: `src/firebase.ts`
- **Location**: `c:\Users\sindh\Documents\codes\mypath\frontend\codes\src\firebase.ts`
- **Firebase Version**: `^10.8.1` (Modular SDK v10)
- **Active Project ID**: `examgoo`
- **Environment Variables**:
  ```ts
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA4zbNx-Bs4rGdGMIXKsGSlMdBay8FWk3U",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "examgoo.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "examgoo",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "examgoo.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "472919780617",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:472919780617:web:4e02ef528d008dbc11f7d8"
  };
  ```
- **Fallback Behavior**: No `.env` or `.env.local` exists in the repository. The application functions out-of-the-box using the hardcoded default fallback credentials.
- **Exported Instances**:
  - `auth: Auth` (from `getAuth(app)`)
  - `db: Firestore` (from `getFirestore(app)`)
  - `googleProvider: GoogleAuthProvider`

### 2.2 Missing Firebase API Imports in `src/firebase.ts`
To fulfill R1, R2, and R3, `src/firebase.ts` must export additional Firebase Modular functions:
| Category | Missing Modular Functions to Import & Export |
| :--- | :--- |
| **Auth APIs** | `linkWithCredential`, `EmailAuthProvider`, `updatePassword`, `deleteUser`, `fetchSignInMethodsForEmail` |
| **Firestore APIs** | `deleteDoc`, `runTransaction`, `serverTimestamp` |

---

## 3. Firestore Setup, Schema & Security Rules

### 3.1 Security Rules (`firestore.rules`)
Existing rules at `frontend/codes/firestore.rules`:
```javascript
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

#### Critical Conflict with R2 & Proposed Resolution:
- **Conflict**: Requirement R2 states: *"If they attempt to log in via email/password before completing this profile, block them with the message: 'Email already exists. Please complete your profile to sign in with email.'"*
  When an unauthenticated user enters their email in the login form, the client must query Firestore to check if an account with that email has `isProfileComplete == false`. With `allow read: if request.auth != null;`, unauthenticated read queries to `/users` will throw `FirebaseError: Missing or insufficient permissions`.
- **Recommended Security Rules Update**:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId} {
        // Allow read for email / profile completion checks and profile lookups
        allow read: if true;
        // Allow write only by the authenticated owner
        allow write: if request.auth != null && (request.auth.uid == userId);
      }
      match /usernames/{username} {
        // Public read to verify username availability
        allow read: if true;
        // Authenticated users can claim an unused username
        allow write: if request.auth != null;
      }
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

### 3.2 Firestore Data Schema Analysis

#### Current Schema (`users/{userId}`):
Currently stored in `AppContext.tsx` lines 106-114:
```json
{
  "userProfile": {
    "name": "Candidate",
    "email": "user@example.com",
    "isEmailVerified": false,
    "dob": "",
    "gender": "",
    "nationality": "Indian",
    "state": "",
    "education": [],
    "category": "General",
    "disabilityStatus": false,
    "relaxationApplicable": false,
    "experienceYears": 0,
    "preferredTypes": [],
    "preferredLocations": [],
    "isOnboarded": false
  },
  "trackerItems": []
}
```

#### Identified Schema Gaps:
1. **Missing Profile Completion Flag**: No boolean tracking `isProfileComplete`.
2. **Missing User Fields**: No `username` field, no `age` field (only `dob` exists).
3. **Queryability of Email**: `email` is nested inside `userProfile.email`. For direct Firestore queries (`where('email', '==', email.toLowerCase())`), storing `email` as a root-level property is required.
4. **Missing Unique Username Index**: Storing usernames only inside user documents makes checking availability require a collection query across all users.

#### Recommended Schema Design:
1. **Collection `users/{userId}`**:
   ```typescript
   interface UserDocument {
     uid: string;
     email: string;             // Lowercase string (for querying)
     name: string;              // Full name
     username: string;          // Lowercase unique handle
     age: number;               // User age
     isProfileComplete: boolean;// True only after profile completion step
     isEmailVerified: boolean;  // Mirror of auth emailVerified
     authProviders: string[];   // ['google.com'] or ['password'] or both
     createdAt: any;
     updatedAt: any;
     userProfile: UserProfile;  // Legacy profile data for app compatibility
   }
   ```
2. **Collection `usernames/{username}`**:
   - Document ID: `username.toLowerCase()`
   - Content: `{ uid: string, createdAt: any }`
   - Purpose: Provides instant O(1) document lookup (`getDoc(doc(db, 'usernames', username))`) for availability checks, and enables atomic reservations via `runTransaction`.

---

## 4. Requirement Breakdown & Gap Analysis

### 4.1 Requirement R1: Authentication Methods & Verification

| Requirement Component | Current Implementation | Gap / Technical Requirement |
| :--- | :--- | :--- |
| **Email/Password Sign-Up** | `signupWithEmail` defined in `AppContext.tsx` line 207 | **No UI exists**. Clicking "Sign Up Free" leads to `/signup` which renders `LandingPage` (undefined route). Must create `SignupPage.tsx` or a tabbed Auth form. |
| **Password Confirmation** | None. Single password passed. | Must add `confirmPassword` input field with client-side equality check before calling Firebase. |
| **Email Verification Link** | Calls `sendEmailVerification(res.user, { url: ... })` | Link is sent, but `actionCodeSettings` should point cleanly to `${window.location.origin}/login?verified=true`. |
| **Email Verification Enforcement** | Checks `!res.user.emailVerified` on `loginWithEmail` and in `onAuthStateChanged` | If user attempts to log in with unverified email: show error message, trigger fresh `sendEmailVerification`, and ensure `signOut(auth)` is called so unverified session is never retained. |
| **Google Sign-In** | `loginWithGoogle` in `AppContext.tsx` line 162 | Directly redirects to `/dashboard`, bypassing profile check and account linking. |

### 4.2 Requirement R2: Account Linking & Profile Enforcement

| Requirement Component | Current Implementation | Gap / Technical Requirement |
| :--- | :--- | :--- |
| **Automatic Google Account Linking** | None. standard `signInWithPopup` only. | When Google sign-in is used with an email that was registered with Email/Password:<br>1. If Firebase automatically links trusted provider: verify linked status.<br>2. If Firebase throws `auth/account-exists-with-different-credential`: capture `pendingCred = GoogleAuthProvider.credentialFromError(err)`, authenticate with password, and call `linkWithCredential(user, pendingCred)`. |
| **Profile Completion Enforcement** | None. | If user signs in via Google and `isProfileComplete == false`:<br>- Prevent access to Dashboard.<br>- Render Profile Completion flow requesting: **Name**, **Age**, **unique Username**, and **Password**.<br>- Call `linkWithCredential(auth.currentUser, EmailAuthProvider.credential(user.email, password))` to set their password in Firebase Auth.<br>- Write `{ name, age, username, isProfileComplete: true }` to `users/{uid}` and record `usernames/{username}`. |
| **Username Uniqueness Check** | None. | Check `doc(db, 'usernames', username.toLowerCase())` in Firestore. Validate uniqueness in real-time or upon form submission. |
| **Blocking Incomplete Google Profiles on Email Login** | None. | In `loginWithEmail(email, password)`:<br>Before or upon login attempt, query Firestore `users` for `email.toLowerCase()`.<br>If a document exists with `isProfileComplete == false`, immediately throw/display the exact required message:<br>`"Email already exists. Please complete your profile to sign in with email."` |

### 4.3 Requirement R3: Dummy Dashboard & Account Deletion

| Requirement Component | Current Implementation | Gap / Technical Requirement |
| :--- | :--- | :--- |
| **Dummy Dashboard Interface** | Main aspirant dashboard (`DashboardPage.tsx`) with exam cards and tracker widgets. | Replace `DashboardPage.tsx` with a clean, temporary testing interface displaying: logged-in user's name, email, username, verification badge, and provider badges. |
| **"Sign Out" Button** | None on Dashboard (only in header profile if configured). | Add prominent "Sign Out" button calling `logoutUser()` -> `signOut(auth)`, clearing session, and navigating to `'/'`. |
| **"Delete Account" Button** | None. | Add "Delete Account" button that:<br>1. Deletes Firestore document `users/{uid}` and `usernames/{username}` using `deleteDoc`.<br>2. Deletes user from Firebase Auth using `deleteUser(currentUser)`.<br>3. Clears local state and redirects to LandingPage `'/'`. |
| **Session Persistence Across Reloads** | In-memory routing resets to `'/'` on reload. | Synchronize `currentPath` with `window.location.pathname` and listen to `popstate`. Add `authLoading` state in `AppContext` to avoid redirecting while Firebase Auth restores credentials from IndexedDB. |
| **Route Protection (Strict Verification)** | None. `/dashboard` can be accessed by anyone. | In router: If `!currentUser` and `!authLoading`, immediately redirect to `/login`. If `isProfileComplete == false`, redirect to Profile Completion. |

---

## 5. Architectural Issues & Detailed Solutions

### 5.1 Issue 1: In-Memory Router Resets on Page Refresh
- **Current Code (`AppContext.tsx` line 70)**:
  `const [currentPath, setCurrentPath] = useState<string>('/');`
  When a user reloads the browser while on `/dashboard`, `useState` re-initializes to `'/'`.
- **Solution**:
  Initialize `currentPath` from `window.location.pathname`:
  ```typescript
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  ```
  *(Note: `firebase.json` already contains rewrite rules sending all routes `**` to `/index.html`, so direct URL navigation and refresh are fully supported by the hosting server).*

### 5.2 Issue 2: Race Condition in Route Protection on Load
- **Current Code**:
  `currentUser` is initialized to `null`. It takes 200–400ms for Firebase's `onAuthStateChanged` to check IndexedDB and restore the session.
- **Solution**:
  Introduce `authLoading` in `AppContext`:
  ```typescript
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // ... check verification and load profile ...
      setCurrentUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  ```
  In `MainRouter`, while `authLoading` is true, render a clean loading spinner to prevent premature redirects to `/login`.

### 5.3 Issue 3: Setting Password for Google Users (Profile Completion)
- When a user signs in with Google, Firebase creates a user with provider `'google.com'`. They do not have an email/password credential.
- To set a password so they can later log in using their email and password:
  ```typescript
  import { EmailAuthProvider, linkWithCredential, updatePassword } from 'firebase/auth';
  
  const setPasswordForGoogleUser = async (user: FirebaseUser, newPass: string) => {
    const hasPassword = user.providerData.some(p => p.providerId === 'password');
    if (hasPassword) {
      await updatePassword(user, newPass);
    } else {
      const credential = EmailAuthProvider.credential(user.email!, newPass);
      await linkWithCredential(user, credential);
    }
  };
  ```

### 5.4 Issue 4: Account Linking on Google Sign-In
- When an existing email/password user clicks "Sign In with Google", Firebase may either:
  1. Automatically link the provider (if email is verified).
  2. Throw `auth/account-exists-with-different-credential`.
- To handle case 2 gracefully:
  ```typescript
  try {
    const res = await signInWithPopup(auth, googleProvider);
    // Proceed with login/profile check
  } catch (err: any) {
    if (err.code === 'auth/account-exists-with-different-credential') {
      const email = err.customData?.email;
      const pendingCred = GoogleAuthProvider.credentialFromError(err);
      // Prompt user for their existing account password:
      const existingPassword = prompt(`An account already exists for ${email}. Enter your password to link your Google account:`);
      if (existingPassword && pendingCred) {
        const userCred = await signInWithEmailAndPassword(auth, email, existingPassword);
        await linkWithCredential(userCred.user, pendingCred);
        // Successfully linked!
      }
    } else {
      throw err;
    }
  }
  ```

### 5.5 Issue 5: Atomic Unique Username Reservation
- To prevent race conditions where two users take the same username:
  ```typescript
  import { runTransaction, doc } from 'firebase/firestore';
  
  const claimUsername = async (uid: string, username: string) => {
    const cleanUsername = username.trim().toLowerCase();
    const usernameRef = doc(db, 'usernames', cleanUsername);
    const userRef = doc(db, 'users', uid);
    
    await runTransaction(db, async (transaction) => {
      const usernameSnap = await transaction.get(usernameRef);
      if (usernameSnap.exists()) {
        throw new Error('Username is already taken. Please choose another.');
      }
      transaction.set(usernameRef, { uid, createdAt: new Date().toISOString() });
      transaction.update(userRef, { username: cleanUsername });
    });
  };
  ```

### 5.6 Issue 6: Account Deletion (Auth & Firestore)
- Requirement R3 specifies: *"permanently removes the user from Firebase Authentication and Firestore"*.
- Implementation:
  ```typescript
  import { deleteUser } from 'firebase/auth';
  import { deleteDoc, doc } from 'firebase/firestore';
  
  const deleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // 1. Delete Firestore user document
    await deleteDoc(doc(db, 'users', user.uid));
    
    // 2. Delete username reservation if exists
    if (userProfile.username) {
      await deleteDoc(doc(db, 'usernames', userProfile.username.toLowerCase()));
    }
    
    // 3. Delete Firebase Auth user
    await deleteUser(user);
    
    // 4. Clear state & redirect to landing page
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
  };
  ```

---

## 6. Implementation File Modification Plan

| File Path | Planned Modifications |
| :--- | :--- |
| `src/firebase.ts` | Export missing APIs: `linkWithCredential`, `EmailAuthProvider`, `updatePassword`, `deleteUser`, `deleteDoc`, `runTransaction`, `serverTimestamp`. |
| `firestore.rules` | Allow public read on `/users` and `/usernames` for email existence and username uniqueness checks. |
| `src/types/index.ts` | Update `UserProfile` with `username?: string`, `age?: number`, `isProfileComplete: boolean`. |
| `src/context/AppContext.tsx` | Add `authLoading`, browser URL sync (`pushState`/`popstate`), R1/R2/R3 auth logic, incomplete profile check in `loginWithEmail`, profile completion method, account linking handler, and `deleteAccount` function. |
| `src/App.tsx` | Add routing cases for `/signup` and `/complete-profile`. Add auth route guard protecting `/dashboard`. |
| `src/pages/LoginPage.tsx` | Display the exact error message `"Email already exists. Please complete your profile to sign in with email."` when triggered. Add navigation to `/signup`. |
| `src/pages/SignupPage.tsx` | **Create new page**: Email, Password, Confirm Password, client-side validation, verification link notice. |
| `src/pages/ProfileCompletionPage.tsx` | **Create new page/modal**: Name, Age, unique Username (real-time Firestore validation), Password & Confirm Password for Google users. |
| `src/pages/DashboardPage.tsx` | Replace content with the temporary Dummy Dashboard displaying user name, email, username, verification badges, "Sign Out" button, and "Delete Account" button. |
