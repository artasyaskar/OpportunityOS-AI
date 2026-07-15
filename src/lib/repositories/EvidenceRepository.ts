import { db } from '../firebase';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';

export type EvidenceType =
  | "resume"
  | "transcript"
  | "passport"
  | "national_id"
  | "ielts"
  | "toefl"
  | "pte"
  | "duolingo"
  | "lor"
  | "personal_statement"
  | "sop"
  | "research_proposal"
  | "portfolio"
  | "publication"
  | "award"
  | "internship_certificate"
  | "employment_letter"
  | "financial_statement"
  | "visa"
  | "linkedin"
  | "other";

export enum DocumentStatus {
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  PARSED = 'PARSED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED'
}

export type ExpirationStatus = "Valid" | "Expires Soon" | "Expired";

export interface PassportData {
  number: string;
  expiryDate: string;
  country: string;
  fullName: string;
  nationality: string;
}

export interface IELTSData {
  overall: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  testDate: string;
  expiryDate: string;
}

export interface TranscriptData {
  institution: string;
  cgpa: string;
  graduationYear: string;
  degree: string;
}

export interface EvidenceDocument {
  id: string;
  userId: string;
  type: EvidenceType;
  
  // Storage layer abstraction
  storageKey: string;
  mimeType: string;
  size: number;
  version: number;
  
  fileName: string;
  uploadedAt: string; // ISO String
  lastUpdatedAt: string; // ISO String
  
  status: DocumentStatus;
  
  // Strongly typed extracted data
  extractedData?: PassportData | IELTSData | TranscriptData | Record<string, any>;
  
  source: string; // "user_upload", or granular like "Resume -> Page 2 -> Paragraph 3"
  
  // Usage tracking
  usedInApplications: string[]; // List of Opportunity IDs
  aiConfidence: number; // 0-100%
  
  // Specific states for test scores or missing items
  testStatus?: "Not Planned" | "Scheduled" | "Result Pending" | "Uploaded" | "Expired";
  testDate?: string;
  expectedScore?: string;
  
  // Track versions from v1 to Submitted
  versionHistory?: { version: number; action: string; timestamp: string; note?: string }[];
  fileHash?: string;
  fileUrl?: string;
  
  // Auditing and lifecycle tracking (Phase 1 MVP Architecture)
  parserUsed?: string;
  extractionVersion?: string;
  whoVerified?: "AI" | "User" | "Admin";
}

export class EvidenceRepository {
  /**
   * Retrieves all evidence documents for a given user.
   */
  static async getEvidenceForUser(userId: string): Promise<EvidenceDocument[]> {
    const q = query(collection(db, 'evidence'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const docs: EvidenceDocument[] = [];
    querySnapshot.forEach((docSnap) => {
      docs.push(docSnap.data() as EvidenceDocument);
    });
    return docs;
  }

  /**
   * Adds a new evidence document.
   */
  static async addDocument(userId: string, data: Partial<EvidenceDocument>): Promise<string> {
    const newId = crypto.randomUUID();
    const docData: EvidenceDocument = {
      id: newId,
      userId,
      type: data.type || 'other',
      storageKey: data.storageKey || '',
      mimeType: data.mimeType || 'application/pdf',
      size: data.size || 0,
      version: 1,
      fileName: data.fileName || 'Untitled Document',
      uploadedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: data.status || DocumentStatus.UPLOADING,
      source: 'user_upload',
      usedInApplications: [],
      aiConfidence: 0,
      fileHash: data.fileHash,
      fileUrl: data.fileUrl
    };
    
    await this.saveEvidence(userId, docData);
    return newId;
  }

  /**
   * Saves or updates a specific evidence document.
   */
  static async saveEvidence(userId: string, docData: EvidenceDocument): Promise<void> {
    const docRef = doc(db, 'evidence', docData.id);
    await setDoc(docRef, docData, { merge: true });
  }

  /**
   * Determines if a document is expired based on extracted date fields.
   */
  static getExpirationStatus(doc: EvidenceDocument): ExpirationStatus {
    if (!doc.extractedData) return "Valid";
    
    const expiry = (doc.extractedData as any).expiryDate;
    if (!expiry) return "Valid";

    const expiryDate = new Date(expiry);
    const now = new Date();
    const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

    if (diffDays < 0) return "Expired";
    if (diffDays <= 30) return "Expires Soon";
    
    return "Valid";
  }
}
