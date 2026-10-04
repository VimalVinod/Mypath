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
  // Graceful fallback if @google/genai cannot be loaded
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

const CRITERIA_SCHEMA = {
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
          description: 'Opening date for online applications in ISO YYYY-MM-DD format. Null if not specified.'
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
      description: 'Current recruitment status: ACTIVE, UPCOMING, CLOSED, EXPIRED, or UNKNOWN.',
      enum: ['ACTIVE', 'UPCOMING', 'CLOSED', 'EXPIRED', 'UNKNOWN']
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
  CRITERIA_SCHEMA,
  EXAM_CRITERIA_SCHEMA: CRITERIA_SCHEMA,
  examSchema: CRITERIA_SCHEMA,
  Type
};
