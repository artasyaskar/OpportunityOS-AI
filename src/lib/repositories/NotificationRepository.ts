import { db } from '../firebase';
import { collection, doc, query, where, getDocs, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'PAYMENT_SUBMITTED' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED' | 'SYSTEM' | 'AI_ALERT';
  read: boolean;
  createdAt: string;
  link?: string;
}

export class NotificationRepository {
  static async createNotification(notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): Promise<string> {
    const ref = doc(collection(db, 'notifications'));
    const newNotif: AppNotification = {
      ...notification,
      id: ref.id,
      read: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(ref, newNotif);
    return ref.id;
  }

  static async markAsRead(id: string): Promise<void> {
    const ref = doc(db, 'notifications', id);
    await updateDoc(ref, { read: true });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => updateDoc(d.ref, { read: true }));
    await Promise.all(promises);
  }

  static subscribeToUserNotifications(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    
    return onSnapshot(q, (snap) => {
      let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      // Filter in memory to avoid Firestore composite index requirement
      notifs = notifs.filter(n => new Date(n.createdAt) >= lastWeek);
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifs);
    });
  }
  
  static subscribeToAdminNotifications(callback: (notifications: AppNotification[]) => void): () => void {
    const q = query(collection(db, 'notifications'), where('userId', '==', 'admin'));
    
    return onSnapshot(q, (snap) => {
      let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifs);
    });
  }
}
