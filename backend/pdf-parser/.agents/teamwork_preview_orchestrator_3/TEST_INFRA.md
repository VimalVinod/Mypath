# E2E Test Infra: PDF Parsing & Validation Pipeline

## Test Philosophy
- Opaque-box, requirement-driven. Derives strictly from `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial + Real-World Workload Testing.
- Progressive testability: verification does not depend on unbuilt or external cloud systems (zero Firestore, zero Resend).

## Feature Inventory Test Mapping
| # | Feature | Requirement | Tier 1 (Happy) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|-------------|:--------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | PDF Text Reading & Adapter | R1 | 5 | 5 | ✓ | ✓ |
| 2 | Page-Level Keyword Filter | R1 | 5 | 5 | ✓ | ✓ |
| 3 | Abbreviation-Aware Sentence Split | R1 | 5 | 5 | ✓ | ✓ |
| 4 | Context Windowing (before/after) | R1 | 5 | 5 | ✓ | ✓ |
| 5 | Token/Char Reduction Metrics | R1 | 5 | 5 | ✓ | ✓ |
| 6 | Gemini Client Initialization | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Structured JSON Schema | R2 | 5 | 5 | ✓ | ✓ |
| 8 | Grounded Extraction Prompt | R2 | 5 | 5 | ✓ | ✓ |
| 9 | Gemini Offline / Mock Mode | R2, R4 | 5 | 5 | ✓ | ✓ |
| 10 | Declarative Criteria Definition | R3 | 5 | 5 | ✓ | ✓ |
| 11 | Unity Verification Engine | R3 | 5 | 5 | ✓ | ✓ |
| 12 | Diff & Diagnostic Reporting | R3 | 5 | 5 | ✓ | ✓ |
| 13 | Standalone CLI Execution (`parse-demo.js`) | R4 | 5 | 5 | ✓ | ✓ |
| 14 | Formatted Console Reporting | R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: Node.js native test runner (`node --test test/*.test.js`)
- Exit code: 0 on all tests passing, >0 on failure.
- Fixture generation: `fixtures/generate-sample-pdf.js` generates deterministic binary PDFs with known text layers.

## Test Tiers
- **Tier 1: Feature Coverage** (>=5 per feature) - Basic positive assertions on isolated components.
- **Tier 2: Boundary & Corner Cases** (>=5 per feature) - Empty PDF, single-page PDF, no keyword matches, all pages matching, abbreviations adjacent to periods, missing .env keys, extreme age ranges, contradictory criteria.
- **Tier 3: Cross-Feature Combinations** - PDF parser with mock Gemini -> Unity check -> Standalone output formatting.
- **Tier 4: Real-World Application Scenarios** - UPSC Civil Services 4-page notification, SSC CGL recruitment notice, Bank PO notification.
- **Tier 5: Adversarial Hardening** - White-box adversarial testing with mutated schemas and malicious or corrupted inputs.
