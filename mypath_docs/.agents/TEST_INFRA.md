# E2E Test Infra: React + Firebase Authentication Flow

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Test Runner: Vitest + React Testing Library + JSDOM (`npm run test` in `frontend/codes`)
- Mock Harness: In-memory Firebase Auth and Firestore state engine (`src/test/mocks/firebaseMock.ts`).

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | Email/Password Sign-Up with Confirm Password | ORIGINAL_REQUEST §R1 | TC-F01 | TC-B01, TC-B02 | TC-C01 | TC-R01 |
| 2 | Email Verification Link & Enforcement | ORIGINAL_REQUEST §R1 | TC-F02, TC-F03 | TC-B09 | TC-C02 | TC-R01 |
| 3 | Google Sign-In & Linking | ORIGINAL_REQUEST §R1, §R2 | TC-F04, TC-F06 | TC-B07 | TC-C01 | TC-R02, TC-R03 |
| 4 | Profile Completion Enforcement | ORIGINAL_REQUEST §R2 | TC-F05 | TC-B04, TC-B05, TC-B06 | TC-C02, TC-C03 | TC-R02, TC-R03 |
| 5 | Block Incomplete Google Profile on Email Login | ORIGINAL_REQUEST §R2 | TC-F05 | - | TC-C02 | TC-R03 |
| 6 | Dummy Dashboard Display (User Name) | ORIGINAL_REQUEST §R3 | TC-F07 | - | - | TC-R01, TC-R02 |
| 7 | Sign Out Session Teardown | ORIGINAL_REQUEST §R3 | TC-F08 | - | - | TC-R01, TC-R02 |
| 8 | Permanent Account Deletion (Auth + DB) | ORIGINAL_REQUEST §R3 | TC-F09 | - | TC-C04, TC-C05 | TC-R02 |
| 9 | Strict Route Guards & Session Persistence | ORIGINAL_REQUEST §R3 | TC-F07, TC-F08 | TC-B08, TC-B09 | - | TC-R01, TC-R02 |

## Test Architecture
- Test runner: Vitest (`npx vitest run`)
- Harness location: `frontend/codes/src/test/`
- Test files:
  - `src/test/tier1-feature-coverage.test.tsx`
  - `src/test/tier2-boundary-cases.test.tsx`
  - `src/test/tier3-cross-feature-linking.test.tsx`
  - `src/test/tier4-real-world-scenarios.test.tsx`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Aspirant Email/Password Journey | Email signup -> verify -> login -> dummy dashboard -> signout | High |
| 2 | Google Onboarding & Account Deletion | Google popup -> duplicate username retry -> complete profile -> reload persist -> delete account | High |
| 3 | Incomplete Profile Recovery | Google popup -> abandon -> email login blocked with exact string -> Google re-entry -> complete profile -> email login works | High |

## Coverage Thresholds
- Tier 1: 9 test cases (TC-F01 to TC-F09)
- Tier 2: 9 test cases (TC-B01 to TC-B09)
- Tier 3: 5 test cases (TC-C01 to TC-C05)
- Tier 4: 3 realistic application scenarios (TC-R01 to TC-R03)
- **Total Test Cases: 26 test cases**
