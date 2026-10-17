import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import healthRoutes from './routes/health.js';
import modelsRoutes from './routes/models.js';
import chatRoutes from './routes/chat.js';
import ragRoutes from './routes/rag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (check server/.env first, then root .env)
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
// Set reasonable body limit (1MB max as per spec)
app.use(express.json({ limit: '1mb' }));

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api', modelsRoutes);
app.use('/api', chatRoutes);
app.use('/api/rag', ragRoutes);

// Root information endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Groq Chat Playground API',
    status: 'running',
    docs: '/api/health, /api/models, /api/free-tier-limits, /api/preview, /api/chat, /api/chat/stream'
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred',
      status: err.status || 500
    }
  });
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`[Groq Chat Playground] Server listening on http://localhost:${PORT}`);
    const keyConfigured = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
    console.log(`[Groq Chat Playground] GROQ_API_KEY status: ${keyConfigured ? 'Configured' : 'NOT CONFIGURED (Add to .env)'}`);
  });
}

export default app;
