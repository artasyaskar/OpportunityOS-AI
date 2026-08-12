const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const credPath = path.join(process.cwd(), 'credentials', 'vertex-sa.json');
console.log('Reading credentials from:', credPath);
const credsJson = JSON.parse(fs.readFileSync(credPath, 'utf8'));

process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

async function testGenAISdk() {
  try {
    console.log('Initializing GoogleGenAI SDK in Vertex AI mode...');
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || credsJson.project_id || 'gen-lang-client-0120944305',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });

    console.log('Calling ai.models.generateContent with gemini-2.5-flash...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello Gemini via Vertex AI SDK! Confirm in 1 short sentence that you are online.',
      config: {
        temperature: 0.1
      }
    });

    console.log('\n🎉 SUCCESS! Response from Google Gen AI SDK:\n', response.text);
  } catch (err) {
    console.error('❌ Google Gen AI SDK Error:\n', err);
  }
}

testGenAISdk();
