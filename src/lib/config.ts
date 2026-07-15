export const config = {
  get geminiApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Missing GEMINI_API_KEY environment variable');
    return key;
  },
  get groqApiKey() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('Missing GROQ_API_KEY environment variable');
    return key;
  },
  get firebaseProjectId() {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'opportunityos-ai';
  },
  get r2() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET || 'opportunityos';
    
    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('R2 credentials missing, using local/mock storage if fallback configured');
    }
    
    return { accountId, accessKeyId, secretAccessKey, bucket };
  },
  flags: {
    useMockStorage: process.env.NEXT_PUBLIC_USE_MOCK_STORAGE === 'true',
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
    enableAi: process.env.NEXT_PUBLIC_ENABLE_AI !== 'false',
  }
};
