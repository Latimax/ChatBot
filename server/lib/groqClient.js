import { extractRateLimitHeaders } from './rateLimitHeaders.js';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function fetchGroqModels(apiKey) {
  if (!apiKey) {
    throw {
      status: 401,
      code: 'MISSING_API_KEY',
      message: 'GROQ_API_KEY is not configured on the server'
    };
  }

  const response = await fetch(`${GROQ_BASE_URL}/models`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const rateLimits = extractRateLimitHeaders(response.headers);

  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch {
      // response not JSON
    }
    const message = errorData?.error?.message || `Failed to fetch models from Groq (${response.status})`;
    throw {
      status: response.status,
      code: response.status === 401 ? 'INVALID_API_KEY' : 'GROQ_ERROR',
      message,
      rateLimits
    };
  }

  const data = await response.json();
  return {
    models: data.data || [],
    rateLimits
  };
}

export async function createGroqChatCompletion({
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxCompletionTokens = 1024,
  signal
}) {
  if (!apiKey) {
    throw {
      status: 401,
      code: 'MISSING_API_KEY',
      message: 'GROQ_API_KEY is not configured on the server. Please set it in server/.env'
    };
  }

  const payload = {
    model,
    messages,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    stream: false
  };

  const startTime = Date.now();
  let response;

  try {
    response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw {
        status: 499,
        code: 'ABORTED',
        message: 'Request was cancelled'
      };
    }
    throw {
      status: 503,
      code: 'NETWORK_ERROR',
      message: `Failed to connect to Groq API: ${err.message}`
    };
  }

  const latencyMs = Date.now() - startTime;
  const rateLimits = extractRateLimitHeaders(response.headers);

  if (!response.ok) {
    let errorJson = null;
    try {
      errorJson = await response.json();
    } catch {
      // non-JSON
    }

    const groqMsg = errorJson?.error?.message || `Groq API responded with status ${response.status}`;
    let code = 'GROQ_ERROR';

    if (response.status === 401) code = 'INVALID_API_KEY';
    else if (response.status === 403) code = 'FORBIDDEN';
    else if (response.status === 404) code = 'MODEL_NOT_FOUND';
    else if (response.status === 429) code = 'RATE_LIMITED';
    else if (response.status === 400) code = 'BAD_REQUEST';

    throw {
      status: response.status,
      code,
      message: groqMsg,
      rateLimits,
      latencyMs
    };
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const reply = choice?.message?.content ?? '';

  return {
    reply,
    model: data.model || model,
    usage: data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    },
    latencyMs,
    rateLimits
  };
}

export async function createGroqChatStream({
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxCompletionTokens = 1024,
  signal
}) {
  if (!apiKey) {
    throw {
      status: 401,
      code: 'MISSING_API_KEY',
      message: 'GROQ_API_KEY is not configured on the server. Please set it in server/.env'
    };
  }

  const payload = {
    model,
    messages,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    stream: true
  };

  const startTime = Date.now();
  let response;

  try {
    response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw {
        status: 499,
        code: 'ABORTED',
        message: 'Request was cancelled'
      };
    }
    throw {
      status: 503,
      code: 'NETWORK_ERROR',
      message: `Failed to connect to Groq API: ${err.message}`
    };
  }

  const rateLimits = extractRateLimitHeaders(response.headers);

  if (!response.ok) {
    let errorJson = null;
    try {
      errorJson = await response.json();
    } catch {
      // non-JSON
    }

    const groqMsg = errorJson?.error?.message || `Groq API responded with status ${response.status}`;
    let code = 'GROQ_ERROR';
    if (response.status === 401) code = 'INVALID_API_KEY';
    else if (response.status === 403) code = 'FORBIDDEN';
    else if (response.status === 404) code = 'MODEL_NOT_FOUND';
    else if (response.status === 429) code = 'RATE_LIMITED';
    else if (response.status === 400) code = 'BAD_REQUEST';

    throw {
      status: response.status,
      code,
      message: groqMsg,
      rateLimits,
      latencyMs: Date.now() - startTime
    };
  }

  return {
    responseStream: response.body,
    rateLimits,
    startTime
  };
}
