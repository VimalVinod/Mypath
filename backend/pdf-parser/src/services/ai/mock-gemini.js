'use strict';

/**
 * src/services/ai/mock-gemini.js
 * Deterministic rule- and regex-based mock extraction engine for offline operation.
 * Conforms 100% to Interface Contract #2 in PROJECT.md and Requirement §R4.
 */

/**
 * Returns a blank criteria structure with all scalars null and lists empty.
 * @returns {Object}
 */
function getEmptyCriteria() {
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

/**
 * Canonical benchmark fixture data representing fixtures/sample-notification.pdf.
 */
const MOCK_NOTIFICATION_FIXTURE = {
  examTitle: 'COMBINED CIVIL SERVICES EXAMINATION 2026',
  organization: 'UNION PUBLIC SERVICE COMMISSION',
  eligibility: {
    minAge: 21,
    maxAge: 32,
    ageRelaxation: [
      { category: 'SC/ST', years: 5 },
      { category: 'OBC', years: 3 }
    ],
    requiredEducation: ["Bachelor's degree in any discipline"],
    eligibleStreams: ['Any Discipline']
  },
  importantDates: {
    applicationStartDate: '2026-01-10',
    applicationEndDate: '2026-02-15',
    examDate: '2026-05-24'
  },
  vacancies: 1056,
  applicationFee: {
    general: 100,
    reserved: 0
  },
  status: 'ACTIVE'
};

/**
 * Extracts structured criteria from text using deterministic heuristics.
 * @param {string} targetedText 
 * @param {Object} [options={}]
 * @returns {Object} Extracted data object matching Interface Contract #2
 */
function extractMockCriteria(targetedText, options = {}) {
  if (!targetedText || typeof targetedText !== 'string' || !targetedText.trim()) {
    return getEmptyCriteria();
  }

  const text = targetedText;

  // 1. Organization
  let organization = null;
  const orgMatch = text.match(/(?:UNION\s+PUBLIC\s+SERVICE\s+COMMISSION|STAFF\s+SELECTION\s+COMMISSION|INSTITUTE\s+OF\s+BANKING\s+PERSONNEL\s+SELECTION|RAILWAY\s+RECRUITMENT\s+BOARD|\bUPSC\b|\bSSC\b|\bIBPS\b|\bRRB\b)/i) ||
                   text.match(/\b([A-Z][A-Z\s]{2,80}?(?:COMMISSION|BOARD|MINISTRY|DEPARTMENT|AUTHORITY|INSTITUTE|BANK))\b/);
  if (orgMatch) {
    organization = (orgMatch[1] || orgMatch[0]).trim().toUpperCase();
  }

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

  // 3. Min / Max Age & Experience Disambiguation
  let minAge = null;
  let maxAge = null;

  // 3.1 Explicit Age Range with 'Age' marker (highest precedence)
  const ageRangeMatch = text.match(/\bAge(?:\s+Limit)?(?:\s*\))?\s*:?\s*(\d{2})\s*(?:to|-)\s*(\d{2})(?:\s*\byears?\b)?/i) ||
                        text.match(/(?:candidate\s+must\s+be\s+)?between\s+(\d{2})\s*(?:to|and|-)\s*(\d{2})\s*\byears?\b(?:\s+of\s+age)?/i) ||
                        text.match(/\b(\d{2})\s*(?:to|-)\s*(\d{2})\s*\byears\s+of\s+age\b/i);

  if (ageRangeMatch) {
    minAge = parseInt(ageRangeMatch[1], 10);
    maxAge = parseInt(ageRangeMatch[2], 10);
  }

  // 3.2 Explicit Minimum Age Label (require age keyword or explicit age context)
  if (minAge === null) {
    const minMatch = text.match(/(?:minimum\s+age(?:\s+(?:of|is))?|min\.?\s*age|lower\s+age\s+limit(?:\s+is)?)(?:\s*:)?\s*(\d+)/i) ||
                     text.match(/(?:candidate\s+must\s+)?not\s+(?:be\s+)?less\s+than\s+(\d+)\s*(?:years\s+of\s+age|\byears?\s+old\b)/i) ||
                     text.match(/(?:attained|completed)\s+(?:the\s+)?(?:minimum\s+)?age\s+of\s+(\d+)/i);
    if (minMatch) {
      minAge = parseInt(minMatch[1], 10);
    }
  }

  // 3.3 Explicit Maximum Age Label (require age keyword or negation before attained)
  if (maxAge === null) {
    const maxMatch = text.match(/(?:maximum\s+age(?:\s+(?:of|is))?|max\.?\s*age|upper\s+age\s+limit(?:\s+is)?)(?:\s*:)?\s*(\d+)/i) ||
                     text.match(/(?:not\s+(?:have\s+)?(?:exceeded|attained)|must\s+not\s+exceed)\s+(?:the\s+)?(?:maximum\s+)?(?:age\s+of\s+)?(\d+)/i) ||
                     text.match(/(?:exceeded|attained)\s+(?:the\s+)?maximum\s+age\s+of\s+(\d+)/i);
    if (maxMatch) {
      maxAge = parseInt(maxMatch[1], 10);
    }
  }

  // 3.4 Word-Bounded Guarded Fallback (support multi-word experience & industry terms)
  if (minAge === null || maxAge === null) {
    const guardedRange = text.match(/\b(\d+)\s*(?:to|-)\s*(\d+)\s*\byears?\b(?!\s*(?:of\s+)?(?:[a-z-]+\s+){0,4}?(?:experience|exp|service|practice|work|projects?|tenure|bond|contract|in\s+[a-z]+))/i);
    if (guardedRange) {
      const gMin = parseInt(guardedRange[1], 10);
      const gMax = parseInt(guardedRange[2], 10);
      if (gMin >= 16 && gMax <= 65 && gMin <= gMax) {
        if (minAge === null) minAge = gMin;
        if (maxAge === null) maxAge = gMax;
      }
    }
  }

  // 3.5 Semantic Range Boundaries & Consistency Validation
  if (minAge !== null && (minAge < 16 || minAge > 65)) minAge = null;
  if (maxAge !== null && (maxAge < 16 || maxAge > 65)) maxAge = null;
  if (minAge !== null && maxAge !== null && minAge > maxAge) maxAge = null;

  // 4. Age Relaxation (Cross-Clause & Category Disambiguation)
  const ageRelaxation = [];
  const hasRelaxationContext = /(?:relax|concession|upper\s+age\s+limit)/i.test(text);

  if (hasRelaxationContext) {
    // Unambiguous Clause Boundary Delimiters:
    // Does not cross: conjunctions ('and', 'while', 'whereas'), other categories, experience, or another '\d+ years'
    const notCrossForSC = '(?:(?!\\b(?:and|while|whereas|OBC|Other Backward Classes|PwBD|PWD|General|UR|experience|exp|service|work|\\d+\\s*years?)\\b)[^,.;\\n])*?';
    const notCrossForOBC = '(?:(?!\\b(?:and|while|whereas|SC|ST|Scheduled Caste|Scheduled Tribe|PwBD|PWD|General|UR|experience|exp|service|work|\\d+\\s*years?)\\b)[^,.;\\n])*?';

    // SC/ST matching
    const relSCPattern1 = new RegExp('(?:(?:up to\\s+a\\s+maximum\\s+of|relaxation of|maximum of|by)\\s+)?(\\d+)\\s+years?' + notCrossForSC + '(?:Scheduled Caste|Scheduled Tribe|\\bSC\\b|\\bST\\b)', 'i');
    const relSCPattern2 = new RegExp('(?:Scheduled Caste|Scheduled Tribe|\\bSC\\b|\\bST\\b)' + notCrossForSC + '(?:up to|by|maximum of|:|-)?\\s*(\\d+)\\s*years?', 'i');

    const relSC = text.match(relSCPattern1) || text.match(relSCPattern2);
    if (relSC) {
      const years = parseInt(relSC[1], 10);
      if (years > 0) {
        ageRelaxation.push({ category: 'SC/ST', years });
      }
    }

    // OBC matching
    const relOBCPattern1 = new RegExp('(?:(?:up to\\s+a\\s+maximum\\s+of|relaxation of|maximum of|by)\\s+)?(\\d+)\\s+years?' + notCrossForOBC + '(?:Other Backward Classes|\\bOBC\\b)', 'i');
    const relOBCPattern2 = new RegExp('(?:Other Backward Classes|\\bOBC\\b)' + notCrossForOBC + '(?:up to|by|maximum of|:|-)?\\s*(\\d+)\\s*years?', 'i');

    const relOBC = text.match(relOBCPattern1) || text.match(relOBCPattern2);
    if (relOBC) {
      const years = parseInt(relOBC[1], 10);
      if (years > 0) {
        ageRelaxation.push({ category: 'OBC', years });
      }
    }
  }

  // 5. Required Education
  const requiredEducation = [];
  if (/Bachelor'?s degree/i.test(text)) {
    requiredEducation.push("Bachelor's degree in any discipline");
  } else if (/Graduation|Graduate/i.test(text)) {
    requiredEducation.push("Graduation");
  } else if (/10\+2|Higher Secondary/i.test(text)) {
    requiredEducation.push("10+2 / Higher Secondary");
  } else if (/10th|Matriculation/i.test(text)) {
    requiredEducation.push("10th Standard / Matriculation");
  }

  // 6. Eligible Streams
  const eligibleStreams = [];
  if (/any discipline|all disciplines/i.test(text)) {
    eligibleStreams.push("Any Discipline");
  }

  // 7. Dates (ISO format YYYY-MM-DD)
  const startDateMatch = text.match(/(?:opens on|commencing on|starting on|start date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const applicationStartDate = startDateMatch ? startDateMatch[1] : null;

  const endDateMatch = text.match(/(?:last date for submission.*?is|closing date:?|ends on|end date:?)\s+(\d{4}-\d{2}-\d{2})/i);
  const applicationEndDate = endDateMatch ? endDateMatch[1] : null;

  const examDateMatch = text.match(/(?:examination is scheduled.*?on|conducted nationwide on|(?:preliminary\s+|tentative\s+)?exam(?:ination)?\s+date(?:\s+is)?|date of exam(?:ination)?(?:\s+is)?)(?:\s*:)?\s+(\d{4}-\d{2}-\d{2})/i);
  const examDate = examDateMatch ? examDateMatch[1] : null;

  // 8. Vacancies
  const vacMatch = text.match(/(?:vacancies.*?approximately|approximately)\s+([\d,]+)\s+(?:posts|vacancies)/i) ||
                   text.match(/(?:\b|\()(?:\w+\s+){0,3}?(?:total\s+vacancies|vacancies|posts)\s*[\):]*\s*([\d,]+)/i) ||
                   text.match(/([\d,]+)\s+vacancies/i);
  const vacancies = vacMatch ? parseInt(vacMatch[1].replace(/,/g, ''), 10) : null;

  // 9. Application Fee
  const feeGenMatch = text.match(/(?:fee of|fee:?)\s*Rs\.?\s*(\d+)/i) ||
                      text.match(/Rs\.?\s*(\d+)\s+for General/i) ||
                      text.match(/Application Fee:\s*Rs\.?\s*(\d+)/i);
  const generalFee = feeGenMatch ? parseInt(feeGenMatch[1], 10) : null;

  const feeResExempt = /exempt from payment of fee|fee:\s*nil|free of cost|no fee|exempted/i.test(text);
  const reservedFee = feeResExempt ? 0 : null;

  // 10. Status
  let status = 'UNKNOWN';
  if (applicationEndDate || (text.length > 50 && (minAge !== null || generalFee !== null || vacancies !== null || organization !== null))) {
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

/**
 * Generates the full envelope in mock mode.
 * @param {string} targetedText 
 * @param {Object} [options={}]
 * @returns {Object} CriteriaEnvelope
 */
function generateMockResponse(targetedText, options = {}) {
  const data = extractMockCriteria(targetedText, options);
  return {
    success: true,
    isMock: true,
    modelUsed: options.modelUsed || 'mock-rules-v1',
    data,
    rawResponse: {
      source: 'mock-gemini',
      timestamp: new Date().toISOString()
    }
  };
}

module.exports = {
  extractMockCriteria,
  getMockExtraction: extractMockCriteria,
  generateMockResponse,
  getEmptyCriteria,
  MOCK_NOTIFICATION_FIXTURE
};
