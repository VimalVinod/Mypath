'use strict';

const { extractTargetedPdfText } = require('../../src/services/pdf');

async function testMock() {
  const res = await extractTargetedPdfText('./fixtures/sample-notification.pdf', {
    keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'dates', 'date', 'fee', 'examination']
  });
  const text = res.targetedText;

  // Rule-based deterministic extraction
  const orgMatch = text.match(/(?:UNION PUBLIC SERVICE COMMISSION|STAFF SELECTION COMMISSION|UPSC|SSC)/i);
  const organization = orgMatch ? orgMatch[0].toUpperCase() : null;

  // Title regex: match specific exam titles or stop before section headers
  let examTitle = null;
  const knownTitleMatch = text.match(/COMBINED CIVIL SERVICES EXAMINATION \d{4}/i) ||
                          text.match(/CIVIL SERVICES EXAMINATION \d{4}/i);
  if (knownTitleMatch) {
    examTitle = knownTitleMatch[0];
  } else {
    const titleMatch = text.match(/Notice No:[^|]+\|\s*([A-Z0-9\s-]+?)(?=\s+SECTION|\s+\d+\.|\s+Notice|\n|$)/i);
    if (titleMatch) {
      examTitle = titleMatch[1].trim();
    }
  }

  const minAgeMatch = text.match(/(?:minimum age of|min\.?\s*age:?)\s*(\d+)/i) ||
                      text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i);
  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;

  const maxAgeMatch = text.match(/(?:maximum age of|max\.?\s*age:?|upper age limit:?)\s*(\d+)/i) ||
                      text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;

  const ageRelaxation = [];
  // SC/ST relaxation
  const relSC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)/i) ||
                text.match(/(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)[^,.;]*?(?:up to|by|maximum of)\s*(\d+)\s*years?/i);
  if (relSC) {
    const years = parseInt(relSC[1] || relSC[2], 10);
    ageRelaxation.push({ category: 'SC/ST', years });
  }

  // OBC relaxation
  const relOBC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Other Backward Classes|\bOBC\b)/i) ||
                 text.match(/(?:Other Backward Classes|\bOBC\b)[^,.;]*?(?:up to|by|maximum of)\s*(\d+)\s*years?/i);
  if (relOBC) {
    const years = parseInt(relOBC[1] || relOBC[2], 10);
    ageRelaxation.push({ category: 'OBC', years });
  }

  const requiredEducation = [];
  if (/Bachelor'?s degree/i.test(text)) {
    requiredEducation.push("Bachelor's degree in any discipline");
  } else if (/Graduation/i.test(text)) {
    requiredEducation.push("Graduation");
  } else if (/10\+2|Higher Secondary/i.test(text)) {
    requiredEducation.push("10+2 / Higher Secondary");
  }

  const eligibleStreams = [];
  if (/any discipline|all disciplines/i.test(text)) {
    eligibleStreams.push("Any Discipline");
  }
  if (/engineering|technical/i.test(text)) {
    eligibleStreams.push("Engineering");
  }

  const startDateMatch = text.match(/(?:opens on|commencing on|starting on)\s+(\d{4}-\d{2}-\d{2})/i);
  const applicationStartDate = startDateMatch ? startDateMatch[1] : null;

  const endDateMatch = text.match(/(?:last date for submission.*?is|closing date:?|ends on)\s+(\d{4}-\d{2}-\d{2})/i);
  const applicationEndDate = endDateMatch ? endDateMatch[1] : null;

  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const examDate = examDateMatch ? examDateMatch[1] : null;

  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ||
                   text.match(/(?:total vacancies|vacancies)\s*:\s*(\d+)/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;

  const feeGenMatch = text.match(/(?:fee of|fee:?)\s*Rs\.?\s*(\d+)/i) ||
                      text.match(/Rs\.?\s*(\d+)\s+for General/i);
  const generalFee = feeGenMatch ? parseInt(feeGenMatch[1], 10) : null;

  const feeResExempt = /exempt from payment of fee|fee:\s*nil|no fee/i.test(text);
  const reservedFee = feeResExempt ? 0 : null;

  let status = 'UNKNOWN';
  if (applicationEndDate) {
    status = 'ACTIVE';
  }

  const result = {
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

  console.log('--- FULL PDF EXTRACTION ---');
  console.log(JSON.stringify(result, null, 2));
}

function extractMockCriteria(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
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

  // 1. Organization
  const orgMatch = text.match(/(?:UNION PUBLIC SERVICE COMMISSION|STAFF SELECTION COMMISSION|INSTITUTE OF BANKING PERSONNEL SELECTION|RAILWAY RECRUITMENT BOARD|UPSC|SSC|IBPS|RRB)/i) ||
                   text.match(/([A-Z\s]{3,}(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))/);
  const organization = orgMatch ? orgMatch[0].trim().toUpperCase() : null;

  // 2. Exam Title
  let examTitle = null;
  const knownTitleMatch = text.match(/(?:COMBINED\s+CIVIL\s+SERVICES\s+EXAMINATION(?:\s+\d{4})?|CIVIL\s+SERVICES\s+EXAMINATION(?:\s+\d{4})?|COMBINED\s+GRADUATE\s+LEVEL\s+EXAMINATION(?:\s+\d{4})?|CGL\s+EXAMINATION(?:\s+\d{4})?)/i);
  if (knownTitleMatch) {
    examTitle = knownTitleMatch[0].trim();
  } else {
    const titleMatch = text.match(/Notice No:[^|]+\|\s*([A-Z0-9\s-]+?)(?=\s+SECTION|\s+\d+\.|\s+Notice|\n|$)/i) ||
                       text.match(/(?:Notice|Notification):\s*([^\n.,]+(?:Examination|Recruitment|Post)[^\n.,]*)/i);
    if (titleMatch) {
      examTitle = titleMatch[1].trim();
    }
  }

  // 3. Age
  const minAgeMatch = text.match(/(?:minimum\s+age(?:\s+of)?|min\.?\s*age:?)\s*(\d+)/i) ||
                      text.match(/(\d+)\s*(?:to|-)\s*\d+\s*years/i) ||
                      text.match(/Age(?:\s+Limit)?:?\s*(\d+)\s*(?:to|-)/i);
  const minAge = minAgeMatch ? parseInt(minAgeMatch[1], 10) : null;

  const maxAgeMatch = text.match(/(?:maximum\s+age(?:\s+of)?|max\.?\s*age:?|upper\s+age\s+limit(?:\s+is)?:?)\s*(\d+)/i) ||
                      text.match(/\d+\s*(?:to|-)\s*(\d+)\s*years/i) ||
                      text.match(/Age(?:\s+Limit)?:?\s*\d+\s*(?:to|-)\s*(\d+)/i);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null;

  // 4. Age Relaxation
  const ageRelaxation = [];
  const relSC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)/i) ||
                text.match(/(?:Scheduled Caste|Scheduled Tribe|\bSC\b|\bST\b)[^,.;]*?(?:up to|by|maximum of)\s*(\d+)\s*years?/i);
  if (relSC) {
    const years = parseInt(relSC[1] || relSC[2], 10);
    ageRelaxation.push({ category: 'SC/ST', years });
  }

  const relOBC = text.match(/(?:up to\s+a\s+maximum\s+of|relaxation of|maximum of)\s+(\d+)\s+years?[^,.;]*?(?:Other Backward Classes|\bOBC\b)/i) ||
                 text.match(/(?:Other Backward Classes|\bOBC\b)[^,.;]*?(?:up to|by|maximum of)\s*(\d+)\s*years?/i);
  if (relOBC) {
    const years = parseInt(relOBC[1] || relOBC[2], 10);
    ageRelaxation.push({ category: 'OBC', years });
  }

  // 5. Education
  const requiredEducation = [];
  if (/Bachelor'?s degree/i.test(text)) {
    requiredEducation.push("Bachelor's degree in any discipline");
  } else if (/Graduation|Graduate/i.test(text)) {
    requiredEducation.push("Graduation");
  } else if (/10\+2|Higher Secondary/i.test(text)) {
    requiredEducation.push("10+2 / Higher Secondary");
  }

  // 6. Streams
  const eligibleStreams = [];
  if (/any discipline|all disciplines/i.test(text)) {
    eligibleStreams.push("Any Discipline");
  }

  // 7. Dates
  const startDateMatch = text.match(/(?:opens on|commencing on|starting on|start date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const applicationStartDate = startDateMatch ? startDateMatch[1] : null;

  const endDateMatch = text.match(/(?:last date for submission.*?is|closing date:?|ends on|end date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const applicationEndDate = endDateMatch ? endDateMatch[1] : null;

  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|exam date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const examDate = examDateMatch ? examDateMatch[1] : null;

  // 8. Vacancies
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+(\d+)\s+posts/i) ||
                   text.match(/(?:total vacancies|vacancies)\s*:\s*(\d+)/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1], 10) : null;

  // 9. Fee
  const feeGenMatch = text.match(/(?:fee of|fee:?)\s*Rs\.?\s*(\d+)/i) ||
                      text.match(/Rs\.?\s*(\d+)\s+for General/i) ||
                      text.match(/Application Fee:\s*Rs\.?\s*(\d+)/i);
  const generalFee = feeGenMatch ? parseInt(feeGenMatch[1], 10) : null;

  const feeResExempt = /exempt from payment of fee|fee:\s*nil|no fee/i.test(text);
  const reservedFee = feeResExempt ? 0 : null;

  // 10. Status
  let status = 'UNKNOWN';
  if (applicationEndDate) {
    status = 'ACTIVE';
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

const assert = require('node:assert/strict');

function assertCriteriaSchema(data) {
  assert.ok(data !== null && typeof data === 'object', 'data must be a non-null object');

  // Top-level fields
  assert.ok(data.examTitle === null || typeof data.examTitle === 'string', 'examTitle must be string | null');
  assert.ok(data.organization === null || typeof data.organization === 'string', 'organization must be string | null');
  assert.ok(data.vacancies === null || (typeof data.vacancies === 'number' && Number.isInteger(data.vacancies) && data.vacancies >= 0), 'vacancies must be non-negative integer | null');
  assert.ok(typeof data.status === 'string', 'status must be a string');

  // Eligibility
  assert.ok(data.eligibility !== null && typeof data.eligibility === 'object', 'eligibility must be an object');
  assert.ok(data.eligibility.minAge === null || (typeof data.eligibility.minAge === 'number' && data.eligibility.minAge >= 0), 'minAge must be number | null');
  assert.ok(data.eligibility.maxAge === null || (typeof data.eligibility.maxAge === 'number' && data.eligibility.maxAge >= 0), 'maxAge must be number | null');
  assert.ok(Array.isArray(data.eligibility.ageRelaxation), 'ageRelaxation must be an array');
  for (const rel of data.eligibility.ageRelaxation) {
    assert.equal(typeof rel.category, 'string', 'relaxation category must be string');
    assert.equal(typeof rel.years, 'number', 'relaxation years must be number');
    assert.ok(rel.years >= 0, 'relaxation years must be non-negative');
  }
  assert.ok(Array.isArray(data.eligibility.requiredEducation), 'requiredEducation must be an array');
  for (const edu of data.eligibility.requiredEducation) {
    assert.equal(typeof edu, 'string', 'requiredEducation item must be string');
  }
  assert.ok(Array.isArray(data.eligibility.eligibleStreams), 'eligibleStreams must be an array');
  for (const str of data.eligibility.eligibleStreams) {
    assert.equal(typeof str, 'string', 'eligibleStreams item must be string');
  }

  // Important Dates
  assert.ok(data.importantDates !== null && typeof data.importantDates === 'object', 'importantDates must be an object');
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (data.importantDates.applicationStartDate !== null) {
    assert.equal(typeof data.importantDates.applicationStartDate, 'string');
    assert.match(data.importantDates.applicationStartDate, dateRegex, 'applicationStartDate must match YYYY-MM-DD format');
  }
  if (data.importantDates.applicationEndDate !== null) {
    assert.equal(typeof data.importantDates.applicationEndDate, 'string');
    assert.match(data.importantDates.applicationEndDate, dateRegex, 'applicationEndDate must match YYYY-MM-DD format');
  }
  if (data.importantDates.examDate !== null) {
    assert.equal(typeof data.importantDates.examDate, 'string');
    assert.match(data.importantDates.examDate, dateRegex, 'examDate must match YYYY-MM-DD format');
  }

  // Application Fee
  assert.ok(data.applicationFee !== null && typeof data.applicationFee === 'object', 'applicationFee must be an object');
  assert.ok(data.applicationFee.general === null || (typeof data.applicationFee.general === 'number' && data.applicationFee.general >= 0), 'applicationFee.general must be number | null');
  assert.ok(data.applicationFee.reserved === null || (typeof data.applicationFee.reserved === 'number' && data.applicationFee.reserved >= 0), 'applicationFee.reserved must be number | null');
}

async function runComprehensiveTests() {
  console.log('[TEST 1] Full UPSC Notification Extraction...');
  const res = await extractTargetedPdfText('./fixtures/sample-notification.pdf', {
    keywords: ['eligibility', 'age', 'qualification', 'vacancies', 'dates', 'date', 'fee', 'examination']
  });
  const upscData = extractMockCriteria(res.targetedText);
  assertCriteriaSchema(upscData);
  assert.equal(upscData.organization, 'UNION PUBLIC SERVICE COMMISSION');
  assert.equal(upscData.examTitle, 'COMBINED CIVIL SERVICES EXAMINATION 2026');
  assert.equal(upscData.eligibility.minAge, 21);
  assert.equal(upscData.eligibility.maxAge, 32);
  assert.deepEqual(upscData.eligibility.ageRelaxation, [
    { category: 'SC/ST', years: 5 },
    { category: 'OBC', years: 3 }
  ]);
  assert.equal(upscData.importantDates.applicationStartDate, '2026-01-10');
  assert.equal(upscData.importantDates.applicationEndDate, '2026-02-15');
  assert.equal(upscData.importantDates.examDate, '2026-05-24');
  assert.equal(upscData.vacancies, 1056);
  assert.equal(upscData.applicationFee.general, 100);
  assert.equal(upscData.applicationFee.reserved, 0);
  console.log(' -> PASSED');

  console.log('[TEST 2] Sparse Text: Only Age...');
  const ageOnly = extractMockCriteria('Candidates must be of minimum age 20 and maximum age 28 years.');
  assertCriteriaSchema(ageOnly);
  assert.equal(ageOnly.eligibility.minAge, 20);
  assert.equal(ageOnly.eligibility.maxAge, 28);
  assert.equal(ageOnly.vacancies, null);
  assert.equal(ageOnly.applicationFee.general, null);
  assert.equal(ageOnly.importantDates.examDate, null);
  console.log(' -> PASSED');

  console.log('[TEST 3] Sparse Text: Only Fee (with Nil exemption)...');
  const feeOnly = extractMockCriteria('Application fee of Rs. 250 for General. SC/ST candidates are exempt from payment of fee (Fee: Nil).');
  assertCriteriaSchema(feeOnly);
  assert.equal(feeOnly.applicationFee.general, 250);
  assert.equal(feeOnly.applicationFee.reserved, 0);
  assert.equal(feeOnly.eligibility.minAge, null);
  console.log(' -> PASSED');

  console.log('[TEST 4] Sparse Text: Only Vacancies...');
  const vacOnly = extractMockCriteria('Total vacancies: 450 posts across various departments.');
  assertCriteriaSchema(vacOnly);
  assert.equal(vacOnly.vacancies, 450);
  assert.equal(vacOnly.applicationFee.general, null);
  console.log(' -> PASSED');

  console.log('[TEST 5] Sparse Text: Only Dates...');
  const datesOnly = extractMockCriteria('Registration opens on 2026-03-01. Last date for submission is 2026-04-15.');
  assertCriteriaSchema(datesOnly);
  assert.equal(datesOnly.importantDates.applicationStartDate, '2026-03-01');
  assert.equal(datesOnly.importantDates.applicationEndDate, '2026-04-15');
  assert.equal(datesOnly.importantDates.examDate, null);
  console.log(' -> PASSED');

  console.log('[TEST 6] Negative / Irrelevant Text...');
  const negData = extractMockCriteria('The quick brown fox jumps over the lazy dog. General instructions regarding hygiene.');
  assertCriteriaSchema(negData);
  assert.equal(negData.examTitle, null);
  assert.equal(negData.organization, null);
  assert.equal(negData.eligibility.minAge, null);
  assert.equal(negData.vacancies, null);
  assert.deepEqual(negData.eligibility.ageRelaxation, []);
  console.log(' -> PASSED');

  console.log('[TEST 7] Empty String...');
  const emptyData = extractMockCriteria('');
  assertCriteriaSchema(emptyData);
  assert.equal(emptyData.examTitle, null);
  assert.equal(emptyData.status, 'UNKNOWN');
  console.log(' -> PASSED');

  console.log('[TEST 8] Whitespace String...');
  const wsData = extractMockCriteria('   \n\t  \r\n');
  assertCriteriaSchema(wsData);
  assert.equal(wsData.examTitle, null);
  assert.equal(wsData.status, 'UNKNOWN');
  console.log(' -> PASSED');

  console.log('ALL 8 COMPREHENSIVE TESTS PASSED WITH 100% SCHEMA COMPLIANCE!');
}

runComprehensiveTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});

