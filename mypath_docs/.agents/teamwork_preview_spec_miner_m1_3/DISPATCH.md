## 2026-09-07T14:47:57Z
You are Spec Miner 3 (teamwork_preview_spec_miner) assigned to Milestone 1: Test Specification for R3 (Dummy Dashboard, Account Deletion & Session Persistence).
Working directory: c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_3
Authoritative Request: c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md
Project Scope: c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md

CRITICAL:
1. You MUST read c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md and c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md first.
2. You are strictly read-only. Do not modify source code.
3. Extract and specify precise opaque-box test requirements for R3:
   - Temporary testing dummy dashboard displaying authenticated user's name: "Logged in as: {name}".
   - "Sign Out" button: clears session in Firebase Auth and local state, redirects to landing page or login.
   - "Delete Account" button: permanently removes user from Firebase Authentication (deleteUser) and Firestore (users/{uid} and usernames/{username}), then redirects to landing page.
   - Strict route protection: accessing /dashboard without authentication immediately redirects to /login without exposing dashboard content.
   - Session persistence across page reloads: authenticated user stays on /dashboard upon reload.
4. Format requirements as concrete test scenarios with inputs, execution steps, and assertions.
5. Write your detailed specification to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_3\analysis.md
6. Write your handoff report to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_3\handoff.md
7. Send a message to the orchestrator when complete.
