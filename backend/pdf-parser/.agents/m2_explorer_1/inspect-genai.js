const path = require('path');
const os = require('os');

const cjsPath = path.join(os.tmpdir(), 'package', 'dist', 'node', 'index.cjs');
console.log('Loading from:', cjsPath);

try {
  const genai = require(cjsPath);
  console.log('Exports:', Object.keys(genai));
  console.log('GoogleGenAI type:', typeof genai.GoogleGenAI);
  console.log('Type enum:', genai.Type);
  
  if (genai.GoogleGenAI) {
    const client = new genai.GoogleGenAI({ apiKey: 'fake-key-for-inspection' });
    console.log('Client instance properties:', Object.keys(client));
    console.log('models methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.models)));
  }
} catch (err) {
  console.error('Error loading:', err);
}
