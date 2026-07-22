import { AIProvider, AIResponse, AIRequestOptions, AIResponseMetadata } from './provider';

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<string>> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API Key is missing.');
    }

    const model = this.getModel(options);
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const startTime = Date.now();
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'OpportunityOS AI'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API failure: Status ${response.status} - ${errText}`);
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
      costUSD: 0,
      cached: false,
      retryCount: 0
    };

    return { content, metadata };
  }

  async generateJSON<T>(
    prompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<T>> {
    const response = await this.generateText(prompt, systemPrompt, { ...options, responseFormat: 'json' });
    try {
      // Remove potential markdown code blocks if the model outputs them despite json_object format
      let cleaned = response.content.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      
      const parsed = JSON.parse(cleaned.trim());
      return {
        content: parsed,
        metadata: response.metadata
      };
    } catch (e) {
      throw new Error(`Failed to parse OpenRouter JSON response: ${e}`);
    }
  }

  async generateFromImage<T>(
    prompt: string,
    imageData: string,
    mimeType: string,
    systemPrompt?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse<T>> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API Key is missing.');
    }

    const model = options?.model || process.env.OPENROUTER_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    const base64Url = imageData.startsWith('data:') ? imageData : `data:${mimeType};base64,${imageData}`;
    
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: base64Url } }
      ]
    });

    const startTime = Date.now();
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'OpportunityOS AI'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens || 4000,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Vision API failure: Status ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const contentStr = data.choices[0]?.message?.content || '';
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const metadata: AIResponseMetadata = {
      provider: this.name,
      model,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      latencyMs,
      costUSD: 0,
      cached: false,
      retryCount: 0
    };

    if (options?.responseFormat === 'json') {
      try {
        let cleaned = contentStr.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        const parsed = JSON.parse(cleaned.trim());
        return { content: parsed as any, metadata };
      } catch (e) {
        throw new Error(`Failed to parse OpenRouter JSON response: ${e}`);
      }
    }

    return { content: contentStr as any, metadata };
  }

  private getModel(options?: AIRequestOptions): string {
    if (options?.model) return options.model;
    
    switch(options?.taskType) {
      case 'vision':
        return process.env.OPENROUTER_VISION_MODEL || 'nvidia/nemotron-nano-12b-v2-vl:free';
      case 'complex_reasoning':
        return process.env.OPENROUTER_REASONING_MODEL || 'deepseek/deepseek-r1:free';
      case 'general':
      case 'fast_chat':
      case 'document_generation':
      default:
        return process.env.OPENROUTER_CHAT_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
    }
  }
}
