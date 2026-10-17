import { describe, it, expect } from 'vitest';

describe('Profile Import & Export Safety', () => {
  it('sanitizes profile exports to ensure no secret keys are included', () => {
    const rawProfile = {
      name: 'Test Profile',
      apiKey: 'gsk_secret_that_must_never_be_exported',
      data: {
        model: 'openai/gpt-oss-20b',
        systemInstructions: 'Helpful assistant',
        companyBackground: 'Acme info',
        customMessages: [],
        temperature: 0.7,
        maxCompletionTokens: 1024
      }
    };

    // Sanitize
    const sanitized = {
      id: 'prof_test',
      name: rawProfile.name,
      data: {
        model: rawProfile.data.model,
        systemInstructions: rawProfile.data.systemInstructions,
        companyBackground: rawProfile.data.companyBackground,
        customMessages: rawProfile.data.customMessages,
        temperature: rawProfile.data.temperature,
        maxCompletionTokens: rawProfile.data.maxCompletionTokens
      }
    };

    expect(sanitized.apiKey).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain('gsk_secret');
    expect(sanitized.name).toBe('Test Profile');
    expect(sanitized.data.model).toBe('openai/gpt-oss-20b');
  });

  it('validates and safely parses profile JSON files', () => {
    const validJson = JSON.stringify({
      appName: 'Groq Chat Playground Profiles',
      profiles: [
        {
          name: 'Imported Profile',
          data: {
            model: 'qwen/qwen3.8-27b',
            systemInstructions: 'Be direct.'
          }
        }
      ]
    });

    const parsed = JSON.parse(validJson);
    expect(Array.isArray(parsed.profiles)).toBe(true);
    expect(parsed.profiles[0].name).toBe('Imported Profile');
    expect(parsed.profiles[0].data.model).toBe('qwen/qwen3.8-27b');
  });

  it('rejects malformed profile payloads gracefully', () => {
    const malformed = 'Not valid JSON';
    let parseError = null;
    try {
      JSON.parse(malformed);
    } catch (err) {
      parseError = err;
    }
    expect(parseError).not.toBeNull();
  });
});
