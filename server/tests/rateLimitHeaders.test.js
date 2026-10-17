import { describe, it, expect } from 'vitest';
import { extractRateLimitHeaders } from '../lib/rateLimitHeaders.js';

describe('extractRateLimitHeaders', () => {
  it('correctly maps x-ratelimit-limit-requests to requestsPerDayLimit (RPD)', () => {
    const mockHeaders = {
      'x-ratelimit-limit-requests': '1000',
      'x-ratelimit-remaining-requests': '994',
      'x-ratelimit-reset-requests': '2h15m',
      'x-ratelimit-limit-tokens': '8000',
      'x-ratelimit-remaining-tokens': '7850',
      'x-ratelimit-reset-tokens': '12s'
    };

    const parsed = extractRateLimitHeaders(mockHeaders);

    // Verify RPD mapping
    expect(parsed.requestsPerDayLimit).toBe(1000);
    expect(parsed.requestsPerDayRemaining).toBe(994);
    expect(parsed.requestsReset).toBe('2h15m');

    // Verify TPM mapping
    expect(parsed.tokensPerMinuteLimit).toBe(8000);
    expect(parsed.tokensPerMinuteRemaining).toBe(7850);
    expect(parsed.tokensReset).toBe('12s');

    expect(parsed.retryAfter).toBeNull();
  });

  it('correctly captures retry-after on 429 rate limit responses', () => {
    const mockHeaders = {
      'retry-after': '30',
      'x-ratelimit-remaining-requests': '0'
    };

    const parsed = extractRateLimitHeaders(mockHeaders);
    expect(parsed.retryAfter).toBe('30');
    expect(parsed.requestsPerDayRemaining).toBe(0);
    expect(parsed.requestsPerDayLimit).toBeNull();
  });

  it('handles null or empty headers gracefully without inventing values', () => {
    const parsed = extractRateLimitHeaders(null);
    expect(parsed).toEqual({
      requestsPerDayLimit: null,
      requestsPerDayRemaining: null,
      tokensPerMinuteLimit: null,
      tokensPerMinuteRemaining: null,
      requestsReset: null,
      tokensReset: null,
      retryAfter: null
    });
  });

  it('works with standard Headers object (case-insensitive get())', () => {
    const headers = new Headers();
    headers.set('X-RateLimit-Limit-Requests', '14400');
    headers.set('X-RateLimit-Remaining-Requests', '14390');
    headers.set('X-RateLimit-Limit-Tokens', '20000');
    headers.set('X-RateLimit-Remaining-Tokens', '19500');

    const parsed = extractRateLimitHeaders(headers);
    expect(parsed.requestsPerDayLimit).toBe(14400);
    expect(parsed.requestsPerDayRemaining).toBe(14390);
    expect(parsed.tokensPerMinuteLimit).toBe(20000);
    expect(parsed.tokensPerMinuteRemaining).toBe(19500);
  });
});
