
export interface MemoryFact {
  key: string;
  value: string;
  category: 'career_goals' | 'education' | 'skills' | 'past_feedback' | 'applications';
  timestamp: string;
  source: 'profile' | 'document_builder' | 'advisor';
}

const DEFAULT_FACTS: MemoryFact[] = [
  { key: 'dream_study', value: 'Wants to study AI in Germany/Europe', category: 'career_goals', timestamp: new Date().toISOString(), source: 'profile' },
  { key: 'undergrad_institution', value: 'NUST (National University of Sciences and Technology), Pakistan', category: 'education', timestamp: new Date().toISOString(), source: 'profile' },
  { key: 'target_gpa', value: '3.72 Cumulative GPA', category: 'education', timestamp: new Date().toISOString(), source: 'profile' },
  { key: 'core_skill_ml', value: 'Machine Learning & Python development experience', category: 'skills', timestamp: new Date().toISOString(), source: 'profile' },
];

export function getMemoryFacts(): MemoryFact[] {
  if (typeof window === 'undefined') return DEFAULT_FACTS;
  try {
    const stored = localStorage.getItem('ai_memory_facts');
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return DEFAULT_FACTS;
}

export function saveMemoryFacts(facts: MemoryFact[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ai_memory_facts', JSON.stringify(facts));
  } catch (e) {}
}

export function addMemoryFact(key: string, value: string, category: MemoryFact['category'], source: MemoryFact['source']) {
  const current = getMemoryFacts();
  
  // Filter out any duplicate keys to maintain clean memory coordinates
  const filtered = current.filter(f => f.key !== key);
  
  filtered.push({
    key,
    value,
    category,
    timestamp: new Date().toISOString(),
    source
  });
  
  saveMemoryFacts(filtered);

  // Future vector database pipeline hook:
  // if (getSubscription().state === 'ENTERPRISE') {
  //   syncToCloudVectorStore(key, value);
  // }
}
