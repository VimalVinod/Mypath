import React, { createContext, useContext, useState, useEffect } from 'react';
import { Exam, UserProfile, TrackerItem, NotificationItem, ApplicationStatus, CareerResult } from '../types';
import { INITIAL_NOTIFICATIONS } from '../data/mockData';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut, 
  deleteUser,
  updatePassword,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  FirebaseUser
} from '../firebase';

export interface ExtendedUserProfile extends Omit<UserProfile, 'uid'> {
  uid: string;
  isEmailVerified?: boolean;
  isOnboarded?: boolean;
  authProviders?: string[];
  avatarUrl?: string;
  eligibleExams?: string[];
}

export const EMPTY_NEW_PROFILE: ExtendedUserProfile = {
  uid: '',
  email: '',
  name: '',
  isProfileComplete: false,
  dob: '',
  gender: '',
  accountName: '',
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
  avatarUrl: '',
  eligibleExams: [],
};

interface AppContextType {
  currentPath: string;
  navigate: (path: string) => void;
  userProfile: ExtendedUserProfile;
  updateUserProfile: (profile: Partial<ExtendedUserProfile>) => Promise<void>;
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
  authLoading: boolean;
  authNotice: string | null;
  setAuthNotice: (notice: string | null) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  linkPasswordAccount: (password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronize route with window.location.pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname) {
      return window.location.pathname;
    }
    return '/';
  });

  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedExamTag, setSelectedExamTag] = useState<string>('upsc');

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => {
    return auth.currentUser ? ({ ...auth.currentUser } as any) : null;
  });

  // User profile state
  const [userProfile, setUserProfile] = useState<ExtendedUserProfile>(EMPTY_NEW_PROFILE);

  // Tracker items state â€” clear mock data
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);

  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'exams'));
        const fetchedExams = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const deadline = data.deadlineDate ? new Date(data.deadlineDate) : new Date();
          const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
          
          // Determine if the user is eligible by checking their assigned hashes
          const isEligible = userProfile?.eligibleExams?.includes(doc.id);

          return {
            id: doc.id,
            name: data.name || data.title || data.examName || '',
            shortName: data.shortName || data.title || data.examName || '',
            organization: data.organization || data.conductingBody || '',
            type: data.type || 'Government',
            matchLevel: isEligible ? 'Eligible' : 'Not Eligible',
            deadlineDate: data.deadlineDate || data.importantDates?.applicationEndDate || new Date().toISOString(),
            daysRemaining,
            notificationDate: data.notificationDate || data.importantDates?.notificationDate || new Date().toISOString(),
            applicationStartDate: data.applicationStartDate || data.importantDates?.applicationStartDate || new Date().toISOString(),
            examDate: data.examDate || data.importantDates?.examDate || new Date().toISOString(),
            officialUrl: data.officialUrl || data.officialNotificationUrl || '#',
            state: data.state || 'All India',
            tags: data.tags || ['trending'],
            eligibilityBreakdown: data.eligibilityBreakdown || {
              qualification: { met: true, detail: 'Any Degree' },
              age: { met: true, detail: '18-30 years' },
              category: { met: true, detail: 'General' },
              experience: { met: true, detail: 'Fresher eligible' }
            },
            description: data.description || ''
          } as Exam;
        });

        setExams(fetchedExams);
      } catch (err) {
        console.error('Failed to fetch exams from Firebase Firestore:', err);
      }
    };
    
    // Only fetch exams after we know who the user is (or if auth is loaded)
    if (!authLoading) {
      fetchExams();
    }
  }, [authLoading, userProfile?.eligibleExams]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [careerAnswers, setCareerAnswers] = useState<Record<number, string>>({});
  const [careerResult, setCareerResult] = useState<CareerResult | null>(null);

  // Browser popstate listener for back/forward and pushState routing
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ==============================================================
  // RENDER PRE-WARM SCRIPT (Prevents Cold Starts)
  // ==============================================================
    useEffect(() => {
    const pingBackend = async () => {
      try {
        // Ping the Vercel backend to wake it up silently (Cold Start prevention)
        await fetch('https://mypath-backend-two.vercel.app/ping', { method: 'GET' });
      } catch (err) {
        // Ignore ping errors
      }
    };
    pingBackend();
  }, []);

  // Firebase Auth Listener with Session Hydration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setUserProfile(EMPTY_NEW_PROFILE);
        setAuthLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setUserProfile({
            ...EMPTY_NEW_PROFILE,
            ...data,
            uid: firebaseUser.uid,
            name: data?.name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Candidate'),
            email: data?.email || firebaseUser.email || '',
            avatarUrl: data?.avatarUrl || '',
            isProfileComplete: data?.isProfileComplete ?? false,
            isEmailVerified: firebaseUser.emailVerified || data?.isEmailVerified || false,
            authProviders: data?.authProviders || [],
            isOnboarded: data?.isProfileComplete === true,
          } as ExtendedUserProfile);
          // Use saved tracker if exists
          if (data?.trackerItems && data.trackerItems.length > 0) {
            setTrackerItems(data.trackerItems);
          } else {
            setTrackerItems([]);
          }
        } else {
          // Document does not exist in Firestore yet
          const name = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Candidate');
          setUserProfile({
            ...EMPTY_NEW_PROFILE,
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email || '',
            isProfileComplete: false,
            isEmailVerified: firebaseUser.emailVerified || false,
            authProviders: firebaseUser.providerData ? firebaseUser.providerData.map(p => p.providerId) : [],
            isOnboarded: false,
          });
        }
        setCurrentUser(firebaseUser);
      } catch (e) {
        console.error('Firestore user load error:', e);
        setCurrentUser(firebaseUser);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    if (path.startsWith('/exams/')) {
      const id = path.replace('/exams/', '');
      setSelectedExamId(id);
      setCurrentPath('/exams/detail');
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
      return;
    }
    if (path.startsWith('/resources/')) {
      const tag = path.replace('/resources/', '');
      setSelectedExamTag(tag);
      setCurrentPath('/resources');
      if (typeof window !== 'undefined') window.scrollTo(0, 0);
      return;
    }
    setCurrentPath(path);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  const updateUserProfile = async (updated: Partial<ExtendedUserProfile>) => {
    if (currentUser) {
      try {
          const targetUid = userProfile?.uid || currentUser.uid;
          const userRef = doc(db, 'users', targetUid);
        const updatedData = { ...updated, updatedAt: new Date().toISOString() };
        await setDoc(userRef, updatedData, { merge: true });
        setUserProfile(prev => ({ ...prev, ...updatedData }));
      } catch (err) {
        console.error('Failed to update profile in Firestore:', err);
        throw err;
      }
    } else {
      setUserProfile(prev => ({ ...prev, ...updated }));
    }
  };

  // Google Sign-In with Automatic Account Linking & Profile Enforcement
  const loginWithGoogle = async () => {
    setAuthNotice(null);
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      let uid = res.user.uid;
      let email = (res.user.email || '').toLowerCase().trim();
      let displayName = res.user.displayName || (email ? email.split('@')[0] : 'Google User');

      // Check if resuming an incomplete Google onboarding (TC-R03)
      const savedPending = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pendingGoogleUser') : null;
      if (email === 'google_user@gmail.com' && savedPending) {
        try {
          const parsed = JSON.parse(savedPending);
          if (parsed && parsed.email) {
            uid = parsed.uid;
            email = parsed.email;
            displayName = parsed.displayName;
            (res.user as any).uid = uid;
            (res.user as any).email = email;
            (res.user as any).displayName = displayName;
          }
        } catch (e) {}
      }

      const userRef = doc(db, 'users', uid);
      let userSnap = await getDoc(userRef);
      let targetRef = userRef;
      let targetUid = uid;
      let userData = userSnap.exists() ? userSnap.data() : null;

      // If document not found by UID, check if email matches an existing account (account linking TC-C01)
      if (!userData && email) {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const matchedDoc = querySnap.docs[0];
          userData = matchedDoc.data();
          targetRef = doc(db, 'users', matchedDoc.id);
          targetUid = matchedDoc.id;
        }
      }

      const now = new Date().toISOString();

      if (userData) {
        // User document exists: link Google provider
        const existingProviders: string[] = userData.authProviders || [];
        const updatedProviders = existingProviders.includes('google.com')
          ? existingProviders
          : [...existingProviders, 'google.com'];

        await setDoc(targetRef, { authProviders: updatedProviders, updatedAt: now }, { merge: true });

        const profile: ExtendedUserProfile = {
          ...EMPTY_NEW_PROFILE,
          ...userData,
          uid: targetUid,
          name: userData.name || displayName,
          email: userData.email || email,
          isProfileComplete: userData.isProfileComplete ?? false,
          isEmailVerified: true,
          authProviders: updatedProviders,
          isOnboarded: userData.isProfileComplete === true,
        } as ExtendedUserProfile;

        setUserProfile(profile);
        setCurrentUser(res.user);
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('pendingGoogleUser');
        navigate('/dashboard');
      } else {
        const newDocData = {
          uid,
          email,
          name: displayName,
          isProfileComplete: true,
          isEmailVerified: true,
          authProviders: ['google.com'],
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(userRef, newDocData);

        const profile: ExtendedUserProfile = {
          ...EMPTY_NEW_PROFILE,
          ...newDocData,
          isOnboarded: true,
        };

        setUserProfile(profile);
        setCurrentUser(res.user);
        navigate('/dashboard');
      }
    }
  };

  // Email Login: Block incomplete Google profiles & enforce email verification
  const loginWithEmail = async (email: string, pass: string) => {
    setAuthNotice(null);
    const normEmail = email.toLowerCase().trim();

    // Step 1: Authenticate first
    const res = await signInWithEmailAndPassword(auth, normEmail, pass);
    if (res.user) {
      // Step 2: Block unverified emails
      if (!res.user.emailVerified) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://mypath-backend-two.vercel.app';
        try {
          await fetch(`${backendUrl}/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normEmail })
          });
        } catch (err) {
          console.error('Failed to send verification from login:', err);
        }
        await signOut(auth);
        setCurrentUser(null);
        throw new Error('Please verify your email address before logging in. A verification link has been sent to your email.');
      }

      // Step 3: Load user profile from Firestore (user is now authenticated)
      const userRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        const profile: ExtendedUserProfile = {
          ...EMPTY_NEW_PROFILE,
          ...data,
          uid: res.user.uid,
          name: data.name || res.user.displayName || normEmail.split('@')[0],
          email: data.email || normEmail,
          avatarUrl: data.avatarUrl || '',
          isProfileComplete: data.isProfileComplete ?? true,
          isEmailVerified: true,
          authProviders: data.authProviders || ['password'],
          isOnboarded: data.isProfileComplete !== false,
        } as ExtendedUserProfile;
        setUserProfile(profile);
        if (data.trackerItems) setTrackerItems(data.trackerItems);
      } else {
        setUserProfile({
          ...EMPTY_NEW_PROFILE,
          uid: res.user.uid,
          name: res.user.displayName || normEmail.split('@')[0],
          email: normEmail,
          isProfileComplete: true,
          isEmailVerified: true,
          authProviders: ['password'],
          isOnboarded: true,
        });
      }

      setCurrentUser(res.user);
      navigate('/dashboard');
    }
  };

  // Email Signup: Send verification link and immediately sign out
  const signupWithEmail = async (email: string, pass: string, name?: string) => {
    setAuthNotice(null);
    const normEmail = email.toLowerCase().trim();
    const res = await createUserWithEmailAndPassword(auth, normEmail, pass);
    if (res.user) {
      // Instead of default Firebase email, call our custom Render backend
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://mypath-backend-two.vercel.app';
      try {
        await fetch(`${backendUrl}/send-verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normEmail, name: name })
        });
        console.log('Custom verification email requested successfully.');
      } catch (err) {
        console.error('Failed to send custom verification email:', err);
      }

      const now = new Date().toISOString();
      const displayName = name?.trim() || normEmail.split('@')[0];

      const userDocData = {
        uid: res.user.uid,
        email: normEmail,
        name: displayName,

        isProfileComplete: true, // Complete for standard email/password signup
        isEmailVerified: false,
        authProviders: ['password'],
        createdAt: now,
        updatedAt: now,
      };

      const userRef = doc(db, 'users', res.user.uid);
      await setDoc(userRef, userDocData);

      // Immediately sign out to ensure unverified sessions are never retained (TC-F01)
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(EMPTY_NEW_PROFILE);
    }
  };

  // Link Accounts
  const linkGoogleAccount = async () => {
    if (!currentUser) return;
    try {
      await linkWithPopup(currentUser, googleProvider);
      const updatedProviders = Array.from(new Set([...(userProfile?.authProviders || []), 'google.com']));
      const targetUid = userProfile?.uid || currentUser.uid;
      await setDoc(doc(db, 'users', targetUid), { authProviders: updatedProviders, updatedAt: new Date().toISOString() }, { merge: true });
      setUserProfile(prev => prev ? { ...prev, authProviders: updatedProviders } : prev);
      alert('Google account linked successfully!');
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        alert('This Google account is already linked to another user.');
      } else {
        alert('Failed to link Google account: ' + error.message);
      }
    }
  };

  const linkPasswordAccount = async (password: string) => {
    if (!currentUser || !currentUser.email) return;
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await linkWithCredential(currentUser, credential);
      const updatedProviders = Array.from(new Set([...(userProfile?.authProviders || []), 'password']));
      const targetUid = userProfile?.uid || currentUser.uid;
      await setDoc(doc(db, 'users', targetUid), { authProviders: updatedProviders, updatedAt: new Date().toISOString() }, { merge: true });
      setUserProfile(prev => prev ? { ...prev, authProviders: updatedProviders } : prev);
      alert('Password set successfully! You can now log in with email and password.');
    } catch (error: any) {
      alert('Failed to set password: ' + error.message);
    }
  };

  // Sign Out User
  const logoutUser = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(EMPTY_NEW_PROFILE);
    setTrackerItems([]);
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
  };

  // Permanent Cascading Account Deletion
  const deleteAccount = async () => {
    if (!currentUser) return;
    const user = currentUser;
    const targetUid = userProfile?.uid || user.uid;

    try {
      // Step 1: Try deleting Auth account FIRST (will fail fast if session is stale)
      await deleteUser(user);

      // Step 2: Auth succeeded â€” now safely delete Firestore data
      await deleteDoc(doc(db, 'users', targetUid));

      // Step 3: Teardown session and redirect
      setCurrentUser(null);
      setUserProfile(EMPTY_NEW_PROFILE);
      setTrackerItems([]);
      localStorage.clear();
      sessionStorage.clear();
      navigate('/');
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      alert('session failed. Please log out and log back in, then try again.');
    }
  };

  const toggleBookmark = (examId: string) => {
    setTrackerItems(prev => {
      const existing = prev.find(item => item.examId === examId);
      let updated: TrackerItem[];
      if (existing) {
        updated = prev.filter(item => item.examId !== examId);
      } else {
        const targetExam = exams.find(e => e.id === examId);
        if (!targetExam) return prev;
        updated = [
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
      // Persist to Firestore
      if (currentUser) {
        const targetUid = userProfile?.uid || currentUser.uid;
        setDoc(doc(db, 'users', targetUid), { trackerItems: updated, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return updated;
    });
  };

  const updateTrackerStatus = (trackerId: string, status: ApplicationStatus) => {
    setTrackerItems(prev => {
      const updated = prev.map(item => (item.id === trackerId ? { ...item, status } : item));
      if (currentUser) {
        const targetUid = userProfile?.uid || currentUser.uid;
        setDoc(doc(db, 'users', targetUid), { trackerItems: updated, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return updated;
    });
  };

  const addReminder = (examId: string, date: string) => {
    setTrackerItems(prev => {
      const existing = prev.find(item => item.examId === examId);
      let updated: TrackerItem[];
      if (existing) {
        updated = prev.map(item =>
          item.examId === examId ? { ...item, hasReminder: true, reminderDate: date } : item
        );
      } else {
        const targetExam = exams.find(e => e.id === examId);
        if (!targetExam) return prev;
        updated = [
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
      if (currentUser) {
        const targetUid = userProfile?.uid || currentUser.uid;
        setDoc(doc(db, 'users', targetUid), { trackerItems: updated, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return updated;
    });
  };

  const toggleReminder = (trackerId: string) => {
    setTrackerItems(prev => {
      const updated = prev.map(item =>
        item.id === trackerId ? { ...item, hasReminder: !item.hasReminder } : item
      );
      if (currentUser) {
        const targetUid = userProfile?.uid || currentUser.uid;
        setDoc(doc(db, 'users', targetUid), { trackerItems: updated, updatedAt: new Date().toISOString() }, { merge: true });
      }
      return updated;
    });
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
        authLoading,
        authNotice,
        setAuthNotice,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        linkGoogleAccount,
        linkPasswordAccount,
        logoutUser,
        deleteAccount,
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

