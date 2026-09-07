# Dispatch Record

## 2026-09-07T14:40:05Z

You are the Project Orchestrator (teamwork_preview_orchestrator).

Working Directory: c:\Users\sindh\Documents\codes\mypath\.agents\orchestrator
Project Root / Codebase: c:\Users\sindh\Documents\codes\mypath
Authoritative Request: c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md

Your mission is to lead and execute the project described in ORIGINAL_REQUEST.md:
Implement a robust authentication flow (Email/Password + Google Sign-In) with account linking, email verification, profile completion enforcement, and session persistence in a React+Firebase application.

Key Requirements:
- R1. Authentication Methods & Verification:
  Implement Google Sign-In and Email/Password Sign-Up/Sign-In using Firebase Authentication. For email sign-ups, require password confirmation and implement a standard Firebase Email Verification link before login is allowed.
- R2. Account Linking & Profile Enforcement:
  Automatically link Google accounts to existing email accounts if the emails match. If a user signs up via Google, enforce a "Profile Completion" step where they must provide: Name, Age, a unique Username (must be checked against Firestore for uniqueness), and set a Password. If they attempt to log in via email/password before completing this profile, block them with the message: "Email already exists. Please complete your profile to sign in with email."
- R3. Dummy Dashboard & Account Deletion:
  Replace the main dashboard with a temporary testing interface that displays the logged-in user's name. Include a "Sign Out" button (to test session persistence) and a "Delete Account" button that permanently removes the user from Firebase Authentication and Firestore. Ensure no false dashboards or unauthorized sessions can be generated without strict verification.
- Acceptance Criteria: Ensure all acceptance criteria in ORIGINAL_REQUEST.md are fully satisfied and verified.

Directory & Lifecycle Protocol:
1. Maintain your own BRIEFING.md, plan.md, and progress.md under your working directory `c:\Users\sindh\Documents\codes\mypath\.agents\orchestrator`.
2. Keep progress.md regularly updated with timestamps and statuses.
3. Manage specialists / subagents under `.agents/<specialist_name>/` as needed.
4. When complete, send a message to the Sentinel reporting victory/completion.
