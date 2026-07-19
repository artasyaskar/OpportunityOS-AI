import { AIProvider, AIResponse, AIRequestOptions, AIResponseMetadata } from './provider';
import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';
import { adminDb } from '@/lib/firebase-admin';
import { CreditManager, InsufficientCreditsError } from '@/lib/services/CreditManager';

type TaskType = 'complex_reasoning' | 'fast_chat' | 'document_generation' | 'general';

class AIRouter {
  private providers: Record<string, AIProvider> = {};
  private cache: Map<string, { result: any, timestamp: number }> = new Map();

  constructor() {
    this.providers.groq = new GroqProvider();
    this.providers.gemini = new GeminiProvider();
  }

  private getProvider(name: string): AIProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`AI Provider "${name}" is not registered in the system.`);
    }
    return provider;
  }

  async runWithRetry<T>(
    agentName: string,
    operation: (provider: AIProvider) => Promise<AIResponse<T>>,
    options?: { format?: 'text' | 'json'; taskType?: TaskType; cacheKey?: string; forcePremium?: boolean; userId?: string; image?: { data: string; mimeType: string } }
  ): Promise<AIResponse<T>> {
    // 1. Check Cache
    if (options?.cacheKey) {
      const cached = this.cache.get(options.cacheKey);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) { // 1 hour cache
        console.log(`[AI Router] Cache hit for ${agentName}`);
        return {
          content: cached.result,
          metadata: { provider: 'cache', model: 'cache', promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0, costUSD: 0 }
        };
      }
    }


    // Credits are checked and deducted after successful generation via CreditManager.deductCredits

    let providerSequence: string[] = ['groq', 'gemini'];

    // Intelligent Routing Engine
    if (options?.taskType === 'document_generation' || options?.image) {
      providerSequence = ['gemini', 'groq']; // High-complexity generative or multimodal tasks
    } else if (options?.taskType === 'complex_reasoning' || options?.taskType === 'fast_chat') {
      providerSequence = ['groq', 'gemini']; // Fast analytical / reasoning tasks
    }

    if (options?.forcePremium) {
      providerSequence = ['gemini'];
    }

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!groqKey && !geminiKey) {
      throw new Error(`The AI is temporarily unavailable. Please try again in a few moments.`);
    }

    // Ensure the system doesn't crash if keys are missing; the sequence loop will skip providers without keys
    let lastError: Error | null = null;

    for (const providerName of providerSequence) {
      if (providerName === 'groq' && !groqKey) continue;
      if (providerName === 'gemini' && !geminiKey) continue;

      let provider: AIProvider;
      try {
        provider = this.getProvider(providerName);
      } catch {
        continue;
      }
      const overallStart = Date.now();
      let attempt = 0;
      // Implement specific retry counts requested for hackathon stability
      const maxAttempts = providerName === 'gemini' ? 3 : 1;
      let lastAttemptError: any = null;
      let result: AIResponse<T> | null = null;

      while (attempt < maxAttempts) {
        attempt++;
        const start = Date.now();
        try {
          const responsePromise = operation(provider);
          const timeoutMs = options?.image ? 60000 : 30000;
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI Request Timeout (${timeoutMs / 1000}s)`)), timeoutMs)
          );

          result = await Promise.race([responsePromise, timeoutPromise]);
          break; // Success, break retry loop
        } catch (error: any) {
          lastAttemptError = error;
          console.error(`[AI Router] Provider ${providerName} attempt ${attempt} failed: ${error.message}`);

          // Fast-Fail for known unrecoverable API errors, Timeouts, or persistent JSON hallucinations
          if (error.message.includes('API Error') || error.message.includes('Status 400') || error.message.includes('unexpected data format') || error.message.includes('JSON Parse Failure')) {
             if (attempt >= maxAttempts) {
               console.log(`[AI Router] Failing over to next provider.`);
               break;
             }
          }

          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.log(`[AI Router] Waiting ${delay}ms before retrying ${providerName}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!result) {
        lastError = lastAttemptError;
        continue; // Both attempts failed, fallback to next provider
      }

      // Cache the successful result
      if (options?.cacheKey) {
        this.cache.set(options.cacheKey, { result: result.content, timestamp: Date.now() });
      }

      // Deduct credits on successful generation (not cache hit)
      if (options?.userId) {
        try {
          await CreditManager.deductCredits(options.userId, options.taskType);
        } catch (err) {
          console.error('Failed to deduct credits:', err);
        }
      }

      if (options?.userId) {
        adminDb.collection('agent_logs').add({
          agentName,
          userId: options.userId,
          provider: result.metadata.provider,
          model: result.metadata.model,
          input: 'System Prompt & Input', // omitted raw input for privacy
          output: typeof result.content === 'string' ? result.content.slice(0, 500) : JSON.stringify(result.content).slice(0, 500),
          tokensUsed: result.metadata.totalTokens,
          duration: Date.now() - overallStart,
          timestamp: new Date()
        }).catch(console.error);
      }

      return result;
      // Let loop continue to fallback provider
    }

    // 3. Graceful Error Fallback
    console.error(`[AI Router] All providers failed for agent "${agentName}". Last error: ${lastError?.message}`);
    throw new Error(`The AI is temporarily unavailable. Please try again in a few moments.`);
  }
}

export const aiRouter = new AIRouter();
export default aiRouter;
