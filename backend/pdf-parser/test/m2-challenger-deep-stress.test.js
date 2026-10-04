'use strict';

/**
 * test/m2-challenger-deep-stress.test.js
 * Adversarial Stress Test Suite for Milestone 2 (Gemini Parser & Error Boundary)
 * Designed by Challenger 2 to stress-test:
 * 1. Conversational Markdown Code Fences & Ambiguous Text
 * 2. Null/Undefined Error Rejections & Exotic Thrown Types
 * 3. Graceful Fallback Integrity under Hostile Fault Injections
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseStructuredCriteria,
  normalizeCriteriaData,
  parseJsonSafely,
  extractMockCriteria
} = require('../src/services/ai');

// Helper to create a client double with custom generateContent implementation
function createDouble(generator) {
  return {
    models: {
      generateContent: async (req) => {
        if (typeof generator === 'function') {
          return await generator(req);
        }
        return generator;
      }
    }
  };
}

// Envelope validator
function assertContractEnvelope(res, { expectedSuccess, expectedMock } = {}) {
  assert.ok(res !== null && typeof res === 'object', 'Envelope must be an object');
  assert.equal(typeof res.success, 'boolean', 'Envelope.success must be boolean');
  assert.equal(typeof res.isMock, 'boolean', 'Envelope.isMock must be boolean');
  assert.equal(typeof res.modelUsed, 'string', 'Envelope.modelUsed must be string');

  if (expectedSuccess !== undefined) {
    assert.equal(res.success, expectedSuccess, `Expected success to be ${expectedSuccess}`);
  }
  if (expectedMock !== undefined) {
    assert.equal(res.isMock, expectedMock, `Expected isMock to be ${expectedMock}`);
  }

  if (res.success) {
    assert.ok(res.data !== null && typeof res.data === 'object', 'data must be non-null object on success');
  } else {
    assert.equal(res.data, null, 'data must be null on failure');
    assert.ok(typeof res.error === 'string' && res.error.length > 0, 'error must be non-empty string on failure');
  }
}

describe('Challenger 2 Deep Stress Suite: Conversational Markdown & Code Fences', () => {

  it('C1.1 extracts JSON when surrounded by leading and trailing conversational prose', () => {
    const raw = `
Thank you for providing the notification text. Based on my analysis, here is the structured JSON criteria:

\`\`\`json
{
  "examTitle": "UPSC CIVIL SERVICES 2026",
  "organization": "UNION PUBLIC SERVICE COMMISSION",
  "vacancies": 1056,
  "status": "ACTIVE",
  "eligibility": {
    "minAge": 21,
    "maxAge": 32,
    "ageRelaxation": [{ "category": "SC/ST", "years": 5 }],
    "requiredEducation": ["Bachelor's degree"],
    "eligibleStreams": ["Any Discipline"]
  },
  "importantDates": {
    "applicationStartDate": "2026-01-10",
    "applicationEndDate": "2026-02-15",
    "examDate": "2026-05-24"
  },
  "applicationFee": {
    "general": 100,
    "reserved": 0
  }
}
\`\`\`

I hope this extraction meets your requirements. Please let me know if you need any adjustments!
`;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'UPSC CIVIL SERVICES 2026');
    assert.equal(parsed.vacancies, 1056);
    assert.equal(parsed.eligibility.minAge, 21);
  });

  it('C1.2 parses code fence with uppercase JSON language tag (```JSON)', () => {
    const raw = `\`\`\`JSON\n{"examTitle": "SSC CGL 2026", "vacancies": 8000, "status": "ACTIVE"}\n\`\`\``;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'SSC CGL 2026');
    assert.equal(parsed.vacancies, 8000);
  });

  it('C1.3 parses code fence without language tag (```)', () => {
    const raw = `\`\`\`\n{"examTitle": "IBPS PO 2026", "vacancies": 4500, "status": "ACTIVE"}\n\`\`\``;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'IBPS PO 2026');
    assert.equal(parsed.vacancies, 4500);
  });

  it('C1.4 parses code fence with mixed indentation and Windows CRLF line endings', () => {
    const raw = "   ```json\r\n   {\r\n     \"examTitle\": \"RRB NTPC 2026\",\r\n     \"vacancies\": 11558,\r\n     \"status\": \"ACTIVE\"\r\n   }\r\n   ```\r\n";
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'RRB NTPC 2026');
    assert.equal(parsed.vacancies, 11558);
  });

  it('C1.5 parses conversational prose containing curly braces before the code fence', () => {
    const raw = `
Note {Reference ID: #9876}: Below is the extracted criteria for your inspection:
\`\`\`json
{
  "examTitle": "UPSC CSE 2026",
  "status": "ACTIVE"
}
\`\`\`
`;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'UPSC CSE 2026');
  });

  it('C1.6 parses conversational prose containing curly braces after the code fence', () => {
    const raw = `
\`\`\`json
{
  "examTitle": "UPSC CSE 2026",
  "status": "ACTIVE"
}
\`\`\`
Verify against schema {version: "2.0", strict: true}.
`;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'UPSC CSE 2026');
  });

  it('C1.7 parses conversational prose containing curly braces both before AND after code fence', () => {
    const raw = `
{Disclaimer}: Notification extract follows:
\`\`\`json
{
  "examTitle": "COMBINED DEFENCE SERVICES",
  "status": "ACTIVE"
}
\`\`\`
{End of report}.
`;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'COMBINED DEFENCE SERVICES');
  });

  it('C1.8 handles raw JSON embedded in prose without code fences', () => {
    const raw = 'The parsed result is {"examTitle": "NDA 2026", "vacancies": 400, "status": "ACTIVE"} as extracted.';
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'NDA 2026');
    assert.equal(parsed.vacancies, 400);
  });

  it('C1.9 handles multiple code blocks where first is bash command and second is JSON', () => {
    const raw = `
To run this query, use:
\`\`\`bash
curl -X POST https://api.example.com/extract
\`\`\`

Here is the JSON response:
\`\`\`json
{
  "examTitle": "ENGINEERING SERVICES 2026",
  "vacancies": 200,
  "status": "ACTIVE"
}
\`\`\`
`;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle, 'ENGINEERING SERVICES 2026');
  });

  it('C1.10 safely returns error envelope when code fence contains invalid JSON syntax', async () => {
    const raw = '```json\n{ examTitle: "Missing quotes on key", vacancies: 500 }\n```';
    const client = createDouble({ text: raw });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /JSON|SyntaxError|unexpected/i);
  });

  it('C1.11 safely returns error envelope when code fence is completely empty', async () => {
    const raw = '```json\n```';
    const client = createDouble({ text: raw });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
  });

  it('C1.12 handles 100KB JSON payload without call stack overflow', () => {
    const longString = 'A'.repeat(50000);
    const raw = `\`\`\`json\n{"examTitle": "${longString}", "status": "ACTIVE"}\n\`\`\``;
    const parsed = parseJsonSafely(raw);
    assert.equal(parsed.examTitle.length, 50000);
  });
});

describe('Challenger 2 Deep Stress Suite: Null / Undefined Rejections & Exotic Thrown Types', () => {

  it('C2.1 handles Promise.reject(null) without uncaught TypeError', async () => {
    const client = createDouble(() => Promise.reject(null));
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'Unknown error (null or undefined rejection)');
  });

  it('C2.2 handles Promise.reject(undefined) without uncaught TypeError', async () => {
    const client = createDouble(() => Promise.reject(undefined));
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'Unknown error (null or undefined rejection)');
  });

  it('C2.3 handles synchronous throw null', async () => {
    const client = createDouble(() => { throw null; });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'Unknown error (null or undefined rejection)');
  });

  it('C2.4 handles synchronous throw undefined', async () => {
    const client = createDouble(() => { throw undefined; });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'Unknown error (null or undefined rejection)');
  });

  it('C2.5 handles throw primitive number (0 and 500)', async () => {
    for (const num of [0, 500]) {
      const client = createDouble(() => { throw num; });
      const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
      assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
      assert.equal(res.error, String(num));
    }
  });

  it('C2.6 handles throw primitive boolean false', async () => {
    const client = createDouble(() => { throw false; });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'false');
  });

  it('C2.7 handles throw empty string ("")', async () => {
    const client = createDouble(() => { throw ''; });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'Unknown error');
  });

  it('C2.8 handles throw Symbol', async () => {
    const client = createDouble(() => { throw Symbol('critical_failure'); });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /critical_failure/);
  });

  it('C2.9 handles throw BigInt', async () => {
    const client = createDouble(() => { throw BigInt(9007199254740991); });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, '9007199254740991');
  });

  it('C2.10 handles throw circular object without crashing JSON.stringify', async () => {
    const circular = { name: 'CircularError' };
    circular.self = circular;
    const client = createDouble(() => { throw circular; });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.ok(typeof res.error === 'string' && res.error.length > 0);
  });

  it('C2.11 handles error object with nested error.message', async () => {
    const apiError = {
      status: 400,
      error: {
        message: 'Invalid argument provided to Gemini API',
        status: 'INVALID_ARGUMENT'
      }
    };
    const client = createDouble(() => { throw apiError; });
    const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
    assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.equal(res.error, 'Invalid argument provided to Gemini API');
  });

  it('C2.12 handles clientFactory throwing null, undefined, or primitive', async () => {
    for (const thrownVal of [null, undefined, 42, 'Factory down']) {
      const res = await parseStructuredCriteria('targeted text', {
        apiKey: 'k',
        clientFactory: () => { throw thrownVal; }
      });
      assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
      assert.ok(typeof res.error === 'string' && res.error.length > 0);
    }
  });

  it('C2.13 handles response.text being null or undefined', async () => {
    for (const textVal of [null, undefined]) {
      const client = createDouble({ text: textVal });
      const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
      assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
      assert.match(res.error, /string/i);
    }
  });

  it('C2.14 handles response.text being a non-string type (number, boolean, array, object)', async () => {
    for (const textVal of [12345, true, false, ['array'], { nested: true }]) {
      const client = createDouble({ text: textVal });
      const res = await parseStructuredCriteria('targeted text', { apiKey: 'k', client });
      assertContractEnvelope(res, { expectedSuccess: false, expectedMock: false });
      assert.match(res.error, /string/i);
    }
  });
});

describe('Challenger 2 Deep Stress Suite: Fallback Integrity under Hostile Fault Injections', () => {

  it('C3.1 fallbackToMockOnError: true recovers gracefully from Promise.reject(null)', async () => {
    const client = createDouble(() => Promise.reject(null));
    const res = await parseStructuredCriteria('Candidate age 21 to 32 years. Vacancies: 500.', {
      apiKey: 'k',
      client,
      fallbackToMockOnError: true
    });
    assertContractEnvelope(res, { expectedSuccess: true, expectedMock: true });
    assert.equal(res.data.eligibility.minAge, 21);
    assert.equal(res.data.eligibility.maxAge, 32);
    assert.equal(res.data.vacancies, 500);
    assert.match(res.error, /Gemini API call failed/);
  });

  it('C3.2 fallbackToMockOnError: true recovers gracefully from Promise.reject(undefined)', async () => {
    const client = createDouble(() => Promise.reject(undefined));
    const res = await parseStructuredCriteria('Candidate age 21 to 32 years.', {
      apiKey: 'k',
      client,
      fallbackToMockOnError: true
    });
    assertContractEnvelope(res, { expectedSuccess: true, expectedMock: true });
    assert.equal(res.data.eligibility.minAge, 21);
  });

  it('C3.3 fallbackToMockOnError: true recovers gracefully from thrown circular object', async () => {
    const circular = { code: 'CRITICAL' };
    circular.self = circular;
    const client = createDouble(() => { throw circular; });
    const res = await parseStructuredCriteria('Candidate age 21 to 32 years.', {
      apiKey: 'k',
      client,
      fallbackToMockOnError: true
    });
    assertContractEnvelope(res, { expectedSuccess: true, expectedMock: true });
    assert.equal(res.data.eligibility.minAge, 21);
  });

  it('C3.4 fallbackToMockOnError: true recovers from malformed JSON model response', async () => {
    const client = createDouble({ text: '```json\n{ corrupt: true, }\n```' });
    const res = await parseStructuredCriteria('Candidate age 21 to 32 years.', {
      apiKey: 'k',
      client,
      fallbackToMockOnError: true
    });
    assertContractEnvelope(res, { expectedSuccess: true, expectedMock: true });
    assert.equal(res.data.eligibility.minAge, 21);
  });
});
