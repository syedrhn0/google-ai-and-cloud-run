import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import type { JournalEntry, UserProfile } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Strict Undefined-Stripping Utility:
 * Prevents Firestore runtime crashes by recursively removing all undefined values.
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

// Concurrency lock to prevent overlapping popup executions (prevents INTERNAL ASSERTION FAILED)
let isSigningIn = false;

/**
 * Google Sign-In with popup and defensive concurrency locking
 */
export async function signInWithGoogle(): Promise<UserProfile | null> {
  if (isSigningIn) {
    console.warn('Sign-in already in progress. Ignoring duplicate trigger.');
    return null;
  }

  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  } catch (error: any) {
    const code = error?.code || '';
    
    // Gracefully handle user closing popup or canceling request
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.info('Google sign-in popup was closed before completion.');
      return null;
    }

    if (code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
    }

    console.error('Firebase Auth Error:', error);
    throw new Error(error?.message || 'Failed to authenticate with Google.');
  } finally {
    isSigningIn = false;
  }
}

/**
 * Sign Out
 */
export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error logging out:', error);
    throw error;
  }
}

/**
 * User Auth State Observer
 */
export function subscribeToAuthState(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Listen to real-time journal entries for a specific authenticated user
 * Path: /users/{userId}/entries
 */
export function subscribeToUserEntries(
  userId: string,
  onEntriesReceived: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onEntriesReceived([]);
    return () => {};
  }

  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as Omit<JournalEntry, 'id'>;
        entries.push({
          ...data,
          id: docSnapshot.id,
        });
      });
      onEntriesReceived(entries);
    },
    (error) => {
      console.error('Error fetching user entries from Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or Update a Journal Entry with zero-crash undefined sanitization
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error('Cannot save entry: User is not authenticated.');
  if (!entry.id) throw new Error('Entry ID is required.');

  const entryRef = doc(db, 'users', userId, 'entries', entry.id);
  const sanitized = sanitizePayload({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(entryRef, sanitized, { merge: true });
}

/**
 * Delete a user's journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('Invalid user or entry ID for deletion.');
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}

/**
 * Toggle favorite status
 */
export async function toggleEntryFavorite(userId: string, entryId: string, isFavorite: boolean): Promise<void> {
  if (!userId || !entryId) return;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await updateDoc(entryRef, {
    isFavorite,
    updatedAt: new Date().toISOString(),
  });
}
