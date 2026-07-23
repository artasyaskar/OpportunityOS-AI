import { UserProfile, Opportunity } from '../gemini';

export type NotificationType = 'alert' | 'recommendation' | 'update' | 'success';
export type DeliveryChannel = 'in_app' | 'email' | 'push';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLink?: string;
  actionText?: string;
  channels: DeliveryChannel[];
}

export class NotificationService {
  /**
   * Generates proactive notifications based on user profile and current opportunity state.
   */
  static generateProactiveNotifications(
    profile: Partial<UserProfile>,
    opportunities: Opportunity[],
    activeApplications: any[],
    documents: any[] = []
  ): AppNotification[] {
    const notifications: AppNotification[] = [];
    const now = new Date();

    // 1. Missing Critical Evidence Alert
    const hasResume = documents.some(doc => doc.type === 'resume' || doc.type === 'cv');
    const hasTranscript = documents.some(doc => doc.type === 'transcript');
    
    if (documents.length === 0) {
      notifications.push({
        id: `alert-nodocs-${now.getTime()}`,
        type: 'alert',
        title: 'Missing Core Documents',
        message: 'Your Vault is empty! Upload your Resume/CV and Transcripts so the AI can start matching you to opportunities.',
        timestamp: now.toISOString(),
        read: false,
        actionLink: '/dashboard/vault',
        actionText: 'Go to Vault',
        channels: ['in_app']
      });
    } else if (!hasResume) {
      notifications.push({
        id: `alert-noresume-${now.getTime()}`,
        type: 'alert',
        title: 'Missing Resume/CV',
        message: 'Most applications require a Resume/CV. Upload one to the Vault to unlock 1-click apply.',
        timestamp: now.toISOString(),
        read: false,
        actionLink: '/dashboard/vault',
        actionText: 'Upload Resume',
        channels: ['in_app']
      });
    } else if (!hasTranscript) {
      notifications.push({
        id: `alert-notranscript-${now.getTime()}`,
        type: 'alert',
        title: 'Missing Academic Transcript',
        message: 'Scholarships require academic transcripts. Upload your latest transcript to the Vault.',
        timestamp: now.toISOString(),
        read: false,
        actionLink: '/dashboard/vault',
        actionText: 'Upload Transcript',
        channels: ['in_app']
      });
    }

    // 2. Upcoming Deadline Alert
    if (activeApplications.length > 0) {
      activeApplications.forEach(app => {
        const opp = opportunities.find(o => o.id === app.id);
        if (opp && opp.deadline && opp.deadline !== 'Rolling') {
          const deadlineDate = new Date(opp.deadline);
          const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 14 && daysLeft > 0) {
            notifications.push({
              id: `alert-deadline-${app.id}-${now.getTime()}`,
              type: 'alert',
              title: `Urgent: ${opp.title} Deadline Approaching`,
              message: `You have ${daysLeft} days left to submit your application for ${opp.provider}.`,
              timestamp: now.toISOString(),
              read: false,
              actionLink: `/dashboard/applications/${app.id}`,
              actionText: 'View Application',
              channels: ['in_app', 'push', 'email']
            });
          }
        }
      });
    }

    // 3. New Match Recommendation
    const matchedOpps = opportunities.filter(o => 
      profile.country && o.country.toLowerCase() === profile.country.toLowerCase() &&
      o.verificationStatus === 'verified'
    );

    const newMatches = matchedOpps.filter(o => !activeApplications.find(a => a.id === o.id));
    
    if (newMatches.length > 0) {
      notifications.push({
        id: `rec-match-${now.getTime()}`,
        type: 'recommendation',
        title: 'New Verified Matches Found',
        message: `The AI Engine has found ${newMatches.length} new fully-verified opportunities matching your profile DNA.`,
        timestamp: now.toISOString(),
        read: false,
        actionLink: '/dashboard/opportunities',
        actionText: 'Review Matches',
        channels: ['in_app', 'push']
      });
    }

    return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Stub for dispatching to Email provider (e.g. SendGrid, Resend)
   */
  static async dispatchEmail(notification: AppNotification, userEmail: string) {
    if (!notification.channels.includes('email')) return;
    console.log(`[NotificationService] Dispatching EMAIL to ${userEmail}: ${notification.title}`);
  }

  /**
   * Stub for dispatching to Push provider (e.g. FCM, APNS)
   */
  static async dispatchPush(notification: AppNotification, deviceToken: string) {
    if (!notification.channels.includes('push')) return;
    console.log(`[NotificationService] Dispatching PUSH to token ${deviceToken}: ${notification.title}`);
  }
}
