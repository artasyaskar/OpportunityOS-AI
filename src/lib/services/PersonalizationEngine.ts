import { UserRepository, UserGoals, UserPreferences } from '../repositories/UserRepository';
import { aiRouter } from '../../services/ai/router';

export class PersonalizationEngine {
  /**
   * Extracts user preferences and goals from conversational inputs or onboarding forms,
   * then natively updates their profile preferences.
   */
  static async inferAndSavePreferences(uid: string, rawInputText: string): Promise<void> {
    const prompt = `Extract user goals and preferences from the following raw text input:
    
    "${rawInputText}"
    
    Return a strictly formatted JSON object matching this TypeScript interface structure:
    {
      "goals": {
        "primaryGoal": "string",
        "targetDegree": "Bachelors" | "Masters" | "PhD" | "Postdoc" | "Other",
        "targetCountries": ["string"],
        "targetFields": ["string"]
      },
      "preferences": {
        "fundingPreference": "Fully Funded" | "Partial" | "Self Funded"
      }
    }
    
    If any field is missing or ambiguous, omit it or use the closest sensible default. Do NOT hallucinate.`;

    try {
      const cacheKey = Buffer.from(rawInputText).toString('base64');
      const response = await aiRouter.runWithRetry<any>(
        'PersonalizationEngine',
        async (provider) => {
          return provider.generateJSON<any>(
            prompt,
            'You are a strict data extraction system designed to parse user goals and preferences.'
          );
        },
        { format: 'json', cacheKey }
      );

      const data = response.content;
      if (data) {
        await this.updateUserGoalsAndPreferences(uid, data.goals, data.preferences);
      }
    } catch (e) {
      console.error('Failed to infer preferences:', e);
    }
  }

  static async updateUserGoalsAndPreferences(uid: string, goals?: Partial<UserGoals>, preferences?: Partial<UserPreferences>): Promise<void> {
    const profile = await UserRepository.getProfile(uid) || { name: 'User', email: '' };
    
    const updatedGoals = { ...(profile.goals || {}), ...goals } as UserGoals;
    const updatedPreferences = { ...(profile.preferences || {}), ...preferences } as UserPreferences;

    await UserRepository.saveProfile(uid, {
      ...profile,
      goals: updatedGoals,
      preferences: updatedPreferences
    });
  }

  static async getUserPersonalization(uid: string) {
    const profile = await UserRepository.getProfile(uid);
    return {
      goals: profile?.goals,
      preferences: profile?.preferences
    };
  }
}
