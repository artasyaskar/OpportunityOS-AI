import { PipelineRepository, OpportunityApplication } from '../repositories/PipelineRepository';

export class PipelineService {
  static async getPipeline(uid: string): Promise<OpportunityApplication[]> {
    return await PipelineRepository.getPipeline(uid);
  }

  static async savePipeline(uid: string, pipeline: OpportunityApplication[]): Promise<void> {
    return await PipelineRepository.savePipeline(uid, pipeline);
  }
}
