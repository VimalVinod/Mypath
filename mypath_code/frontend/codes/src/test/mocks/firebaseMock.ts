import { vi } from 'vitest';

export interface MockUser {
  uid: string;
  email: string;
  password?: string;
  displayName: string | null;
  emailVerified: boolean;
  providerData: Array<{ providerId: string; uid: string; email: string | null }>;
}

export interface MockDocRef {
  id: string;
  path: string;
  collection: string;
}

export interface MockCollectionRef {
  id: string;
  path: string;
}

export interface MockQueryConstraint {
  type: 'where';
  field: string;
  op: string;
  value: any;
}

export interface MockQuery {
  colRef: MockCollectionRef;
  constraints: MockQueryConstraint[];
}

// In-Memory Storage Engine
class MockFirebaseState {
  collections: Record<string, Record<string, any>> = {
    users: {},
    usernames: {},
  };

  registeredUsers: Map<string, MockUser> = new Map(); // email.toLowerCase() -> MockUser
  usersByUid: Map<string, MockUser> = new Map(); // uid -> MockUser
  currentUser: MockUser | null = null;
  authListeners: Array<(user: MockUser | null) => void> = [];

  nextPopupError: any = null;
  nextDeleteUserError: any = null;
  nextGoogleUser: Partial<MockUser> | null = null;

  reset() {
    this.collections = {
      users: {},
      usernames: {},
    };
    this.registeredUsers.clear();
    this.usersByUid.clear();
    this.currentUser = null;
    this.authListeners = [];
    this.nextPopupError = null;
    this.nextDeleteUserError = null;
    this.nextGoogleUser = null;
  }

  notifyAuth(user: MockUser | null) {
    this.currentUser = user;
    this.authListeners.forEach((listener) => {
      try {
        listener(user ? { ...user } : null);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  setRegisteredUser(user: Partial<MockUser> & { uid: string; email: string }) {
    const fullUser: MockUser = {
      uid: user.uid,
      email: user.email,
      password: user.password || 'TestPassword123!',
      displayName: user.displayName !== undefined ? user.displayName : user.email.split('@')[0],
      emailVerified: user.emailVerified ?? false,
      providerData: user.providerData || [
        { providerId: 'password', uid: user.uid, email: user.email },
      ],
    };
    this.registeredUsers.set(user.email.toLowerCase(), fullUser);
    this.usersByUid.set(user.uid, fullUser);
    return fullUser;
  }

  getRegisteredUser(email: string): MockUser | undefined {
    return this.registeredUsers.get(email.toLowerCase());
  }

  getRegisteredUserByUid(uid: string): MockUser | undefined {
    return this.usersByUid.get(uid);
  }

  verifyEmail(emailOrUid: string) {
    let user = this.registeredUsers.get(emailOrUid.toLowerCase());
    if (!user) {
      user = this.usersByUid.get(emailOrUid);
    }
    if (user) {
      user.emailVerified = true;
      if (this.currentUser?.uid === user.uid) {
        this.currentUser.emailVerified = true;
      }
    }
  }
}

export const mockState = new MockFirebaseState();

// Auth and Firestore instances
export const auth = {
  get currentUser() {
    return mockState.currentUser;
  },
  name: '[DEFAULT]',
};

export const db = {
  app: auth,
  type: 'firestore',
};

export class GoogleAuthProvider {
  providerId = 'google.com';
}

export const googleProvider = new GoogleAuthProvider();

export class RecaptchaVerifier {
  render = vi.fn().mockResolvedValue(1);
  clear = vi.fn();
}

export const signInWithPhoneNumber = vi.fn();

// --- Auth Spies and Implementations ---

export const createUserWithEmailAndPassword = vi.fn(
  async (_authInstance: any, email: string, pass: string) => {
    const normEmail = email.toLowerCase().trim();
    if (!normEmail || !normEmail.includes('@') || normEmail.startsWith('@') || normEmail.endsWith('@')) {
      const err: any = new Error('The email address is badly formatted.');
      err.code = 'auth/invalid-email';
      throw err;
    }
    if (pass.length < 6) {
      const err: any = new Error('Password should be at least 6 characters');
      err.code = 'auth/weak-password';
      throw err;
    }
    if (mockState.registeredUsers.has(normEmail)) {
      const err: any = new Error('Email already in use. Please log in instead.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const uid = 'uid_' + Math.random().toString(36).substring(2, 9);
    const newUser: MockUser = {
      uid,
      email: normEmail,
      password: pass,
      displayName: null,
      emailVerified: false,
      providerData: [{ providerId: 'password', uid, email: normEmail }],
    };

    mockState.registeredUsers.set(normEmail, newUser);
    mockState.usersByUid.set(uid, newUser);
    mockState.notifyAuth(newUser);

    return { user: { ...newUser } };
  }
);

export const sendEmailVerification = vi.fn(async (user: any, _actionCodeSettings?: any) => {
  // Records the verification link dispatch
  if (user && user.email) {
    const existing = mockState.registeredUsers.get(user.email.toLowerCase());
    if (existing) {
      // Keep tracking verification sent
    }
  }
});

export const signInWithEmailAndPassword = vi.fn(
  async (_authInstance: any, email: string, pass: string) => {
    const normEmail = email.toLowerCase().trim();
    const existing = mockState.registeredUsers.get(normEmail);

    if (!existing || existing.password !== pass) {
      const err: any = new Error('Invalid email address or password.');
      err.code = 'auth/invalid-credential';
      throw err;
    }

    mockState.notifyAuth(existing);
    return { user: { ...existing } };
  }
);

export const signInWithPopup = vi.fn(async (_authInstance: any, _provider: any) => {
  if (mockState.nextPopupError) {
    const err = mockState.nextPopupError;
    mockState.nextPopupError = null;
    throw err;
  }

  const custom = mockState.nextGoogleUser;
  mockState.nextGoogleUser = null;

  const email = (custom?.email || 'google_user@gmail.com').toLowerCase();
  const displayName = custom?.displayName !== undefined ? custom.displayName : 'Google Candidate';
  const uid = custom?.uid || 'g_uid_' + Math.random().toString(36).substring(2, 9);

  let user = mockState.registeredUsers.get(email);
  if (user) {
    // Automatically link Google provider to existing email account
    if (!user.providerData.some((p) => p.providerId === 'google.com')) {
      user.providerData.push({ providerId: 'google.com', uid: user.uid, email: user.email });
    }
  } else {
    user = {
      uid,
      email,
      displayName,
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid, email }],
    };
    mockState.registeredUsers.set(email, user);
    mockState.usersByUid.set(user.uid, user);
  }

  mockState.notifyAuth(user);
  return { user: { ...user } };
});

export const linkWithCredential = vi.fn(async (user: any, credential: any) => {
  const existing = mockState.usersByUid.get(user.uid) || mockState.registeredUsers.get(user.email?.toLowerCase());
  if (existing) {
    if (!existing.providerData.some((p) => p.providerId === 'password')) {
      existing.providerData.push({ providerId: 'password', uid: existing.uid, email: existing.email });
    }
    if (credential?.password) {
      existing.password = credential.password;
    }
  }
  return { user: existing };
});

export const updatePassword = vi.fn(async (user: any, newPassword: string) => {
  const existing = mockState.usersByUid.get(user.uid) || mockState.registeredUsers.get(user.email?.toLowerCase());
  if (existing) {
    existing.password = newPassword;
    if (!existing.providerData.some((p) => p.providerId === 'password')) {
      existing.providerData.push({ providerId: 'password', uid: existing.uid, email: existing.email });
    }
  }
});

export const signOut = vi.fn(async (_authInstance?: any) => {
  mockState.notifyAuth(null);
});

export const deleteUser = vi.fn(async (user: any) => {
  if (mockState.nextDeleteUserError) {
    const err = mockState.nextDeleteUserError;
    mockState.nextDeleteUserError = null;
    throw err;
  }

  if (user) {
    if (user.email) {
      mockState.registeredUsers.delete(user.email.toLowerCase());
    }
    mockState.usersByUid.delete(user.uid);
    if (mockState.currentUser?.uid === user.uid) {
      mockState.notifyAuth(null);
    }
  }
});

export const onAuthStateChanged = vi.fn((_authInstance: any, callback: (user: any) => void) => {
  mockState.authListeners.push(callback);
  // Async notify initial state like Firebase does
  Promise.resolve().then(() => {
    callback(mockState.currentUser ? { ...mockState.currentUser } : null);
  });
  return () => {
    mockState.authListeners = mockState.authListeners.filter((l) => l !== callback);
  };
});

// --- Firestore Spies and Implementations ---

export const doc = vi.fn((...args: any[]): MockDocRef => {
  // args could be:
  // doc(db, 'users', 'uid')
  // doc(db, 'users/uid')
  // doc(collectionRef, 'uid')
  if (args.length === 3) {
    const collection = args[1];
    const id = args[2];
    return { id, path: `${collection}/${id}`, collection };
  } else if (args.length === 2) {
    if (typeof args[1] === 'string' && args[1].includes('/')) {
      const parts = args[1].split('/');
      return { id: parts[1], path: args[1], collection: parts[0] };
    } else if (args[0] && args[0].path) {
      return { id: args[1], path: `${args[0].path}/${args[1]}`, collection: args[0].path };
    }
    return { id: args[1], path: args[1], collection: args[1] };
  }
  return { id: 'unknown', path: 'unknown', collection: 'unknown' };
});

export const collection = vi.fn((_dbInstance: any, name: string): MockCollectionRef => {
  return { id: name, path: name };
});

export const where = vi.fn((field: string, op: string, value: any): MockQueryConstraint => {
  return { type: 'where', field, op, value };
});

export const query = vi.fn((colRef: MockCollectionRef, ...constraints: MockQueryConstraint[]): MockQuery => {
  return { colRef, constraints };
});

export const getDoc = vi.fn(async (docRef: MockDocRef) => {
  const col = mockState.collections[docRef.collection] || {};
  const data = col[docRef.id];
  return {
    id: docRef.id,
    exists: () => data !== undefined && data !== null,
    data: () => (data !== undefined && data !== null ? JSON.parse(JSON.stringify(data)) : undefined),
  };
});

export const setDoc = vi.fn(async (docRef: MockDocRef, data: any, options?: { merge?: boolean }) => {
  if (!mockState.collections[docRef.collection]) {
    mockState.collections[docRef.collection] = {};
  }
  if (options?.merge && mockState.collections[docRef.collection][docRef.id]) {
    mockState.collections[docRef.collection][docRef.id] = {
      ...mockState.collections[docRef.collection][docRef.id],
      ...JSON.parse(JSON.stringify(data)),
    };
  } else {
    mockState.collections[docRef.collection][docRef.id] = JSON.parse(JSON.stringify(data));
  }
});

export const updateDoc = vi.fn(async (docRef: MockDocRef, data: any) => {
  if (!mockState.collections[docRef.collection] || !mockState.collections[docRef.collection][docRef.id]) {
    const err: any = new Error(`No document to update: ${docRef.path}`);
    err.code = 'not-found';
    throw err;
  }
  mockState.collections[docRef.collection][docRef.id] = {
    ...mockState.collections[docRef.collection][docRef.id],
    ...JSON.parse(JSON.stringify(data)),
  };
});

export const deleteDoc = vi.fn(async (docRef: MockDocRef) => {
  if (mockState.collections[docRef.collection]) {
    delete mockState.collections[docRef.collection][docRef.id];
  }
});

export const getDocs = vi.fn(async (queryTarget: MockQuery | MockCollectionRef) => {
  const colName = 'colRef' in queryTarget ? queryTarget.colRef.path : queryTarget.path;
  const col = mockState.collections[colName] || {};
  let items = Object.entries(col).map(([id, data]) => ({ id, data }));

  if ('constraints' in queryTarget && queryTarget.constraints) {
    for (const c of queryTarget.constraints) {
      if (c.type === 'where') {
        items = items.filter((item) => {
          const itemVal = item.data?.[c.field];
          if (c.op === '==') {
            if (typeof itemVal === 'string' && typeof c.value === 'string') {
              return itemVal.toLowerCase() === c.value.toLowerCase();
            }
            return itemVal === c.value;
          }
          return true;
        });
      }
    }
  }

  return {
    empty: items.length === 0,
    size: items.length,
    docs: items.map((item) => ({
      id: item.id,
      exists: () => true,
      data: () => JSON.parse(JSON.stringify(item.data)),
    })),
    forEach: (callback: (doc: any) => void) => {
      items.forEach((item) =>
        callback({
          id: item.id,
          exists: () => true,
          data: () => JSON.parse(JSON.stringify(item.data)),
        })
      );
    },
  };
});

export const runTransaction = vi.fn(async (_dbInstance: any, updateFn: (tx: any) => Promise<any>) => {
  const tx = {
    get: async (docRef: MockDocRef) => getDoc(docRef),
    set: async (docRef: MockDocRef, data: any, options?: any) => setDoc(docRef, data, options),
    update: async (docRef: MockDocRef, data: any) => updateDoc(docRef, data),
    delete: async (docRef: MockDocRef) => deleteDoc(docRef),
  };
  return await updateFn(tx);
});

export const onSnapshot = vi.fn(() => () => {});

export const getAuth = vi.fn(() => auth);
export const getFirestore = vi.fn(() => db);
export const initializeApp = vi.fn(() => ({}));

// --- State Reset and Test Helper Functions ---

export function resetFirebaseMockState() {
  mockState.reset();
  createUserWithEmailAndPassword.mockClear();
  sendEmailVerification.mockClear();
  signInWithEmailAndPassword.mockClear();
  signInWithPopup.mockClear();
  linkWithCredential.mockClear();
  updatePassword.mockClear();
  signOut.mockClear();
  deleteUser.mockClear();
  onAuthStateChanged.mockClear();
  doc.mockClear();
  collection.mockClear();
  where.mockClear();
  query.mockClear();
  getDoc.mockClear();
  setDoc.mockClear();
  updateDoc.mockClear();
  deleteDoc.mockClear();
  getDocs.mockClear();
  runTransaction.mockClear();
  onSnapshot.mockClear();
}

export function setMockUser(user: Partial<MockUser> & { uid: string; email: string }) {
  return mockState.setRegisteredUser(user);
}

export function setMockDoc(colName: string, id: string, data: any) {
  if (!mockState.collections[colName]) {
    mockState.collections[colName] = {};
  }
  mockState.collections[colName][id] = JSON.parse(JSON.stringify(data));
}

export function getMockDoc(colName: string, id: string) {
  return mockState.collections[colName]?.[id];
}

export function setNextPopupError(error: any) {
  mockState.nextPopupError = error;
}

export function setNextDeleteUserError(error: any) {
  mockState.nextDeleteUserError = error;
}

export function setNextGoogleUser(user: Partial<MockUser>) {
  mockState.nextGoogleUser = user;
}

export function verifyUserEmail(emailOrUid: string) {
  mockState.verifyEmail(emailOrUid);
}

export type { MockUser as FirebaseUser };
