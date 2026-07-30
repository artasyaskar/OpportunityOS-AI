export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  taskType?: string;
  preferredProvider?: string;
  // Decoding controls (OpenAI/Groq/OpenRouter + Gemini all support these).
  // Used to reduce boilerplate and increase lexical variety in creative passes.
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
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
  retryCount?: number;
  cached?: boolean;
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
