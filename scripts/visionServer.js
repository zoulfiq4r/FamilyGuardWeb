// Minimal Express server to call Google Cloud Vision SafeSearch
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const vision = require('@google-cloud/vision');
const fs = require('fs');

const PORT = process.env.VISION_SERVER_PORT || 5050;
const credsPath = process.env.REACT_APP_GOOGLE_CREDENTIALS_PATH || './google-credentials.json';

if (!fs.existsSync(credsPath)) {
  console.error(`Credential file not found at: ${credsPath}`);
  process.exit(1);
}

const client = new vision.ImageAnnotatorClient({ keyFilename: credsPath });

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const [result] = await client.safeSearchDetection({ image: { content: imageBase64 } });
    const d = result.safeSearchAnnotation || {};
    const payload = {
      adult: d.adult,
      violence: d.violence,
      racy: d.racy,
      medical: d.medical,
      spoof: d.spoof,
    };
    res.json({ ok: true, safeSearch: payload });
  } catch (err) {
    console.error('Vision analyze error:', err);
    res.status(500).json({ error: err.message || 'Vision error' });
  }
});

app.listen(PORT, () => {
  console.log(`Vision server listening on http://localhost:${PORT}`);
});
