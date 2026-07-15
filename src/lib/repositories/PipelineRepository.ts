import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ApplicationStatus } from '../gemini';

export interface OpportunityApplication {
  id: string;
  title: string;
  stage: ApplicationStatus;
  deadline: string;
  matchScore: number;
  submittedAt?: string;
  documents: {
    name: string;
    status: 'missing' | 'draft' | 'final' | 'submitted';
    version: number;
  }[];
}

export class PipelineRepository {
  static async getPipeline(uid: string): Promise<OpportunityApplication[]> {
    const docRef = doc(db, 'pipelines', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().pipeline) {
      return docSnap.data().pipeline as OpportunityApplication[];
    }
    // Fallback to old "applications" data for migration
    if (docSnap.exists() && docSnap.data().applications) {
      return docSnap.data().applications.map((app: any) => ({
        ...app,
        stage: app.status || 'wishlist',
        documents: [],
      })) as OpportunityApplication[];
    }
    return [];
  }

  static async savePipeline(uid: string, pipeline: OpportunityApplication[]): Promise<void> {
    const docRef = doc(db, 'pipelines', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await updateDoc(docRef, { pipeline });
    } else {
      await setDoc(docRef, { pipeline, userId: uid }, { merge: true });
    }
  }
}
