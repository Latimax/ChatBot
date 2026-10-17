import express from 'express';
import { validateChatPayload } from '../lib/validators.js';
import { buildMessages } from '../lib/buildMessages.js';
import { createGroqChatCompletion, createGroqChatStream } from '../lib/groqClient.js';
import { getApiKey } from '../lib/getApiKey.js';
import { RagService } from '../lib/ragService.js';

const router = express.Router();

function resolveBackground({ useRag, ragTopK, query, fallbackBackground }) {
  if (useRag) {
    const chunks = RagService.retrieveRelevantChunks({
      query,
      topK: ragTopK ? parseInt(ragTopK, 10) : 3
    });

    if (chunks.length > 0) {
      const retrievedContent = chunks
        .map((c, i) => `### [Retrieved Section ${i + 1} - Match Score: ${c.relevanceScore}]\n${c.content}`)
        .join('\n\n');

      return {
        background: retrievedContent,
        ragMeta: {
          enabled: true,
          chunksCount: chunks.length,
          chunks,
          originalTokensEst: Math.round((fallbackBackground || '').length / 4),
          retrievedTokensEst: Math.round(retrievedContent.length / 4)
        }
      };
    }
  }

  return {
    background: fallbackBackground,
    ragMeta: {
      enabled: false,
      chunksCount: 0,
      chunks: [],
      originalTokensEst: Math.round((fallbackBackground || '').length / 4),
      retrievedTokensEst: Math.round((fallbackBackground || '').length / 4)
    }
  };
}

// POST /api/preview — generate exact payload without calling Groq
router.post('/preview', (req, res) => {
  try {
    const validated = validateChatPayload(req.body);
    const { useRag, ragTopK } = req.body || {};

    const { background: effectiveBackground, ragMeta } = resolveBackground({
      useRag,
      ragTopK,
      query: validated.message,
      fallbackBackground: validated.companyBackground
    });

    const messages = buildMessages({
      systemInstructions: validated.systemInstructions,
      companyBackground: effectiveBackground,
      customMessages: validated.customMessages,
      history: validated.history,
      message: validated.message
    });

    res.json({
      model: validated.model,
      messages,
      options: {
        temperature: validated.options.temperature,
        max_completion_tokens: validated.options.maxCompletionTokens,
        stream: false
      },
      rag: ragMeta
    });
  } catch (err) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        status: 400
      }
    });
  }
});

// POST /api/chat — non-streaming chat completion
router.post('/chat', async (req, res) => {
  let validated;
  let messages;
  let ragMeta;

  try {
    validated = validateChatPayload(req.body);
    const { useRag, ragTopK } = req.body || {};

    const { background: effectiveBackground, ragMeta: resolvedMeta } = resolveBackground({
      useRag,
      ragTopK,
      query: validated.message,
      fallbackBackground: validated.companyBackground
    });
    ragMeta = resolvedMeta;

    messages = buildMessages({
      systemInstructions: validated.systemInstructions,
      companyBackground: effectiveBackground,
      customMessages: validated.customMessages,
      history: validated.history,
      message: validated.message
    });
  } catch (err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        status: 400
      }
    });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: 'MISSING_API_KEY',
        message: 'GROQ_API_KEY is not configured on the server. Please add your key to server/.env or export GROQ_API_KEY.',
        status: 401
      }
    });
  }

  try {
    const result = await createGroqChatCompletion({
      apiKey,
      model: validated.model,
      messages,
      temperature: validated.options.temperature,
      maxCompletionTokens: validated.options.maxCompletionTokens
    });

    res.json({
      ...result,
      rag: ragMeta
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      error: {
        code: err.code || 'CHAT_COMPLETION_ERROR',
        message: err.message || 'An error occurred during chat completion',
        status
      },
      rateLimits: err.rateLimits || null,
      latencyMs: err.latencyMs || null,
      rag: ragMeta
    });
  }
});

// POST /api/chat/stream — SSE streaming chat completion
router.post('/chat/stream', async (req, res) => {
  let validated;
  let messages;
  let ragMeta;

  try {
    validated = validateChatPayload(req.body);
    const { useRag, ragTopK } = req.body || {};

    const { background: effectiveBackground, ragMeta: resolvedMeta } = resolveBackground({
      useRag,
      ragTopK,
      query: validated.message,
      fallbackBackground: validated.companyBackground
    });
    ragMeta = resolvedMeta;

    messages = buildMessages({
      systemInstructions: validated.systemInstructions,
      companyBackground: effectiveBackground,
      customMessages: validated.customMessages,
      history: validated.history,
      message: validated.message
    });
  } catch (err) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        status: 400
      }
    });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: 'MISSING_API_KEY',
        message: 'GROQ_API_KEY is not configured on the server. Please add your key to server/.env',
        status: 401
      }
    });
  }

  const abortController = new AbortController();

  req.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  try {
    const { responseStream, rateLimits, startTime } = await createGroqChatStream({
      apiKey,
      model: validated.model,
      messages,
      temperature: validated.options.temperature,
      maxCompletionTokens: validated.options.maxCompletionTokens,
      signal: abortController.signal
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // 1. Send meta event (including RAG retrieval info)
    res.write(`event: meta\ndata: ${JSON.stringify({ model: validated.model, rateLimits, rag: ragMeta })}\n\n`);

    // 2. Read streamed chunks and parse SSE
    const reader = responseStream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Retain incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6).trim();

          if (payload === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(payload);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent !== undefined && deltaContent !== null) {
              res.write(`event: delta\ndata: ${JSON.stringify({ content: deltaContent })}\n\n`);
            }

            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || promptTokens;
              completionTokens = parsed.usage.completion_tokens || completionTokens;
              totalTokens = parsed.usage.total_tokens || totalTokens;
            }
          } catch {
            // Non-JSON or partial
          }
        }
      }
    }

    // Flush any leftover in buffer
    if (buffer.trim().startsWith('data: ')) {
      const payload = buffer.trim().slice(6).trim();
      if (payload !== '[DONE]') {
        try {
          const parsed = JSON.parse(payload);
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) {
            res.write(`event: delta\ndata: ${JSON.stringify({ content: deltaContent })}\n\n`);
          }
        } catch {
          // ignore
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    res.write(`event: done\ndata: ${JSON.stringify({
      latencyMs,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens
      },
      rag: ragMeta
    })}\n\n`);

    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({
        error: {
          code: err.code || 'STREAM_ERROR',
          message: err.message || 'Stream error occurred',
          status: err.status || 500
        },
        rateLimits: err.rateLimits || null,
        rag: ragMeta
      })}\n\n`);
      res.end();
    } else {
      res.status(err.status || 500).json({
        error: {
          code: err.code || 'STREAM_ERROR',
          message: err.message || 'Failed to start stream',
          status: err.status || 500
        },
        rateLimits: err.rateLimits || null,
        rag: ragMeta
      });
    }
  }
});

export default router;
