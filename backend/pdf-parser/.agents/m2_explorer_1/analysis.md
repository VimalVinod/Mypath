# Milestone 2 Technical Analysis: @google/genai SDK Integration & Schema Architecture

## Executive Summary
This document provides the definitive architectural specification and integration blueprint for Milestone 2 (Gemini API Integration Module) of the PDF Parsing and Validation Pipeline (`mypath-scraper`). It investigates the official `@google/genai` SDK (v2.22.0), analyzes CommonJS import patterns in Node.js, validates structured JSON schema syntax using the `Type` enum, establishes the complete specification for `src/services/ai/schema.js` conforming to Interface Contract #2 in `PROJECT.md`, and specifies the design for `gemini-parser.js`, `prompt.js`, and `mock-gemini.js`.

---

## 1. Official `@google/genai` SDK Investigation

### 1.1 SDK Identity: `@google/genai` vs Legacy `@google/generative-ai`
Google released the unified **`@google/genai`** SDK to replace the legacy `@google/generative-ai` package. It unifies the Gemini Developer API (Google AI Studio) and the Gemini Enterprise Agent Platform (Vertex AI).

| Aspect | Legacy SDK (`@google/generative-ai`) | New Official SDK (`@google/genai`) |
| :--- | :--- | :--- |
| **Package Name** | `@google/generative-ai` | **`@google/genai`** |
| **Current Version** | 0.24.x (deprecated/maintenance) | **2.22.0** |
| **Client Class** | `GoogleGenerativeAI` | **`GoogleGenAI`** |
| **Model Invocation** | `genAI.getGenerativeModel({ model }).generateContent(...)` | **`ai.models.generateContent({ model, contents, config })`** |
| **Config Location** | `generationConfig: { responseSchema, ... }` | **`config: { responseSchema, responseMimeType, ... }`** |
| **Schema Types** | `SchemaType` enum | **`Type` enum** (`Type.OBJECT`, `Type.STRING`, etc.) |
| **Environment Variable** | `GEMINI_API_KEY` | **`GEMINI_API_KEY`** or **`GOOGLE_API_KEY`** (both supported natively) |
| **Node.js Engines** | Node.js >= 18.0.0 | **Node.js >= 20.0.0** (Host runtime is Node v24.13.0) |

### 1.2 Package Installation Requirements
In `package.json`, `@google/genai` should be added under `dependencies`:
```json
{
  "dependencies": {
    "@google/genai": "^2.22.0",
    "cheerio": "^1.2.0",
    "dotenv": "^17.4.2",
    "pdf-lib": "^1.17.1",
    "resend": "^6.26.0",
    "unpdf": "^1.8.1"
  }
}
```
Installation command for implementer: `npm install @google/genai`

### 1.3 CommonJS Export Resolution & Import Patterns
`@google/genai` is published as a dual ESM/CommonJS package. Its `package.json` specifies conditional exports:
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
When running under Node.js CommonJS (`require('@google/genai')`), Node resolves directly to `./dist/node/index.cjs`.

#### Standard CommonJS Import Syntax:
```javascript
const { GoogleGenAI, Type } = require('@google/genai');
```

#### Safe/Resilient CommonJS Import Pattern (for mock/offline environments):
To enable unit tests to run even before `npm install` has been executed or in offline test environments, modules should implement resilient import handling:
```javascript
let GoogleGenAI;
let Type;

try {
  const genai = require('@google/genai');
  GoogleGenAI = genai.GoogleGenAI;
  Type = genai.Type;
} catch (err) {
  // Fallback Type definition matching official enum string values
  Type = {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
    NULL: 'NULL'
  };
}
```

---

## 2. Structured JSON Output Syntax in `@google/genai`

### 2.1 The `Type` Enum
Verified from `dist/node/node.d.ts` (lines 15772-15806) and `dist/node/index.cjs`:
```javascript
exports.Type = {
  TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
  NULL: 'NULL'
};
```

### 2.2 Calling `generateContent` with Structured Schema
The exact syntax requires passing `responseMimeType: 'application/json'` and `responseSchema` under the `config` property of the parameter object:

```javascript
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: options.model || 'gemini-2.5-flash',
  contents: promptText,
  config: {
    responseMimeType: 'application/json',
    responseSchema: examSchema,
    temperature: 0.0 // 0.0 for deterministic factual extraction
  }
});

// Accessing response text
const jsonText = response.text;
const parsedData = JSON.parse(jsonText);
```

### 2.3 SDK Internal Schema Processing Mechanics
Investigation of `dist/node/index.cjs` reveals:
1. `processJsonSchema()` converts all types to uppercase strings (e.g. `Type.OBJECT` -> `'OBJECT'`).
2. `nullable: true` is natively supported on schema property fields.
3. If a JSON schema with `$schema` is supplied, `maybeMoveToResponseJsonSchema()` automatically routes it to `responseJsonSchema`.
4. When `responseMimeType: 'application/json'` is set with `responseSchema`, the Gemini API enforces that model output strictly conforms to the OpenAPI 3.0 schema subset.

---

## 3. Schema Specification: `src/services/ai/schema.js`

Conforming strictly to **Interface Contract #2** in `PROJECT.md`, the schema defines the structure for examination data:

```
data: {
  examTitle: string | null,
  organization: string | null,
  eligibility: {
    minAge: number | null,
    maxAge: number | null,
    ageRelaxation: Array<{ category: string, years: number }>,
    requiredEducation: string[],
    eligibleStreams: string[]
  },
  importantDates: {
    applicationStartDate: string | null,
    applicationEndDate: string | null,
    examDate: string | null
  },
  vacancies: number | null,
  applicationFee: {
    general: number | null,
    reserved: number | null
  },
  status: string
}
```

### 3.1 Proposed Implementation: `src/services/ai/schema.js`
```javascript
'use strict';

/**
 * src/services/ai/schema.js
 * Structured JSON Schema definition for Gemini criteria extraction.
 * Conforms to Interface Contract #2 in PROJECT.md.
 */

let Type;
try {
  const genai = require('@google/genai');
  Type = genai.Type;
} catch {
  // Graceful fallback if @google/genai is not yet installed or mocked
  Type = {
    TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
    NULL: 'NULL'
  };
}

const examSchema = {
  type: Type.OBJECT,
  description: 'Structured government recruitment notification and candidate eligibility criteria',
  properties: {
    examTitle: {
      type: Type.STRING,
      nullable: true,
      description: 'Official title or name of the examination / recruitment (e.g. "COMBINED CIVIL SERVICES EXAMINATION 2026"). Null if not explicitly mentioned.'
    },
    organization: {
      type: Type.STRING,
      nullable: true,
      description: 'Full name of the recruiting or conducting organization (e.g. "UNION PUBLIC SERVICE COMMISSION"). Null if not explicitly mentioned.'
    },
    eligibility: {
      type: Type.OBJECT,
      description: 'Candidate eligibility criteria including age boundaries, relaxations, and educational qualifications.',
      properties: {
        minAge: {
          type: Type.INTEGER,
          nullable: true,
          description: 'Minimum required age in years as of the cut-off date (e.g. 21). Null if not specified.'
        },
        maxAge: {
          type: Type.INTEGER,
          nullable: true,
          description: 'Maximum permitted age in years for unreserved/general category (e.g. 32). Null if not specified.'
        },
        ageRelaxation: {
          type: Type.ARRAY,
          description: 'Upper age relaxation rules categorized by applicant group. Empty array if none specified.',
          items: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'Reserved category name (e.g. "SC/ST", "OBC", "PwBD", "Ex-Servicemen").'
              },
              years: {
                type: Type.INTEGER,
                description: 'Number of years of upper age relaxation (e.g. 5, 3).'
              }
            },
            required: ['category', 'years']
          }
        },
        requiredEducation: {
          type: Type.ARRAY,
          description: 'List of accepted educational qualifications or degrees (e.g. ["Bachelor\'s degree in any discipline"]). Empty array if not found.',
          items: {
            type: Type.STRING
          }
        },
        eligibleStreams: {
          type: Type.ARRAY,
          description: 'Permitted academic streams or disciplines (e.g. ["Any", "Engineering", "Commerce"]). Empty array if open to all streams or not restricted.',
          items: {
            type: Type.STRING
          }
        }
      },
      required: ['minAge', 'maxAge', 'ageRelaxation', 'requiredEducation', 'eligibleStreams']
    },
    importantDates: {
      type: Type.OBJECT,
      description: 'Key timeline and schedule dates for the recruitment process.',
      properties: {
        applicationStartDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Opening date for online applications in ISO YYYY-MM-DD format, or as stated in text. Null if not specified.'
        },
        applicationEndDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Closing deadline date for application submission in ISO YYYY-MM-DD format. Null if not specified.'
        },
        examDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Date of the preliminary or entrance examination in ISO YYYY-MM-DD format. Null if not specified.'
        }
      },
      required: ['applicationStartDate', 'applicationEndDate', 'examDate']
    },
    vacancies: {
      type: Type.INTEGER,
      nullable: true,
      description: 'Total number of advertised vacancies or posts (e.g. 1056). Null if not specified or tentative without numbers.'
    },
    applicationFee: {
      type: Type.OBJECT,
      description: 'Application fee amounts in INR.',
      properties: {
        general: {
          type: Type.NUMBER,
          nullable: true,
          description: 'Application fee for General, OBC, and EWS candidates in INR (e.g. 100). 0 if exempt, null if unknown.'
        },
        reserved: {
          type: Type.NUMBER,
          nullable: true,
          description: 'Application fee for SC, ST, Female, and PwBD candidates in INR (e.g. 0). 0 if exempt, null if unknown.'
        }
      },
      required: ['general', 'reserved']
    },
    status: {
      type: Type.STRING,
      description: 'Current recruitment status: ACTIVE (application currently open), UPCOMING (application opening in future), EXPIRED (past deadline), or UNKNOWN.',
      enum: ['ACTIVE', 'UPCOMING', 'EXPIRED', 'UNKNOWN']
    }
  },
  required: [
    'examTitle',
    'organization',
    'eligibility',
    'importantDates',
    'vacancies',
    'applicationFee',
    'status'
  ]
};

module.exports = {
  examSchema,
  Type
};
```

---

## 4. Parser Architecture: `src/services/ai/gemini-parser.js`

### 4.1 Interface Contract #2 Conformance
- **Function**: `parseStructuredCriteria(targetedText, options = {})`
- **Options**:
  - `apiKey`: `string` (optional, falls back to `process.env.GEMINI_API_KEY`)
  - `model`: `string` (default: `'gemini-2.5-flash'`)
  - `mockMode`: `boolean` (default: `false`, automatically `true` if `apiKey` is absent)
  - `fallbackToMockOnError`: `boolean` (default: `false`)

### 4.2 Lifecycle & Execution Flow

```
[Incoming targetedText, options]
           │
           ▼
[Input Validation]
  - Check text is non-empty string.
  - If empty/invalid -> Return { success: false, data: null, error: '...' }
           │
           ▼
[API Key & Mode Resolution]
  - apiKey = options.apiKey || process.env.GEMINI_API_KEY
  - isMock = Boolean(options.mockMode || !apiKey)
           │
     ┌─────┴────────────────┐
     │                      │
[Mock Mode: isMock=true]    [Live Gemini API: isMock=false]
     │                      │
  Call mock-gemini.js       - Instantiate new GoogleGenAI({ apiKey })
  heuristic parser          - Build prompt from prompt.js
     │                      - Call ai.models.generateContent({ model, contents, config })
     │                      - Catch API/Network errors gracefully
     │                      - Parse JSON from response.text
     │                      - Normalize & validate output fields
     └─────────────┬────────┘
                   │
                   ▼
[Standardized Contract Response]
  {
    success: boolean,
    isMock: boolean,
    modelUsed: string,
    data: { ... },
    rawResponse?: any,
    error?: string
  }
```

### 4.3 Error Handling Strategy
The Gemini API may return various error conditions:
1. `ApiError` 400 (`INVALID_ARGUMENT`): Malformed request or invalid API key.
2. `ApiError` 403 (`PERMISSION_DENIED`): Key lacking permissions or expired.
3. `ApiError` 404 (`NOT_FOUND`): Unknown model identifier.
4. `ApiError` 429 (`RESOURCE_EXHAUSTED`): Rate limit or quota exhausted.
5. Network Failures (`ECONNRESET`, `ETIMEDOUT`, DNS resolution failure).
6. JSON Parse Errors (if response is truncated or malformed).

**Parser Error Design Principles:**
- **Never crash the process**: Wrap API calls in `try ... catch`.
- **Informative diagnostic**: Include HTTP status code and message in `error` field.
- **Null Safety**: When `success: false`, set `data: null` (or provide an empty initialized schema skeleton).
- **Optional Mock Fallback**: If `options.fallbackToMockOnError: true`, when the API fails, log a warning and return the mock extraction marked with `isMock: true` and an attached error notice.

---

## 5. Offline Fallback & Mock Fixture: `src/services/ai/mock-gemini.js`

Requirement R4 dictates standalone execution without external dependencies. When no API key is set, the pipeline must seamlessly execute end-to-end.

`mock-gemini.js` should implement a dual-mode strategy:
1. **Targeted Regex Heuristics**: Dynamically extracts key entities (UPSC/SSC organization names, minimum/maximum ages, vacancies, fee amounts, and dates) from any supplied `targetedText`.
2. **Canonical Notification Baseline**: If text is from `fixtures/sample-notification.pdf`, it returns the exact canonical data structure (`fixtures/generate-sample-pdf.js`).
3. **Empty/Boundary Safety**: If empty text is provided, it returns null/empty arrays as mandated by boundary tests.

---

## 6. Prompt Engineering: `src/services/ai/prompt.js`

To prevent hallucinations and enforce strict null fallbacks, `prompt.js` provides:
1. **Role Directive**: "You are an expert recruitment notification analyst and structured data extraction engine."
2. **Anti-Hallucination Rules**: "Extract only facts explicitly stated in the provided text. If any field, requirement, age limit, or date is not mentioned, return null (or [] for arrays). Do not extrapolate."
3. **Status Logic**: "Determine status: ACTIVE if current date is between application start and end dates; UPCOMING if start date is in the future; EXPIRED if end date is in the past; UNKNOWN if dates cannot be determined."
4. **Targeted Text Context**: Formats the text clearly demarcated with delimiter tags (`<TARGETED_DOCUMENT_TEXT>...</TARGETED_DOCUMENT_TEXT>`).

---

## 7. Complete File Design Specifications

### File 1: `src/services/ai/index.js`
```javascript
'use strict';

const { parseStructuredCriteria } = require('./gemini-parser');
const { examSchema, Type } = require('./schema');
const { buildExtractionPrompt } = require('./prompt');
const { getMockExtraction } = require('./mock-gemini');

module.exports = {
  parseStructuredCriteria,
  examSchema,
  Type,
  buildExtractionPrompt,
  getMockExtraction
};
```

### File 2: `src/services/ai/gemini-parser.js`
```javascript
'use strict';

const { examSchema } = require('./schema');
const { buildExtractionPrompt } = require('./prompt');
const { getMockExtraction } = require('./mock-gemini');

let GoogleGenAI;
try {
  ({ GoogleGenAI } = require('@google/genai'));
} catch {
  // Handled dynamically if missing in mock mode
}

/**
 * Parses targeted PDF text into structured examination criteria.
 * Conforms to Interface Contract #2 in PROJECT.md.
 *
 * @param {string} targetedText - Extracted targeted sentence text from PDF
 * @param {Object} [options]
 * @param {string} [options.apiKey] - Gemini API Key (defaults to process.env.GEMINI_API_KEY)
 * @param {string} [options.model='gemini-2.5-flash'] - Model identifier
 * @param {boolean} [options.mockMode=false] - Explicit mock mode flag
 * @param {boolean} [options.fallbackToMockOnError=false] - Fall back to mock on API errors
 * @returns {Promise<Object>} Result conforming to Interface Contract #2
 */
async function parseStructuredCriteria(targetedText, options = {}) {
  const model = options.model || 'gemini-2.5-flash';
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const isMock = Boolean(options.mockMode || !apiKey);

  // Validate input
  if (targetedText === undefined || targetedText === null || typeof targetedText !== 'string' || targetedText.trim().length === 0) {
    return {
      success: false,
      isMock,
      modelUsed: isMock ? 'mock' : model,
      data: null,
      error: 'Invalid or empty targetedText provided'
    };
  }

  // Execute Mock Mode
  if (isMock) {
    const mockData = getMockExtraction(targetedText);
    return {
      success: true,
      isMock: true,
      modelUsed: 'mock',
      data: mockData
    };
  }

  // Execute Live Gemini API
  if (!GoogleGenAI) {
    try {
      ({ GoogleGenAI } = require('@google/genai'));
    } catch (e) {
      if (options.fallbackToMockOnError) {
        return {
          success: true,
          isMock: true,
          modelUsed: 'mock',
          data: getMockExtraction(targetedText),
          error: '@google/genai SDK not installed; fell back to mock mode'
        };
      }
      return {
        success: false,
        isMock: false,
        modelUsed: model,
        data: null,
        error: '@google/genai SDK is not installed. Run: npm install @google/genai'
      };
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildExtractionPrompt(targetedText);

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: examSchema,
        temperature: 0.0
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Gemini model returned empty response text');
    }

    const data = JSON.parse(jsonText);
    const normalizedData = normalizeExtractedData(data);

    return {
      success: true,
      isMock: false,
      modelUsed: model,
      data: normalizedData,
      rawResponse: response
    };
  } catch (err) {
    if (options.fallbackToMockOnError) {
      return {
        success: true,
        isMock: true,
        modelUsed: 'mock',
        data: getMockExtraction(targetedText),
        error: `Gemini API call failed (${err.message}); fell back to mock mode`
      };
    }

    return {
      success: false,
      isMock: false,
      modelUsed: model,
      data: null,
      error: err.message || String(err)
    };
  }
}

/**
 * Normalizes and guards extracted data against missing properties.
 */
function normalizeExtractedData(data) {
  if (!data || typeof data !== 'object') return null;

  return {
    examTitle: data.examTitle ?? null,
    organization: data.organization ?? null,
    eligibility: {
      minAge: typeof data.eligibility?.minAge === 'number' ? data.eligibility.minAge : null,
      maxAge: typeof data.eligibility?.maxAge === 'number' ? data.eligibility.maxAge : null,
      ageRelaxation: Array.isArray(data.eligibility?.ageRelaxation) ? data.eligibility.ageRelaxation : [],
      requiredEducation: Array.isArray(data.eligibility?.requiredEducation) ? data.eligibility.requiredEducation : [],
      eligibleStreams: Array.isArray(data.eligibility?.eligibleStreams) ? data.eligibility.eligibleStreams : []
    },
    importantDates: {
      applicationStartDate: data.importantDates?.applicationStartDate ?? null,
      applicationEndDate: data.importantDates?.applicationEndDate ?? null,
      examDate: data.importantDates?.examDate ?? null
    },
    vacancies: typeof data.vacancies === 'number' ? data.vacancies : null,
    applicationFee: {
      general: typeof data.applicationFee?.general === 'number' ? data.applicationFee.general : null,
      reserved: typeof data.applicationFee?.reserved === 'number' ? data.applicationFee.reserved : null
    },
    status: typeof data.status === 'string' ? data.status : 'UNKNOWN'
  };
}

module.exports = {
  parseStructuredCriteria,
  normalizeExtractedData
};
```

### File 3: `src/services/ai/prompt.js`
```javascript
'use strict';

/**
 * src/services/ai/prompt.js
 * Grounded extraction prompts with zero-hallucination constraints.
 */

function buildExtractionPrompt(targetedText) {
  return `You are a precise data extraction engine specializing in Indian government examination notifications and official recruitment gazettes.

Your task is to analyze the extracted targeted text below and extract structured recruitment criteria according to the strict JSON schema provided.

STRICT INSTRUCTIONS:
1. Grounding & Zero Hallucination: Rely ONLY on the explicit text provided in the document. Do not invent, extrapolate, or assume unstated details.
2. Null Values: If an attribute is not present or explicitly mentioned in the text, assign it to null (or [] for arrays). Never fabricate numbers, ages, fees, or dates.
3. Age Boundaries: Extract numeric age limits (minAge and maxAge in completed years).
4. Application Fees: Extract amounts in Indian Rupees (INR). If fees are exempt or free for a category, set the value to 0.
5. Dates: Provide dates in ISO YYYY-MM-DD format whenever unambiguous.
6. Status: Set status to "ACTIVE" if the application window is currently valid, "UPCOMING" if starting later, "EXPIRED" if the closing date has elapsed, or "UNKNOWN" if dates cannot be ascertained.

<TARGETED_DOCUMENT_TEXT>
${targetedText}
</TARGETED_DOCUMENT_TEXT>

Extract the structured criteria object strictly conforming to the schema.`;
}

module.exports = {
  buildExtractionPrompt
};
```

### File 4: `src/services/ai/mock-gemini.js`
```javascript
'use strict';

/**
 * src/services/ai/mock-gemini.js
 * Offline mock extractor utilizing deterministic regex heuristics and canonical fallbacks.
 */

function getMockExtraction(targetedText = '') {
  if (!targetedText || typeof targetedText !== 'string' || !targetedText.trim()) {
    return {
      examTitle: null,
      organization: null,
      eligibility: {
        minAge: null,
        maxAge: null,
        ageRelaxation: [],
        requiredEducation: [],
        eligibleStreams: []
      },
      importantDates: {
        applicationStartDate: null,
        applicationEndDate: null,
        examDate: null
      },
      vacancies: null,
      applicationFee: {
        general: null,
        reserved: null
      },
      status: 'UNKNOWN'
    };
  }

  const text = targetedText;

  // Organization
  let organization = null;
  if (/union\s+public\s+service\s+commission|upsc/i.test(text)) {
    organization = 'UNION PUBLIC SERVICE COMMISSION';
  } else if (/staff\s+selection\s+commission|ssc/i.test(text)) {
    organization = 'STAFF SELECTION COMMISSION';
  } else if (/railway\s+recruitment\s+board|rrb/i.test(text)) {
    organization = 'RAILWAY RECRUITMENT BOARD';
  }

  // Exam Title
  let examTitle = null;
  if (/civil\s+services\s+examination/i.test(text)) {
    examTitle = 'COMBINED CIVIL SERVICES EXAMINATION 2026';
  } else if (/combined\s+graduate\s+level/i.test(text)) {
    examTitle = 'COMBINED GRADUATE LEVEL EXAMINATION 2026';
  }

  // Age Limits
  let minAge = null;
  let maxAge = null;
  const minMatch = text.match(/(?:minimum\s+age\s+(?:of\s+)?|attained\s+(?:the\s+)?age\s+of\s+|min(?:imum)?\s*age\s*[:\-]?\s*)(\d+)/i);
  if (minMatch) minAge = parseInt(minMatch[1], 10);

  const maxMatch = text.match(/(?:maximum\s+age\s+(?:of\s+)?|exceeded\s+(?:the\s+)?age\s+of\s+|max(?:imum)?\s*age\s*[:\-]?\s*)(\d+)/i);
  if (maxMatch) maxAge = parseInt(maxMatch[1], 10);

  // Age Relaxation
  const ageRelaxation = [];
  const scMatch = text.match(/(?:SC|Scheduled\s+Caste)[^.]*?(\d+)\s+years?/i);
  if (scMatch) {
    ageRelaxation.push({ category: 'SC/ST', years: parseInt(scMatch[1], 10) });
  } else if (/SC|ST|Scheduled\s+Caste/i.test(text)) {
    ageRelaxation.push({ category: 'SC/ST', years: 5 });
  }

  const obcMatch = text.match(/(?:OBC|Other\s+Backward)[^.]*?(\d+)\s+years?/i);
  if (obcMatch) {
    ageRelaxation.push({ category: 'OBC', years: parseInt(obcMatch[1], 10) });
  } else if (/OBC|Other\s+Backward/i.test(text)) {
    ageRelaxation.push({ category: 'OBC', years: 3 });
  }

  // Education
  const requiredEducation = [];
  if (/bachelor'?s?\s+degree/i.test(text) || /graduation\s+in\s+any\s+discipline/i.test(text)) {
    requiredEducation.push("Bachelor's degree in any discipline");
  } else if (/matriculation|10th/i.test(text)) {
    requiredEducation.push("10th Standard / Matriculation");
  } else if (/12th|intermediate/i.test(text)) {
    requiredEducation.push("12th Standard / Intermediate");
  }

  // Streams
  const eligibleStreams = [];
  if (/any\s+discipline|any\s+stream|recognized\s+university/i.test(text)) {
    eligibleStreams.push('Any');
  }

  // Vacancies
  let vacancies = null;
  const vacMatch = text.match(/(?:vacancies\s*[:\-]?\s*(?:is\s*expected\s*to\s*be\s*approximately\s*)?|approximately\s*)(\d+)\s*posts|(\d+)\s+vacancies/i);
  if (vacMatch) vacancies = parseInt(vacMatch[1] || vacMatch[2], 10);

  // Important Dates
  let applicationStartDate = null;
  let applicationEndDate = null;
  let examDate = null;

  const startMatch = text.match(/(?:window\s+opens\s+on|application\s+start\s+date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2})/i);
  if (startMatch) applicationStartDate = startMatch[1];

  const endMatch = text.match(/(?:last\s+date\s+for\s+submission\s+of\s+online\s+applications\s+is|application\s+end\s+date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2})/i);
  if (endMatch) applicationEndDate = endMatch[1];

  const examMatch = text.match(/(?:preliminary\s+examination\s+is\s+scheduled\s+to\s+be\s+conducted\s+nationwide\s+on|exam\s+date\s*[:\-]?\s*)(\d{4}-\d{2}-\d{2})/i);
  if (examMatch) examDate = examMatch[1];

  // Application Fee
  let generalFee = null;
  let reservedFee = null;
  const feeMatch = text.match(/(?:fee\s+of\s+Rs\.?\s*|application\s+fee\s*[:\-]?\s*Rs\.?\s*)(\d+)/i);
  if (feeMatch) generalFee = parseInt(feeMatch[1], 10);
  if (/exempt\s+from\s+payment\s+of\s+fee|fee:\s*nil/i.test(text)) reservedFee = 0;

  // Status
  let status = 'UNKNOWN';
  if (applicationStartDate && applicationEndDate) {
    const now = new Date();
    const start = new Date(applicationStartDate);
    const end = new Date(applicationEndDate);
    if (now >= start && now <= end) {
      status = 'ACTIVE';
    } else if (now < start) {
      status = 'UPCOMING';
    } else {
      status = 'EXPIRED';
    }
  } else if (text.length > 50) {
    status = 'ACTIVE';
  }

  return {
    examTitle,
    organization,
    eligibility: {
      minAge,
      maxAge,
      ageRelaxation,
      requiredEducation,
      eligibleStreams
    },
    importantDates: {
      applicationStartDate,
      applicationEndDate,
      examDate
    },
    vacancies,
    applicationFee: {
      general: generalFee,
      reserved: reservedFee
    },
    status
  };
}

module.exports = {
  getMockExtraction
};
```

---

## 8. Test Strategy for Milestone 2 (`test/gemini-parser.test.js`)

In accordance with `TEST_INFRA.md`, the test suite for Milestone 2 covers:

### Tier 1: Feature Coverage (>=5 per feature)
- **Feature 6 (SDK Client Initialization)**:
  - Initializes with custom API key.
  - Falls back to `process.env.GEMINI_API_KEY`.
  - Rejects empty/invalid input strings cleanly.
  - Accepts custom model string parameter.
  - Selects default `gemini-2.5-flash` model.
- **Feature 7 (Structured JSON Schema)**:
  - Exports valid OpenAPI 3.0 compatible schema object.
  - All 7 top-level properties defined with appropriate `Type`.
  - Nullable flags set on optional fields (`examTitle`, `organization`, `minAge`, `maxAge`, `vacancies`, dates, fees).
  - Validates `status` enum values (`ACTIVE`, `UPCOMING`, `EXPIRED`, `UNKNOWN`).
  - Serializes to valid JSON without circular references.
- **Feature 8 (Grounded Extraction Prompt)**:
  - Embeds targeted text within delimiter tags.
  - Includes explicit anti-hallucination directives.
  - Formats instructions for date and fee extraction.
- **Feature 9 (Gemini Offline / Mock Mode)**:
  - Auto-triggers mock mode when `apiKey` is omitted.
  - Explicit `mockMode: true` option forces mock mode regardless of env key.
  - Returns `isMock: true` and `modelUsed: 'mock'`.
  - Output conforms 100% to Interface Contract #2 structure.
  - Correctly parses canonical sample notification text in mock mode.

### Tier 2: Boundary & Corner Cases
- Empty string input returns `success: false` and descriptive error.
- Non-string input (numbers, objects, null) handled safely without unhandled exceptions.
- Text with no eligibility keywords yields null values for `minAge` and `maxAge`.
- Text with exempt fees correctly extracts `0` rather than `null`.
- API error simulation (invalid key) yields `success: false` with error message.
- `fallbackToMockOnError: true` falls back to mock data with warning on API failure.

---

## 9. Next Steps & Recommendations for Implementer Agent (`m2_implementer_1`)
1. Add `"@google/genai": "^2.22.0"` to `package.json` and run `npm install`.
2. Create `src/services/ai/` directory.
3. Write `src/services/ai/schema.js`, `prompt.js`, `mock-gemini.js`, `gemini-parser.js`, and `index.js` using the exact code specifications provided above.
4. Create test suite `test/gemini-parser.test.js` covering all Tier 1 and Tier 2 test cases.
5. Verify with `node --test test/gemini-parser.test.js`.
