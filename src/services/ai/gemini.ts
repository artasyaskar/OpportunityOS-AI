import { AIProvider, AIResponse, AIRequestOptions, AIResponseMetadata } from './provider';

export class GeminiProvider extends AIProvider {
  name = 'gemini';
  private apiKey: string;
  private defaultModel = 'gemini-1.5-flash';
  private defaultReasoningModel = 'gemini-1.5-flash';

  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY || '';
  }

  private getModel(options?: AIRequestOptions): string {
    if (options?.model) return options.model;
    if (options?.responseFormat === 'json') return this.defaultReasoningModel;
    return this.defaultModel;
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const isPro = model.includes('pro');
    const inputRate = isPro ? 1.25 / 1000000 : 0.075 / 1000000;
    const outputRate = isPro ? 5.00 / 1000000 : 0.30 / 1000000;
    return (promptTokens * inputRate) + (completionTokens * outputRate);
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    if (!this.apiKey) {
      throw new Error('Gemini API Key is missing. Configure GEMINI_API_KEY.');
    }

    const model = this.getModel(options);
    const contents = [];
    
    // In Gemini, system prompt can be passed in systemInstruction field
    const requestBody: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        maxOutputTokens: options?.maxTokens,
        responseMimeType: options?.responseFormat === 'json' ? 'application/json' : 'text/plain'
      }
    };

    if (systemPrompt) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const startTime = Date.now();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API failure: Status ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

    const metadata: AIResponseMetadata = {
      provider: this.name,
      model,
      promptTokens: usageMetadata.promptTokenCount,
      completionTokens: usageMetadata.candidatesTokenCount,
      totalTokens: usageMetadata.totalTokenCount,
      latencyMs,
      costUSD: this.calculateCost(model, usageMetadata.promptTokenCount, usageMetadata.candidatesTokenCount),
    };

    return { content, metadata };
  }

  async generateJSON<T>(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<T>> {
    const adjustedOptions = {
      ...options,
      responseFormat: 'json' as const,
    };
    const response = await this.generateText(prompt, systemPrompt, adjustedOptions);
    try {
      const parsed = JSON.parse(response.content) as T;
      return {
        content: parsed,
        metadata: response.metadata,
      };
    } catch (e) {
      throw new Error(`Gemini JSON Parse Failure: ${e instanceof Error ? e.message : String(e)}. Content: ${response.content}`);
    }
  }
}
