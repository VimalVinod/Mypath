import { Exam, CareerQuestion, NotificationItem, ResourceItem } from '../types';



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
      qualification: { met: true, detail: 'Bachelor\'s degree required' },
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

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const MOCK_RESOURCES: ResourceItem[] = []; // Omitted for brevity since not requested to change

export const MOCK_TRACKER_ITEMS = [
  {
    id: 'tr-upsc-cse',
    examId: 'upsc-cse-2026',
    examName: 'UPSC CSE 2026',
    organization: 'Union Public Service Commission',
    deadlineDate: nextMonth.split('T')[0],
    status: 'Applied' as const,
    hasReminder: true,
    reminderDate: nextWeek.split('T')[0],
  },
  {
    id: 'tr-ssc-cgl',
    examId: 'ssc-cgl-2026',
    examName: 'SSC CGL 2026',
    organization: 'Staff Selection Commission',
    deadlineDate: nextWeek.split('T')[0],
    status: 'Applied' as const,
    hasReminder: true,
  },
  {
    id: 'tr-sbi-po',
    examId: 'sbi-po-2026',
    examName: 'SBI PO 2026',
    organization: 'State Bank of India',
    deadlineDate: twoDaysFromNow.split('T')[0],
    status: 'Under Review' as const,
    hasReminder: false,
  },
  {
    id: 'tr-rrb-ntpc',
    examId: 'rrb-ntpc-2026',
    examName: 'RRB NTPC 2026',
    organization: 'Railway Recruitment Board',
    deadlineDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Bookmarked' as const,
    hasReminder: false,
  },
  {
    id: 'tr-ibps-clerk',
    examId: 'ibps-clerk-2026',
    examName: 'IBPS Clerk CRP XIV',
    organization: 'Institute of Banking Personnel Selection',
    deadlineDate: nextMonth.split('T')[0],
    status: 'Bookmarked' as const,
    hasReminder: false,
  },
  {
    id: 'tr-ibps-po',
    examId: 'ibps-po-2026',
    examName: 'IBPS PO 2026',
    organization: 'Institute of Banking Personnel Selection',
    deadlineDate: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Applied' as const,
    hasReminder: true,
  },
  {
    id: 'tr-cds',
    examId: 'upsc-cds-2025',
    examName: 'UPSC CDS (II) 2025',
    organization: 'Union Public Service Commission',
    deadlineDate: pastWeek.split('T')[0],
    status: 'Completed/Expired' as const,
    hasReminder: false,
  },
];

