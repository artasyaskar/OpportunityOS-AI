const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const credPath = path.join(process.cwd(), 'credentials', 'vertex-sa.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
const credsJson = JSON.parse(fs.readFileSync(credPath, 'utf8'));

async function testGeminiKeyAndVertexAuth() {
  console.log('====================================================');
  console.log('  OPPORTUNITYOS-AI: GEMINI & VERTEX AI AUTH TEST');
  console.log('====================================================');
  console.log('Project ID:', credsJson.project_id);
  console.log('Service Account Email:', credsJson.client_email);
  console.log('----------------------------------------------------');

  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: credsJson.project_id,
      location: 'us-central1'
    });

    console.log('Sending test prompt to gemini-2.5-flash via Vertex AI...');
    const start = Date.now();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Demonstrate active connection by providing a 1-sentence inspirational quote.',
      config: { temperature: 0.7 }
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    console.log(`\n🎉 SUCCESS (${elapsed}s)!`);
    console.log('Gemini 2.5 Flash Response:\n', `"${response.text.trim()}"`);
    console.log('----------------------------------------------------');
    console.log('✅ All Vertex AI authentication credentials verified!');
  } catch (err) {
    console.error('❌ Auth Verification Error:', err.message);
  }
}

testGeminiKeyAndVertexAuth();
