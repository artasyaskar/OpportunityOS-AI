export interface ChangeEvent {
  opportunityId: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  version: number;
}

export const DEMO_EDIT_HISTORY: Record<string, ChangeEvent[]> = {
  'chevening-2025': [
    { opportunityId: 'chevening-2025', fieldChanged: 'deadline', oldValue: 'Nov 05, 2025', newValue: 'Nov 12, 2025', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), version: 2 },
    { opportunityId: 'chevening-2025', fieldChanged: 'funding', oldValue: 'Partial Stipend', newValue: 'Fully-Funded + Airfare', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), version: 1 }
  ],
  'daad-2025': [
    { opportunityId: 'daad-2025', fieldChanged: 'gpa_minimum', oldValue: '3.80', newValue: '3.70', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), version: 1 }
  ]
};

export function getOpportunityChangeHistory(oppId: string): ChangeEvent[] {
  return DEMO_EDIT_HISTORY[oppId] || [];
}

export function getFreshnessRating(oppId: string): { rating: number; label: string } {
  const history = getOpportunityChangeHistory(oppId);
  if (history.length === 0) {
    return { rating: 3, label: 'Stable (Verified 1mo ago)' };
  }

  const latest = new Date(history[0].timestamp).getTime();
  const diffDays = (Date.now() - latest) / (86400000);

  if (diffDays <= 1) {
    return { rating: 5, label: 'Fresh (Updated today)' };
  } else if (diffDays <= 3) {
    return { rating: 5, label: 'Highly Active (Updated 3d ago)' };
  } else if (diffDays <= 7) {
    return { rating: 4, label: 'Verified (Updated 1w ago)' };
  }
  return { rating: 3, label: 'Stable (Verified 2w ago)' };
}
