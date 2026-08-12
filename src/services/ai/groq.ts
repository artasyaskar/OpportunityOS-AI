import { AIProvider, AIResponse, AIRequestOptions, AIResponseMetadata } from './provider';

function cleanAndParseJSON(input: any): any {
  if (typeof input === 'object' && input !== null) return input;
  const text = typeof input === 'string' ? input : String(input || '');
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch (e) {}
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = trimmed.match(jsonBlockRegex);
  if (match && match[1]) { try { return JSON.parse(match[1].trim()); } catch (e) {} }
  const genericBlockRegex = /```\s*([\s\S]*?)\s*```/;
  const genericMatch = trimmed.match(genericBlockRegex);
  if (genericMatch && genericMatch[1]) { try { return JSON.parse(genericMatch[1].trim()); } catch (e) {} }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch (e) {}
  }
  const startArr = trimmed.indexOf('[');
  const endArr = trimmed.lastIndexOf(']');
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
    try { return JSON.parse(trimmed.slice(startArr, endArr + 1)); } catch (e) {}
  }
  throw new Error("No parseable JSON structure found");
}

export class GroqProvider extends AIProvider {
  name = 'groq';
  private apiKey: string;
  private defaultModel = 'llama-3.1-8b-instant';
  private defaultReasoningModel = 'llama-3.3-70b-versatile';

  constructor() {
    super();
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  private getModel(options?: AIRequestOptions): string {
    if (options?.model) return options.model;
    if (options?.responseFormat === 'json') return this.defaultReasoningModel;
    return this.defaultModel;
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Estimations based on standard Groq Llama 3 pricing
    const isLlama70b = model.includes('70b');
    const inputRate = isLlama70b ? 0.59 / 1000000 : 0.05 / 1000000;
    const outputRate = isLlama70b ? 0.79 / 1000000 : 0.08 / 1000000;
    return (promptTokens * inputRate) + (completionTokens * outputRate);
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    if (!this.apiKey) {
      throw new Error('Groq API Key is missing. Configure GROQ_API_KEY.');
    }

    const model = this.getModel(options);
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const startTime = Date.now();
    
    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        top_p: options?.topP ?? 0.9,
        frequency_penalty: options?.frequencyPenalty ?? 0.4,
        presence_penalty: options?.presencePenalty ?? 0.3,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    // 429 Rate Limit backoff retry
    if (response.status === 429) {
      console.warn('[Groq] Hit HTTP 429 Rate Limit. Retrying in 1.2s...');
      await new Promise(r => setTimeout(r, 1200));
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP ?? 0.9,
          frequency_penalty: options?.frequencyPenalty ?? 0.4,
          presence_penalty: options?.presencePenalty ?? 0.3,
          response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API failure: Status ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const content = data.choices[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const metadata: AIResponseMetadata = {
      provider: this.name,
      model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latencyMs,
      costUSD: this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens),
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
      const parsed = cleanAndParseJSON(response.content) as T;
      return {
        content: parsed,
        metadata: response.metadata,
      };
    } catch (e) {
      throw new Error(`Groq JSON Parse Failure: ${e instanceof Error ? e.message : String(e)}. Content: ${response.content}`);
    }
  }
}
