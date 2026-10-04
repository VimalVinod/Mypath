'use strict';

/**
 * .agents/m2_challenger_2/challenge_harness.js
 * Empirical Challenge Harness for Milestone 2: Gemini API Integration Module.
 * Challenger 2 Focus: Parser Option Boundaries, Client Injection & Fault Tolerance.
 */

const assert = require('node:assert/strict');
const {
  parseStructuredCriteria,
  normalizeCriteriaData,
  parseJsonSafely,
  CRITERIA_SCHEMA,
  SYSTEM_INSTRUCTION,
  buildExtractionPrompt,
  getEmptyCriteria
} = require('../../src/services/ai');

// Track overall stats
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  crashed: 0,
  suites: {},
  failures: []
};

function recordTest(suite, testName, fn) {
  stats.total++;
  stats.suites[suite] = stats.suites[suite] || { total: 0, passed: 0, failed: 0, crashed: 0 };
  stats.suites[suite].total++;
  try {
    fn();
    stats.passed++;
    stats.suites[suite].passed++;
    console.log(`  [PASS] ${suite} > ${testName}`);
  } catch (err) {
    stats.failed++;
    stats.suites[suite].failed++;
    stats.failures.push({ suite, testName, error: err.message || String(err), stack: err.stack, type: 'assertion' });
    console.error(`  [FAIL] ${suite} > ${testName}`);
    console.error(`         Assertion Error: ${err.message}`);
  }
}

async function recordAsyncTest(suite, testName, asyncFn) {
  stats.total++;
  stats.suites[suite] = stats.suites[suite] || { total: 0, passed: 0, failed: 0, crashed: 0 };
  stats.suites[suite].total++;
  try {
    await asyncFn();
    stats.passed++;
    stats.suites[suite].passed++;
    console.log(`  [PASS] ${suite} > ${testName}`);
  } catch (err) {
    const isAssertion = err instanceof assert.AssertionError;
    if (isAssertion) {
      stats.failed++;
      stats.suites[suite].failed++;
    } else {
      stats.crashed++;
      stats.suites[suite].crashed++;
    }
    stats.failures.push({
      suite,
      testName,
      error: err.message || String(err),
      stack: err.stack,
      type: isAssertion ? 'assertion' : 'unhandled_crash'
    });
    console.error(`  [FAIL] ${suite} > ${testName}`);
    console.error(`         ${err.name || 'Error'}: ${err.message}`);
  }
}

/**
 * Validates that an envelope conforms to Interface Contract #2.
 */
function assertConformingEnvelope(res, { expectedSuccess, expectedMock, expectDataNull } = {}) {
  assert.ok(res !== null && typeof res === 'object', 'Envelope must be an object');
  assert.equal(typeof res.success, 'boolean', 'Envelope.success must be boolean');
  assert.equal(typeof res.isMock, 'boolean', 'Envelope.isMock must be boolean');
  assert.equal(typeof res.modelUsed, 'string', 'Envelope.modelUsed must be string');

  if (expectedSuccess !== undefined) {
    assert.equal(res.success, expectedSuccess, `Envelope.success should be ${expectedSuccess}`);
  }
  if (expectedMock !== undefined) {
    assert.equal(res.isMock, expectedMock, `Envelope.isMock should be ${expectedMock}`);
  }

  if (res.success) {
    assert.ok(res.data !== null && typeof res.data === 'object', 'data must be non-null object on success');
    assertValidDataSchema(res.data);
  } else {
    assert.ok(typeof res.error === 'string' && res.error.length > 0, 'error message must be non-empty string on failure');
    if (expectDataNull !== false) {
      assert.equal(res.data, null, 'data must be null on failure');
    }
  }
}

/**
 * Validates criteria data conforms to Contract #2.
 */
function assertValidDataSchema(data) {
  assert.ok(data !== null && typeof data === 'object', 'Criteria data must be an object');
  assert.ok(data.examTitle === null || typeof data.examTitle === 'string');
  assert.ok(data.organization === null || typeof data.organization === 'string');
  assert.ok(data.vacancies === null || (typeof data.vacancies === 'number' && Number.isInteger(data.vacancies) && data.vacancies >= 0));
  assert.equal(typeof data.status, 'string');

  assert.ok(data.eligibility && typeof data.eligibility === 'object');
  assert.ok(data.eligibility.minAge === null || (typeof data.eligibility.minAge === 'number' && data.eligibility.minAge >= 0));
  assert.ok(data.eligibility.maxAge === null || (typeof data.eligibility.maxAge === 'number' && data.eligibility.maxAge >= 0));
  assert.ok(Array.isArray(data.eligibility.ageRelaxation));
  for (const r of data.eligibility.ageRelaxation) {
    assert.equal(typeof r.category, 'string');
    assert.equal(typeof r.years, 'number');
    assert.ok(r.years >= 0);
  }
  assert.ok(Array.isArray(data.eligibility.requiredEducation));
  for (const e of data.eligibility.requiredEducation) {
    assert.equal(typeof e, 'string');
  }
  assert.ok(Array.isArray(data.eligibility.eligibleStreams));
  for (const s of data.eligibility.eligibleStreams) {
    assert.equal(typeof s, 'string');
  }

  assert.ok(data.importantDates && typeof data.importantDates === 'object');
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (data.importantDates.applicationStartDate !== null) {
    assert.equal(typeof data.importantDates.applicationStartDate, 'string');
    assert.match(data.importantDates.applicationStartDate, isoRegex);
  }
  if (data.importantDates.applicationEndDate !== null) {
    assert.equal(typeof data.importantDates.applicationEndDate, 'string');
    assert.match(data.importantDates.applicationEndDate, isoRegex);
  }
  if (data.importantDates.examDate !== null) {
    assert.equal(typeof data.importantDates.examDate, 'string');
    assert.match(data.importantDates.examDate, isoRegex);
  }

  assert.ok(data.applicationFee && typeof data.applicationFee === 'object');
  assert.ok(data.applicationFee.general === null || (typeof data.applicationFee.general === 'number' && data.applicationFee.general >= 0));
  assert.ok(data.applicationFee.reserved === null || (typeof data.applicationFee.reserved === 'number' && data.applicationFee.reserved >= 0));
}

// Client test double helper
function createDoubleClient(responseGenerator) {
  return {
    models: {
      generateContent: async (req) => {
        if (typeof responseGenerator === 'function') {
          return await responseGenerator(req);
        }
        return responseGenerator;
      }
    }
  };
}

async function runAllChallenges() {
  console.log('================================================================');
  console.log('CHALLENGE HARNESS: Milestone 2 Parser Pipeline & Error Boundary');
  console.log('Challenger: m2_challenger_2');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('================================================================\n');

  // ==========================================================================
  // SUITE 1: Malformed Model Responses
  // ==========================================================================
  console.log('--- SUITE 1: Malformed Model Responses ---');

  await recordAsyncTest('Suite 1', '1.1 Completely non-JSON response string', async () => {
    const client = createDoubleClient({ text: 'This is plain English, not JSON at all.' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /JSON|SyntaxError/i);
  });

  await recordAsyncTest('Suite 1', '1.2 Truncated JSON syntax', async () => {
    const client = createDoubleClient({ text: '{"examTitle": "CIVIL SERVICES", "vacancies": 500, "eligi' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /JSON|SyntaxError|unexpected/i);
  });

  await recordAsyncTest('Suite 1', '1.3 Invalid JS values inside JSON (NaN, undefined)', async () => {
    const client = createDoubleClient({ text: '{"examTitle": "UPSC", "vacancies": NaN, "status": undefined}' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.4 Trailing comma in JSON object', async () => {
    const client = createDoubleClient({ text: '{"examTitle": "UPSC", "vacancies": 100,}' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.5 HTML error page payload (502 Bad Gateway / Cloudflare)', async () => {
    const client = createDoubleClient({ text: '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>Server Error</h1></body></html>' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.6 Markdown code fence with trailing commentary', async () => {
    const rawPayload = '```json\n{"examTitle": "UPSC 2026", "organization": "UPSC", "status": "ACTIVE"}\n```\nNote: All fields were parsed accurately.';
    const client = createDoubleClient({ text: rawPayload });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedMock: false });
  });

  await recordAsyncTest('Suite 1', '1.7 Markdown code fence with leading conversational prose', async () => {
    const rawPayload = 'Here is the extracted JSON criteria based on the notification:\n```json\n{"examTitle": "UPSC 2026", "organization": "UPSC", "status": "ACTIVE"}\n```';
    const client = createDoubleClient({ text: rawPayload });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedMock: false });
  });

  await recordAsyncTest('Suite 1', '1.8 Unclosed markdown code fence', async () => {
    const rawPayload = '```json\n{"examTitle": "UPSC 2026", "status": "ACTIVE"}';
    const client = createDoubleClient({ text: rawPayload });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedMock: false });
  });

  await recordAsyncTest('Suite 1', '1.9 Empty string response text', async () => {
    const client = createDoubleClient({ text: '' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.10 Whitespace-only response text', async () => {
    const client = createDoubleClient({ text: '    \n\t   \r\n   ' });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.11 Null response text (response.text is null)', async () => {
    const client = createDoubleClient({ text: null });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 1', '1.12 Undefined response text (response.text is undefined)', async () => {
    const client = createDoubleClient({ text: undefined });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 1', '1.13 Non-string response text (response.text is a number)', async () => {
    const client = createDoubleClient({ text: 404 });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 1', '1.14 Null model response (generateContent returns null)', async () => {
    const client = createDoubleClient(null);
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.15 Undefined model response (generateContent returns undefined)', async () => {
    const client = createDoubleClient(undefined);
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 1', '1.16 Model response is empty object {} without text property', async () => {
    const client = createDoubleClient({});
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /string/i);
  });

  // ==========================================================================
  // SUITE 2: Client Test Doubles Throwing Errors & Fault Tolerance
  // ==========================================================================
  console.log('\n--- SUITE 2: Client Test Doubles Throwing Errors & Fault Tolerance ---');

  await recordAsyncTest('Suite 2', '2.1 HTTP 429 Quota Exceeded error', async () => {
    const err = new Error('Quota exceeded for quota metric "Generate Content API requests" - HTTP 429');
    err.status = 429;
    const client = createDoubleClient(() => { throw err; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /429|quota/i);
  });

  await recordAsyncTest('Suite 2', '2.2 HTTP 503 Service Unavailable error', async () => {
    const err = new Error('The service is temporarily unavailable - HTTP 503');
    err.status = 503;
    const client = createDoubleClient(() => { throw err; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /503|unavailable/i);
  });

  await recordAsyncTest('Suite 2', '2.3 Timeout error (ETIMEDOUT)', async () => {
    const err = new Error('Client connection timed out after 30000ms');
    err.code = 'ETIMEDOUT';
    const client = createDoubleClient(() => { throw err; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /timed out/i);
  });

  await recordAsyncTest('Suite 2', '2.4 Network DNS failure (ENOTFOUND)', async () => {
    const err = new Error('getaddrinfo ENOTFOUND generativelanguage.googleapis.com');
    err.code = 'ENOTFOUND';
    const client = createDoubleClient(() => { throw err; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /ENOTFOUND/i);
  });

  await recordAsyncTest('Suite 2', '2.5 Network connection reset (ECONNRESET)', async () => {
    const err = new Error('read ECONNRESET');
    err.code = 'ECONNRESET';
    const client = createDoubleClient(() => { throw err; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /ECONNRESET/i);
  });

  await recordAsyncTest('Suite 2', '2.6 Client double throwing a primitive string ("Socket closed")', async () => {
    const client = createDoubleClient(() => { throw 'Socket closed unexpectedly'; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /Socket closed/i);
  });

  await recordAsyncTest('Suite 2', '2.7 Client double throwing a plain object without message property', async () => {
    const client = createDoubleClient(() => { throw { code: 'UNEXPECTED_ERROR', httpStatus: 500 }; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 2', '2.8 Client double rejecting with null (Promise.reject(null) / throw null)', async () => {
    const client = createDoubleClient(() => { throw null; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 2', '2.9 Client double rejecting with undefined', async () => {
    const client = createDoubleClient(() => { throw undefined; });
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 2', '2.10 options.clientFactory throws synchronously during initialization', async () => {
    const clientFactory = () => { throw new Error('Failed to initialize GoogleGenAI client'); };
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', clientFactory });
    assertConformingEnvelope(res, { expectedSuccess: false });
    assert.match(res.error, /initialize GoogleGenAI client/i);
  });

  await recordAsyncTest('Suite 2', '2.11 options.client is an empty object without models property', async () => {
    const client = {};
    const res = await parseStructuredCriteria('sample text', { apiKey: 'k', client });
    assertConformingEnvelope(res, { expectedSuccess: false });
  });

  await recordAsyncTest('Suite 2', '2.12 fallbackToMockOnError: true gracefully degrades on API error', async () => {
    const err = new Error('429 Resource has been exhausted');
    err.status = 429;
    const client = createDoubleClient(() => { throw err; });
    const res = await parseStructuredCriteria('Candidate must be of age 21 to 32 years.', {
      apiKey: 'k',
      client,
      fallbackToMockOnError: true
    });

    assert.equal(res.success, true);
    assert.equal(res.isMock, true);
    assert.ok(res.data !== null);
    assert.equal(res.data.eligibility.minAge, 21);
    assert.equal(res.data.eligibility.maxAge, 32);
    assert.match(res.error, /Gemini API call failed/i);
  });

  await recordAsyncTest('Suite 2', '2.13 fallbackToMockOnError: true when client throws null', async () => {
    const client = createDoubleClient(() => { throw null; });
    const res = await parseStructuredCriteria('Candidate must be of age 21 to 32 years.', {
      apiKey: 'k',
      client,
      fallbackToMockOnError: true
    });

    assert.equal(res.success, true);
    assert.equal(res.isMock, true);
    assert.ok(res.data !== null);
    assert.ok(typeof res.error === 'string');
  });

  // ==========================================================================
  // SUITE 3: Normalization Boundary Checks
  // ==========================================================================
  console.log('\n--- SUITE 3: Normalization Boundary Checks ---');

  recordTest('Suite 3', '3.1 Missing all nested objects (eligibility, importantDates, applicationFee)', () => {
    const raw = {
      examTitle: 'CIVIL SERVICES 2026',
      organization: 'UPSC',
      vacancies: 1056,
      status: 'ACTIVE'
    };
    const norm = normalizeCriteriaData(raw);
    assertValidDataSchema(norm);
    assert.equal(norm.examTitle, 'CIVIL SERVICES 2026');
    assert.equal(norm.vacancies, 1056);
    assert.equal(norm.eligibility.minAge, null);
    assert.deepEqual(norm.eligibility.ageRelaxation, []);
    assert.equal(norm.importantDates.examDate, null);
    assert.equal(norm.applicationFee.general, null);
  });

  recordTest('Suite 3', '3.2 Empty raw object {}', () => {
    const norm = normalizeCriteriaData({});
    assertValidDataSchema(norm);
    assert.equal(norm.examTitle, null);
    assert.equal(norm.organization, null);
    assert.equal(norm.vacancies, null);
    assert.equal(norm.status, 'UNKNOWN');
    assert.deepEqual(norm.eligibility.ageRelaxation, []);
  });

  recordTest('Suite 3', '3.3 Non-object inputs to normalizeCriteriaData (null, undefined, 42, "string", [])', () => {
    const invalidInputs = [null, undefined, 42, 'string', false, true, []];
    for (const input of invalidInputs) {
      const norm = normalizeCriteriaData(input);
      assertValidDataSchema(norm);
      assert.equal(norm.examTitle, null);
      assert.equal(norm.status, 'UNKNOWN');
    }
  });

  recordTest('Suite 3', '3.4 Invalid minAge / maxAge types (string, negative, float, NaN, Infinity)', () => {
    const badAges = [
      { minAge: '21', maxAge: '32' },
      { minAge: -5, maxAge: -1 },
      { minAge: 21.5, maxAge: 32.8 },
      { minAge: NaN, maxAge: NaN }
    ];
    for (const { minAge, maxAge } of badAges) {
      const norm = normalizeCriteriaData({ eligibility: { minAge, maxAge } });
      assertValidDataSchema(norm);
    }
  });

  recordTest('Suite 3', '3.5 Vacancies boundary conditions (float, negative, string, NaN)', () => {
    const testCases = [
      { input: 100.5, expected: null },
      { input: -10, expected: null },
      { input: '1000', expected: null },
      { input: NaN, expected: null },
      { input: 0, expected: 0 },
      { input: 500, expected: 500 }
    ];
    for (const { input, expected } of testCases) {
      const norm = normalizeCriteriaData({ vacancies: input });
      assert.equal(norm.vacancies, expected, `Failed for vacancies input: ${input}`);
    }
  });

  recordTest('Suite 3', '3.6 Application fee reserved: 0 must NOT be coerced to null', () => {
    const norm = normalizeCriteriaData({
      applicationFee: { general: 100, reserved: 0 }
    });
    assert.equal(norm.applicationFee.general, 100);
    assert.equal(norm.applicationFee.reserved, 0, 'reserved fee of 0 must be preserved');
  });

  recordTest('Suite 3', '3.7 Negative application fees should normalize to null', () => {
    const norm = normalizeCriteriaData({
      applicationFee: { general: -100, reserved: -50 }
    });
    assert.equal(norm.applicationFee.general, null);
    assert.equal(norm.applicationFee.reserved, null);
  });

  recordTest('Suite 3', '3.8 ageRelaxation with malformed entries (non-objects, negative years, NaN)', () => {
    const raw = {
      eligibility: {
        ageRelaxation: [
          null,
          '5 years for SC',
          123,
          { category: 'SC/ST', years: 5 },
          { category: null, years: 3 },
          { category: 'OBC', years: -2 },
          { category: 'PwBD', years: NaN }
        ]
      }
    };
    const norm = normalizeCriteriaData(raw);
    assertValidDataSchema(norm);
    assert.equal(norm.eligibility.ageRelaxation.length, 4); // Only valid object entries retained
    assert.deepEqual(norm.eligibility.ageRelaxation[0], { category: 'SC/ST', years: 5 });
    assert.deepEqual(norm.eligibility.ageRelaxation[1], { category: 'General', years: 3 });
    assert.deepEqual(norm.eligibility.ageRelaxation[2], { category: 'OBC', years: 0 });
    assert.deepEqual(norm.eligibility.ageRelaxation[3], { category: 'PwBD', years: 0 });
  });

  recordTest('Suite 3', '3.9 requiredEducation and eligibleStreams filter non-string elements', () => {
    const raw = {
      eligibility: {
        requiredEducation: ["Bachelor's degree", 123, null, undefined, { degree: 'MTech' }],
        eligibleStreams: ['Any Discipline', false, 456]
      }
    };
    const norm = normalizeCriteriaData(raw);
    assertValidDataSchema(norm);
    assert.deepEqual(norm.eligibility.requiredEducation, ["Bachelor's degree"]);
    assert.deepEqual(norm.eligibility.eligibleStreams, ['Any Discipline']);
  });

  recordTest('Suite 3', '3.10 Non-ISO dates normalized to null', () => {
    const raw = {
      importantDates: {
        applicationStartDate: '10/01/2026',
        applicationEndDate: '2026/02/15',
        examDate: '24th May 2026'
      }
    };
    const norm = normalizeCriteriaData(raw);
    assertValidDataSchema(norm);
    assert.equal(norm.importantDates.applicationStartDate, null);
    assert.equal(norm.importantDates.applicationEndDate, null);
    assert.equal(norm.importantDates.examDate, null);
  });

  recordTest('Suite 3', '3.11 Extra unexpected / malicious keys stripped cleanly', () => {
    const raw = {
      examTitle: 'CIVIL SERVICES 2026',
      __proto__: { admin: true },
      unknownKey: 'ignored',
      nestedExploit: { eval: 'alert(1)' }
    };
    const norm = normalizeCriteriaData(raw);
    assertValidDataSchema(norm);
    assert.equal(norm.unknownKey, undefined);
    assert.equal(norm.nestedExploit, undefined);
    assert.equal(norm.examTitle, 'CIVIL SERVICES 2026');
  });

  // ==========================================================================
  // SUITE 4: Missing & Boundary Arguments to parseStructuredCriteria()
  // ==========================================================================
  console.log('\n--- SUITE 4: Missing & Boundary Arguments to parseStructuredCriteria() ---');

  await recordAsyncTest('Suite 4', '4.1 parseStructuredCriteria() called with no arguments', async () => {
    const res = await parseStructuredCriteria();
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.2 parseStructuredCriteria(undefined)', async () => {
    const res = await parseStructuredCriteria(undefined);
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.3 parseStructuredCriteria(null)', async () => {
    const res = await parseStructuredCriteria(null);
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.4 parseStructuredCriteria(12345)', async () => {
    const res = await parseStructuredCriteria(12345);
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.5 parseStructuredCriteria({})', async () => {
    const res = await parseStructuredCriteria({});
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.6 parseStructuredCriteria([])', async () => {
    const res = await parseStructuredCriteria([]);
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.7 parseStructuredCriteria(true)', async () => {
    const res = await parseStructuredCriteria(true);
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.8 parseStructuredCriteria(() => {})', async () => {
    const res = await parseStructuredCriteria(() => {});
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /string/i);
  });

  await recordAsyncTest('Suite 4', '4.9 options parameter is null: parseStructuredCriteria("text", null)', async () => {
    const res = await parseStructuredCriteria('some text', null);
    assertConformingEnvelope(res);
  });

  await recordAsyncTest('Suite 4', '4.10 options parameter is a number: parseStructuredCriteria("text", 42)', async () => {
    const res = await parseStructuredCriteria('some text', 42);
    assertConformingEnvelope(res);
  });

  await recordAsyncTest('Suite 4', '4.11 options parameter is a string: parseStructuredCriteria("text", "invalid")', async () => {
    const res = await parseStructuredCriteria('some text', 'invalid');
    assertConformingEnvelope(res);
  });

  await recordAsyncTest('Suite 4', '4.12 options parameter is false: parseStructuredCriteria("text", false)', async () => {
    const res = await parseStructuredCriteria('some text', false);
    assertConformingEnvelope(res);
  });

  await recordAsyncTest('Suite 4', '4.13 apiKey is null with mockMode: false: parseStructuredCriteria("text", { apiKey: null, mockMode: false })', async () => {
    const res = await parseStructuredCriteria('some text', { apiKey: null, mockMode: false });
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /GEMINI_API_KEY/i);
  });

  await recordAsyncTest('Suite 4', '4.14 apiKey is empty string with mockMode: false', async () => {
    const res = await parseStructuredCriteria('some text', { apiKey: '', mockMode: false });
    assertConformingEnvelope(res, { expectedSuccess: false, expectedMock: false });
    assert.match(res.error, /GEMINI_API_KEY/i);
  });

  await recordAsyncTest('Suite 4', '4.15 Whitespace-only text in live mode with valid client double', async () => {
    const client = createDoubleClient({ text: '{"status": "ACTIVE"}' });
    const res = await parseStructuredCriteria('    \n\t   ', { apiKey: 'k', client, mockMode: false });
    assertConformingEnvelope(res, { expectedSuccess: true, expectedMock: false });
    assert.equal(res.data.status, 'UNKNOWN');
    assert.equal(res.data.examTitle, null);
  });

  await recordAsyncTest('Suite 4', '4.16 Empty string text in live mode with valid client double', async () => {
    const client = createDoubleClient({ text: '{"status": "ACTIVE"}' });
    const res = await parseStructuredCriteria('', { apiKey: 'k', client, mockMode: false });
    assertConformingEnvelope(res, { expectedSuccess: true, expectedMock: false });
    assert.equal(res.data.status, 'UNKNOWN');
    assert.equal(res.data.examTitle, null);
  });

  // ==========================================================================
  // SUITE 5: Stress & Concurrency Hardening
  // ==========================================================================
  console.log('\n--- SUITE 5: Stress & Concurrency Hardening ---');

  await recordAsyncTest('Suite 5', '5.1 Concurrency: 50 simultaneous parseStructuredCriteria calls in mock mode', async () => {
    const text = 'UPSC notification min age 21 max age 32 vacancies: 500 fee: 100';
    const promises = Array.from({ length: 50 }, () => parseStructuredCriteria(text, { mockMode: true }));
    const results = await Promise.all(promises);
    assert.equal(results.length, 50);
    for (const res of results) {
      assertConformingEnvelope(res, { expectedSuccess: true, expectedMock: true });
      assert.equal(res.data.vacancies, 500);
    }
  });

  await recordAsyncTest('Suite 5', '5.2 High-volume payload: 1MB targeted text processed without OOM or call stack overflow', async () => {
    const filler = 'Public recruitment circular details and conditions apply. '.repeat(17000); // ~1MB
    const text = `UNION PUBLIC SERVICE COMMISSION Notice 2026\n${filler}\nAge limit: 21 to 32 years. Vacancies: 800.`;
    const res = await parseStructuredCriteria(text, { mockMode: true });
    assertConformingEnvelope(res, { expectedSuccess: true, expectedMock: true });
    assert.equal(res.data.vacancies, 800);
  });

  // ==========================================================================
  // HARNESS SUMMARY REPORT
  // ==========================================================================
  console.log('\n================================================================');
  console.log('CHALLENGE HARNESS EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`Total Stress Tests: ${stats.total}`);
  console.log(`Passed:             ${stats.passed}`);
  console.log(`Failed (Assertions):${stats.failed}`);
  console.log(`Crashed (Unhandled):${stats.crashed}`);
  console.log('----------------------------------------------------------------');
  for (const [suite, s] of Object.entries(stats.suites)) {
    console.log(`  ${suite.padEnd(10)}: Total: ${s.total} | Passed: ${s.passed} | Failed: ${s.failed} | Crashed: ${s.crashed}`);
  }
  console.log('================================================================\n');

  if (stats.failures.length > 0) {
    console.log('DETAILED FAILURE LOG:');
    stats.failures.forEach((f, idx) => {
      console.log(`\n[#${idx + 1}] [${f.type.toUpperCase()}] ${f.suite} > ${f.testName}`);
      console.log(`Error: ${f.error}`);
      if (f.stack) console.log(f.stack);
    });
  }

  const fs = require('node:fs');
  const path = require('node:path');
  const resultsPath = path.join(__dirname, 'challenge_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(stats, null, 2), 'utf-8');
  console.log(`Saved challenge results to: ${resultsPath}`);

  return stats;
}

runAllChallenges().then((stats) => {
  process.exit(stats.failures.length > 0 ? 1 : 0);
}).catch(err => {
  console.error('Fatal harness crash:', err);
  process.exit(2);
});

