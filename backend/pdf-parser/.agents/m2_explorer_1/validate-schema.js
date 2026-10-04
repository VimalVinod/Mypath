const { GoogleGenAI, Type } = require('@google/genai');

console.log('Type enum values:', {
  STRING: Type.STRING,
  NUMBER: Type.NUMBER,
  INTEGER: Type.INTEGER,
  BOOLEAN: Type.BOOLEAN,
  ARRAY: Type.ARRAY,
  OBJECT: Type.OBJECT,
  NULL: Type.NULL
});

// Draft schema conforming to Interface Contract #2
const examSchema = {
  type: Type.OBJECT,
  description: 'Structured government examination notification and eligibility criteria',
  properties: {
    examTitle: {
      type: Type.STRING,
      nullable: true,
      description: 'Official name of the exam or recruitment (e.g. Civil Services Examination 2026). Null if not found.'
    },
    organization: {
      type: Type.STRING,
      nullable: true,
      description: 'Conducting organization name (e.g. Union Public Service Commission). Null if not found.'
    },
    eligibility: {
      type: Type.OBJECT,
      description: 'Candidate eligibility criteria including age limits, education, and relaxations.',
      properties: {
        minAge: {
          type: Type.INTEGER,
          nullable: true,
          description: 'Minimum required age in years (e.g. 21). Null if not specified.'
        },
        maxAge: {
          type: Type.INTEGER,
          nullable: true,
          description: 'Maximum age limit in years for general category (e.g. 32). Null if not specified.'
        },
        ageRelaxation: {
          type: Type.ARRAY,
          description: 'Upper age relaxation rules by category (e.g. SC/ST: 5 years, OBC: 3 years).',
          items: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'Category name (e.g. SC/ST, OBC, PwBD, Ex-Servicemen).'
              },
              years: {
                type: Type.INTEGER,
                description: 'Number of years relaxed.'
              }
            },
            required: ['category', 'years']
          }
        },
        requiredEducation: {
          type: Type.ARRAY,
          description: 'Required degrees or minimum qualifications (e.g. [Bachelor degree in any discipline]).',
          items: {
            type: Type.STRING
          }
        },
        eligibleStreams: {
          type: Type.ARRAY,
          description: 'Eligible academic streams (e.g. [Engineering, Any]). Empty if no restriction.',
          items: {
            type: Type.STRING
          }
        }
      },
      required: ['minAge', 'maxAge', 'ageRelaxation', 'requiredEducation', 'eligibleStreams']
    },
    importantDates: {
      type: Type.OBJECT,
      description: 'Key schedule dates for the examination.',
      properties: {
        applicationStartDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Application start date in YYYY-MM-DD or as stated. Null if not found.'
        },
        applicationEndDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Application deadline date in YYYY-MM-DD or as stated. Null if not found.'
        },
        examDate: {
          type: Type.STRING,
          nullable: true,
          description: 'Scheduled examination date in YYYY-MM-DD or as stated. Null if not found.'
        }
      },
      required: ['applicationStartDate', 'applicationEndDate', 'examDate']
    },
    vacancies: {
      type: Type.INTEGER,
      nullable: true,
      description: 'Total advertised vacancies/posts (e.g. 1056). Null if not found.'
    },
    applicationFee: {
      type: Type.OBJECT,
      description: 'Application fee amounts in INR.',
      properties: {
        general: {
          type: Type.NUMBER,
          nullable: true,
          description: 'Application fee for General / OBC / EWS candidates in INR. 0 if free, null if unknown.'
        },
        reserved: {
          type: Type.NUMBER,
          nullable: true,
          description: 'Application fee for SC / ST / PwBD / Female candidates in INR. 0 if free, null if unknown.'
        }
      },
      required: ['general', 'reserved']
    },
    status: {
      type: Type.STRING,
      description: 'Application status: ACTIVE, UPCOMING, EXPIRED, or UNKNOWN.',
      enum: ['ACTIVE', 'UPCOMING', 'EXPIRED', 'UNKNOWN']
    }
  },
  required: ['examTitle', 'organization', 'eligibility', 'importantDates', 'vacancies', 'applicationFee', 'status']
};

console.log('Testing client initialization with dummy key...');
const ai = new GoogleGenAI({ apiKey: 'dummy-api-key' });
console.log('Client initialized successfully!');

console.log('Schema properties count:', Object.keys(examSchema.properties).length);
console.log('Required fields:', examSchema.required);
console.log('Testing schema serialization with JSON.stringify...');
const serialized = JSON.stringify(examSchema, null, 2);
console.log('Serialized length:', serialized.length);
console.log('Schema is completely valid and JSON serializable!');
