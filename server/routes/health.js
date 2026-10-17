import express from 'express';
import { getApiKey } from '../lib/getApiKey.js';

const router = express.Router();

router.get('/health', (req, res) => {
  const apiKey = getApiKey();
  res.json({
    ok: true,
    groqConfigured: Boolean(apiKey && apiKey.length > 0)
  });
});

export default router;
