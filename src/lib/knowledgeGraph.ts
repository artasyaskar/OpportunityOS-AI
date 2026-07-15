export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'country' | 'university' | 'lab' | 'mentor' | 'funding' | 'career';
  connections: string[];
}

export const KNOWLEDGE_GRAPH_DATA: Record<string, KnowledgeNode[]> = {
  'chevening-2025': [
    { id: 'uk', label: 'United Kingdom', type: 'country', connections: ['edinburgh_univ', 'oxford_univ'] },
    { id: 'edinburgh_univ', label: 'University of Edinburgh', type: 'university', connections: ['centre_ai_ethics', 'informatics_lab'] },
    { id: 'centre_ai_ethics', label: 'Centre for AI Ethics', type: 'lab', connections: ['prof_jane_smith'] },
    { id: 'prof_jane_smith', label: 'Prof. Jane Smith (Federated ML)', type: 'mentor', connections: ['chevening_award'] },
    { id: 'chevening_award', label: 'Chevening Stipend (£1,500/mo)', type: 'funding', connections: ['ai_director'] },
    { id: 'ai_director', label: 'Lead AI Ethics Director', type: 'career', connections: [] },
  ],
  'daad-2025': [
    { id: 'germany', label: 'Germany', type: 'country', connections: ['tum_univ'] },
    { id: 'tum_univ', label: 'Technical University of Munich', type: 'university', connections: ['tum_robotics_lab'] },
    { id: 'tum_robotics_lab', label: 'TUM Robotics Research Lab', type: 'lab', connections: ['prof_hans_meier'] },
    { id: 'prof_hans_meier', label: 'Prof. Hans Meier (Computer Vision)', type: 'mentor', connections: ['daad_stipend'] },
    { id: 'daad_stipend', label: 'DAAD Scholarship (€1,200/mo)', type: 'funding', connections: ['robotics_engineer'] },
    { id: 'robotics_engineer', label: 'Robotics Software Architect', type: 'career', connections: [] },
  ],
};

export function getOpportunityNodes(opportunityId: string): KnowledgeNode[] {
  return KNOWLEDGE_GRAPH_DATA[opportunityId] || [
    { id: 'global', label: 'Global Corridor', type: 'country', connections: ['target_univ'] },
    { id: 'target_univ', label: 'Target University Faculty', type: 'university', connections: ['research_group'] },
    { id: 'research_group', label: 'Research Group & Department', type: 'lab', connections: ['advisor_pi'] },
    { id: 'advisor_pi', label: 'Principal Advisor / PI', type: 'mentor', connections: ['scholarship_funding'] },
    { id: 'scholarship_funding', label: 'Sponsor Scholarship Funding', type: 'funding', connections: ['industry_career'] },
    { id: 'industry_career', label: 'Industry Career Outcomes', type: 'career', connections: [] },
  ];
}
