require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const api = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 8000;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('🗄️  Mongo connected');

  const app = express();

  app.use(cors({ origin: ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`🚀 API on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
