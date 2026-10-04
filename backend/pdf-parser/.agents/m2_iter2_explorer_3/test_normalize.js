'use strict';

const assert = require('node:assert/strict');
const { getEmptyCriteria } = require('../../src/services/ai/mock-gemini');

function normalizeCriteriaData(raw) {
  if (!raw || typeof raw !== 'object') {
    return getEmptyCriteria();
  }

  const d = raw;
  const eligibility = (d.eligibility && typeof d.eligibility === 'object') ? d.eligibility : {};
  const importantDates = (d.importantDates && typeof d.importantDates === 'object') ? d.importantDates : {};
  const applicationFee = (d.applicationFee && typeof d.applicationFee === 'object') ? d.applicationFee : {};

  return {
    examTitle: typeof d.examTitle === 'string' && d.examTitle.trim() ? d.examTitle.trim() : null,
    organization: typeof d.organization === 'string' && d.organization.trim() ? d.organization.trim() : null,
    eligibility: {
      minAge: typeof eligibility.minAge === 'number' && Number.isFinite(eligibility.minAge) && eligibility.minAge >= 0
        ? eligibility.minAge
        : null,
      maxAge: typeof eligibility.maxAge === 'number' && Number.isFinite(eligibility.maxAge) && eligibility.maxAge >= 0
        ? eligibility.maxAge
        : null,
      ageRelaxation: Array.isArray(eligibility.ageRelaxation)
        ? eligibility.ageRelaxation
            .filter(r => r && typeof r === 'object')
            .map(r => ({
              category: typeof r.category === 'string' && r.category.trim() ? r.category.trim() : 'General',
              years: typeof r.years === 'number' && Number.isFinite(r.years) && r.years >= 0 ? r.years : 0
            }))
        : [],
      requiredEducation: Array.isArray(eligibility.requiredEducation)
        ? eligibility.requiredEducation.filter(e => typeof e === 'string' && e.trim().length > 0)
        : [],
      eligibleStreams: Array.isArray(eligibility.eligibleStreams)
        ? eligibility.eligibleStreams.filter(s => typeof s === 'string' && s.trim().length > 0)
        : []
    },
    importantDates: {
      applicationStartDate: typeof importantDates.applicationStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(importantDates.applicationStartDate)
        ? importantDates.applicationStartDate
        : null,
      applicationEndDate: typeof importantDates.applicationEndDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(importantDates.applicationEndDate)
        ? importantDates.applicationEndDate
        : null,
      examDate: typeof importantDates.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(importantDates.examDate)
        ? importantDates.examDate
        : null
    },
    vacancies: typeof d.vacancies === 'number' && Number.isInteger(d.vacancies) && d.vacancies >= 0
      ? d.vacancies
      : null,
    applicationFee: {
      general: typeof applicationFee.general === 'number' && Number.isFinite(applicationFee.general) && applicationFee.general >= 0
        ? applicationFee.general
        : null,
      reserved: typeof applicationFee.reserved === 'number' && Number.isFinite(applicationFee.reserved) && applicationFee.reserved >= 0
        ? applicationFee.reserved
        : null
    },
    status: typeof d.status === 'string' && d.status.trim() ? d.status.trim() : 'UNKNOWN'
  };
}

// Test Infinity and NaN
const nanData = {
  eligibility: {
    minAge: NaN,
    maxAge: Infinity,
    ageRelaxation: [
      { category: 'SC', years: Infinity },
      { category: 'ST', years: NaN },
      { category: 'OBC', years: 3 }
    ]
  },
  vacancies: Infinity,
  applicationFee: {
    general: NaN,
    reserved: Infinity
  }
};

const res = normalizeCriteriaData(nanData);
assert.equal(res.eligibility.minAge, null, 'minAge NaN should be null');
assert.equal(res.eligibility.maxAge, null, 'maxAge Infinity should be null');
assert.equal(res.vacancies, null, 'vacancies Infinity should be null');
assert.equal(res.applicationFee.general, null, 'general fee NaN should be null');
assert.equal(res.applicationFee.reserved, null, 'reserved fee Infinity should be null');
assert.equal(res.eligibility.ageRelaxation[0].years, 0, 'ageRelaxation years Infinity should normalize to 0');
assert.equal(res.eligibility.ageRelaxation[1].years, 0, 'ageRelaxation years NaN should normalize to 0');
assert.equal(res.eligibility.ageRelaxation[2].years, 3, 'valid relaxation years preserved');

// Test -Infinity
const negInfData = {
  eligibility: {
    minAge: -Infinity,
    maxAge: -Infinity
  },
  vacancies: -Infinity,
  applicationFee: {
    general: -Infinity,
    reserved: -Infinity
  }
};
const resNeg = normalizeCriteriaData(negInfData);
assert.equal(resNeg.eligibility.minAge, null, 'minAge -Infinity should be null');
assert.equal(resNeg.eligibility.maxAge, null, 'maxAge -Infinity should be null');
assert.equal(resNeg.vacancies, null, 'vacancies -Infinity should be null');
assert.equal(resNeg.applicationFee.general, null, 'general fee -Infinity should be null');
assert.equal(resNeg.applicationFee.reserved, null, 'reserved fee -Infinity should be null');

// Test valid numbers
const validData = {
  eligibility: {
    minAge: 21,
    maxAge: 32,
    ageRelaxation: [{ category: 'SC/ST', years: 5 }]
  },
  vacancies: 1056,
  applicationFee: {
    general: 100,
    reserved: 0
  }
};
const resValid = normalizeCriteriaData(validData);
assert.equal(resValid.eligibility.minAge, 21);
assert.equal(resValid.eligibility.maxAge, 32);
assert.equal(resValid.vacancies, 1056);
assert.equal(resValid.applicationFee.general, 100);
assert.equal(resValid.applicationFee.reserved, 0, 'reserved fee of 0 must be preserved');
assert.equal(resValid.eligibility.ageRelaxation[0].years, 5);

console.log('ALL normalizeCriteriaData NUMBER SANITIZATION TESTS PASSED!');
