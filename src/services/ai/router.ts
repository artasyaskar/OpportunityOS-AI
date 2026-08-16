import { AIProvider, AIResponse, AIRequestOptions, AIResponseMetadata } from './provider';
import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';
import { OpenRouterProvider } from './openrouter';
import { adminDb } from '@/lib/firebase-admin';
import { CreditManager, InsufficientCreditsError } from '@/lib/services/CreditManager';

type TaskType = 'complex_reasoning' | 'fast_chat' | 'document_generation' | 'general' | 'vision' | 'resume_parsing';

const ROUTES: Record<string, string[]> = {
  VISION: ['gemini', 'openrouter'],
  RESUME_PARSING: ['gemini', 'groq', 'openrouter'],
  DOCUMENT_GENERATION: ['gemini', 'groq', 'openrouter'],
  GENERAL_CHAT: ['gemini', 'groq', 'openrouter'],
  COMPLEX_REASONING: ['gemini', 'groq', 'openrouter'],
  DEFAULT: ['gemini', 'groq', 'openrouter']
};

interface ProviderHealth {
  status: 'healthy' | 'disabled';
  latencySumMs: number;
  successCount: number;
  callsCount: number;
  consecutiveFailures: number;
  disabledUntil: number | null;
}

class AIRouter {
  private providers: Record<string, AIProvider> = {};
  private cache: Map<string, { result: any, timestamp: number }> = new Map();
  private health: Record<string, ProviderHealth> = {};

  constructor() {
    this.providers.groq = new GroqProvider();
    this.providers.gemini = new GeminiProvider();
    this.providers.openrouter = new OpenRouterProvider();

    // Initialize health state
    Object.keys(this.providers).forEach(p => {
      this.health[p] = { status: 'healthy', latencySumMs: 0, successCount: 0, callsCount: 0, consecutiveFailures: 0, disabledUntil: null };
    });
  }

  private getProvider(name: string): AIProvider {
    const provider = this.providers[name];
    if (!provider) {
      throw new Error(`AI Provider "${name}" is not registered in the system.`);
    }
    return provider;
  }

  private updateHealth(provider: string, success: boolean, latencyMs: number = 0, statusCode?: number) {
    const h = this.health[provider];
    if (!h) return;

    h.callsCount++;
    if (success) {
      h.successCount++;
      h.consecutiveFailures = 0;
      h.latencySumMs += latencyMs;
      h.status = 'healthy';
      h.disabledUntil = null;
    } else {
      h.consecutiveFailures++;
      // Exponential cooldown: 30s -> 60s -> 120s -> 300s
      const cooldownSecs = Math.min(300, 30 * Math.pow(2, Math.max(0, h.consecutiveFailures - 1)));
      h.status = 'disabled';
      h.disabledUntil = Date.now() + cooldownSecs * 1000;
      console.warn(`[Health Manager] Provider ${provider} disabled for ${cooldownSecs}s (Failure #${h.consecutiveFailures}${statusCode ? `, HTTP ${statusCode}` : ''}).`);
    }
  }

  private isProviderHealthy(provider: string): boolean {
    const h = this.health[provider];
    if (!h) return false;
    if (h.status === 'disabled' && h.disabledUntil) {
      if (Date.now() > h.disabledUntil) {
        h.status = 'healthy'; // Recover
        h.consecutiveFailures = 0;
        h.disabledUntil = null;
        console.log(`[Health Manager] Provider ${provider} recovered from cooldown.`);
        return true;
      }
      return false;
    }
    return true;
  }

  getPrimaryHealthyProvider(taskType: string = 'document_generation'): string {
    const key = (taskType || 'DEFAULT').toUpperCase();
    const sequence = ROUTES[key] || ROUTES.DEFAULT;

    // Adaptive Selection: Prefer a healthy provider with consecutive successes
    for (const name of sequence) {
      const h = this.health[name];
      if (h && h.status === 'healthy' && h.successCount >= 2 && h.consecutiveFailures === 0) {
        if (name === 'groq' && process.env.GROQ_API_KEY) return name;
      }
    }

    for (const name of sequence) {
      if (name === 'groq' && !process.env.GROQ_API_KEY) continue;
      if (name === 'gemini' && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GCP_PROJECT_ID) continue;
      if (name === 'openrouter' && !process.env.OPENROUTER_API_KEY) continue;
      if (this.isProviderHealthy(name)) return name;
    }
    return 'groq';
  }

  async runWithRetry<T>(
    agentName: string,
    operation: (provider: AIProvider) => Promise<AIResponse<T>>,
    options?: { format?: 'text' | 'json'; taskType?: TaskType; cacheKey?: string; forcePremium?: boolean; userId?: string; preferredProvider?: string; image?: { data: string; mimeType: string } }
  ): Promise<AIResponse<T>> {
    // 1. Check Cache
    if (options?.cacheKey) {
      const cached = this.cache.get(options.cacheKey);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) { // 1 hour cache
        console.log(`[AI Router] Cache hit for ${agentName}`);
        return {
          content: cached.result,
          metadata: { provider: 'cache', model: 'cache', promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0, costUSD: 0, cached: true, retryCount: 0 }
        };
      }
    }

    // Pre-flight credit check
    if (options?.userId) {
      const affordable = await CreditManager.canAfford(options.userId, options.taskType as any);
      if (!affordable) {
        throw new InsufficientCreditsError();
      }
    }

    // Determine Route Sequence based on Capability
    let providerSequence = ROUTES.DEFAULT;
    if (options?.image) {
      providerSequence = ROUTES.VISION;
    } else if (options?.taskType === 'resume_parsing') {
      providerSequence = ROUTES.RESUME_PARSING;
    } else if (options?.taskType === 'complex_reasoning') {
      providerSequence = ROUTES.COMPLEX_REASONING;
    } else if (options?.taskType === 'fast_chat' || options?.taskType === 'general') {
      providerSequence = ROUTES.GENERAL_CHAT;
    }

    if (options?.forcePremium) {
      providerSequence = ['gemini', 'groq', 'openrouter'];
    }

    // Provider Locking: If a preferredProvider is specified and healthy, prioritize it
    if (options?.preferredProvider && this.isProviderHealthy(options.preferredProvider)) {
      providerSequence = [options.preferredProvider, ...providerSequence.filter(p => p !== options.preferredProvider)];
    }

    const fallbackTrace: { provider: string, status: string, attempt: number, latencyMs: number, error?: string }[] = [];
    let lastError: Error | null = null;
    const overallStart = Date.now();

    for (const providerName of providerSequence) {
      if (providerName === 'groq' && !process.env.GROQ_API_KEY) continue;
      if (providerName === 'gemini' && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GCP_PROJECT_ID) continue;
      if (providerName === 'openrouter' && !process.env.OPENROUTER_API_KEY) continue;

      if (!this.isProviderHealthy(providerName)) {
        fallbackTrace.push({ provider: providerName, status: 'Skipped (Cooldown)', attempt: 0, latencyMs: 0 });
        continue;
      }

      let provider: AIProvider;
      try {
        provider = this.getProvider(providerName);
      } catch {
        continue;
      }

      let attempt = 0;
      // Instant failover for Gemini/OpenRouter to speed up fallback, only retry Groq which is fast
      const maxAttempts = providerName === 'groq' ? 2 : 1;
      let result: AIResponse<T> | null = null;

      while (attempt < maxAttempts) {
        attempt++;
        const start = Date.now();
        try {
          const responsePromise = operation(provider);
          // Generous timeouts: 60s for document generation/complex reasoning/parsing, 60s for vision, 30s for general chat
          const timeoutMs = options?.image
            ? 60000
            : (options?.taskType === 'document_generation' || options?.taskType === 'resume_parsing' || options?.taskType === 'complex_reasoning')
              ? 60000
              : 30000;
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI Request Timeout (${timeoutMs / 1000}s)`)), timeoutMs)
          );

          result = await Promise.race([responsePromise, timeoutPromise]);
          result.metadata.retryCount = attempt - 1;
          result.metadata.cached = false;

          const latency = Date.now() - start;
          this.updateHealth(providerName, true, latency);
          fallbackTrace.push({ provider: providerName, status: 'Success', attempt, latencyMs: latency });

          if (options?.userId && result) {
            try {
              await CreditManager.deductCredits(options.userId, options.taskType as any);
            } catch (deductErr) {
              console.warn('[AI Router] Credit deduction error:', deductErr);
            }
          }
          break; // Success
        } catch (error: any) {
          const duration = Date.now() - start;
          lastError = error;

          let statusCode = 500;
          const msg = error.message || '';
          if (msg.includes('Status 503') || msg.includes('Overloaded')) statusCode = 503;
          if (msg.includes('Status 429')) statusCode = 429;

          this.updateHealth(providerName, false, duration, statusCode);
          fallbackTrace.push({ provider: providerName, status: 'Failed', attempt, latencyMs: duration, error: error.message });

          const isPermanentForProvider =
            msg.includes('API Error') ||
            msg.includes('Status 400') ||
            msg.includes('Status 401') ||
            msg.includes('Status 403') ||
            msg.includes('Status 404') ||
            statusCode === 429 ||
            statusCode === 503 ||
            msg.includes('unexpected data format') ||
            msg.includes('JSON Parse Failure');

          if (isPermanentForProvider || maxAttempts === 1) {
            break; // Failover to next provider immediately
          }

          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!result) continue; // Failed completely, try next provider in sequence

      // Log latency table
      this.printLatencyTrace(agentName, fallbackTrace);

      // Log fallback trace to infrastructure_logs if there was any error
      if (fallbackTrace.some(t => t.status === 'Failed') && options?.userId) {
        adminDb.collection('infrastructure_logs').add({
          agentName,
          userId: options.userId,
          trace: fallbackTrace,
          finalProvider: result.metadata.provider,
          timestamp: new Date()
        }).catch(console.error);
      }

      // Cache the successful result
      if (options?.cacheKey) {
        this.cache.set(options.cacheKey, { result: result.content, timestamp: Date.now() });
      }

      // Deduct credits
      if (options?.userId) {
        try {
          await CreditManager.deductCredits(options.userId, options.taskType as any);
        } catch (err) {
          console.error('Failed to deduct credits:', err);
        }
      }

      try {
        adminDb.collection('agent_logs').add({
          agentName,
          userId: options?.userId || 'system',
          provider: result.metadata.provider || 'gemini',
          model: result.metadata.model || 'gemini-2.5-flash',
          latencyMs: result.metadata.latencyMs || (Date.now() - overallStart),
          tokensUsed: result.metadata.totalTokens || 0,
          retryCount: result.metadata.retryCount || 0,
          status: 'success',
          action: `Executed ${agentName} (${options?.taskType || 'reasoning'})`,
          timestamp: new Date()
        }).catch(console.error);
      } catch (err) {
        console.error('Failed to log agent execution:', err);
      }

      return result;
    }

    // 3. Graceful Error Fallback
    this.printLatencyTrace(agentName, fallbackTrace);

    try {
      adminDb.collection('agent_logs').add({
        agentName,
        userId: options?.userId || 'system',
        provider: 'failed',
        model: 'n/a',
        latencyMs: Date.now() - overallStart,
        tokensUsed: 0,
        retryCount: fallbackTrace.length,
        status: 'failed',
        action: `Attempted ${agentName} (${options?.taskType || 'reasoning'})`,
        timestamp: new Date()
      }).catch(console.error);
    } catch (err) {
      console.error('Failed to log failed agent execution:', err);
    }

    if (options?.userId) {
      adminDb.collection('infrastructure_logs').add({
        agentName,
        userId: options.userId,
        trace: fallbackTrace,
        finalProvider: 'FAILED',
        timestamp: new Date()
      }).catch(console.error);
    }

    console.error(`[AI Router] All providers failed for agent "${agentName}". Last error: ${lastError?.message}`);
    throw new Error(`The AI is temporarily unavailable. Please try again in a few moments.`);
  }

  private printLatencyTrace(agentName: string, trace: any[]) {
    console.log(`\n=== AI Router Trace: ${agentName} ===`);
    console.table(trace.map(t => ({
      Provider: t.provider,
      Status: t.status,
      Latency: `${(t.latencyMs / 1000).toFixed(2)}s`,
      Error: t.error ? (t.error.length > 50 ? t.error.substring(0, 47) + '...' : t.error) : '-'
    })));
    console.log('========================================\n');
  }

  public getHealthMetrics() {
    return this.health;
  }
}

export const aiRouter = new AIRouter();
