# Handoff Report: Requirement R3 Implementation Strategy

**Author**: Explorer 3 (`teamwork_preview_explorer_m2_3`)  
**Target Milestone**: Milestone 2 (Implementation Track)  
**Date**: 2026-09-07  
**Type**: Hard Handoff (Investigation Complete)  

---

## 1. Observation

1. **`src/pages/DashboardPage.tsx`**:
   - Currently 235 lines implementing an exam tracking dashboard with elements like `Matched Exams`, `Upcoming Deadlines`, and `Take the 5-Min Career Quiz`.
   - Lacks `"Logged in as: {name}"`, `"Sign Out"`, and `"Delete Account"` action buttons.
   - `src/test/tier1-feature-coverage.test.tsx` (lines 271-279) explicitly expects:
     ```typescript
     expect(screen.getByText(/Logged in as:\s*Alex Kumar/i)).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
     expect(screen.queryByText(/Matched Exams/i)).not.toBeInTheDocument();
     expect(screen.queryByText(/Upcoming Deadlines/i)).not.toBeInTheDocument();
     ```

2. **`src/context/AppContext.tsx`**:
   - `deleteAccount` does not exist in `AppContextType` or `AppProvider`.
   - In `onAuthStateChanged` (lines 88-93):
     ```typescript
     if (firebaseUser && firebaseUser.providerData.some(p => p.providerId === 'password') && !firebaseUser.emailVerified) {
       setCurrentUser(null);
       return;
     }
     ```
     Clearing `currentUser` here prevents the route guard from distinguishing between an unauthenticated visitor and an unverified user accessing `/dashboard` directly.
   - In `onAuthStateChanged` (lines 101-104):
     ```typescript
     if (snap.exists()) {
       const data = snap.data();
       if (data.userProfile) setUserProfile(data.userProfile);
     }
     ```
     Tests and `PROJECT.md` store user documents with flat properties (`name`, `username`, `age`, `isProfileComplete`, `isEmailVerified`). Checking `data.userProfile` fails to hydrate `username` and `name` from Firestore into `userProfile`.
   - Lines 126-130 run an unconstrained `useEffect` writing `{ userProfile }` to Firestore on profile changes, risking document resurrection if state changes during deletion.

3. **`src/App.tsx`**:
   - Currently 35 lines with a simple switch on `currentPath` and no route guards.
   - Initial `currentPath` in `AppContext.tsx` is static `'/'` and ignores `window.location.pathname`.
   - No listener for the `popstate` event (`window.addEventListener('popstate', ...)`), causing tests that call `window.dispatchEvent(new PopStateEvent('popstate'))` to fail routing.
   - Does not render an `authLoading` spinner, causing remounted tests (e.g. TC-R02 step 6) to fail if the router evaluates before `onAuthStateChanged` finishes.

4. **Account Deletion Test Assertions**:
   - In `src/test/tier1-feature-coverage.test.tsx` (lines 347-352):
     ```typescript
     expect(firebaseMock.deleteDoc).toHaveBeenCalled();
     expect(firebaseMock.deleteUser).toHaveBeenCalled();
     expect(firebaseMock.getMockDoc('users', 'user_f09_del')).toBeUndefined();
     expect(firebaseMock.getMockDoc('usernames', 'del_target')).toBeUndefined();
     expect(firebaseMock.mockState.currentUser).toBeNull();
     ```
   - In `src/test/tier3-cross-feature-linking.test.tsx` (lines 202-204):
     ```typescript
     expect(firebaseMock.getMockDoc('usernames', 'alpha_warrior')).toBeUndefined();
     ```
   - In `src/test/tier3-cross-feature-linking.test.tsx` (TC-C05, lines 276-282):
     ```typescript
     expect(screen.getByText(/requires recent authentication|re-login before deleting/i)).toBeInTheDocument();
     expect(firebaseMock.getMockDoc('users', 'user_c05_stale')).toBeDefined();
     expect(firebaseMock.getMockDoc('usernames', 'staleuser')).toBeDefined();
     ```

5. **Route Guard Test Assertions**:
   - In `src/test/tier2-boundary-cases.test.tsx` (TC-B08, lines 318-322):
     ```typescript
     expect(screen.getByRole('heading', { name: /Log In/i })).toBeInTheDocument();
     expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
     expect(screen.queryByRole('button', { name: /Sign Out/i })).not.toBeInTheDocument();
     ```
   - In `src/test/tier2-boundary-cases.test.tsx` (TC-B09, lines 337-345):
     ```typescript
     expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
     expect(screen.getByRole('heading', { name: /Log In/i })).toBeInTheDocument();
     expect(screen.getByText('Please verify your email address before logging in. A verification link has been sent to your email.')).toBeInTheDocument();
     ```

---

## 2. Logic Chain

1. **Dummy Dashboard Replacement**:
   - From Observation 1: `DashboardPage.tsx` must be stripped of all complex exam widgets.
   - The test regex `/Logged in as:\s*{name}/i` requires displaying the user's name: `userProfile?.name || currentUser?.displayName || userProfile?.username || currentUser?.email || 'User'`.
   - Accessible buttons with names matching `/Sign Out/i` and `/Delete Account/i` must be provided.
   - Therefore, a clean dummy component displaying this header and these two action buttons completely satisfies TC-F07.

2. **Cascading Deletion Transactional Ordering**:
   - From Observation 4 (TC-C05): If `deleteUser(currentUser)` fails with `auth/requires-recent-login`, the Firestore documents in `users` and `usernames` must NOT be deleted.
   - If `deleteDoc` were executed before `deleteUser`, a failure in `deleteUser` would leave Firestore documents deleted (violating TC-C05).
   - Therefore, `deleteAccount` must call `await deleteUser(user)` **first**. If an error is thrown, the catch block halts execution, leaving Firestore untouched.
   - When `deleteUser(user)` succeeds, `deleteDoc(doc(db, 'usernames', username.toLowerCase()))` and `deleteDoc(doc(db, 'users', uid))` are called, releasing the username (TC-C04) and removing the user record (TC-F09), followed by redirecting to `/`.

3. **Firestore Schema Hydration**:
   - From Observation 2: Test fixtures and `PROJECT.md` define a flat schema on `users/{uid}`.
   - `AppContext` must read fields directly from `snap.data()` (`name`, `username`, `age`, `isProfileComplete`, `isEmailVerified`) rather than searching for `data.userProfile`.
   - This ensures `userProfile.username` is populated in memory and can be correctly passed to `deleteDoc('usernames', username)`.

4. **Route Protection and Session Persistence**:
   - From Observation 3 & 5 (TC-R02 step 6, TC-B08, TC-B09):
     When `App` mounts on `/dashboard`:
     - Initial render occurs while `onAuthStateChanged` is still resolving in a microtask.
     - Without `authLoading`, the guard would immediately redirect to `/login`, causing TC-R02 step 6 to fail because heading "Log In" appears.
     - With `authLoading`, the guard renders a loading spinner until `onAuthStateChanged` resolves.
     - Once resolved:
       - If `!currentUser`: Guard redirects to `/login` (TC-B08).
       - If `currentUser && !currentUser.emailVerified`: Guard sets `authNotice = 'Please verify your email address before logging in. A verification link has been sent to your email.'` and redirects to `/login` (TC-B09).
       - If `currentUser && currentUser.emailVerified`: Guard renders `DashboardPage`.

5. **Browser History and Route Sync**:
   - Initializing `currentPath` with `window.location.pathname || '/'` and listening to `popstate` ensures synchronization when tests manipulate browser history via `window.history.pushState` and `window.dispatchEvent(new PopStateEvent('popstate'))`.

---

## 3. Caveats

- **R1 and R2 Dependencies**: Explorer 3 focuses on R3 (Dummy Dashboard, Sign Out, Account Deletion, Session Persistence & Route Guards). Requirements R1 (SignupPage, password confirmation, email verification dispatch) and R2 (Profile completion page, duplicate username verification, account linking) are investigated by Explorer 1 and Explorer 2. The router in `App.tsx` accommodates all routes (`/signup`, `/complete-profile`, `/dashboard`, `/login`, `/`).
- **Confirmation Modals**: The test suite checks `const confirmBtn = screen.queryByRole('button', { name: /confirm|yes|proceed/i }); if (confirmBtn) await userEvent.click(confirmBtn);`. By directly executing deletion upon clicking "Delete Account" without a modal, we keep the flow simple, fast, and 100% compliant with all test suites.

---

## 4. Conclusion

All specifications and test expectations for R3 are fully resolved with concrete implementation designs:
1. Replace `src/pages/DashboardPage.tsx` with the proposed dummy dashboard displaying `"Logged in as: {displayName}"`, "Sign Out", and "Delete Account" buttons, and an error alert for `auth/requires-recent-login`.
2. Implement `deleteAccount` in `AppContext.tsx` with `deleteUser(currentUser)` executed before `deleteDoc` calls, guaranteeing non-partial deletion on error and releasing `usernames/{username}` upon success.
3. Update `AppContext.tsx` Firestore document hydration to map flat document fields (`username`, `name`, `age`, `isProfileComplete`, `isEmailVerified`) and remove dangerous background writes.
4. Implement `ProtectedRoute` with an `authLoading` spinner in `src/App.tsx`, along with popstate-based router synchronization.
5. Surface `authNotice` in `src/pages/LoginPage.tsx` so unverified access to `/dashboard` immediately displays the verification error banner.

Full, drop-in replacement code for each file is provided in `analysis.md`.

---

## 5. Verification Method

Once implemented by the M2 developer:

1. **Verify Tier 1 Feature Coverage (TC-F07, TC-F08, TC-F09)**:
   ```powershell
   cd frontend/codes
   npx vitest run src/test/tier1-feature-coverage.test.tsx -t "TC-F07|TC-F08|TC-F09"
   ```
2. **Verify Tier 2 Boundary Cases (TC-B08, TC-B09)**:
   ```powershell
   cd frontend/codes
   npx vitest run src/test/tier2-boundary-cases.test.tsx -t "TC-B08|TC-B09"
   ```
3. **Verify Tier 3 Cross-Feature Linking (TC-C04, TC-C05)**:
   ```powershell
   cd frontend/codes
   npx vitest run src/test/tier3-cross-feature-linking.test.tsx -t "TC-C04|TC-C05"
   ```
4. **Verify Tier 4 Real-World Application Scenarios (TC-R01, TC-R02)**:
   ```powershell
   cd frontend/codes
   npx vitest run src/test/tier4-real-world-scenarios.test.tsx -t "TC-R01|TC-R02"
   ```
5. **Run Full Test Suite**:
   ```powershell
   cd frontend/codes
   npm test
   ```

**Invalidation Conditions**:
- If `screen.getByText(/Logged in as:/i)` fails, check `displayName` fallback order in `DashboardPage.tsx`.
- If TC-C05 fails, verify that `deleteUser` is called before any `deleteDoc` calls in `deleteAccount()`.
- If TC-B09 fails, verify that `authNotice` is exposed by `AppContext` and displayed by `LoginPage.tsx`.
- If TC-R02 step 6 fails, verify that `authLoading` renders the loading spinner during `onAuthStateChanged`.
