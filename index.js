require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const PORT = process.env.PORT || 8000;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const MONGODB_URI = process.env.MONGODB_URI;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Configure Multer for in-memory file storage
// This temporarily stores the uploaded file in RAM
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function start() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  if (!ELEVENLABS_API_KEY) {
    console.warn(
      'Missing ELEVENLABS_API_KEY in .env. Transcription will fail.'
    );
  }

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('🗄️  Mongo connected');

  // Start Express
  const app = express();
  app.use(cors({ origin: ORIGIN }));
  app.use(helmet());
  app.use(express.json());

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      ok: true,
      mongo: mongoose.connection.readyState === 1 ? 'up' : 'down',
      ts: new Date().toISOString(),
    });
  });

  // --- TRANSCRIPTION ENDPOINT ---
  app.post('/api/v1/transcribe', upload.single('audio'), async (req, res) => {
    if (!ELEVENLABS_API_KEY) {
      return res
        .status(500)
        .json({ error: 'ElevenLabs API key is not configured.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided.' });
    }

    try {
      // Create a FormData object to send to ElevenLabs
      const formData = new FormData();
      
      // Append the audio buffer
      formData.append('file', req.file.buffer, {
        filename: 'audio.webm', 
        contentType: req.file.mimetype,
      });
      
      // --- FIX: Use the correct Speech-to-Text model ID ---
      formData.append('model_id', 'scribe_v1');

      const XI_API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

      // Make the API call to ElevenLabs
      const response = await axios.post(XI_API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      // Send the transcription text back to the client
      res.json({ transcription: response.data.text });
      
    } catch (error) {
      // Log the detailed error from ElevenLabs if available
      if (error.response && error.response.data) {
        console.error('ElevenLabs API Error:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('API Error:', error.message);
      }
      res
        .status(500)
        .json({ error: 'Failed to transcribe audio.', details: error.response?.data || error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`🚀 API on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

