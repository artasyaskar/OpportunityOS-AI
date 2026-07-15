import { AIProvider, AIResponse, AIRequestOptions, AIResponseMetadata } from './provider';
import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';
import { logAgentExecution } from '@/lib/firestore';
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
    options?: { format?: 'text' | 'json'; taskType?: TaskType; cacheKey?: string; forcePremium?: boolean; userId?: string }
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

    // 1.5. Check Credits (if userId provided)
    if (options?.userId) {
      const balance = await CreditManager.getBalance(options.userId);
      const cost = CreditManager.COSTS[options.taskType || 'general'];
      if (balance < cost) {
        throw new InsufficientCreditsError();
      }
    }

    // 2. Fallback Sequence (Gemini Flash -> Groq)
    const primary = 'gemini';
    const fallback = 'groq';

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!groqKey && !geminiKey) {
      throw new Error(`The AI is temporarily unavailable. Please try again in a few moments.`);
    }

    const providerSequence = [primary, fallback];
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
      // ONLY 1 ATTEMPT PER PROVIDER
      const start = Date.now();
      try {
        const responsePromise = operation(provider);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI Request Timeout (15s)')), 15000)
        );

        const result = await Promise.race([responsePromise, timeoutPromise]);

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

        logAgentExecution(
          agentName,
          result.metadata.provider,
          result.metadata.model,
          typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
          result.metadata.totalTokens,
          Date.now() - start
        ).catch(console.error);

        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`[AI Router] Provider ${providerName} failed: ${error.message}`);
        
        // Log error telemetry
        logAgentExecution(
          `${agentName}-error`,
          'anonymous-telemetry',
          `Provider: ${providerName}`,
          `Error: ${error.message}`,
          0,
          Date.now() - start
        ).catch(() => {});
        
        // Continue to the next provider
      }
    }
    
    // 3. Graceful Error Fallback
    console.error(`[AI Router] All providers failed for agent "${agentName}". Last error: ${lastError?.message}`);
    throw new Error(`The AI is temporarily unavailable. Please try again in a few moments.`);
  }
}

export const aiRouter = new AIRouter();
export default aiRouter;
