import { UserRepository, UserProfileData } from '../repositories/UserRepository';

export class UserService {
  private static isPresentationMode(): boolean {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_APP_MODE === 'demo' || process.env.NEXT_PUBLIC_APP_MODE === 'presentation';
  }

  static async getProfile(uid: string): Promise<UserProfileData | null> {
    return await UserRepository.getProfile(uid);
  }

  static async saveProfile(uid: string, profile: Partial<UserProfileData>): Promise<void> {
    return await UserRepository.saveProfile(uid, profile);
  }
}
