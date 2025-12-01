// Simple Vision API SafeSearch test
// Usage: node scripts/testVision.js ./test.jpg

const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Usage: node scripts/testVision.js <imagePath>');
    process.exit(1);
  }

  const credsPath = process.env.REACT_APP_GOOGLE_CREDENTIALS_PATH || './google-credentials.json';
  if (!fs.existsSync(credsPath)) {
    console.error(`Credential file not found at: ${credsPath}`);
    process.exit(1);
  }

  const client = new vision.ImageAnnotatorClient({ keyFilename: credsPath });

  const absImage = path.resolve(imagePath);
  if (!fs.existsSync(absImage)) {
    console.error(`Image file not found: ${absImage}`);
    process.exit(1);
  }

  const imageBytes = fs.readFileSync(absImage).toString('base64');

  console.log('🔎 Calling Vision SafeSearchDetection...');
  const [result] = await client.safeSearchDetection({ image: { content: imageBytes } });
  const detections = result.safeSearchAnnotation || {};

  console.log('✅ SafeSearch result:');
  console.log({
    adult: detections.adult,
    violence: detections.violence,
    racy: detections.racy,
    medical: detections.medical,
    spoof: detections.spoof,
  });
}

main().catch((err) => {
  console.error('❌ Vision API call failed:', err.message || err);
  process.exit(1);
});
