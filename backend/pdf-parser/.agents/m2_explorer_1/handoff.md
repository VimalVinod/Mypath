# Milestone 2 Handoff Report: @google/genai SDK Integration & Schema Architecture

## 1. Observation
1. **Package Status & Structure**:
   - `package.json` currently contains `"dependencies": { "cheerio": "^1.2.0", "dotenv": "^17.4.2", "pdf-lib": "^1.17.1", "resend": "^6.26.0", "unpdf": "^1.8.1" }`. `@google/genai` is not yet listed in `package.json`.
   - On npm registry, `@google/genai` is at version `2.22.0`. Its `package.json` specifies `"type": "module"` with conditional exports:
     ```json
     "exports": {
       ".": {
         "node": {
           "types": "./dist/node/node.d.ts",
           "import": "./dist/node/index.mjs",
           "default": "./dist/node/index.mjs",
           "require": "./dist/node/index.cjs"
         },
         "types": "./dist/genai.d.ts",
         "import": "./dist/index.mjs",
         "require": "./dist/index.cjs"
       }
     }
     ```
     This allows direct CommonJS consumption via `const { GoogleGenAI, Type } = require('@google/genai');`.

2. **Type Enum Definition**:
   - In `dist/node/node.d.ts` lines 15773-15806:
     ```typescript
     export declare enum Type {
         TYPE_UNSPECIFIED = "TYPE_UNSPECIFIED",
         STRING = "STRING",
         NUMBER = "NUMBER",
         INTEGER = "INTEGER",
         BOOLEAN = "BOOLEAN",
         ARRAY = "ARRAY",
         OBJECT = "OBJECT",
         NULL = "NULL"
     }
     ```
   - In `dist/node/index.cjs` line 15773, `Type` is exported with uppercase string constants.

3. **Structured Output Calling Convention**:
   - In `dist/node/node.d.ts` lines 5570-5656, `GenerateContentConfig` defines:
     ```typescript
     responseMimeType?: string;
     responseSchema?: SchemaUnion;
     ```
   - In `dist/node/index.cjs` lines 15238-15243: Calling signature is `ai.models.generateContent({ model, contents, config: { responseMimeType: 'application/json', responseSchema } })`.
   - In `dist/node/index.cjs` lines 3504-3600: `processJsonSchema()` maps `Type.OBJECT` / `Type.STRING`, preserves `nullable: true`, and formats OpenAPI 3.0 schema definitions.

4. **Live Verification**:
   - Executing `node .agents/m2_explorer_1/validate-schema.js` confirmed that an OpenAPI schema using `Type.OBJECT`, `Type.INTEGER`, `Type.STRING`, `Type.ARRAY`, and `nullable: true` successfully initializes with `new GoogleGenAI({ apiKey: '...' })`.
   - Executing `node .agents/m2_explorer_1/test-schema-transform.js` verified that `ai.models.generateContent()` validates the schema parameter on the client side and issues the HTTP request to Google's API endpoint, returning an `ApiError` 400 (`API_KEY_INVALID`) rather than a client-side schema validation error.

5. **Interface Contract #2 (`PROJECT.md` lines 86-125)**:
   - Target function: `parseStructuredCriteria(targetedText, options)`.
   - Expected output format contains `success: boolean`, `isMock: boolean`, `modelUsed: string`, `data: { examTitle, organization, eligibility: { minAge, maxAge, ageRelaxation, requiredEducation, eligibleStreams }, importantDates: { applicationStartDate, applicationEndDate, examDate }, vacancies, applicationFee: { general, reserved }, status }`, `rawResponse?: any`, `error?: string`.

---

## 2. Logic Chain
1. **Observation 1 & 2** prove that `@google/genai` is the modern unified SDK for Gemini and fully supports Node.js CommonJS via `require('@google/genai')`.
2. **Observation 3** proves that structured outputs are invoked using `ai.models.generateContent` with `config.responseMimeType = 'application/json'` and `config.responseSchema = schema`, differing from the deprecated `@google/generative-ai` SDK (`genAI.getGenerativeModel`).
3. **Observation 3 & 4** prove that `Type` enum values (`Type.OBJECT`, `Type.STRING`, `Type.INTEGER`, `Type.ARRAY`) and `nullable: true` property annotations are natively recognized by the SDK's internal `processJsonSchema` transformer.
4. **Observation 5** establishes the exact fields and nested structure needed in `src/services/ai/schema.js`, which maps 1:1 with the verified OpenAPI schema format.
5. Therefore, implementing `src/services/ai/schema.js`, `gemini-parser.js`, `prompt.js`, and `mock-gemini.js` with the exact code specifications documented in `analysis.md` will satisfy Feature #6, #7, #8, and #9 of Milestone 2 with zero hallucination and complete offline testability.

---

## 3. Caveats
- **Live API Key**: Offline mock mode was verified with heuristic regex extraction; live API calls require a valid `process.env.GEMINI_API_KEY` from Google AI Studio. Live network requests will not succeed without an active key or internet connection.
- **Package Installation**: `@google/genai` must be formally added to `package.json` dependencies by the implementer agent.
- **Node Version**: `@google/genai` requires Node.js >= 20.0.0. The current local runtime is Node.js v24.13.0, which satisfies this requirement.

---

## 4. Conclusion
1. Install `@google/genai` (`^2.22.0`) in `package.json`.
2. Implement `src/services/ai/schema.js` using `Type` enum and `nullable: true` properties matching Interface Contract #2.
3. Implement `src/services/ai/gemini-parser.js` using `ai.models.generateContent` with `config: { responseMimeType: 'application/json', responseSchema }`, with automatic fallback to `mock-gemini.js` when `apiKey` is absent.
4. Implement `src/services/ai/prompt.js` with strict zero-hallucination constraints and null fallbacks.
5. Implement `src/services/ai/mock-gemini.js` with heuristic regex extractors and canonical notification fixtures to guarantee offline standalone testing.
6. Provide comprehensive test suite at `test/gemini-parser.test.js` covering Tier 1 and Tier 2 test suites.

---

## 5. Verification Method
To independently verify the findings and design:
1. Inspect the complete technical report at `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_1\analysis.md`.
2. Inspect schema validation proofs in:
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_1\validate-schema.js`
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_1\test-schema-transform.js`
   - `c:\Users\sindh\Documents\codes\mypath-scraper\.agents\m2_explorer_1\test-mock-gemini.js`
3. Invalidation Conditions:
   - If `@google/genai` rejects `responseSchema` under `config` in `models.generateContent`.
   - If `Type.OBJECT` or `nullable: true` throws a validation exception during parameter processing.
   - If `parseStructuredCriteria` return format deviates from Interface Contract #2 in `PROJECT.md`.
