export interface ActivityEvent {
  id: string;
  type: 'UPLOAD' | 'DOCUMENT_GENERATED' | 'OPPORTUNITY_SAVED' | 'PROFILE_UPDATED' | 'STATUS_CHANGED';
  title: string;
  description: string;
  timestamp: number;
}

export const ActivityLogger = {
  log: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    if (typeof window === 'undefined') return;
    try {
      const existingStr = localStorage.getItem('user_activity_timeline');
      const existing: ActivityEvent[] = existingStr ? JSON.parse(existingStr) : [];
      
      const newEvent: ActivityEvent = {
        ...event,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      };
      
      const updated = [newEvent, ...existing].slice(0, 50); // Keep last 50 events
      localStorage.setItem('user_activity_timeline', JSON.stringify(updated));
      
      // Dispatch event to update UI instantly
      window.dispatchEvent(new CustomEvent('activity-logged', { detail: newEvent }));
    } catch (e) {}
  },
  
  getHistory: (): ActivityEvent[] => {
    if (typeof window === 'undefined') return [];
    try {
      const existingStr = localStorage.getItem('user_activity_timeline');
      return existingStr ? JSON.parse(existingStr) : [];
    } catch (e) {
      return [];
    }
  }
};
