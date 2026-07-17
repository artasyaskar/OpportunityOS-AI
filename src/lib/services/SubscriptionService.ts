import { SubscriptionRepository, SubscriptionRecord } from '../repositories/SubscriptionRepository';

export class SubscriptionService {
  static async getSubscription(uid: string): Promise<SubscriptionRecord> {
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
    return await SubscriptionRepository.saveSubscription(uid, subscription);
  }
}
