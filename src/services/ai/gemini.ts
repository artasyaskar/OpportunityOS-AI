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

interface DiscoveredModelCache {
  models: string[];
  expiresAt: number;
}

let modelCache: DiscoveredModelCache | null = null;

/**
 * Dynamic Model Discovery: Queries Google AI Studio API for available models on the user's API key.
 * Caches discovered valid models for 1 hour to prevent redundant HTTP requests and 404 guesswork.
 */
export async function discoverAvailableModels(apiKey: string, forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && modelCache && modelCache.expiresAt > now && modelCache.models.length > 0) {
    return modelCache.models;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      console.warn(`[Gemini Discovery] Model discovery HTTP ${res.status}. Falling back to default Flash line.`);
      return ['gemini-2.0-flash', 'gemini-1.5-flash'];
    }

    const data = await res.json();
    const discovered: string[] = [];

    if (Array.isArray(data.models)) {
      for (const m of data.models) {
        const supportedMethods = m.supportedGenerationMethods || [];
        if (supportedMethods.includes('generateContent')) {
          const cleanName = (m.name || '').replace(/^models\//, '');
          if (
            cleanName &&
            !cleanName.includes('text-embedding') &&
            !cleanName.includes('aqa') &&
            !cleanName.includes('imagen') &&
            !cleanName.includes('tts')
          ) {
            discovered.push(cleanName);
          }
        }
      }
    }

    // Sort to prioritize fast flash models first
    discovered.sort((a, b) => {
      if (a === 'gemini-2.0-flash' && b !== 'gemini-2.0-flash') return -1;
      if (a !== 'gemini-2.0-flash' && b === 'gemini-2.0-flash') return 1;
      if (a.includes('flash') && !b.includes('flash')) return -1;
      if (!a.includes('flash') && b.includes('flash')) return 1;
      return 0;
    });

    const result = discovered.length > 0 ? discovered : ['gemini-2.0-flash', 'gemini-1.5-flash'];
    modelCache = {
      models: result,
      expiresAt: now + 3600 * 1000, // 1 Hour Cache TTL
    };
    console.log(`[Gemini Discovery] Confirmed ${result.length} valid models:`, result.slice(0, 5).join(', '));
    return result;
  } catch (e) {
    console.warn('[Gemini Discovery] Model discovery request failed:', e);
    return ['gemini-2.0-flash', 'gemini-1.5-flash'];
  }
}

export class GeminiProvider extends AIProvider {
  name = 'gemini';

  constructor() {
    super();
  }

  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || '';
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
    const apiKey = this.getApiKey();
    const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true' || Boolean(process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || 'gen-lang-client-0120944305';
    const location = process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || 'us-central1';

    if (!apiKey && !useVertex) {
      throw new Error('Gemini Credentials missing. Configure GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env.local.');
    }

    const startTime = Date.now();

    // 1. TRY OFFICIAL @google/genai SDK IN VERTEX AI MODE (GCP $300 CREDITS)
    if (useVertex) {
      try {
        const path = await import('path');
        let googleAuthOptions: any = undefined;

        // Support inline JSON string (Vercel env var) or local file path
        const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
          (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{') ? process.env.GOOGLE_APPLICATION_CREDENTIALS : null);

        if (jsonEnv) {
          try {
            const parsedCreds = typeof jsonEnv === 'string' ? JSON.parse(jsonEnv) : jsonEnv;
            googleAuthOptions = { credentials: parsedCreds };
          } catch (jsonErr) {
            console.warn('[GeminiProvider] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', jsonErr);
          }
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
          if (!path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
          }
        }

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          vertexai: true,
          project: projectId,
          location: location,
          ...(googleAuthOptions ? { googleAuthOptions } : {})
        });

        const candidateModels = options?.model 
          ? [options.model] 
          : ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

        let lastVertexErr: any = null;
        for (const modelName of candidateModels) {
          try {
            const contents: any[] = [];
            if (options?.image) {
              contents.push({
                role: 'user',
                parts: [
                  { text: prompt },
                  { inlineData: { data: options.image.data, mimeType: options.image.mimeType } }
                ]
              });
            } else {
              contents.push(prompt);
            }

            const resp = await ai.models.generateContent({
              model: modelName,
              contents: contents.length === 1 && typeof contents[0] === 'string' ? contents[0] : contents,
              config: {
                temperature: options?.temperature ?? 0.1,
                maxOutputTokens: options?.maxTokens || 4096,
                ...(options?.topP !== undefined ? { topP: options.topP } : {}),
                ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
                ...(options?.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {})
              }
            });

            const content = resp.text || '';
            const usageMetadata = resp.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
            const latencyMs = Date.now() - startTime;

            return {
              content,
              metadata: {
                provider: 'gemini-vertex',
                model: modelName,
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0,
                latencyMs,
                costUSD: this.calculateCost(modelName, usageMetadata.promptTokenCount || 0, usageMetadata.candidatesTokenCount || 0)
              }
            };
          } catch (modelErr: any) {
            lastVertexErr = modelErr;
            const errMsg = String(modelErr?.message || modelErr);
            if (errMsg.includes('404') || errMsg.includes('NOT_FOUND')) {
              console.warn(`[GeminiProvider] Vertex model ${modelName} returned 404. Trying next candidate...`);
              continue;
            }
            throw modelErr;
          }
        }
        if (lastVertexErr) throw lastVertexErr;
      } catch (vertexErr: any) {
        console.warn(`[GeminiProvider] Vertex AI attempt failed: ${vertexErr?.message || vertexErr}. Falling back to AI Studio API Key.`);
      }
    }

    // 2. FALLBACK TO GOOGLE AI STUDIO API KEY REST API
    if (!apiKey) {
      throw new Error('Gemini API Key missing and Vertex AI unavailable.');
    }

    const discovered = await discoverAvailableModels(apiKey);
    const candidateStudioModels = options?.model 
      ? [options.model] 
      : [...discovered, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

    let lastStudioErr: any = null;

    for (const primaryModel of candidateStudioModels) {
      try {
        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                ...(options?.image ? [{
                  inlineData: {
                    data: options.image.data,
                    mimeType: options.image.mimeType
                  }
                }] : [])
              ]
            }
          ],
          generationConfig: {
            temperature: options?.temperature ?? 0.1,
            maxOutputTokens: options?.maxTokens || 4096,
            ...(options?.topP !== undefined ? { topP: options.topP } : {}),
            responseMimeType: options?.responseFormat === 'json' ? 'application/json' : 'text/plain'
          }
        };

        if (systemPrompt) {
          requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }]
          };
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          }
        );

        // 401 / 403: Invalid API Key / Unauthorized Project
        if (response.status === 401 || response.status === 403) {
          const errText = await response.text();
          throw new Error(`Gemini Authentication Error (${response.status}): ${errText}`);
        }

        // 429: Rate Limit / Quota Exceeded -> Fast Handoff
        if (response.status === 429) {
          const errText = await response.text();
          console.warn(`[Gemini] Hit HTTP 429 Quota Limit on "${primaryModel}". Fast failing over.`);
          throw new Error(`Gemini API failure: Status 429 - ${errText.slice(0, 200)}`);
        }

        // 404: Try next model candidate
        if (response.status === 404) {
          console.warn(`[Gemini] Model ${primaryModel} returned 404 in AI Studio. Trying next candidate...`);
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API failure (${primaryModel}): Status ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const usageMetadata = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };

        const metadata: AIResponseMetadata = {
          provider: this.name,
          model: primaryModel,
          promptTokens: usageMetadata.promptTokenCount,
          completionTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
          latencyMs,
          costUSD: this.calculateCost(primaryModel, usageMetadata.promptTokenCount, usageMetadata.candidatesTokenCount),
        };

        return { content, metadata };
      } catch (e: any) {
        lastStudioErr = e;
        if (e.message && e.message.includes('Status 429')) throw e;
        if (e.message && (e.message.includes('401') || e.message.includes('403'))) throw e;
        continue;
      }
    }

    if (lastStudioErr) throw lastStudioErr;
    throw new Error('All Gemini candidate models failed.');
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
      throw new Error(`Gemini JSON Parse Failure: ${e instanceof Error ? e.message : String(e)}. Content: ${response.content}`);
    }
  }
}
