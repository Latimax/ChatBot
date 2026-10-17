import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGroqModels } from '../lib/groqClient.js';
import { getApiKey } from '../lib/getApiKey.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const freeTierPath = path.resolve(__dirname, '../data/freeTierModels.json');

const router = express.Router();

let cache = {
  data: null,
  fetchedAt: null
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readFreeTierSnapshot() {
  try {
    const raw = fs.readFileSync(freeTierPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read freeTierModels.json:', err);
    return {
      lastVerified: '2026-10-17',
      sourceUrl: 'https://console.groq.com/docs/rate-limits',
      models: []
    };
  }
}

// GET /api/free-tier-limits (Documented static snapshot)
router.get('/free-tier-limits', (req, res) => {
  const snapshot = readFreeTierSnapshot();
  res.json(snapshot);
});

// GET /api/models (Live discovery merged with snapshot)
router.get('/models', async (req, res) => {
  const apiKey = getApiKey();
  const force = req.query.force === 'true';
  const snapshot = readFreeTierSnapshot();
  const snapshotMap = new Map((snapshot.models || []).map(m => [m.id, m]));

  // If no API key configured, return documented snapshot models
  if (!apiKey) {
    const models = (snapshot.models || []).map(m => ({
      id: m.id,
      name: m.name,
      owned_by: m.developer || 'Groq',
      active: true,
      context_window: m.contextWindow || 8192,
      documentedFreeTier: true,
      freeTierDetails: m,
      discoveredLive: false,
      isChatCapable: true,
      testedAccessible: false
    }));

    return res.json({
      models,
      liveDiscovery: false,
      message: 'GROQ_API_KEY not configured. Showing documented free-tier model snapshot. Add GROQ_API_KEY in server/.env for live discovery.',
      fetchedAt: new Date().toISOString()
    });
  }

  // Check cache
  const now = Date.now();
  if (!force && cache.data && cache.fetchedAt && (now - cache.fetchedAt < CACHE_TTL_MS)) {
    return res.json({
      ...cache.data,
      fromCache: true
    });
  }

  try {
    const { models: groqModels, rateLimits } = await fetchGroqModels(apiKey);

    const mergedModels = [];
    const seenIds = new Set();

    // 1. Process models discovered live from Groq API
    for (const gm of groqModels) {
      const modelId = gm.id;
      seenIds.add(modelId);
      const isKnownDoc = snapshotMap.has(modelId);
      const docData = isKnownDoc ? snapshotMap.get(modelId) : null;

      // Filter or flag non-chat models (audio, moderation/guard, whisper)
      const isAudio = modelId.toLowerCase().includes('whisper') || modelId.toLowerCase().includes('distil-whisper');
      const isGuard = modelId.toLowerCase().includes('guard') || modelId.toLowerCase().includes('safeguard');
      const isChatCapable = !isAudio && !isGuard;

      mergedModels.push({
        id: modelId,
        name: docData?.name || modelId,
        owned_by: gm.owned_by || docData?.developer || 'Unknown',
        active: gm.active !== false,
        context_window: gm.context_window || docData?.contextWindow || null,
        documentedFreeTier: isKnownDoc,
        freeTierDetails: docData || null,
        freeTierStatus: isKnownDoc ? 'Verified Free-Tier' : 'Free-tier status unverified',
        discoveredLive: true,
        isChatCapable,
        isAudio,
        isGuard,
        testedAccessible: false
      });
    }

    // 2. Also append any documented models from snapshot that weren't in live list (flagged as discoveredLive: false)
    for (const docModel of (snapshot.models || [])) {
      if (!seenIds.has(docModel.id)) {
        mergedModels.push({
          id: docModel.id,
          name: docModel.name,
          owned_by: docModel.developer || 'Unknown',
          active: true,
          context_window: docModel.contextWindow || 8192,
          documentedFreeTier: true,
          freeTierDetails: docModel,
          freeTierStatus: 'Documented Snapshot Only',
          discoveredLive: false,
          isChatCapable: true,
          testedAccessible: false
        });
      }
    }

    const result = {
      models: mergedModels,
      liveDiscovery: true,
      lastVerifiedSnapshot: snapshot.lastVerified,
      fetchedAt: new Date().toISOString(),
      rateLimits
    };

    cache = {
      data: result,
      fetchedAt: now
    };

    res.json(result);
  } catch (err) {
    console.error('Error fetching live models:', err);
    // Fallback gracefully to snapshot models if Groq API call fails
    const fallbackModels = (snapshot.models || []).map(m => ({
      id: m.id,
      name: m.name,
      owned_by: m.developer || 'Groq',
      active: true,
      context_window: m.contextWindow || 8192,
      documentedFreeTier: true,
      freeTierDetails: m,
      freeTierStatus: 'Verified Free-Tier',
      discoveredLive: false,
      isChatCapable: true,
      testedAccessible: false
    }));

    res.status(err.status && err.status >= 400 && err.status < 500 ? err.status : 200).json({
      models: fallbackModels,
      liveDiscovery: false,
      error: {
        code: err.code || 'GROQ_FETCH_FAILED',
        message: err.message || 'Failed to fetch live models from Groq. Showing documented snapshot.'
      },
      rateLimits: err.rateLimits || null,
      fetchedAt: new Date().toISOString()
    });
  }
});

export default router;
