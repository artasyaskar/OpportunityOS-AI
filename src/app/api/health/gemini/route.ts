import { NextResponse } from 'next/server';
import { discoverAvailableModels, GeminiProvider } from '@/services/ai/gemini';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    return NextResponse.json({
      status: 'missing_api_key',
      message: 'GEMINI_API_KEY is not configured in .env.local',
      apiKeyConfigured: false,
      sdk: '@google/generative-ai (v0.24.1) via v1beta REST API',
      discoveredModels: [],
    }, { status: 400 });
  }

  const startTime = Date.now();
  try {
    // 1. Get cached models or discover
    const discoveredModels = await discoverAvailableModels(apiKey, false);

    // 2. Perform fast probe (1-word generation)
    const gemini = new GeminiProvider();
    const probeResponse = await gemini.generateText('Respond with one word: Hello');
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      apiKeyConfigured: true,
      sdk: '@google/generative-ai (v0.24.1) via v1beta REST API',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      primaryModel: probeResponse.metadata.model,
      discoveredModels: discoveredModels.slice(0, 8),
      probeResponse: probeResponse.content.trim(),
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errMessage = error?.message || String(error);

    let status = 'degraded';
    if (errMessage.includes('401') || errMessage.includes('403') || errMessage.includes('Authentication')) {
      status = 'invalid_api_key';
    } else if (errMessage.includes('429') || errMessage.includes('Quota')) {
      status = 'rate_limited';
    }

    return NextResponse.json({
      status,
      apiKeyConfigured: true,
      sdk: '@google/generative-ai (v0.24.1) via v1beta REST API',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      error: errMessage.slice(0, 300),
      latencyMs,
      timestamp: new Date().toISOString(),
    }, { status: status === 'invalid_api_key' ? 401 : 200 });
  }
}
