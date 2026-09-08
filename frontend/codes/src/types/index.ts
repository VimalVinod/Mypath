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

export interface UserProfile {
  name: string;
  email: string;
  isEmailVerified: boolean;
  dob: string;
  gender: string;
  nationality: string;
  state: string;
  district: string;
  education: Array<{
    id: string;
    level: string; // e.g., '10th', '12th', 'Diploma', 'Graduation', 'Post Graduation', 'PhD'
    degree: string;
    institution: string;
    passingYear: string;
    percentage: string;
  }>;
  category: 'General' | 'OBC-NCL' | 'OBC' | 'SC' | 'ST' | 'EWS' | '';
  isPwbd: boolean;
  isExServiceman: boolean;
  disabilityStatus: boolean; // Legacy/Alias
  relaxationApplicable: boolean;
  experienceYears: number;
  preferredTypes: string[];
  preferredLocations: string[];
  isOnboarded: boolean;
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
