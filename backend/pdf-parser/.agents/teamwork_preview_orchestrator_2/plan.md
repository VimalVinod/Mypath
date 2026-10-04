# Orchestration Plan — teamwork_preview_orchestrator_2

## Objective
Execute Milestones 2 through 5 of the PDF Parsing and Validation Pipeline, ensuring full test coverage and requirement fulfillment:
- M1: Targeted PDF Parsing Module [COMPLETED & 100% VERIFIED]
- M2: Gemini API Integration Module (@google/genai, JSON Schema, prompt, mock mode)
- M3: Unity / Database Checking Module (criteria verification, diffs, candidate eligibility)
- M4: Standalone Execution CLI Runner (parse-demo.js, mock criteria, console dashboard)
- M5: E2E Verification & Hardening (comprehensive test suite execution, npm test verification)

## Execution Pattern: Milestone Iteration Cycles
For each remaining milestone:
1. **Explore**: Spawn Explorer(s) to analyze interface requirements, existing code contracts, edge cases, and test strategy.
2. **Implement**: Spawn Worker to implement modules, integrate unit tests, and verify builds/tests.
3. **Review**: Spawn Reviewers (2) to review architecture, code quality, error handling, and interface compliance.
4. **Challenge**: Spawn Challengers (2) to write adversarial stress harnesses and verify robustness.
5. **Audit**: Spawn Forensic Auditor to verify genuine implementation (no facades, no cheat strings).
6. **Gate**: Evaluate all verdicts. If all pass, advance milestone; if any fail, loop back with remediation.
7. **Succession Guard**: Monitor spawn count against threshold (16). If reached, execute succession.

## Milestones Detail
- **Milestone 2**:
  - `src/services/ai/gemini-parser.js`
  - `src/services/ai/schema.js`
  - `src/services/ai/prompt.js`
  - `src/services/ai/mock-gemini.js`
  - `test/gemini-parser.test.js`
- **Milestone 3**:
  - `src/services/validator/unity-checker.js`
  - `src/services/validator/rules.js`
  - `test/unity-checker.test.js`
- **Milestone 4**:
  - `parse-demo.js`
  - `fixtures/mock-criteria.js`
  - Formatted console reporter & CLI flags
- **Milestone 5**:
  - `test/e2e-pipeline.test.js`
  - Full test runner (`npm test`)
  - Adversarial hardening & coverage verification
