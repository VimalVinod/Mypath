export type MatchLevel = 'Eligible' | 'Probably Eligible' | 'Not Eligible';

export interface EligibilityCriteria {
  qualification: { met: boolean; detail: string };
  age: { met: boolean; detail: string };
  category: { met: boolean; detail: string };
  experience: { met: boolean; detail: string };
}

export interface Exam {
  id: string;
  name: string;
  shortName: string;
  organization: string;
  type: 'Government' | 'Banking' | 'Engineering' | 'Teaching' | 'Defense';
  matchLevel: MatchLevel;
  deadlineDate: string; // ISO or formatted
  daysRemaining: number;
  notificationDate: string;
  applicationStartDate: string;
  examDate: string;
  officialUrl: string;
  state: string;
  tags: string[];
  eligibilityBreakdown: EligibilityCriteria;
  description: string;
}

export type ApplicationStatus = 'Bookmarked' | 'Applied' | 'Under Review' | 'Completed/Expired';

export interface TrackerItem {
  id: string;
  examId: string;
  examName: string;
  organization: string;
  deadlineDate: string;
  status: ApplicationStatus;
  hasReminder: boolean;
  reminderDate?: string;
}

export interface Education {
  id: string;
  level: string; // e.g., 10th, 12th, Diploma, Graduate, PG, PhD
  boardOrUniversity: string;
  passingYear: string;
  percentageOrCgpa: string;
  streamOrSubject: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  username: string;
  isProfileComplete: boolean;
  
  // Personal Details
  dob: string;
  gender: string;
  fathersName: string;
  mothersName: string;

  // Address
  state: string;
  district: string;
  permanentAddress: string;
  currentAddress: string;

  // Demographics / Category
  category: 'General' | 'EWS' | 'OBC-NCL' | 'SC' | 'ST' | '';
  
  // Disability
  isPwbd: boolean;
  disabilityType: string;
  disabilityPercentage: string;

  // Employment & Relaxation
  isExServiceman: boolean;
  isGovtEmployee: boolean;
  department: string;

  // Family
  parentsAnnualIncome: string;

  // Education array
  education: Education[];

  // Analytics & tracking
  preferredTypes: string[];
  savedExams: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface CareerQuestion {
  id: number;
  question: string;
  options: Array<{
    label: string;
    trait: string;
  }>;
}

export interface CareerResult {
  topCareer: {
    title: string;
    description: string;
    matchPercent: number;
  };
  secondaryCareers: Array<{
    title: string;
    matchPercent: number;
  }>;
  suggestedExamIds: string[];
}

export interface NotificationItem {
  id: string;
  examId: string;
  examName: string;
  reason: string;
  timestamp: string;
  isUnread: boolean;
}

export interface ResourceItem {
  id: string;
  examTag: string;
  type: 'video' | 'article' | 'official';
  title: string;
  source: string;
  durationOrDesc: string;
  url: string;
  thumbnailUrl?: string;
}
