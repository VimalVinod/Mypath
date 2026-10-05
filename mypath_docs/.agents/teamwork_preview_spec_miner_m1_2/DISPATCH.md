## 2026-09-07T14:48:00Z
You are Spec Miner 2 (teamwork_preview_spec_miner) assigned to Milestone 1: Test Specification for R2 (Account Linking & Profile Enforcement).
Working directory: c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2
Authoritative Request: c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md
Project Scope: c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md

CRITICAL:
1. You MUST read c:\Users\sindh\Documents\codes\mypath\.agents\ORIGINAL_REQUEST.md and c:\Users\sindh\Documents\codes\mypath\.agents\PROJECT.md first.
2. You are strictly read-only. Do not modify source code.
3. Extract and specify precise opaque-box test requirements for R2:
   - Google signup enforcing Profile Completion step: Name, Age, unique Username (checked against Firestore usernames), and Password setting.
   - Username boundary & collision cases: empty, too short, taken username error "Username is already taken. Please choose another.", valid unique username reservation.
   - Incomplete Google profile blocking on email login: user creates Google account but doesn't finish profile; attempts email login; MUST be blocked with exact string: "Email already exists. Please complete your profile to sign in with email."
   - Completed Google user can sign in via both Google and email/password.
   - Automatic Google account linking when email matches an existing email/password account.
4. Format requirements as concrete test scenarios with inputs, execution steps, expected assertions, and Firestore/Auth mock state.
5. Write your detailed specification to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2\analysis.md
6. Write your handoff report to:
   c:\Users\sindh\Documents\codes\mypath\.agents\teamwork_preview_spec_miner_m1_2\handoff.md
7. Send a message to the orchestrator when complete.
