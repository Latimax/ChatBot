/**
 * Parses and maps Groq response rate-limit headers accurately.
 *
 * NOTE on Groq rate limits:
 * - `x-ratelimit-limit-requests` represents Requests Per Day (RPD), NOT RPM.
 * - `x-ratelimit-limit-tokens` represents Tokens Per Minute (TPM), NOT TPD.
 * - Do NOT conflate them or invent missing numbers.
 */

function parseOptionalInt(val) {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(val, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function extractRateLimitHeaders(headers) {
  if (!headers) {
    return {
      requestsPerDayLimit: null,
      requestsPerDayRemaining: null,
      tokensPerMinuteLimit: null,
      tokensPerMinuteRemaining: null,
      requestsReset: null,
      tokensReset: null,
      retryAfter: null
    };
  }

  // Handle both node-fetch Headers object and plain object / map
  const getHeader = (key) => {
    if (typeof headers.get === 'function') {
      return headers.get(key) || headers.get(key.toLowerCase());
    }
    return headers[key] || headers[key.toLowerCase()] || null;
  };

  return {
    requestsPerDayLimit: parseOptionalInt(getHeader('x-ratelimit-limit-requests')),
    requestsPerDayRemaining: parseOptionalInt(getHeader('x-ratelimit-remaining-requests')),
    tokensPerMinuteLimit: parseOptionalInt(getHeader('x-ratelimit-limit-tokens')),
    tokensPerMinuteRemaining: parseOptionalInt(getHeader('x-ratelimit-remaining-tokens')),
    requestsReset: getHeader('x-ratelimit-reset-requests') || null,
    tokensReset: getHeader('x-ratelimit-reset-tokens') || null,
    retryAfter: getHeader('retry-after') || null
  };
}
