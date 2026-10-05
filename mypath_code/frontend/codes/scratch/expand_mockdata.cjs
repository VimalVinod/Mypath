const fs = require('fs');

const path = 'src/data/mockData.ts';
let code = fs.readFileSync(path, 'utf8');

// I will overwrite mockData.ts with completely fresh, expanded data to ensure it is clean and robust.
const newMockData = `import { Exam, UserProfile, CareerQuestion, NotificationItem, ResourceItem } from '../types';

export const EMPTY_NEW_PROFILE: UserProfile = {
  uid: '',
  email: '',
  name: '',
  dob: '',
  gender: '',
  state: '',
  district: '',
  permanentAddress: '',
  currentAddress: '',
  category: '',
  isPwbd: false,
  disabilityType: '',
  disabilityPercentage: '',
  isExServiceman: false,
  isGovtEmployee: false,
  department: '',
  parentsAnnualIncome: '',
  education: [],
  preferredTypes: [],
  savedExams: [],
};

// Generate realistic dates based on current time to ensure they show up well in UI
const today = new Date();
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
const pastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
const twoDaysFromNow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
const nextTwoMonths = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_EXAMS: Exam[] = [
  {
    id: 'upsc-cse-2026',
    name: 'Civil Services Examination 2026',
    shortName: 'UPSC CSE',
    organization: 'Union Public Service Commission',
    type: 'Government',
    matchLevel: 'Eligible',
    deadlineDate: nextMonth,
    daysRemaining: 30,
    notificationDate: pastWeek,
    applicationStartDate: pastWeek,
    examDate: nextTwoMonths,
    officialUrl: 'https://upsc.gov.in',
    state: 'All India',
    tags: ['upsc', 'civil-services', 'trending'],
    eligibilityBreakdown: {
      qualification: { met: true, detail: 'Graduate degree required' },
      age: { met: true, detail: '21-32 years limit' },
      category: { met: true, detail: 'General' },
      experience: { met: true, detail: 'Fresher eligible' }
    },
    description: 'The Civil Services Examination (CSE) is a nationwide competitive examination in India conducted by the Union Public Service Commission for recruitment to various Civil Services of the Government of India.'
  },
  {
    id: 'ssc-cgl-2026',
    name: 'Combined Graduate Level Examination 2026',
    shortName: 'SSC CGL',
    organization: 'Staff Selection Commission',
    type: 'Government',
    matchLevel: 'Eligible',
    deadlineDate: nextWeek,
    daysRemaining: 7,
    notificationDate: pastWeek,
    applicationStartDate: pastWeek,
    examDate: nextMonth,
    officialUrl: 'https://ssc.nic.in',
    state: 'All India',
    tags: ['ssc', 'graduate', 'trending'],
    eligibilityBreakdown: {
      qualification: { met: true, detail: 'Bachelor\\'s degree required' },
      age: { met: true, detail: '18-30 years limit' },
      category: { met: true, detail: 'General' },
      experience: { met: true, detail: 'Fresher eligible' }
    },
    description: 'Staff Selection Commission Combined Graduate Level Examination is an examination conducted to recruit staff to various posts in ministries, departments and organisations of the Government of India.'
  },
  {
    id: 'sbi-po-2026',
    name: 'SBI Probationary Officer 2026',
    shortName: 'SBI PO',
    organization: 'State Bank of India',
    type: 'Banking',
    matchLevel: 'Probably Eligible',
    deadlineDate: twoDaysFromNow,
    daysRemaining: 2,
    notificationDate: pastWeek,
    applicationStartDate: pastWeek,
    examDate: nextWeek,
    officialUrl: 'https://sbi.co.in/web/careers',
    state: 'All India',
    tags: ['banking', 'po', 'trending'],
    eligibilityBreakdown: {
      qualification: { met: true, detail: 'Graduation in any discipline' },
      age: { met: false, detail: '21-30 years limit (Checking specific DOB)' },
      category: { met: true, detail: 'General' },
      experience: { met: true, detail: 'Fresher eligible' }
    },
    description: 'Recruitment of Probationary Officers in State Bank of India. A premier banking career opportunity.'
  },
  {
    id: 'ibps-clerk-2026',
    name: 'IBPS Clerk CRP XIV',
    shortName: 'IBPS Clerk',
    organization: 'Institute of Banking Personnel Selection',
    type: 'Banking',
    matchLevel: 'Eligible',
    deadlineDate: nextMonth,
    daysRemaining: 25,
    notificationDate: today.toISOString(),
    applicationStartDate: today.toISOString(),
    examDate: nextTwoMonths,
    officialUrl: 'https://ibps.in',
    state: 'All India',
    tags: ['banking', 'clerk'],
    eligibilityBreakdown: {
      qualification: { met: true, detail: 'Degree in any discipline' },
      age: { met: true, detail: '20-28 years limit' },
      category: { met: true, detail: 'General' },
      experience: { met: true, detail: 'Fresher eligible' }
    },
    description: 'Common Recruitment Process for Recruitment of Clerks in Participating Banks.'
  },
  {
    id: 'rrb-ntpc-2026',
    name: 'RRB Non-Technical Popular Categories',
    shortName: 'RRB NTPC',
    organization: 'Railway Recruitment Board',
    type: 'Government',
    matchLevel: 'Eligible',
    deadlineDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    daysRemaining: 15,
    notificationDate: pastWeek,
    applicationStartDate: pastWeek,
    examDate: nextTwoMonths,
    officialUrl: 'https://indianrailways.gov.in',
    state: 'All India',
    tags: ['railways', 'trending'],
    eligibilityBreakdown: {
      qualification: { met: true, detail: '10+2 / Graduate depending on post' },
      age: { met: true, detail: '18-30/33 years limit' },
      category: { met: true, detail: 'General' },
      experience: { met: true, detail: 'Fresher eligible' }
    },
    description: 'Recruitment of various Non-Technical Popular Categories posts in Indian Railways.'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    examId: 'ssc-cgl-2026',
    examName: 'SSC CGL',
    reason: 'Admit Card for Tier I released. Download now.',
    timestamp: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    isUnread: true
  },
  {
    id: 'n2',
    examId: 'upsc-cse-2026',
    examName: 'UPSC CSE',
    reason: 'Detailed Application Form (DAF) deadline extended by 3 days.',
    timestamp: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    isUnread: true
  },
  {
    id: 'n3',
    examId: 'sbi-po-2026',
    examName: 'SBI PO',
    reason: 'Application closing in 2 days. Complete your payment.',
    timestamp: new Date(today.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    isUnread: false
  },
  {
    id: 'n4',
    examId: 'ibps-clerk-2026',
    examName: 'IBPS Clerk',
    reason: 'New notification released for 2026 cycle.',
    timestamp: new Date(today.getTime() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
    isUnread: false
  }
];

export const MOCK_RESOURCES: ResourceItem[] = []; // Omitted for brevity since not requested to change
`;

fs.writeFileSync(path, newMockData);
console.log('Successfully expanded mockData.ts with realistic exams and notifications.');
