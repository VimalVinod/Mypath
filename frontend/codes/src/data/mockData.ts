import { Exam, UserProfile, CareerQuestion, NotificationItem, ResourceItem } from '../types';

export const EMPTY_NEW_PROFILE: UserProfile = {
  name: '',
  email: '',
  isEmailVerified: false,
  dob: '',
  gender: '',
  nationality: 'Indian',
  state: '',
  district: '',
  education: [],
  category: '' as UserProfile['category'],
  isPwbd: false,
  isExServiceman: false,
  disabilityStatus: false,
  relaxationApplicable: false,
  experienceYears: 0,
  preferredTypes: [],
  preferredLocations: [],
  isOnboarded: false
};

export const INITIAL_USER_PROFILE: UserProfile = EMPTY_NEW_PROFILE;

// Empty initial exams catalog (No unscraped mock data)
export const MOCK_EXAMS: Exam[] = [];

export const CAREER_QUESTIONS: CareerQuestion[] = [
  {
    id: 1,
    question: 'What kind of work environment energizes you the most?',
    options: [
      { label: 'Structured administration & policy planning', trait: 'admin' },
      { label: 'Fast-paced financial operations & banking', trait: 'banking' },
      { label: 'Cutting-edge technology & engineering R&D', trait: 'tech' },
      { label: 'Teaching, research & academic mentoring', trait: 'academic' }
    ]
  },
  {
    id: 2,
    question: 'How do you prefer solving complex problems?',
    options: [
      { label: 'By evaluating regulations, laws, and public welfare', trait: 'admin' },
      { label: 'Through quantitative analysis, data, and logic', trait: 'tech' },
      { label: 'With financial modeling, risk assessment, and decision trees', trait: 'banking' },
      { label: 'By synthesizing research, literature, and educational frameworks', trait: 'academic' }
    ]
  },
  {
    id: 3,
    question: 'Which daily activity appeals to you most?',
    options: [
      { label: 'Leading teams, managing public initiatives & field visits', trait: 'admin' },
      { label: 'Architecting software, systems, or engineering models', trait: 'tech' },
      { label: 'Handling portfolio investments & client financial strategies', trait: 'banking' },
      { label: 'Designing curriculum, lecturing & publishing research', trait: 'academic' }
    ]
  },
  {
    id: 4,
    question: 'What is your primary long-term career motivation?',
    options: [
      { label: 'Societal impact, governance, and prestige', trait: 'admin' },
      { label: 'Technical mastery and innovation breakthroughs', trait: 'tech' },
      { label: 'Financial stability, lucrative perks & rapid promotions', trait: 'banking' },
      { label: 'Knowledge creation, mentorship, and work-life balance', trait: 'academic' }
    ]
  },
  {
    id: 5,
    question: 'When working in a team, what role do you naturally assume?',
    options: [
      { label: 'The Strategic Coordinator who aligns everyone with policy', trait: 'admin' },
      { label: 'The Technical Specialist who builds core solutions', trait: 'tech' },
      { label: 'The Resource Manager who optimizes budget and efficiency', trait: 'banking' },
      { label: 'The Educator who explains concepts and guides members', trait: 'academic' }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const MOCK_RESOURCES: ResourceItem[] = [];
