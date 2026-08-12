const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const credPath = path.join(process.cwd(), 'credentials', 'vertex-sa.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
const credsJson = JSON.parse(fs.readFileSync(credPath, 'utf8'));

async function testVertexAIModels() {
  console.log('====================================================');
  console.log('  OPPORTUNITYOS-AI: VERTEX AI PLATFORM SUITE TEST');
  console.log('====================================================');
  console.log('GCP Project ID:', credsJson.project_id);
  console.log('Service Account:', credsJson.client_email);
  console.log('Credentials Path:', credPath);
  console.log('----------------------------------------------------');

  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: credsJson.project_id,
      location: 'us-central1'
    });

    const modelsToTest = ['gemini-2.5-flash'];

    for (const modelName of modelsToTest) {
      process.stdout.write(`Testing Vertex AI model "${modelName}"... `);
      const start = Date.now();
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: 'Say "Online and operational" in 3 words.',
          config: { temperature: 0.1 }
        });
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`✅ SUCCESS (${elapsed}s)`);
        console.log(`   Response: "${response.text.trim()}"`);
      } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
      }
    }
    console.log('----------------------------------------------------');
    console.log('🎉 VERTEX AI DIAGNOSTIC SUITE COMPLETE!');
  } catch (err) {
    console.error('❌ Diagnostic Suite Error:', err);
  }
}

testVertexAIModels();