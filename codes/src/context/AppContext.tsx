import React, { createContext, useContext, useState, useEffect } from 'react';
import { Exam, UserProfile, TrackerItem, NotificationItem, ApplicationStatus, CareerResult } from '../types';
import { MOCK_EXAMS, INITIAL_NOTIFICATIONS } from '../data/mockData';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  FirebaseUser
} from '../firebase';

export const EMPTY_NEW_PROFILE: UserProfile = {
  name: '',
  email: '',
  isEmailVerified: false,
  dob: '',
  gender: '',
  nationality: 'Indian',
  state: '',
  education: [],
  category: 'General',
  disabilityStatus: false,
  relaxationApplicable: false,
  experienceYears: 0,
  preferredTypes: [],
  preferredLocations: [],
  isOnboarded: false
};

interface AppContextType {
  currentPath: string;
  navigate: (path: string) => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  exams: Exam[];
  trackerItems: TrackerItem[];
  toggleBookmark: (examId: string) => void;
  updateTrackerStatus: (trackerId: string, status: ApplicationStatus) => void;
  addReminder: (examId: string, date: string) => void;
  toggleReminder: (trackerId: string) => void;
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  unreadNotificationCount: number;
  careerAnswers: Record<number, string>;
  setCareerAnswer: (questionId: number, trait: string) => void;
  careerResult: CareerResult | null;
  calculateCareerResult: () => void;
  resetCareerTest: () => void;
  selectedExamId: string | null;
  selectedExamTag: string;
  // Firebase Auth & Database
  currentUser: FirebaseUser | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [selectedExamId, setSelectedExamId] = useState<string | null>('upsc-cse-2026');
  const [selectedExamTag, setSelectedExamTag] = useState<string>('upsc');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_NEW_PROFILE);

  // Tracker items state
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);

  const [exams] = useState<Exam[]>(MOCK_EXAMS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [careerAnswers, setCareerAnswers] = useState<Record<number, string>>({});
  const [careerResult, setCareerResult] = useState<CareerResult | null>(null);

  // Firebase Auth Listener - Enforces Email Verification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // If user logged in with email/password but hasn't verified email, prevent session
      if (firebaseUser && firebaseUser.providerData.some(p => p.providerId === 'password') && !firebaseUser.emailVerified) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          
          if (snap.exists()) {
            const data = snap.data();
            if (data.userProfile) setUserProfile(data.userProfile);
            if (data.trackerItems) setTrackerItems(data.trackerItems);
          } else {
            const newProfile: UserProfile = {
              ...EMPTY_NEW_PROFILE,
              name: firebaseUser.displayName || 'Candidate',
              email: firebaseUser.email || '',
              isEmailVerified: firebaseUser.emailVerified || false,
              isOnboarded: false
            };
            await setDoc(userRef, { userProfile: newProfile, trackerItems: [] }, { merge: true });
            setUserProfile(newProfile);
          }
        } catch (e) {
          console.error('Firestore user load error:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync profile & tracker to Firestore whenever updated
  useEffect(() => {
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid), { userProfile }, { merge: true }).catch(() => {});
    }
  }, [userProfile, currentUser]);

  useEffect(() => {
    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid), { trackerItems }, { merge: true }).catch(() => {});
    }
  }, [trackerItems, currentUser]);

  const navigate = (path: string) => {
    if (path.startsWith('/exams/')) {
      const id = path.replace('/exams/', '');
      setSelectedExamId(id);
      setCurrentPath('/exams/detail');
      window.scrollTo(0, 0);
      return;
    }
    if (path.startsWith('/resources/')) {
      const tag = path.replace('/resources/', '');
      setSelectedExamTag(tag);
      setCurrentPath('/resources');
      window.scrollTo(0, 0);
      return;
    }
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  const updateUserProfile = (updated: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updated }));
  };

  // Google Sign-In -> Direct to Dashboard
  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      const userRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data()?.userProfile) {
        setUserProfile(snap.data().userProfile);
      } else {
        const newProfile: UserProfile = {
          ...EMPTY_NEW_PROFILE,
          name: res.user.displayName || 'Candidate',
          email: res.user.email || '',
          isEmailVerified: true,
          isOnboarded: false
        };
        setUserProfile(newProfile);
        await setDoc(userRef, { userProfile: newProfile, trackerItems: [] }, { merge: true });
      }
      navigate('/dashboard');
    }
  };

  // Email Login: STRICT Check if email is verified
  const loginWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      if (!res.user.emailVerified) {
        await sendEmailVerification(res.user, {
          url: `${window.location.origin}/login?verified=true`,
          handleCodeInApp: true
        });
        await signOut(auth);
        throw new Error('Email not verified. A verification link has been sent to your Gmail inbox. Please click the link to verify before logging in.');
      }

      const userRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data()?.userProfile) {
        setUserProfile(snap.data().userProfile);
      }
      navigate('/dashboard');
    }
  };

  // Email Signup: Send Verification Link and DO NOT LOG IN until verified!
  const signupWithEmail = async (email: string, pass: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      await sendEmailVerification(res.user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: true
      });
      
      const newProfile: UserProfile = {
        ...EMPTY_NEW_PROFILE,
        email: res.user.email || email,
        isEmailVerified: false,
        isOnboarded: false
      };
      setUserProfile(newProfile);
      const userRef = doc(db, 'users', res.user.uid);
      await setDoc(userRef, { userProfile: newProfile, trackerItems: [] }, { merge: true });

      // Immediately sign out user so they CANNOT access app without verifying link!
      await signOut(auth);
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    setUserProfile(EMPTY_NEW_PROFILE);
    setTrackerItems([]);
    setCurrentPath('/');
  };

  const toggleBookmark = (examId: string) => {
    setTrackerItems(prev => {
      const existing = prev.find(item => item.examId === examId);
      if (existing) {
        return prev.filter(item => item.examId !== examId);
      } else {
        const targetExam = exams.find(e => e.id === examId);
        if (!targetExam) return prev;
        return [
          ...prev,
          {
            id: `t_${Date.now()}`,
            examId,
            examName: targetExam.shortName,
            organization: targetExam.organization,
            deadlineDate: targetExam.deadlineDate,
            status: 'Bookmarked',
            hasReminder: false
          }
        ];
      }
    });
  };

  const updateTrackerStatus = (trackerId: string, status: ApplicationStatus) => {
    setTrackerItems(prev =>
      prev.map(item => (item.id === trackerId ? { ...item, status } : item))
    );
  };

  const addReminder = (examId: string, date: string) => {
    setTrackerItems(prev => {
      const existing = prev.find(item => item.examId === examId);
      if (existing) {
        return prev.map(item =>
          item.examId === examId ? { ...item, hasReminder: true, reminderDate: date } : item
        );
      } else {
        const targetExam = exams.find(e => e.id === examId);
        if (!targetExam) return prev;
        return [
          ...prev,
          {
            id: `t_${Date.now()}`,
            examId,
            examName: targetExam.shortName,
            organization: targetExam.organization,
            deadlineDate: targetExam.deadlineDate,
            status: 'Bookmarked',
            hasReminder: true,
            reminderDate: date
          }
        ];
      }
    });
  };

  const toggleReminder = (trackerId: string) => {
    setTrackerItems(prev =>
      prev.map(item =>
        item.id === trackerId ? { ...item, hasReminder: !item.hasReminder } : item
      )
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(item => (item.id === id ? { ...item, isUnread: false } : item))
    );
  };

  const setCareerAnswer = (questionId: number, trait: string) => {
    setCareerAnswers(prev => ({ ...prev, [questionId]: trait }));
  };

  const calculateCareerResult = () => {
    const counts: Record<string, number> = { admin: 0, tech: 0, banking: 0, academic: 0 };
    Object.values(careerAnswers).forEach(trait => {
      if (counts[trait] !== undefined) counts[trait]++;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topTrait = sorted[0][0];

    let topCareer = {
      title: 'Public Administration & Civil Services',
      description: 'Your responses reflect a strong alignment with governance, strategic decision-making, and public welfare administration.',
      matchPercent: 94
    };

    if (topTrait === 'tech') {
      topCareer = {
        title: 'Technology & Scientific R&D Specialist',
        description: 'You thrive on systematic problem-solving, engineering innovation, and technical mastery in high-tech research bodies.',
        matchPercent: 96
      };
    } else if (topTrait === 'banking') {
      topCareer = {
        title: 'Financial Operations & Banking Leadership',
        description: 'You show high proficiency in quantitative logic, monetary policy, and managing national banking operations.',
        matchPercent: 91
      };
    }

    setCareerResult({
      topCareer,
      secondaryCareers: [
        { title: 'Technical Engineering Research', matchPercent: 82 },
        { title: 'Strategic PSU Management', matchPercent: 78 }
      ],
      suggestedExamIds: ['upsc-cse-2026', 'isro-scientist-2026', 'sbi-po-2026']
    });
  };

  const resetCareerTest = () => {
    setCareerAnswers({});
    setCareerResult(null);
  };

  const unreadNotificationCount = notifications.filter(n => n.isUnread).length;

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        userProfile,
        updateUserProfile,
        exams,
        trackerItems,
        toggleBookmark,
        updateTrackerStatus,
        addReminder,
        toggleReminder,
        notifications,
        markNotificationRead,
        unreadNotificationCount,
        careerAnswers,
        setCareerAnswer,
        careerResult,
        calculateCareerResult,
        resetCareerTest,
        selectedExamId,
        selectedExamTag,
        currentUser,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logoutUser
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
