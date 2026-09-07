# Original User Request

## Initial Request — 2026-09-07T14:38:41Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Implement a robust authentication flow (Email/Password + Google Sign-In) with account linking, email verification, profile completion enforcement, and session persistence in a React+Firebase application.

Working directory: `c:\Users\sindh\Documents\codes\mypath`
Integrity mode: development

## Requirements

### R1. Authentication Methods & Verification
Implement Google Sign-In and Email/Password Sign-Up/Sign-In using Firebase Authentication. For email sign-ups, require password confirmation and implement a standard Firebase Email Verification link before login is allowed. 

### R2. Account Linking & Profile Enforcement
Automatically link Google accounts to existing email accounts if the emails match. If a user signs up via Google, enforce a "Profile Completion" step where they must provide: Name, Age, a unique Username (must be checked against Firestore for uniqueness), and set a Password. If they attempt to log in via email/password before completing this profile, block them with the message: "Email already exists. Please complete your profile to sign in with email."

### R3. Dummy Dashboard & Account Deletion
Replace the main dashboard with a temporary testing interface that displays the logged-in user's name. Include a "Sign Out" button (to test session persistence) and a "Delete Account" button that permanently removes the user from Firebase Authentication and Firestore. Ensure no false dashboards or unauthorized sessions can be generated without strict verification.

## Acceptance Criteria

### Authentication & Sessions
- [ ] User can sign up with Email/Password and receives a Firebase verification link.
- [ ] User can sign in with Google successfully.
- [ ] Session persists across page reloads (signing out is required to clear the session).
- [ ] Attempting to access the dashboard without authentication redirects to the login page.

### Edge Cases & Linking
- [ ] Signing in with Google using an email that was already registered via Email/Password successfully links the accounts.
- [ ] Google users are forced to set a unique username, age, and password during profile completion.
- [ ] Incomplete Google profiles trying to use Email/Password login are blocked with the correct error message.

### Account Management
- [ ] Clicking "Delete Account" permanently removes the user record from Firebase Authentication and Firestore, and redirects to the landing page.
