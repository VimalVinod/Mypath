'use strict';

const assert = require('node:assert/strict');
const { parseJsonSafely, normalizeCriteriaData, parseStructuredCriteria } = require('../../src/services/ai');

async function run() {
  console.log('Running reviewer edge case stress test...');

  // 1. Stress test extractErrorMessage with circular object
  const circular = { name: 'circularError' };
  circular.self = circular;

  const resCircular = await parseStructuredCriteria('valid text', {
    apiKey: 'dummy',
    client: {
      models: {
        generateContent: async () => { throw circular; }
      }
    }
  });
  assert.equal(resCircular.success, false);
  assert.equal(resCircular.error, '[object Object]');
  console.log('✔ Circular error handling passed');

  // 2. Stress test extractErrorMessage with non-Error objects
  const customObj = { error: { message: 'Nested Google error message' } };
  const resNested = await parseStructuredCriteria('valid text', {
    apiKey: 'dummy',
    client: {
      models: {
        generateContent: async () => { throw customObj; }
      }
    }
  });
  assert.equal(resNested.success, false);
  assert.equal(resNested.error, 'Nested Google error message');
  console.log('✔ Nested error object handling passed');

  // 3. Stress test extractErrorMessage with empty object and primitives
  const cases = [
    { thrown: null, expected: 'Unknown error (null or undefined rejection)' },
    { thrown: undefined, expected: 'Unknown error (null or undefined rejection)' },
    { thrown: '', expected: 'Unknown error' },
    { thrown: '   ', expected: 'Unknown error' },
    { thrown: 0, expected: '0' },
    { thrown: false, expected: 'false' },
    { thrown: { code: 404 }, expected: '{"code":404}' },
    { thrown: { statusText: 'Bad Request' }, expected: 'Bad Request' }
  ];

  for (const c of cases) {
    const res = await parseStructuredCriteria('valid text', {
      apiKey: 'dummy',
      client: {
        models: {
          generateContent: async () => { throw c.thrown; }
        }
      }
    });
    assert.equal(res.success, false);
    assert.equal(res.error, c.expected, `Expected "${c.expected}" for thrown ${JSON.stringify(c.thrown)}`);
  }
  console.log('✔ All primitive & non-Error thrown types verified');

  // 4. Stress test parseJsonSafely with surrounding commentary & variations
  const proseJson = 'Here is your criteria:\n\n{"examTitle": "Prose Exam", "status": "ACTIVE"}\n\nHope this helps!';
  const parsedProse = parseJsonSafely(proseJson);
  assert.equal(parsedProse.examTitle, 'Prose Exam');

  const unclosedFence = '```json\n{"examTitle": "Unclosed", "vacancies": 50}';
  const parsedUnclosed = parseJsonSafely(unclosedFence);
  assert.equal(parsedUnclosed.examTitle, 'Unclosed');

  const bomJson = '\uFEFF{"examTitle": "BOM Test", "status": "ACTIVE"}';
  const parsedBom = parseJsonSafely(bomJson);
  assert.equal(parsedBom.examTitle, 'BOM Test');
  console.log('✔ parseJsonSafely 4-tier resilience verified');

  // 5. Stress test normalizeCriteriaData with non-finite and extreme values
  const raw = {
    eligibility: {
      minAge: -Infinity,
      maxAge: Infinity,
      ageRelaxation: [
        { category: 42, years: NaN },
        { category: 'OBC', years: Infinity },
        { category: 'SC', years: -5 },
        null,
        'bad-item'
      ]
    },
    vacancies: 1056.78, // non-integer float
    applicationFee: {
      general: NaN,
      reserved: 0
    }
  };
  const normalized = normalizeCriteriaData(raw);
  assert.equal(normalized.eligibility.minAge, null);
  assert.equal(normalized.eligibility.maxAge, null);
  assert.equal(normalized.vacancies, null);
  assert.equal(normalized.applicationFee.general, null);
  assert.equal(normalized.applicationFee.reserved, 0); // Preserved zero
  assert.equal(normalized.eligibility.ageRelaxation.length, 3);
  assert.equal(normalized.eligibility.ageRelaxation[0].category, 'General');
  assert.equal(normalized.eligibility.ageRelaxation[0].years, 0);
  assert.equal(normalized.eligibility.ageRelaxation[1].years, 0);
  assert.equal(normalized.eligibility.ageRelaxation[2].years, 0);
  console.log('✔ normalizeCriteriaData Number.isFinite and non-integer float verified');

  console.log('ALL REVIEWER ADVERSARIAL STRESS TESTS PASSED!');
}

run().catch((err) => {
  console.error('Reviewer stress test failed:', err);
  process.exit(1);
});
