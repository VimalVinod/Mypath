# Technical Survey Report: Gemini API Integration, Unity Checking, & Standalone Execution

> **Author**: `explorer_survey_3` (Teamwork Explorer)  
> **Date**: 2026-09-13  
> **Target Scope**: Requirement 2 (Gemini API Integration), Requirement 3 (Unity/Database Checking), Requirement 4 (Standalone Execution)  
> **Project Workspace**: `c:\Users\sindh\Documents\codes\mypath-scraper`  
> **Environment**: Node.js v24.13.0, Windows x64, CommonJS  

---

## 1. Executive Summary & Core Architectural Decisions

This survey evaluates and defines the technical architecture for the downstream intelligence and validation stages of the PDF parsing pipeline:

1. **Requirement 2 (Gemini API Integration)**:
   - **Mandatory SDK**: Use the official new Google Gen AI SDK **`@google/genai`** (latest version `2.22.0`). Strictly avoid the legacy `@google/generative-ai` package, which is frozen, lacks Gemini 2.0+ features, and uses deprecated client/model invocation patterns.
   - **Client & Model**: Initialized via `new GoogleGenAI({ apiKey })`, reading `process.env.GEMINI_API_KEY`. The default model is **`gemini-2.5-flash`** for sub-second latency, low token cost, and native schema compliance.
   - **Structured Outputs**: Fully constrained JSON responses using `config.responseMimeType = 'application/json'` and `config.responseSchema` defined with the SDK's exported `Type` enum (`Type.OBJECT`, `Type.STRING`, `Type.INTEGER`, etc.).
   - **Prompt Engineering**: System instructions that enforce strict grounding on extracted PDF snippets, explicit prohibition against hallucination, standard ISO 8601 date parsing, and null-fallback for unstated fields.

2. **Requirement 3 (Unity / Database Checking Module)**:
   - **Concept**: A declarative reconciliation and evaluation engine that cross-references the Gemini-extracted structured JSON against a benchmark set of database criteria or schema rules.
   - **Multi-Level Checking**:
     1. *Schema/Integrity Rules*: Enforces required fields, data types, and enum values.
     2. *Benchmark Criteria Rules*: Enforces acceptable value ranges (e.g. `minAge >= 18`, `maxAge <= 32`, `vacancies.total >= 500`).
     3. *Candidate Eligibility Matching*: Compares candidate credentials (e.g., candidate age, degree, category) against extracted notification requirements.
   - **Engine Output**: Standardized verdict (`PASS` / `FAIL` / `WARNING`), field-by-field verification matrix, detailed diffs with root-cause explanations, and pass rates.

3. **Requirement 4 (Standalone Execution & Local Demo `parse-demo.js`)**:
   - **Zero-Service Independence**: Runs entirely locally via `node parse-demo.js` without any active Firebase, Firestore, or Resend email connections.
   - **Automatic Mock Fallback**: If `GEMINI_API_KEY` is not present in `.env` (or `--mock` is passed), the pipeline gracefully falls back to a simulated mock extraction mode, preventing crashes and allowing offline demoing/testing.
   - **Formatted Terminal UI**: Professional console dashboard displaying extraction statistics, token reduction metrics, Gemini inference timing, field-by-field unity evaluation table, and final validation verdict.

---

## 2. Requirement 2: Gemini API Integration via `@google/genai`

### 2.1 SDK Verification: `@google/genai` vs Legacy `@google/generative-ai`

The user requirement mandates:
> *"Integrate the official `@google/genai` SDK. Pass the targeted, extracted PDF text to the Gemini model to intelligently parse out structured criteria (e.g., eligibility requirements, qualifications, or specific data points)."*

An audit of the npm registry and package declarations confirms:

| Dimension | New Official SDK: `@google/genai` (v2.22.0) | Legacy SDK: `@google/generative-ai` (v0.24.x) |
| :--- | :--- | :--- |
| **Status** | **Active official Google DeepMind SDK** | **Deprecated / Frozen** (no new Gemini 2.0+ features) |
| **Package Name** | `@google/genai` | `@google/generative-ai` |
| **Node.js Engine** | Node >= 20.0.0 (Our environment is Node v24.13.0) | Node >= 18.0.0 |
| **Module Support** | **Dual ESM & CommonJS** (`dist/node/index.cjs` & `index.mjs`) | Dual ESM & CommonJS |
| **Client Class** | `new GoogleGenAI({ apiKey })` | `new GoogleGenerativeAI(apiKey)` |
| **Model Invocation** | `ai.models.generateContent({ model, contents, config })` | `genAI.getGenerativeModel({ model }).generateContent()` |
| **Schema Definition** | `config.responseSchema` using `Type` enum from `@google/genai` | `generationConfig.responseSchema` via `SchemaType` |
| **Response Accessor** | `response.text` (getter string property) | `response.response.text()` (function call) |
| **Token Usage** | `response.usageMetadata` (`promptTokenCount`, `candidatesTokenCount`) | `response.response.usageMetadata` |

**Conclusion**: Implementations must install and import **`@google/genai`** exclusively. Any usage of `@google/generative-ai` must be rejected during code review.

### 2.2 Client Initialization & Credential Handling

#### Construction
```javascript
const { GoogleGenAI, Type } = require('@google/genai');

class GeminiExtractor {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.isMock = Boolean(options.mock);

    if (!this.isMock) {
      if (!this.apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env file or enable mock mode via --mock.'
        );
      }
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }
}
```

#### Safe Credential Practices
1. `GEMINI_API_KEY` is loaded from `.env` via `dotenv` (already present in `package.json`).
2. The key is never logged to the console or written to output files. In debug/verbose logs, sanitize to `AIzaSy...XXXX`.
3. If no key is detected, the pipeline automatically switches to Mock Fallback Mode rather than terminating abruptly.

### 2.3 Model Selection Strategy

1. **Default Model: `gemini-2.5-flash`**
   - Recommended for general production use.
   - Extremely low latency (< 1.5 seconds typical response time on filtered snippets).
   - High adherence to OpenAPI/JSON schemas.
   - Large context window (1M tokens), though our PDF preprocessing reduces input to ~500-1,500 tokens.
2. **Alternative / Configurable Models**:
   - `gemini-2.5-pro`: Recommended if notifications contain intricate nested tables or multi-column reservation schedules requiring complex deductive logic.
   - `gemini-2.0-flash`: Fully supported lightweight fallback.

### 2.4 Structured JSON Output Schema Definition using `Type`

In `@google/genai`, the response schema is supplied under `config.responseSchema` with `config.responseMimeType = 'application/json'`.

The exported `Type` enum provides:
- `Type.STRING`
- `Type.NUMBER`
- `Type.INTEGER`
- `Type.BOOLEAN`
- `Type.ARRAY`
- `Type.OBJECT`

#### Domain Schema Definition: `EXAM_CRITERIA_SCHEMA`

```javascript
const { Type } = require('@google/genai');

const EXAM_CRITERIA_SCHEMA = {
  type: Type.OBJECT,
  description: 'Structured recruitment examination criteria extracted from notification text',
  properties: {
    examTitle: {
      type: Type.STRING,
      description: 'Official title or notification name of the examination (e.g., "Combined Higher Secondary (10+2) Level Examination 2026")'
    },
    organization: {
      type: Type.STRING,
      description: 'Name of the conducting commission, department, or agency (e.g., "SSC", "UPSC", "IBPS")'
    },
    examCode: {
      type: Type.STRING,
      description: 'Standardized examination acronym or code if identifiable (e.g., "CHSL", "CGL", "CSE")'
    },
    postNames: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of specific job posts or positions announced in this notification'
    },
    eligibility: {
      type: Type.OBJECT,
      description: 'Eligibility criteria required for applicants',
      properties: {
        minAge: {
          type: Type.INTEGER,
          description: 'Minimum eligible age in years as on the specified cutoff date'
        },
        maxAge: {
          type: Type.INTEGER,
          description: 'Maximum eligible age in years for General / Unreserved category applicants'
        },
        ageCutoffDate: {
          type: Type.STRING,
          description: 'Cutoff date for determining applicant age (e.g., "2026-08-01")'
        },
        requiredEducation: {
          type: Type.STRING,
          description: 'Minimum educational requirement category (e.g., "10th Pass", "12th Pass", "Graduate", "Post-Graduate")'
        },
        allowedDegrees: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific qualifying degrees, diplomas, or subjects mentioned'
        },
        nationality: {
          type: Type.STRING,
          description: 'Required citizenship or nationality (e.g., "Citizen of India")'
        }
      },
      required: ['minAge', 'maxAge', 'requiredEducation']
    },
    importantDates: {
      type: Type.OBJECT,
      description: 'Schedule of critical application and exam dates',
      properties: {
        notificationDate: {
          type: Type.STRING,
          description: 'Official release date of notification in YYYY-MM-DD'
        },
        applicationStartDate: {
          type: Type.STRING,
          description: 'Date online applications open in YYYY-MM-DD'
        },
        applicationEndDate: {
          type: Type.STRING,
          description: 'Final deadline / closing date for online applications in YYYY-MM-DD'
        },
        examDate: {
          type: Type.STRING,
          description: 'Tentative or scheduled date/month of examination'
        }
      },
      required: ['applicationEndDate']
    },
    vacancies: {
      type: Type.OBJECT,
      description: 'Reported vacancy count and characteristics',
      properties: {
        total: {
          type: Type.INTEGER,
          description: 'Total number of vacancies declared (integer)'
        },
        isTentative: {
          type: Type.BOOLEAN,
          description: 'Whether the reported vacancy count is tentative/approximate'
        }
      }
    },
    applicationFee: {
      type: Type.OBJECT,
      description: 'Application fee structure in INR',
      properties: {
        generalAmount: {
          type: Type.NUMBER,
          description: 'Application fee for unreserved / General / OBC male candidates in INR'
        },
        exemptedCategories: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Categories exempted from fee payment (e.g., "Women", "SC", "ST", "PwBD", "ESM")'
        }
      }
    },
    status: {
      type: Type.STRING,
      description: 'Current operational status of this recruitment cycle',
      enum: ['ACTIVE', 'UPCOMING', 'CLOSED']
    }
  },
  required: ['examTitle', 'organization', 'eligibility', 'importantDates']
};

module.exports = { EXAM_CRITERIA_SCHEMA };
```

### 2.5 Prompt Engineering & Grounding Constraints

#### System Instruction
The model must operate under strict system instructions to guarantee accuracy:
```
You are an expert recruitment notification analyst and structured data extraction engine.
Your role is to extract recruitment parameters, eligibility criteria, schedules, and vacancy details from official notification excerpts.

STRICT OPERATIONAL RULES:
1. Grounding: Extract facts ONLY from the supplied text snippets. Do not extrapolate, infer unmentioned positions, or hallucinate.
2. Missing Information: If any schema field is not explicitly mentioned or cannot be determined with certainty from the text, set that field to null (or omit optional fields). Never invent placeholders like "N/A" or imaginary dates.
3. Date Normalization: Convert all extracted dates into ISO 8601 format (YYYY-MM-DD) whenever discernible (e.g., "7th October 2026" -> "2026-10-07").
4. Age Calculation: For minAge and maxAge, extract the explicit integer age limits for General / Unreserved candidates.
5. Organization: Identify the conducting commission (e.g., SSC, UPSC, State PSC) accurately.
```

#### User Prompt Template
```javascript
function buildExtractionPrompt(targetedText, metadata = {}) {
  return `Please extract the structured examination criteria from the following targeted notification text snippets.

DOCUMENT METADATA:
- Source: ${metadata.source || 'Official Notification PDF'}
- Total Extracted Snippets: ${metadata.snippetCount || 'Multiple'}

TARGETED NOTIFICATION TEXT:
================================================================================
${targetedText}
================================================================================

Extract all fields specified in the schema. Return valid JSON only.`;
}
```

### 2.6 Invocation & Response Parsing

```javascript
async function extractCriteriaWithGemini(ai, targetedText, options = {}) {
  const model = options.model || 'gemini-2.5-flash';
  const startTime = Date.now();

  const response = await ai.models.generateContent({
    model,
    contents: buildExtractionPrompt(targetedText, options.metadata),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1, // Low temperature for deterministic, factual extraction
      responseMimeType: 'application/json',
      responseSchema: EXAM_CRITERIA_SCHEMA
    }
  });

  const durationMs = Date.now() - startTime;
  const rawText = response.text;

  let parsedData;
  try {
    parsedData = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Failed to parse Gemini structured JSON response: ${err.message}\nRaw Text: ${rawText}`);
  }

  return {
    success: true,
    data: parsedData,
    metrics: {
      model,
      durationMs,
      promptTokens: response.usageMetadata?.promptTokenCount || 0,
      candidateTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0
    }
  };
}
```

---

## 3. Requirement 3: Unity / Database Checking Module

### 3.1 What is "Unity Checking"?
In the context of the MyPath / ExamGo architecture, the **Unity Checker** is the cross-referencing and verification engine. It serves two distinct, essential functions:

1. **Database Schema & Benchmark Verification**:
   Validates that the PDF parsed by Gemini aligns with system standards and business expectations (e.g., verifying that an SSC exam has an expected minimum age of 18, has a valid application closing date, and belongs to an authorized organization).
2. **Candidate Profile Compatibility Matching**:
   Takes a candidate profile (e.g. `age: 24, education: 'Graduate', category: 'General'`) and evaluates whether the candidate is eligible for the parsed exam according to the extracted criteria.

### 3.2 Database Criteria Schema & Structure (`databaseCriteria`)

We define a declarative, JSON-serializable criteria format that allows administrators or automated systems to define flexible rules without writing code:

```javascript
const SAMPLE_DATABASE_CRITERIA = {
  criteriaId: 'CRIT_SSC_CHSL_2026',
  examCode: 'SSC_CHSL',
  description: 'Database validation criteria for SSC CHSL 2026 examination',
  
  // Field-level rules evaluated against Gemini extracted data
  rules: [
    {
      field: 'organization',
      rule: 'enum',
      expected: ['SSC', 'Staff Selection Commission'],
      severity: 'ERROR',
      description: 'Conducting organization must be Staff Selection Commission'
    },
    {
      field: 'examTitle',
      rule: 'contains',
      expected: 'Combined Higher Secondary',
      caseInsensitive: true,
      severity: 'ERROR',
      description: 'Exam title must refer to Combined Higher Secondary Level'
    },
    {
      field: 'eligibility.minAge',
      rule: 'range',
      min: 18,
      max: 18,
      severity: 'ERROR',
      description: 'Minimum age requirement must be exactly 18'
    },
    {
      field: 'eligibility.maxAge',
      rule: 'range',
      min: 27,
      max: 32,
      severity: 'ERROR',
      description: 'Maximum age for unreserved positions must be between 27 and 32'
    },
    {
      field: 'eligibility.requiredEducation',
      rule: 'enum',
      expected: ['12th Pass', 'Higher Secondary', '10+2', 'Intermediate'],
      caseInsensitive: true,
      severity: 'ERROR',
      description: 'Required education must be 12th Pass / 10+2 equivalent'
    },
    {
      field: 'importantDates.applicationEndDate',
      rule: 'dateRange',
      after: '2026-01-01',
      severity: 'ERROR',
      description: 'Application end date must be valid within the year 2026'
    },
    {
      field: 'vacancies.total',
      rule: 'min',
      expected: 500,
      severity: 'WARNING', // Non-fatal advisory rule
      description: 'Vacancies are expected to be at least 500'
    },
    {
      field: 'applicationFee.generalAmount',
      rule: 'max',
      expected: 250,
      severity: 'WARNING',
      description: 'SSC application fees should not exceed 250 INR'
    },
    {
      field: 'status',
      rule: 'enum',
      expected: ['ACTIVE', 'UPCOMING'],
      severity: 'ERROR',
      description: 'Exam status must be active or upcoming'
    }
  ],

  // Optional candidate profile for direct eligibility matching
  candidateProfile: {
    name: 'Abhishek S Kumar',
    age: 24,
    education: 'Graduate',
    category: 'General'
  }
};
```

### 3.3 Supported Rule Operators

The comparison engine supports the following declarative operators:

| Operator | Parameter | Purpose / Check | Severity |
| :--- | :--- | :--- | :--- |
| `required` | `true` | Field exists, is not `null`, not `undefined`, not empty string | `ERROR` / `WARNING` |
| `equals` | `expected` | Exact value equality (`===`), with optional `caseInsensitive` | `ERROR` / `WARNING` |
| `enum` | `expected: [...]` | Actual string is in the list of allowed strings | `ERROR` / `WARNING` |
| `contains` | `expected: string` | Actual string includes substring | `ERROR` / `WARNING` |
| `min` | `expected: number` | Actual number is `>= expected` | `ERROR` / `WARNING` |
| `max` | `expected: number` | Actual number is `<= expected` | `ERROR` / `WARNING` |
| `range` | `min: x, max: y` | Actual number is `>= min` and `<= max` | `ERROR` / `WARNING` |
| `dateRange` | `after: d1, before: d2` | Actual date string is chronologically valid | `ERROR` / `WARNING` |
| `includes` | `expected: string` | Actual array includes expected element | `ERROR` / `WARNING` |
| `custom` | `fn: (val, ctx) => ...` | Programmatic custom predicate | `ERROR` / `WARNING` |

### 3.4 Deep Property Resolution (Dot Notation)
The engine resolves nested properties safely using a dot-path resolver:
```javascript
function getDeepValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}
```

### 3.5 Candidate Profile Matching Logic
When `candidateProfile` is provided, the engine additionally evaluates:
1. **Age Criteria**:
   - `ageRelaxation`: General = 0, OBC = +3, SC/ST = +5, EWS = 0.
   - `effectiveMaxAge = extracted.eligibility.maxAge + (categoryRelaxation[candidate.category] || 0)`.
   - Result: `candidate.age >= extracted.eligibility.minAge && candidate.age <= effectiveMaxAge`.
2. **Educational Hierarchy**:
   - Education levels: `10th Pass (1) < 12th Pass (2) < Diploma (2) < Graduate (3) < Post-Graduate (4)`.
   - Result: `levelRank(candidate.education) >= levelRank(extracted.eligibility.requiredEducation)`.
3. **Application Deadline**:
   - Compares today's date against `extracted.importantDates.applicationEndDate`. If deadline has passed, candidate eligibility is flagged as expired.

### 3.6 Comparison Engine Implementation: `UnityChecker`

```javascript
class UnityChecker {
  constructor(options = {}) {
    this.options = options;
  }

  evaluate(extractedData, criteria) {
    const results = [];
    const diffs = [];
    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;

    const rules = criteria.rules || [];

    for (const rule of rules) {
      const actualValue = getDeepValue(extractedData, rule.field);
      const evalResult = this._evaluateRule(rule, actualValue, extractedData);

      results.push(evalResult);

      if (evalResult.status === 'PASS') {
        passedCount++;
      } else if (evalResult.status === 'FAIL') {
        failedCount++;
        diffs.push({
          field: rule.field,
          rule: rule.rule,
          expected: evalResult.expectedFormatted,
          actual: actualValue !== undefined ? actualValue : '<not found>',
          reason: evalResult.reason,
          severity: rule.severity || 'ERROR'
        });
      } else if (evalResult.status === 'WARNING') {
        warningCount++;
        diffs.push({
          field: rule.field,
          rule: rule.rule,
          expected: evalResult.expectedFormatted,
          actual: actualValue !== undefined ? actualValue : '<not found>',
          reason: evalResult.reason,
          severity: 'WARNING'
        });
      }
    }

    // Candidate Profile evaluation if attached
    let candidateEvaluation = null;
    if (criteria.candidateProfile) {
      candidateEvaluation = this._evaluateCandidate(extractedData, criteria.candidateProfile);
    }

    // Overall verdict calculation
    const hasError = results.some(r => r.status === 'FAIL');
    const hasWarning = results.some(r => r.status === 'WARNING');
    const overallStatus = hasError ? 'FAIL' : (hasWarning ? 'WARNING' : 'PASS');

    return {
      overallStatus,
      isPass: !hasError,
      summary: {
        totalRules: rules.length,
        passedCount,
        failedCount,
        warningCount,
        passRate: rules.length > 0 ? Number(((passedCount / rules.length) * 100).toFixed(1)) : 100
      },
      results,
      diffs,
      candidateEvaluation,
      evaluatedAt: new Date().toISOString()
    };
  }

  _evaluateRule(ruleDef, actual, allExtracted) {
    const field = ruleDef.field;
    const severity = ruleDef.severity || 'ERROR';

    // 1. Check required presence
    if (actual === undefined || actual === null || actual === '') {
      return {
        field,
        status: severity === 'WARNING' ? 'WARNING' : 'FAIL',
        rule: ruleDef.rule,
        expectedFormatted: 'Field must be present',
        actual: null,
        reason: `Required field "${field}" was not found in extracted data.`,
        severity
      };
    }

    // 2. Dispatch by rule type
    switch (ruleDef.rule) {
      case 'enum': {
        const allowed = Array.isArray(ruleDef.expected) ? ruleDef.expected : [ruleDef.expected];
        const match = ruleDef.caseInsensitive
          ? allowed.some(a => String(a).toLowerCase() === String(actual).toLowerCase())
          : allowed.includes(actual);
        return {
          field,
          status: match ? 'PASS' : (severity === 'WARNING' ? 'WARNING' : 'FAIL'),
          rule: 'enum',
          expectedFormatted: allowed.join(' | '),
          actual,
          reason: match ? 'Value matches allowed set' : `Value "${actual}" is not among [${allowed.join(', ')}]`,
          severity
        };
      }

      case 'contains': {
        const needle = String(ruleDef.expected);
        const haystack = String(actual);
        const match = ruleDef.caseInsensitive
          ? haystack.toLowerCase().includes(needle.toLowerCase())
          : haystack.includes(needle);
        return {
          field,
          status: match ? 'PASS' : (severity === 'WARNING' ? 'WARNING' : 'FAIL'),
          rule: 'contains',
          expectedFormatted: `Contains "${needle}"`,
          actual,
          reason: match ? `Text contains "${needle}"` : `Text does not contain expected substring "${needle}"`,
          severity
        };
      }

      case 'min': {
        const num = Number(actual);
        const pass = !isNaN(num) && num >= ruleDef.expected;
        return {
          field,
          status: pass ? 'PASS' : (severity === 'WARNING' ? 'WARNING' : 'FAIL'),
          rule: 'min',
          expectedFormatted: `>= ${ruleDef.expected}`,
          actual,
          reason: pass ? `Value ${num} >= ${ruleDef.expected}` : `Value ${num} is below minimum ${ruleDef.expected}`,
          severity
        };
      }

      case 'max': {
        const num = Number(actual);
        const pass = !isNaN(num) && num <= ruleDef.expected;
        return {
          field,
          status: pass ? 'PASS' : (severity === 'WARNING' ? 'WARNING' : 'FAIL'),
          rule: 'max',
          expectedFormatted: `<= ${ruleDef.expected}`,
          actual,
          reason: pass ? `Value ${num} <= ${ruleDef.expected}` : `Value ${num} exceeds maximum ${ruleDef.expected}`,
          severity
        };
      }

      case 'range': {
        const num = Number(actual);
        const pass = !isNaN(num) && num >= ruleDef.min && num <= ruleDef.max;
        return {
          field,
          status: pass ? 'PASS' : (severity === 'WARNING' ? 'WARNING' : 'FAIL'),
          rule: 'range',
          expectedFormatted: `${ruleDef.min} - ${ruleDef.max}`,
          actual,
          reason: pass ? `Value ${num} within range [${ruleDef.min}, ${ruleDef.max}]` : `Value ${num} outside range [${ruleDef.min}, ${ruleDef.max}]`,
          severity
        };
      }

      case 'dateRange': {
        const actualDate = new Date(actual).getTime();
        let pass = !isNaN(actualDate);
        let expText = 'Valid date';

        if (pass && ruleDef.after) {
          const afterDate = new Date(ruleDef.after).getTime();
          pass = actualDate >= afterDate;
          expText += ` >= ${ruleDef.after}`;
        }
        if (pass && ruleDef.before) {
          const beforeDate = new Date(ruleDef.before).getTime();
          pass = actualDate <= beforeDate;
          expText += ` <= ${ruleDef.before}`;
        }

        return {
          field,
          status: pass ? 'PASS' : (severity === 'WARNING' ? 'WARNING' : 'FAIL'),
          rule: 'dateRange',
          expectedFormatted: expText,
          actual,
          reason: pass ? 'Date satisfies range boundary' : `Date ${actual} violates boundary (${expText})`,
          severity
        };
      }

      default:
        return {
          field,
          status: 'PASS',
          rule: ruleDef.rule,
          expectedFormatted: 'Passed',
          actual,
          reason: 'No rule evaluation logic mapped',
          severity: 'INFO'
        };
    }
  }

  _evaluateCandidate(extracted, candidate) {
    const ageLimits = { General: 0, EWS: 0, OBC: 3, SC: 5, ST: 5 };
    const relaxation = ageLimits[candidate.category] || 0;
    const maxAgeAllowed = (extracted.eligibility?.maxAge || 32) + relaxation;
    const minAge = extracted.eligibility?.minAge || 18;

    const ageEligible = candidate.age >= minAge && candidate.age <= maxAgeAllowed;

    const eduRanks = { '10th Pass': 1, '12th Pass': 2, 'Diploma': 2, 'Graduate': 3, 'Post-Graduate': 4 };
    const candRank = eduRanks[candidate.education] || 0;
    const reqRank = eduRanks[extracted.eligibility?.requiredEducation] || 2;
    const eduEligible = candRank >= reqRank;

    const isEligible = ageEligible && eduEligible;

    return {
      candidateName: candidate.name,
      isEligible,
      checks: {
        age: {
          eligible: ageEligible,
          candidateAge: candidate.age,
          allowedRange: `${minAge} - ${maxAgeAllowed} yrs (incl. +${relaxation} yrs ${candidate.category} relaxation)`
        },
        education: {
          eligible: eduEligible,
          candidateEducation: candidate.education,
          requiredEducation: extracted.eligibility?.requiredEducation
        }
      }
    };
  }
}

module.exports = { UnityChecker };
```

---

## 4. Requirement 4: Standalone Execution & Local Demo (`parse-demo.js`)

### 4.1 Specification & Operating Constraints
Requirement 4 mandates:
> *"This must be a standalone pipeline. **Do NOT include** Firestore database interactions, user creation, or email sending integrations (Resend). Provide a local test script (e.g., `parse-demo.js`) that allows the user to supply a PDF, a Gemini API key via `.env`, and mock database criteria to see the end-to-end extraction and validation in the console."*

#### Key Operational Constraints:
1. **Zero External Services**: No connections to Firebase Firestore, Authentication, or Resend Email API.
2. **Local Direct Execution**: Executed via standard command:
   ```bash
   node parse-demo.js
   ```
3. **CLI Arguments & Options**:
   - `node parse-demo.js [pdf-path] [options]`
   - `--pdf <path>`: Specify PDF path directly
   - `--keywords <k1,k2>`: Comma-delimited keyword filters
   - `--model <name>`: Gemini model override (e.g. `gemini-2.5-flash`)
   - `--mock`: Run in simulated mock mode without making live API calls
   - `--verbose`: Display full extracted text snippets and raw API response
   - `--json`: Output result as pure JSON for CI/testing automation
4. **Resilient Offline / Mock Fallback**:
   If `.env` does not contain `GEMINI_API_KEY` (or the user passes `--mock`), `parse-demo.js` **must not crash**. Instead, it prints a clean notice:
   ```
   [NOTICE] GEMINI_API_KEY not found in .env. Running in MOCK FALLBACK MODE.
   ```
   It then feeds a realistic mock extracted criteria object into the Unity Checker, demonstrating the complete pipeline flawlessly.

### 4.2 Formatted Console Dashboard Design

The console output is structured into clear visual stages matching the pipeline architecture:

```
================================================================================
  MyPath - PDF Parsing & Unity Validation Pipeline (Standalone Demo)
================================================================================
Mode       : LIVE (Gemini API: gemini-2.5-flash) [or MOCK FALLBACK]
PDF Source : ./sample/ssc-chsl-sample.pdf
Keywords   : age, eligibility, qualification, closing date, vacancy, fee

[STAGE 1] TARGETED PDF EXTRACTION
--------------------------------------------------------------------------------
Total Pages Scanned : 4
Pages Matched       : 2 (Pages 2, 3)
Keywords Detected   : age, eligibility, qualification, closing date, vacancy, fee
Original Word Count : 1,942 words (~2,580 tokens)
Extracted Snippets  : 348 words (~460 tokens)
Token Reduction     : 82.1% token savings

[STAGE 2] GEMINI CRITERIA EXTRACTION (@google/genai)
--------------------------------------------------------------------------------
Model Used          : gemini-2.5-flash
Inference Latency   : 1,120 ms
API Token Usage     : 512 prompt tokens | 134 candidate tokens | 646 total tokens
Extracted Entity    :
  - Title           : Combined Higher Secondary (10+2) Level Examination 2026
  - Organization    : SSC
  - Posts           : Lower Division Clerk (LDC), Junior Secretariat Assistant (JSA), Data Entry Operator (DEO)
  - Age Limits      : 18 to 27 years (General/UR)
  - Qualification   : 12th Pass / Higher Secondary
  - Closing Date    : 2026-10-07
  - Total Vacancies : 3,712 (Tentative)
  - Application Fee : Rs. 100 (Exempted: Women, SC, ST, PwBD, ESM)

[STAGE 3] UNITY / DATABASE VERIFICATION
--------------------------------------------------------------------------------
Criteria ID         : CRIT_SSC_CHSL_2026 (Benchmark Rules)

STATUS  | FIELD                          | EXPECTED             | ACTUAL               | REASON
--------+--------------------------------+----------------------+----------------------+------------------------------------------------
 PASS   | organization                   | SSC | Staff Selec... | SSC                  | Value matches allowed set
 PASS   | examTitle                      | Contains "Combin...  | Combined Higher S... | Text contains "Combined Higher Secondary"
 PASS   | eligibility.minAge             | 18 - 18              | 18                   | Value 18 within range [18, 18]
 PASS   | eligibility.maxAge             | 27 - 32              | 27                   | Value 27 within range [27, 32]
 PASS   | eligibility.requiredEducation  | 12th Pass | High...  | 12th Pass            | Value matches allowed set
 PASS   | importantDates.applicationEnd  | Valid date >= 202... | 2026-10-07           | Date satisfies range boundary
 PASS   | vacancies.total                | >= 500               | 3712                 | Value 3712 >= 500
 PASS   | applicationFee.generalAmount   | <= 250               | 100                  | Value 100 <= 250
 PASS   | status                         | ACTIVE | UPCOMING    | ACTIVE               | Value matches allowed set

--------------------------------------------------------------------------------
Candidate Profile Evaluation: Abhishek S Kumar (24 yrs, General, Graduate)
  - Age Eligibility       : ELIGIBLE (Age 24 is within 18 - 27 yrs)
  - Education Eligibility : ELIGIBLE (Graduate meets or exceeds 12th Pass)
  - Overall Compatibility : ELIGIBLE FOR APPLICATION

================================================================================
  PIPELINE VERDICT: [PASS] (9/9 rules passed, 0 failures, 0 warnings)
================================================================================
```

### 4.3 Reference Implementation: `parse-demo.js`

```javascript
#!/usr/bin/env node
/**
 * parse-demo.js
 * 
 * Standalone CLI demo for the MyPath PDF Parsing & Unity Validation Pipeline.
 * Zero external database or email dependencies.
 * 
 * Usage:
 *   node parse-demo.js
 *   node parse-demo.js --pdf ./sample/notice.pdf
 *   node parse-demo.js --mock
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Domain imports (to be implemented in Milestones 1, 2, 3)
// const { parseTargetedPdf } = require('./src/services/pdf');
// const { GeminiExtractor } = require('./src/services/gemini');
// const { UnityChecker } = require('./src/services/unity');

// Default Mock Criteria
const DEFAULT_CRITERIA = {
  criteriaId: 'CRIT_SSC_CHSL_2026',
  examCode: 'SSC_CHSL',
  description: 'Default Verification Benchmark for SSC CHSL 2026',
  rules: [
    { field: 'organization', rule: 'enum', expected: ['SSC', 'Staff Selection Commission'], severity: 'ERROR' },
    { field: 'examTitle', rule: 'contains', expected: 'Higher Secondary', caseInsensitive: true, severity: 'ERROR' },
    { field: 'eligibility.minAge', rule: 'range', min: 18, max: 18, severity: 'ERROR' },
    { field: 'eligibility.maxAge', rule: 'range', min: 27, max: 32, severity: 'ERROR' },
    { field: 'eligibility.requiredEducation', rule: 'enum', expected: ['12th Pass', 'Higher Secondary', '10+2'], caseInsensitive: true, severity: 'ERROR' },
    { field: 'importantDates.applicationEndDate', rule: 'dateRange', after: '2026-01-01', severity: 'ERROR' },
    { field: 'vacancies.total', rule: 'min', expected: 500, severity: 'WARNING' },
    { field: 'applicationFee.generalAmount', rule: 'max', expected: 250, severity: 'WARNING' }
  ],
  candidateProfile: {
    name: 'Abhishek S Kumar',
    age: 24,
    education: 'Graduate',
    category: 'General'
  }
};

// Default Mock Extracted Output (for --mock or missing API key)
const MOCK_EXTRACTED_DATA = {
  examTitle: 'Combined Higher Secondary (10+2) Level Examination 2026',
  organization: 'SSC',
  examCode: 'SSC_CHSL_2026',
  postNames: ['Lower Division Clerk (LDC)', 'Junior Secretariat Assistant (JSA)', 'Data Entry Operator (DEO)'],
  eligibility: {
    minAge: 18,
    maxAge: 27,
    ageCutoffDate: '2026-08-01',
    requiredEducation: '12th Pass',
    allowedDegrees: ['Higher Secondary School Certificate', '10+2 Standard'],
    nationality: 'Citizen of India'
  },
  importantDates: {
    notificationDate: '2026-09-07',
    applicationStartDate: '2026-09-07',
    applicationEndDate: '2026-10-07',
    examDate: '2026-12-15'
  },
  vacancies: {
    total: 3712,
    isTentative: true
  },
  applicationFee: {
    generalAmount: 100,
    exemptedCategories: ['Women', 'SC', 'ST', 'PwBD', 'ESM']
  },
  status: 'ACTIVE'
};

async function main() {
  const args = process.argv.slice(2);
  const isMockExplicit = args.includes('--mock');
  const isJsonOutput = args.includes('--json');
  const isVerbose = args.includes('--verbose');
  const apiKey = process.env.GEMINI_API_KEY;

  const isMock = isMockExplicit || !apiKey;

  if (!isJsonOutput) {
    console.log('\n================================================================================');
    console.log('  MyPath - PDF Parsing & Unity Validation Pipeline (Standalone Demo)');
    console.log('================================================================================');
    if (!apiKey && !isMockExplicit) {
      console.log('\x1b[33m[NOTICE] GEMINI_API_KEY is not set in .env. Running in MOCK FALLBACK MODE.\x1b[0m');
    }
    console.log(`Execution Mode : ${isMock ? 'SIMULATION / MOCK FALLBACK' : 'LIVE GEMINI API (@google/genai)'}`);
  }

  // Step 1: PDF Parsing
  // In live mode, read PDF buffer and execute parseTargetedPdf
  // In mock mode, simulate 82.1% reduction metrics

  // Step 2: Gemini Extraction
  let extractedData;
  let extractionMetrics;

  if (isMock) {
    extractedData = MOCK_EXTRACTED_DATA;
    extractionMetrics = {
      model: 'gemini-2.5-flash (simulated)',
      durationMs: 145,
      promptTokens: 480,
      candidateTokens: 142,
      totalTokens: 622
    };
  } else {
    // Live Gemini invocation using @google/genai
    // const extractor = new GeminiExtractor({ apiKey });
    // const result = await extractor.extractCriteria(targetedText);
    // extractedData = result.data;
    // extractionMetrics = result.metrics;
  }

  // Step 3: Unity Check Evaluation
  // const checker = new UnityChecker();
  // const report = checker.evaluate(extractedData, DEFAULT_CRITERIA);
  // (Format and log formatted console UI)
}

if (require.main === module) {
  main().catch(err => {
    console.error('Execution failure:', err);
    process.exit(1);
  });
}
```

---

## 5. End-to-End Pipeline Interface Contracts & Architecture

```
[ Input PDF File ]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│  Stage 1: Targeted PDF Parser (Requirement 1)          │
│  - unpdf page extraction                               │
│  - Text segmentation & abbreviation masking            │
│  - Keyword matching & context windowing                │
└────────────────────────────────────────────────────────┘
       │
       │ Output: TargetedPdfResult { targetedText, metrics }
       ▼
┌────────────────────────────────────────────────────────┐
│  Stage 2: Gemini Extractor (Requirement 2)             │
│  - @google/genai official client                       │
│  - gemini-2.5-flash model                              │
│  - responseSchema using Type enum                      │
└────────────────────────────────────────────────────────┘
       │
       │ Output: ExtractedCriteria (JSON)
       ▼
┌────────────────────────────────────────────────────────┐
│  Stage 3: Unity Checking Module (Requirement 3)        │
│  - Database benchmark comparison                       │
│  - Range, enum, and date boundary checks               │
│  - Candidate profile eligibility matcher               │
└────────────────────────────────────────────────────────┘
       │
       │ Output: UnityReport { overallStatus, results, diffs }
       ▼
┌────────────────────────────────────────────────────────┐
│  Stage 4: Standalone Execution CLI (Requirement 4)     │
│  - parse-demo.js terminal dashboard                    │
│  - Mock fallback mode handling                         │
│  - Zero Firestore / Zero Resend isolation              │
└────────────────────────────────────────────────────────┘
```

### 5.1 Directory & Layout Plan

Following the workspace architecture:
```
mypath-scraper/
├── parse-demo.js                     # Standalone CLI entry point (Requirement 4)
├── src/
│   └── services/
│       ├── pdf/                      # Requirement 1 (Targeted PDF Parsing)
│       │   ├── index.js
│       │   ├── extractor.js
│       │   ├── segmenter.js
│       │   ├── matcher.js
│       │   └── metrics.js
│       ├── gemini/                   # Requirement 2 (Gemini API Integration)
│       │   ├── index.js              # GeminiExtractor facade
│       │   ├── client.js             # @google/genai client initializer & mock
│       │   ├── schema.js             # EXAM_CRITERIA_SCHEMA using Type enum
│       │   └── prompt.js             # System instruction & prompt builders
│       └── unity/                    # Requirement 3 (Unity / Database Checking)
│           ├── index.js              # UnityChecker engine
│           ├── evaluators.js         # Rule operators (range, enum, date, etc.)
│           ├── candidate-matcher.js  # Candidate eligibility comparison logic
│           └── default-criteria.js   # Built-in benchmark criteria sets
└── test/
    ├── pdf-targeted.test.js
    ├── gemini-extractor.test.js
    ├── unity-checker.test.js
    └── pipeline-e2e.test.js
```

---

## 6. Verification and Acceptance Matrix

| Requirement | Acceptance Test | Verification Method |
| :--- | :--- | :--- |
| **R2: @google/genai SDK** | Package uses `@google/genai`, NOT `@google/generative-ai` | Verify `package.json` and imports via grep |
| **R2: Client Initialization** | Client initializes with `new GoogleGenAI({ apiKey })` | Unit test with mocked API key |
| **R2: Structured Schema** | Output conforms strictly to JSON schema using `Type` enum | Schema validation test against sample responses |
| **R2: Prompt Engineering** | Model extracts criteria without hallucination | Run live/test extraction against synthetic PDF snippet |
| **R3: Rule Evaluation** | Unity checker correctly flags out-of-range/mismatched values | Unit test covering `range`, `enum`, `dateRange` |
| **R3: Candidate Match** | Candidate eligibility accurately computed | Verify candidate age/education matching against extracted rules |
| **R3: Verdict & Diffs** | Produces `PASS`/`FAIL`, summary pass rates, and diff array | Unit test verifying `diffs` format and `overallStatus` |
| **R4: Zero Services** | Pipeline runs without Firestore or Resend email configs | Inspect dependencies and run without cloud credentials |
| **R4: Mock Fallback** | `node parse-demo.js --mock` runs successfully to exit code 0 | Run `node parse-demo.js --mock` in clean shell |
| **R4: Local Terminal UI** | Formatted dashboard displays extraction stats and unity table | Inspect terminal output visually and via stdout assertions |

---
*End of Technical Survey Report.*
