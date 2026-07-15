// Firestore database helpers for OpportunityOS AI
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, Opportunity, Application } from './gemini';

// ========================
// USER OPERATIONS
// ========================

export const createUser = async (userId: string, email: string, displayName: string) => {
  await setDoc(doc(db, 'users', userId), {
    email,
    displayName,
    opportunityScore: 0,
    readinessScore: 0,
    portfolioHealth: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUser = async (userId: string) => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserScores = async (
  userId: string,
  scores: { opportunityScore?: number; readinessScore?: number; portfolioHealth?: number }
) => {
  await updateDoc(doc(db, 'users', userId), {
    ...scores,
    updatedAt: serverTimestamp(),
  });
};

// ========================
// PROFILE OPERATIONS
// ========================

export const saveProfile = async (userId: string, profile: UserProfile) => {
  await setDoc(
    doc(db, 'profiles', userId),
    { ...profile, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'profiles', userId));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

// ========================
// APPLICATION OPERATIONS
// ========================

export const createApplication = async (
  userId: string,
  opportunityId: string,
  opportunityTitle: string,
  data: Partial<Application>
) => {
  const ref = await addDoc(collection(db, 'applications'), {
    userId,
    opportunityId,
    opportunityTitle,
    status: 'draft',
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getUserApplications = async (userId: string): Promise<Application[]> => {
  const q = query(
    collection(db, 'applications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
};

export const updateApplicationStatus = async (
  appId: string,
  status: Application['status']
) => {
  await updateDoc(doc(db, 'applications', appId), {
    status,
    updatedAt: serverTimestamp(),
  });
};

// ========================
// ESSAY OPERATIONS
// ========================

export const saveEssay = async (
  userId: string,
  applicationId: string,
  type: string,
  content: string
) => {
  const ref = await addDoc(collection(db, 'essays'), {
    userId,
    applicationId,
    type,
    content,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getUserEssays = async (userId: string) => {
  const q = query(
    collection(db, 'essays'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ========================
// AGENT LOG OPERATIONS
// ========================

export const logAgentExecution = async (
  agentName: string,
  userId: string,
  input: string,
  output: string,
  tokensUsed: number,
  duration: number
) => {
  await addDoc(collection(db, 'agent_logs'), {
    agentName,
    userId,
    input: input.slice(0, 500),
    output: output.slice(0, 1000),
    tokensUsed,
    duration,
    timestamp: serverTimestamp(),
  });
};
