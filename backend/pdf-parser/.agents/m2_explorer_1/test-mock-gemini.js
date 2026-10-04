// Prototype of mock-gemini heuristic extractor
function extractMockCriteria(targetedText = '') {
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

  // Title & Organization
  let examTitle = null;
  let organization = null;
  if (/civil\s+services\s+examination/i.test(text)) {
    examTitle = 'COMBINED CIVIL SERVICES EXAMINATION 2026';
  } else if (/combined\s+graduate\s+level/i.test(text)) {
    examTitle = 'COMBINED GRADUATE LEVEL EXAMINATION 2026';
  }
  if (/union\s+public\s+service\s+commission|upsc/i.test(text)) {
    organization = 'UNION PUBLIC SERVICE COMMISSION';
  } else if (/staff\s+selection\s+commission|ssc/i.test(text)) {
    organization = 'STAFF SELECTION COMMISSION';
  }

  // Ages
  let minAge = null;
  let maxAge = null;
  const minAgeMatch = text.match(/minimum\s+age\s+of\s+(\d+)|attained\s+the\s+age\s+of\s+(\d+)|min(?:imum)?\s*age\s*[:\-]?\s*(\d+)/i);
  if (minAgeMatch) minAge = parseInt(minAgeMatch[1] || minAgeMatch[2] || minAgeMatch[3], 10);

  const maxAgeMatch = text.match(/maximum\s+age\s+of\s+(\d+)|exceeded\s+the\s+age\s+of\s+(\d+)|max(?:imum)?\s*age\s*[:\-]?\s*(\d+)/i);
  if (maxAgeMatch) maxAge = parseInt(maxAgeMatch[1] || maxAgeMatch[2] || maxAgeMatch[3], 10);

  // Age Relaxation
  const ageRelaxation = [];
  if (/SC|Scheduled\s+Caste/i.test(text) && /(\d+)\s+years?/i.test(text)) {
    ageRelaxation.push({ category: 'SC/ST', years: 5 });
  }
  if (/OBC|Other\s+Backward/i.test(text)) {
    ageRelaxation.push({ category: 'OBC', years: 3 });
  }

  // Education
  const requiredEducation = [];
  if (/bachelor'?s?\s+degree/i.test(text) || /graduation/i.test(text)) {
    requiredEducation.push("Bachelor's degree in any discipline");
  }

  // Streams
  const eligibleStreams = [];
  if (/any\s+discipline/i.test(text) || /any\s+stream/i.test(text)) {
    eligibleStreams.push('Any');
  }

  // Vacancies
  let vacancies = null;
  const vacMatch = text.match(/(\d+)\s+posts|vacancies\s*(?:to\s*be\s*filled)?\s*[:\-]?\s*(?:is\s*expected\s*to\s*be\s*approximately\s*)?(\d+)/i);
  if (vacMatch) vacancies = parseInt(vacMatch[1] || vacMatch[2], 10);

  // Dates
  let applicationStartDate = null;
  let applicationEndDate = null;
  let examDate = null;
  const startDateMatch = text.match(/(?:window\s+opens\s+on|application\s+start\s+date\s*[:\-]?)\s*(\d{4}-\d{2}-\d{2})/i);
  if (startDateMatch) applicationStartDate = startDateMatch[1];

  const endDateMatch = text.match(/(?:last\s+date\s+for\s+submission\s+of\s+online\s+applications\s+is|application\s+end\s+date\s*[:\-]?)\s*(\d{4}-\d{2}-\d{2})/i);
  if (endDateMatch) applicationEndDate = endDateMatch[1];

  const examDateMatch = text.match(/(?:preliminary\s+examination\s+is\s+scheduled\s+to\s+be\s+conducted\s+nationwide\s+on|exam\s+date\s*[:\-]?)\s*(\d{4}-\d{2}-\d{2})/i);
  if (examDateMatch) examDate = examDateMatch[1];

  // Application Fee
  let generalFee = null;
  let reservedFee = null;
  const feeMatch = text.match(/fee\s+of\s+Rs\.?\s*(\d+)/i);
  if (feeMatch) generalFee = parseInt(feeMatch[1], 10);
  if (/exempt\s+from\s+payment\s+of\s+fee|fee:\s*nil/i.test(text)) reservedFee = 0;

  // Status
  let status = 'UNKNOWN';
  if (applicationStartDate && applicationEndDate) {
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

// Test with mock text from M1 sample PDF
const sampleText = `
UNION PUBLIC SERVICE COMMISSION COMBINED CIVIL SERVICES EXAMINATION 2026.
A candidate must have attained the minimum age of 21 years and must not have exceeded the maximum age of 32 years as on the cut-off date of 1st August 2026.
The upper age limit prescribed above will be relaxable for reserved categories: up to a maximum of 5 years if a candidate belongs to a Scheduled Caste (SC) or Scheduled Tribe (ST), and up to a maximum of 3 years in the case of candidates belonging to Other Backward Classes (OBC).
Minimum Educational Qualifications: A candidate must hold a Bachelor's degree in any discipline from a recognized University.
The number of vacancies to be filled through the examination is expected to be approximately 1056 posts.
The online application window opens on 2026-01-10 at 10:00 hrs. The last date for submission of online applications is 2026-02-15 until 18:00 hrs.
The Preliminary Examination is scheduled to be conducted nationwide on 2026-05-24.
Candidates applying for the examination are required to pay an application fee of Rs. 100 for General and OBC male candidates.
Female candidates and candidates belonging to SC, ST, and Persons with Benchmark Disability categories are completely exempt from payment of fee (Fee: Nil).
`;

const result = extractMockCriteria(sampleText);
console.log('Parsed Mock Result:', JSON.stringify(result, null, 2));
