import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  res.json({
    ok: true,
    groqConfigured: Boolean(apiKey && apiKey.trim().length > 0)
  });
});

export default router;
