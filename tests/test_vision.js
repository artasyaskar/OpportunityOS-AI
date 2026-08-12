const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const credPath = path.join(process.cwd(), 'credentials', 'vertex-sa.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

// Small 1x1 transparent PNG base64 for testing multimodal image input
const sampleImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function testVisionExtraction() {
  try {
    console.log('Testing Multimodal Image Extraction with Gemini 2.5 Flash on Vertex AI...');
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0120944305',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Please analyze this sample document image. Confirm you can process document scans and passports.' },
            {
              inlineData: {
                mimeType: 'image/png',
                data: sampleImageBase64
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.1
      }
    });

    console.log('\n🎉 MULTIMODAL VISION SUCCESS! Response:\n', response.text.trim());
  } catch (err) {
    console.error('❌ Multimodal Vision Test Error:\n', err);
  }
}

testVisionExtraction();
