export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  image?: {
    data: string;
    mimeType: string;
  };
}

export interface AIResponseMetadata {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  costUSD: number;
}

export interface AIResponse<T = string> {
  content: T;
  metadata: AIResponseMetadata;
}

export abstract class AIProvider {
  abstract name: string;
  
  abstract generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>>;

  abstract generateJSON<T>(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<T>>;
}
