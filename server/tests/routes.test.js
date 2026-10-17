import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Express API Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('returns ok: true and groqConfigured flag', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.groqConfigured).toBe('boolean');
    });
  });

  describe('GET /api/free-tier-limits', () => {
    it('returns the documented static snapshot with lastVerified and models array', async () => {
      const res = await request(app).get('/api/free-tier-limits');
      expect(res.status).toBe(200);
      expect(res.body.lastVerified).toBe('2026-10-17');
      expect(Array.isArray(res.body.models)).toBe(true);
      expect(res.body.models.length).toBeGreaterThan(0);

      const gptOss20b = res.body.models.find(m => m.id === 'openai/gpt-oss-20b');
      expect(gptOss20b).toBeDefined();
      expect(gptOss20b.requestsPerMinute).toBe(30);
      expect(gptOss20b.requestsPerDay).toBe(1000);
      expect(gptOss20b.tokensPerMinute).toBe(8000);
      expect(gptOss20b.tokensPerDay).toBe(200000);
    });
  });

  describe('POST /api/preview', () => {
    it('returns assembled messages and model options without calling Groq API', async () => {
      const payload = {
        model: 'openai/gpt-oss-20b',
        systemInstructions: 'You are helpful.',
        companyBackground: 'We make widgets.',
        message: 'Do you ship internationally?',
        options: {
          temperature: 0.5,
          maxCompletionTokens: 500
        }
      };

      const res = await request(app).post('/api/preview').send(payload);
      expect(res.status).toBe(200);
      expect(res.body.model).toBe('openai/gpt-oss-20b');
      expect(res.body.options.temperature).toBe(0.5);
      expect(res.body.options.max_completion_tokens).toBe(500);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].role).toBe('system');
      expect(res.body.messages[0].content).toContain('## Organization Reference');
      expect(res.body.messages[1]).toEqual({
        role: 'user',
        content: 'Do you ship internationally?'
      });
    });

    it('rejects invalid or empty message with 400', async () => {
      const res = await request(app).post('/api/preview').send({
        model: 'openai/gpt-oss-20b',
        message: '   '
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /api/chat - Validation & Key Handling', () => {
    it('returns 401 MISSING_API_KEY if GROQ_API_KEY is not configured', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const res = await request(app).post('/api/chat').send({
        model: 'openai/gpt-oss-20b',
        message: 'Hello'
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_API_KEY');

      process.env.GROQ_API_KEY = originalKey;
    });

    it('returns 400 if model is missing', async () => {
      const res = await request(app).post('/api/chat').send({
        message: 'Hello'
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('model');
    });

    it('returns 400 if message is empty', async () => {
      const res = await request(app).post('/api/chat').send({
        model: 'openai/gpt-oss-20b',
        message: ''
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('message');
    });
  });

  describe('GET /api/models', () => {
    it('returns snapshot models with liveDiscovery: false when no key is configured', async () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const res = await request(app).get('/api/models');
      expect(res.status).toBe(200);
      expect(res.body.liveDiscovery).toBe(false);
      expect(Array.isArray(res.body.models)).toBe(true);
      expect(res.body.models.length).toBeGreaterThan(0);

      process.env.GROQ_API_KEY = originalKey;
    });
  });
});
