const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

// Read service account key json file
const credPath = path.join(process.cwd(), 'credentials', 'vertex-sa.json');
const credsJsonStr = fs.readFileSync(credPath, 'utf8');
const credsObj = JSON.parse(credsJsonStr);

// Simulate Vercel environment variable
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = credsJsonStr;
process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true';
process.env.GOOGLE_CLOUD_PROJECT = 'gen-lang-client-0120944305';
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';

async function testVercelEnvSetup() {
  try {
    console.log('Testing Vercel GOOGLE_SERVICE_ACCOUNT_JSON environment variable setup...');
    
    // In Node.js / Vercel, GoogleAuth can use credentials object or GoogleGenAI accepts credentials
    let ai;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const parsedCreds = typeof process.env.GOOGLE_SERVICE_ACCOUNT_JSON === 'string'
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
        : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

      ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || parsedCreds.project_id,
        location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
        googleAuthOptions: {
          credentials: parsedCreds
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello Gemini! Confirm in 1 short sentence that Vercel GOOGLE_SERVICE_ACCOUNT_JSON env setup works perfectly.',
      config: { temperature: 0.1 }
    });

    console.log('\n🎉 SUCCESS! Response via GOOGLE_SERVICE_ACCOUNT_JSON:\n', response.text.trim());
  } catch (err) {
    console.error('❌ Error with GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
  }
}

testVercelEnvSetup();
