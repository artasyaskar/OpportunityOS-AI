// Opportunity Score calculation engine
// Proprietary scoring algorithm for OpportunityOS AI

export interface ScoringInputs {
  education: number;      // GPA / degree quality (0-100)
  experience: number;     // Years and relevance (0-100)
  skills: number;         // Skill match percentage (0-100)
  achievements: number;   // Awards, publications etc (0-100)
  profileCompleteness: number; // How complete the profile is (0-100)
  applicationActivity: number; // Active applications (0-100)
}

export const calculateOpportunityScore = (inputs: ScoringInputs): number => {
  const weights = {
    education: 0.25,
    experience: 0.20,
    skills: 0.20,
    achievements: 0.15,
    profileCompleteness: 0.10,
    applicationActivity: 0.10,
  };

  const weighted =
    inputs.education * weights.education +
    inputs.experience * weights.experience +
    inputs.skills * weights.skills +
    inputs.achievements * weights.achievements +
    inputs.profileCompleteness * weights.profileCompleteness +
    inputs.applicationActivity * weights.applicationActivity;

  return Math.round(weighted);
};

export const calculateReadinessScore = (
  profileComplete: boolean,
  resumeUploaded: boolean,
  essaysComplete: number,
  totalEssays: number
): number => {
  let score = 0;
  if (profileComplete) score += 40;
  if (resumeUploaded) score += 30;
  if (totalEssays > 0) score += Math.round((essaysComplete / totalEssays) * 30);
  return Math.min(score, 100);
};

export const calculatePortfolioHealth = (
  applications: Array<{ status: string; successProbability?: number }>
): number => {
  if (!applications.length) return 0;

  const statusWeights: Record<string, number> = {
    accepted: 100,
    interview: 75,
    applied: 50,
    draft: 25,
    rejected: 10,
  };

  const avgStatus =
    applications.reduce(
      (sum, app) => sum + (statusWeights[app.status] || 0),
      0
    ) / applications.length;

  const diversityBonus = Math.min(applications.length * 5, 20);
  return Math.min(Math.round(avgStatus + diversityBonus), 100);
};

export const calculateSuccessProbabilityAvg = (
  applications: Array<{ successProbability?: number }>
): number => {
  const withProb = applications.filter(a => a.successProbability !== undefined);
  if (!withProb.length) return 0;
  return Math.round(
    withProb.reduce((sum, a) => sum + (a.successProbability || 0), 0) /
      withProb.length
  );
};

export const getScoreLabel = (score: number): { label: string; color: string } => {
  if (score >= 85) return { label: 'Exceptional', color: '#10b981' };
  if (score >= 70) return { label: 'Strong', color: '#3b82f6' };
  if (score >= 55) return { label: 'Good', color: '#8b5cf6' };
  if (score >= 40) return { label: 'Developing', color: '#f59e0b' };
  return { label: 'Needs Work', color: '#ef4444' };
};

export const getProbabilityColor = (prob: number): string => {
  if (prob >= 70) return '#10b981';
  if (prob >= 50) return '#3b82f6';
  if (prob >= 35) return '#f59e0b';
  return '#ef4444';
};

export const getProbabilityLabel = (prob: number): string => {
  if (prob >= 70) return 'High Chance';
  if (prob >= 50) return 'Good Chance';
  if (prob >= 35) return 'Moderate';
  return 'Challenging';
};
