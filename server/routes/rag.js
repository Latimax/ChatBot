import express from 'express';
import { RagService } from '../lib/ragService.js';

const router = express.Router();

// GET /api/rag/status
router.get('/status', (req, res) => {
  res.json(RagService.getStatus());
});

// POST /api/rag/index
router.post('/index', (req, res) => {
  const { title, content, text, documents, chunkSize, chunkOverlap } = req.body || {};

  if (Array.isArray(documents) && documents.length > 0) {
    try {
      const result = RagService.indexDocuments(documents, {
        chunkSize: chunkSize ? parseInt(chunkSize, 10) : 900,
        chunkOverlap: chunkOverlap ? parseInt(chunkOverlap, 10) : 120
      });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: {
          code: 'INDEXING_FAILED',
          message: err.message
        }
      });
    }
  }

  const rawContent = content || text;
  if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
    return res.status(400).json({
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Field "content" (or "text" or "documents") is required and must be non-empty'
      }
    });
  }

  try {
    const result = RagService.indexDocument({
      title: title || 'Company Knowledge Base',
      content: rawContent,
      chunkSize: chunkSize ? parseInt(chunkSize, 10) : 900,
      chunkOverlap: chunkOverlap ? parseInt(chunkOverlap, 10) : 120
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'INDEXING_FAILED',
        message: err.message
      }
    });
  }
});

// POST & GET /api/rag/search
const handleSearch = (req, res) => {
  const query = req.body?.query || req.query?.query;
  const topK = req.body?.topK || req.query?.topK;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_QUERY',
        message: 'Field "query" is required'
      }
    });
  }

  const chunks = RagService.retrieveRelevantChunks({
    query,
    topK: topK ? parseInt(topK, 10) : 3
  });

  res.json({
    query,
    chunks,
    count: chunks.length
  });
};

router.post('/search', handleSearch);
router.get('/search', handleSearch);

// POST /api/rag/clear
router.post('/clear', (req, res) => {
  RagService.clearIndex();
  res.json({ success: true, message: 'RAG index cleared' });
});

export default router;
