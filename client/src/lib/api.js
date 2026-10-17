export async function checkHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchModels(force = false) {
  const res = await fetch(`/api/models?force=${force}`);
  return res.json();
}

export async function fetchFreeTierLimits() {
  const res = await fetch('/api/free-tier-limits');
  return res.json();
}

export async function fetchPreview(payload) {
  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Preview generation failed');
  }
  return data;
}

export async function sendChatMessage(payload, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error?.message || 'Chat completion failed');
    error.status = res.status;
    error.code = data.error?.code;
    error.rateLimits = data.rateLimits;
    throw error;
  }

  return data;
}

export async function streamChatMessage(payload, { onMeta, onDelta, onDone, onError, signal }) {
  try {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      let errData = {};
      try {
        errData = await res.json();
      } catch {
        // ignore
      }
      const error = new Error(errData.error?.message || `Streaming request failed (${res.status})`);
      error.status = res.status;
      error.code = errData.error?.code;
      error.rateLimits = errData.rateLimits;
      if (onError) onError(error);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep remainder

      let currentEvent = 'message';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEvent = 'message';
          continue;
        }

        if (trimmed.startsWith('event: ')) {
          currentEvent = trimmed.slice(7).trim();
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          const rawData = trimmed.slice(6);
          try {
            const parsed = JSON.parse(rawData);
            if (currentEvent === 'meta' && onMeta) {
              onMeta(parsed);
            } else if (currentEvent === 'delta' && onDelta) {
              onDelta(parsed.content || '');
            } else if (currentEvent === 'done' && onDone) {
              onDone(parsed);
            } else if (currentEvent === 'error' && onError) {
              const error = new Error(parsed.error?.message || 'Stream error occurred');
              error.status = parsed.error?.status;
              error.code = parsed.error?.code;
              error.rateLimits = parsed.rateLimits;
              onError(error);
            }
          } catch {
            // ignore JSON parse chunk errors
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // User clicked stop generation
      return;
    }
    if (onError) onError(err);
  }
}
