require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 8000;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
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

  app.listen(PORT, () => {
    console.log(`🚀 API on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
