export interface SuccessOutcomeRecord {
  opportunityId: string;
  cgpa: number;
  ielts: number;
  publications: number;
  experienceYears: number;
  outcome: 'accepted' | 'rejected';
  feedbackRating: number; // Recommendation usefulness (1 to 5 stars)
}

export function saveAnonymizedOutcome(record: SuccessOutcomeRecord) {
  if (typeof window === 'undefined') return;
  try {
    const key = `success_outcomes_${record.opportunityId}`;
    const current = localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : [];
    
    // Anonymize by scrubbing any user names or IDs, keeping only stats coordinates
    current.push({
      cgpa: record.cgpa,
      ielts: record.ielts,
      publications: record.publications,
      experienceYears: record.experienceYears,
      outcome: record.outcome,
      feedbackRating: record.feedbackRating,
      timestamp: new Date().toISOString()
    });
    
    localStorage.setItem(key, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to log anonymized success outcome:', e);
  }
}

export function getSuccessCohortStats(oppId: string): { averageGpa: number; averageIelts: number; totalOutcomes: number } {
  if (typeof window === 'undefined') return { averageGpa: 3.8, averageIelts: 7.5, totalOutcomes: 12 };
  try {
    const key = `success_outcomes_${oppId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const records = JSON.parse(stored) as SuccessOutcomeRecord[];
      if (records.length > 0) {
        const total = records.length;
        const gpaSum = records.reduce((acc, r) => acc + r.cgpa, 0);
        const ieltsSum = records.reduce((acc, r) => acc + r.ielts, 0);
        return {
          averageGpa: parseFloat((gpaSum / total).toFixed(2)),
          averageIelts: parseFloat((ieltsSum / total).toFixed(1)),
          totalOutcomes: total
        };
      }
    }
  } catch (e) {}
  return { averageGpa: 3.8, averageIelts: 7.5, totalOutcomes: 12 }; // Baseline default cohort statistics
}
