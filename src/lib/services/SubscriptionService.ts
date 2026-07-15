import { SubscriptionRepository, SubscriptionRecord } from '../repositories/SubscriptionRepository';

export class SubscriptionService {
  private static isPresentationMode(): boolean {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_APP_MODE === 'demo' || process.env.NEXT_PUBLIC_APP_MODE === 'presentation';
  }

  private static getMockSubscription(): SubscriptionRecord {
    return {
      planId: 'pro',
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
    };
  }

  static async getSubscription(uid: string): Promise<SubscriptionRecord> {
    if (this.isPresentationMode()) {
      return this.getMockSubscription();
    }
    const sub = await SubscriptionRepository.getSubscription(uid);
    if (!sub) {
      return {
        planId: 'free',
        status: 'FREE',
        startedAt: new Date().toISOString(),
      };
    }
    return sub;
  }

  static async saveSubscription(uid: string, subscription: SubscriptionRecord): Promise<void> {
    if (this.isPresentationMode()) {
      return;
    }
    return await SubscriptionRepository.saveSubscription(uid, subscription);
  }
}
