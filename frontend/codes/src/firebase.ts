import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  onSnapshot 
} from 'firebase/firestore';

// Valid Firebase configuration for project ID: mypath0
const firebaseConfig = {
  apiKey: "AIzaSyD3-t03tS8cc4tuabP_lZpPOOHbQGJY9_w",
  authDomain: "mypath0.firebaseapp.com",
  projectId: "mypath0",
  storageBucket: "mypath0.firebasestorage.app",
  messagingSenderId: "1061068106762",
  appId: "1:1061068106762:web:bb8bd57c6c4574441343f3",
  measurementId: "G-XMGZW1C5SE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  onSnapshot
};
export type { FirebaseUser };
