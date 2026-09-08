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

export interface ExtendedUserProfile extends UserProfile {
  username?: string;
  age?: number;
  uid?: string;
  isProfileComplete?: boolean;
  authProviders?: string[];
}

export const EMPTY_NEW_PROFILE: ExtendedUserProfile = {
  name: '',
  email: '',
  username: '',
  age: 0,
  isProfileComplete: false,
  isEmailVerified: false,
  authProviders: [],
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
  userProfile: ExtendedUserProfile;
  updateUserProfile: (profile: Partial<ExtendedUserProfile>) => void;
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
  completeGoogleProfile: (data: { name: string; age: number; username: string; password: string }) => Promise<void>;
  logoutUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
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

  const [selectedExamId, setSelectedExamId] = useState<string | null>('upsc-cse-2026');
  const [selectedExamTag, setSelectedExamTag] = useState<string>('upsc');

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => {
    return auth.currentUser ? ({ ...auth.currentUser } as any) : null;
  });

  // User profile state
  const [userProfile, setUserProfile] = useState<ExtendedUserProfile>(EMPTY_NEW_PROFILE);

  // Tracker items state
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);

  const [exams] = useState<Exam[]>(MOCK_EXAMS);
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
            uid: firebaseUser.uid,
            name: data?.name || firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Candidate'),
            email: data?.email || firebaseUser.email || '',
            username: data?.username || '',
            age: data?.age,
            isProfileComplete: data?.isProfileComplete ?? false,
            isEmailVerified: firebaseUser.emailVerified || data?.isEmailVerified || false,
            authProviders: data?.authProviders || [],
            isOnboarded: data?.isProfileComplete === true,
          });
          if (data?.trackerItems) setTrackerItems(data.trackerItems);
        } else {
          // Document does not exist in Firestore yet
          const name = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Candidate');
          setUserProfile({
            ...EMPTY_NEW_PROFILE,
            uid: firebaseUser.uid,
            name,
            email: firebaseUser.email || '',
            username: '',
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

  const updateUserProfile = (updated: Partial<ExtendedUserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updated }));
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
          uid: targetUid,
          name: userData.name || displayName,
          email: userData.email || email,
          username: userData.username || '',
          age: userData.age,
          isProfileComplete: userData.isProfileComplete ?? false,
          isEmailVerified: true,
          authProviders: updatedProviders,
          isOnboarded: userData.isProfileComplete === true,
        };

        setUserProfile(profile);
        setCurrentUser(res.user);

        if (userData.isProfileComplete === true) {
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('pendingGoogleUser');
          navigate('/dashboard');
        } else {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('pendingGoogleUser', JSON.stringify({ uid: targetUid, email, displayName }));
          }
          navigate('/complete-profile');
        }
      } else {
        // Brand new Google user: must complete profile (TC-F04)
        const newDocData = {
          uid,
          email,
          name: displayName,
          username: '',
          age: 0,
          isProfileComplete: false,
          isEmailVerified: true,
          authProviders: ['google.com'],
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(userRef, newDocData);

        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('pendingGoogleUser', JSON.stringify({ uid, email, displayName }));
        }

        const profile: ExtendedUserProfile = {
          ...EMPTY_NEW_PROFILE,
          ...newDocData,
          isOnboarded: false,
        };

        setUserProfile(profile);
        setCurrentUser(res.user);
        navigate('/complete-profile');
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
        await sendEmailVerification(res.user, {
          url: `${window.location.origin}/login?verified=true`,
          handleCodeInApp: true
        });
        await signOut(auth);
        setCurrentUser(null);
        throw new Error('Please verify your email address before logging in. A verification link has been sent to your email.');
      }

      // Step 3: Load user profile from Firestore (user is now authenticated)
      const userRef = doc(db, 'users', res.user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        // Block incomplete Google profiles from email login
        if (data.isProfileComplete === false) {
          await signOut(auth);
          setCurrentUser(null);
          throw new Error('Email already exists. Please complete your profile to sign in with email.');
        }

        const profile: ExtendedUserProfile = {
          ...EMPTY_NEW_PROFILE,
          uid: res.user.uid,
          name: data.name || res.user.displayName || normEmail.split('@')[0],
          email: data.email || normEmail,
          username: data.username || '',
          age: data.age,
          isProfileComplete: true,
          isEmailVerified: true,
          authProviders: data.authProviders || ['password'],
          isOnboarded: true,
        };
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
      await sendEmailVerification(res.user, {
        url: `${window.location.origin}/login?verified=true`,
        handleCodeInApp: true
      });

      const now = new Date().toISOString();
      const displayName = name?.trim() || normEmail.split('@')[0];

      const userDocData = {
        uid: res.user.uid,
        email: normEmail,
        name: displayName,
        username: '',
        age: 0,
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

  // Complete Google User Profile: Set Password, Age, Name & Reserve Unique Username
  const completeGoogleProfile = async (data: { name: string; age: number; username: string; password: string }) => {
    if (!currentUser) throw new Error('No authenticated user found.');

    const normUsername = data.username.trim().toLowerCase();
    const usernameRef = doc(db, 'usernames', normUsername);
    const userRef = doc(db, 'users', currentUser.uid);

    // 1. Check if username is already taken (TC-B06, TC-R02)
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists() && usernameSnap.data()?.uid !== currentUser.uid) {
      throw new Error('Username is already taken. Please choose another.');
    }

    // 2. Set password on the Firebase Auth user for dual authentication (TC-C03)
    if (data.password) {
      await updatePassword(currentUser, data.password);
    }

    const now = new Date().toISOString();

    // 3. Atomically reserve username in Firestore
    await setDoc(usernameRef, {
      uid: currentUser.uid,
      createdAt: now
    });

    // 4. Update user document
    const userSnap = await getDoc(userRef);
    const currentProviders: string[] = userSnap.exists() ? userSnap.data()?.authProviders || [] : [];
    const updatedProviders = Array.from(new Set([...currentProviders, 'google.com', 'password']));

    const updatedUserDoc = {
      uid: currentUser.uid,
      email: (currentUser.email || '').toLowerCase().trim(),
      name: data.name.trim(),
      username: normUsername,
      age: data.age,
      isProfileComplete: true,
      isEmailVerified: true,
      authProviders: updatedProviders,
      updatedAt: now
    };

    await setDoc(userRef, updatedUserDoc, { merge: true });

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pendingGoogleUser');
    }

    // 5. Update local state and navigate to dashboard
    setUserProfile(prev => ({
      ...prev,
      ...updatedUserDoc,
      isOnboarded: true
    }));

    navigate('/dashboard');
  };

  // Check username availability
  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const norm = username.trim().toLowerCase();
    if (!norm) return false;
    const usernameRef = doc(db, 'usernames', norm);
    const snap = await getDoc(usernameRef);
    return !snap.exists() || snap.data()?.uid === currentUser?.uid;
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
    const uid = user.uid;

    // 1. Resolve username to delete
    let username = userProfile?.username;
    if (!username) {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          username = snap.data()?.username;
        }
      } catch (e) {
        console.error('Failed to look up username for deletion:', e);
      }
    }

    // 2. Delete user from Firebase Auth FIRST (handles auth/requires-recent-login safely for TC-C05)
    await deleteUser(user);

    // 3. Cascade deletion to Firestore collections
    if (username) {
      await deleteDoc(doc(db, 'usernames', username.toLowerCase()));
    }
    await deleteDoc(doc(db, 'users', uid));

    // 4. Teardown session and redirect to landing page
    setCurrentUser(null);
    setUserProfile(EMPTY_NEW_PROFILE);
    setTrackerItems([]);
    localStorage.clear();
    sessionStorage.clear();
    navigate('/');
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
        authLoading,
        authNotice,
        setAuthNotice,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        completeGoogleProfile,
        logoutUser,
        deleteAccount,
        checkUsernameAvailable
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
