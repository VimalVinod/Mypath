const { GoogleGenAI, Type } = require('@google/genai');

// We can test by calling models.countTokens or inspecting how generateContent prepares params,
// or passing a mock HTTP client / intercepting fetch, or checking if generateContent validates the schema before sending.
const ai = new GoogleGenAI({ apiKey: 'dummy-api-key' });

const examSchema = {
  type: Type.OBJECT,
  description: 'Structured government examination notification and eligibility criteria',
  properties: {
    examTitle: {
      type: Type.STRING,
      nullable: true,
      description: 'Official name of the exam'
    },
    organization: {
      type: Type.STRING,
      nullable: true,
      description: 'Conducting organization'
    },
    eligibility: {
      type: Type.OBJECT,
      properties: {
        minAge: { type: Type.INTEGER, nullable: true },
        maxAge: { type: Type.INTEGER, nullable: true },
        ageRelaxation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              years: { type: Type.INTEGER }
            },
            required: ['category', 'years']
          }
        },
        requiredEducation: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        eligibleStreams: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ['minAge', 'maxAge', 'ageRelaxation', 'requiredEducation', 'eligibleStreams']
    },
    importantDates: {
      type: Type.OBJECT,
      properties: {
        applicationStartDate: { type: Type.STRING, nullable: true },
        applicationEndDate: { type: Type.STRING, nullable: true },
        examDate: { type: Type.STRING, nullable: true }
      },
      required: ['applicationStartDate', 'applicationEndDate', 'examDate']
    },
    vacancies: { type: Type.INTEGER, nullable: true },
    applicationFee: {
      type: Type.OBJECT,
      properties: {
        general: { type: Type.NUMBER, nullable: true },
        reserved: { type: Type.NUMBER, nullable: true }
      },
      required: ['general', 'reserved']
    },
    status: {
      type: Type.STRING,
      enum: ['ACTIVE', 'UPCOMING', 'EXPIRED', 'UNKNOWN']
    }
  },
  required: ['examTitle', 'organization', 'eligibility', 'importantDates', 'vacancies', 'applicationFee', 'status']
};

console.log('Attempting generateContent with dummy key (should fail with network or auth error, NOT schema error)...');

ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Extract exam details from text: UPSC Civil Services 2026',
  config: {
    responseMimeType: 'application/json',
    responseSchema: examSchema,
    temperature: 0.1
  }
}).then(res => {
  console.log('Response:', res.text);
}).catch(err => {
  console.log('Caught expected error from API:');
  console.log('Error name:', err.name);
  console.log('Error message:', err.message);
  console.log('Error status:', err.status);
  // Notice that if the schema was invalid or rejected by the SDK parameter processor,
  // it would have thrown a synchronous client-side error before making the HTTP request!
  console.log('Client successfully processed parameters and sent HTTP request without schema rejection!');
});
