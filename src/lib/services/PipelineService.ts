import { PipelineRepository, OpportunityApplication } from '../repositories/PipelineRepository';

export class PipelineService {
  private static isPresentationMode(): boolean {
    return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_APP_MODE === 'demo' || process.env.NEXT_PUBLIC_APP_MODE === 'presentation';
  }

  private static getMockPipeline(): OpportunityApplication[] {
    return [
      {
        id: 'chevening-2025',
        title: 'Chevening Scholarship 2025',
        stage: 'preparing',
        deadline: '2025-11-02',
        matchScore: 92,
        documents: [
          { name: 'Statement of Purpose', status: 'draft', version: 1 },
          { name: 'Letter of Recommendation', status: 'missing', version: 0 },
        ],
      },
      {
        id: 'daad-epos',
        title: 'DAAD EPOS',
        stage: 'wishlist',
        deadline: '2026-01-15',
        matchScore: 88,
        documents: [],
      }
    ];
  }

  static async getPipeline(uid: string): Promise<OpportunityApplication[]> {
    if (this.isPresentationMode()) {
      return this.getMockPipeline();
    }
    return await PipelineRepository.getPipeline(uid);
  }

  static async savePipeline(uid: string, pipeline: OpportunityApplication[]): Promise<void> {
    if (this.isPresentationMode()) {
      return;
    }
    return await PipelineRepository.savePipeline(uid, pipeline);
  }
}
