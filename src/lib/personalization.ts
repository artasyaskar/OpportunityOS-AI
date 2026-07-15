export interface PersonalizationPreferences {
  writingTone: 'academic' | 'professional' | 'narrative_story' | 'critical_pitch';
  targetCountries: string[];
  dreamUniversities: string[];
  preferredFunding: 'fully_funded' | 'partial_stipend' | 'tuition_only';
  researchInterests: string[];
}

const DEFAULT_PREFERENCES: PersonalizationPreferences = {
  writingTone: 'professional',
  targetCountries: ['Germany', 'United Kingdom', 'United States'],
  dreamUniversities: ['Technical University of Munich', 'University of Edinburgh', 'Oxford'],
  preferredFunding: 'fully_funded',
  researchInterests: ['Machine Learning', 'AI Ethics', 'Computer Vision'],
};

export function getPersonalizationPrefs(): PersonalizationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem('user_personalization');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return DEFAULT_PREFERENCES;
}

export function savePersonalizationPrefs(prefs: PersonalizationPreferences) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('user_personalization', JSON.stringify(prefs));
  } catch (e) {}
}
