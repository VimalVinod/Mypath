# Project: React + Firebase Authentication Flow

## Architecture
- **Framework**: React 18 + TypeScript + Vite 5 + Tailwind CSS (`frontend/codes`)
- **Backend & Auth**: Firebase Modular SDK v10.8.1 (Authentication & Cloud Firestore)
- **Routing**: In-memory state synchronized with `window.location.pathname` and `window.history` (URL routes: `/`, `/login`, `/signup`, `/complete-profile`, `/dashboard`)
- **State Management**: React Context (`AppContext.tsx`) managing `currentUser`, `userProfile`, `authLoading`, and auth actions.
- **Testing Architecture**: Vitest + React Testing Library + JSDOM with high-fidelity in-memory Firebase Auth & Firestore mock harness (`src/test/mocks/firebaseMock.ts`).

## Feature Inventory
Every feature from user requirements and the Survey phase is assigned to a milestone:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Vitest & Test Infrastructure | Setup Vitest, RTL, jsdom, config, and in-memory mock harness | M1 | Survey Explorer 3 |
| 2 | 4-Tier Opaque-Box Test Suite | Implement Tiers 1-4 tests and generate TEST_READY.md | M1 | Survey Explorer 3 |
| 3 | Email/Password Sign-Up Form | Dedicated SignupPage with Password & Confirm Password validation | M2 | ORIGINAL_REQUEST R1 |
| 4 | Email Verification Flow | Send Firebase verification link, enforce verification before login | M2 | ORIGINAL_REQUEST R1 |
| 5 | Email/Password Sign-In | Verified login and clear error handling | M2 | ORIGINAL_REQUEST R1 |
| 6 | Google Sign-In Integration | Firebase Google Auth popup integration with state handling | M2 | ORIGINAL_REQUEST R1 |
| 7 | Route Sync & Route Protection | URL sync, authLoading guard, redirect unauth to /login | M2 | ORIGINAL_REQUEST R3 |
| 8 | Google Profile Completion Step | Enforce Name, Age, unique Username, and set Password | M2 | ORIGINAL_REQUEST R2 |
| 9 | Unique Username Verification | Check and atomically reserve username in Firestore `usernames` | M2 | ORIGINAL_REQUEST R2 |
| 10 | Incomplete Profile Email Login Block | Block email login with exact error: "Email already exists. Please complete your profile to sign in with email." | M2 | ORIGINAL_REQUEST R2 |
| 11 | Google & Email Account Linking | Automatically link Google account to existing email/password account | M2 | ORIGINAL_REQUEST R2 |
| 12 | Firestore Security Rules | Allow unauth read for username availability and profile completion check | M2 | Survey Explorer 2 |
| 13 | Temporary Testing Dummy Dashboard | Dashboard displaying user's name with Sign Out & Delete Account | M2 | ORIGINAL_REQUEST R3 |
| 14 | Sign Out Action | Button clearing session and redirecting to landing/login | M2 | ORIGINAL_REQUEST R3 |
| 15 | Permanent Account Deletion | Deletes Firestore doc and Firebase Auth user permanently | M2 | ORIGINAL_REQUEST R3 |
| 16 | Final E2E Suite Pass & Hardening | 100% pass of Tiers 1-4 and Tier 5 adversarial hardening | M3 | Orchestration Strategy |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Testing Track (Infra & Tiers 1-4) | Vitest, RTL, mock harness, Tiers 1-4 test suite, TEST_READY.md | none | DONE |
| M2 | Implementation Track (R1, R2, R3) | Implement all auth flows, pages, routing, linking, deletion, and pass 100% E2E tests | M1 | IN_PROGRESS |
| M3 | Adversarial Coverage Hardening (Tier 5) | Tier 5 white-box stress testing, gap analysis, and final audit | M2 | PLANNED |

## Interface Contracts

### AppContext ↔ UI Components
```typescript
interface AppContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  currentPath: string;
  navigate: (path: string) => void;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  completeGoogleProfile: (data: { name: string; age: number; username: string; password: string }) => Promise<void>;
  logoutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
}
```

### Firestore Schema
1. **`users/{userId}`**:
   - `uid: string`
   - `email: string` (lowercase)
   - `name: string`
   - `username: string` (lowercase)
   - `age: number`
   - `isProfileComplete: boolean`
   - `isEmailVerified: boolean`
   - `authProviders: string[]`
   - `createdAt: string`
   - `updatedAt: string`
2. **`usernames/{username}`**:
   - `uid: string`
   - `createdAt: string`

### Exact Error Messages Required
- Incomplete Google Profile Block on Email Login:
  `"Email already exists. Please complete your profile to sign in with email."`
- Passwords mismatch on signup:
  `"Passwords do not match."`
- Unverified email login:
  `"Please verify your email address before logging in. A verification link has been sent to your email."`
- Username taken:
  `"Username is already taken. Please choose another."`

## Code Layout
Project directory: `frontend/codes/`
- `src/firebase.ts`: Firebase Modular SDK initialization & API exports
- `src/context/AppContext.tsx`: State, router sync, auth operations, profile & deletion logic
- `src/App.tsx`: Route dispatcher with route protection and guards
- `src/pages/LandingPage.tsx`: Landing page
- `src/pages/LoginPage.tsx`: Login form with Google sign-in and navigation to signup
- `src/pages/SignupPage.tsx`: Email/Password sign up form with password confirmation
- `src/pages/ProfileCompletionPage.tsx`: Google profile completion form (Name, Age, Username, Password)
- `src/pages/DashboardPage.tsx`: Temporary testing dashboard (User name, Sign Out, Delete Account)
- `firestore.rules`: Security rules for users and usernames collections
- `src/test/mocks/firebaseMock.ts`: In-memory Firebase Auth and Firestore mock harness
- `src/test/setup.ts`: Vitest test setup file
- `vitest.config.ts`: Vitest configuration file
- `src/test/tier1-feature-coverage.test.tsx`: Tier 1 test cases
- `src/test/tier2-boundary-cases.test.tsx`: Tier 2 test cases
- `src/test/tier3-cross-feature-linking.test.tsx`: Tier 3 test cases
- `src/test/tier4-real-world-scenarios.test.tsx`: Tier 4 test cases
