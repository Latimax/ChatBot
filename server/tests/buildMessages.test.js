import { describe, it, expect } from 'vitest';
import { buildMessages } from '../lib/buildMessages.js';

describe('buildMessages', () => {
  it('combines system instructions and company background into a single system message', () => {
    const messages = buildMessages({
      systemInstructions: 'You are a helpful assistant.',
      companyBackground: 'Organization name: Acme Corp\nWebsite: https://acme.com',
      message: 'Hello'
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('You are a helpful assistant.');
    expect(messages[0].content).toContain('## Organization Reference');
    expect(messages[0].content).toContain('Acme Corp');
    expect(messages[1]).toEqual({ role: 'user', content: 'Hello' });
  });

  it('includes custom system messages inside the single system message', () => {
    const messages = buildMessages({
      systemInstructions: 'Base instruction.',
      companyBackground: 'Acme info.',
      customMessages: [
        { role: 'system', content: 'Extra tone guideline: be concise.' }
      ],
      message: 'Hi'
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBe(
      'Base instruction.\n\n## Organization Reference\nAcme info.\n\nExtra tone guideline: be concise.'
    );
  });

  it('appends custom few-shot examples (user, assistant) before history', () => {
    const messages = buildMessages({
      systemInstructions: 'Be brief.',
      customMessages: [
        { role: 'user', content: 'Example Q' },
        { role: 'assistant', content: 'Example A' }
      ],
      history: [
        { role: 'user', content: 'Previous Q' },
        { role: 'assistant', content: 'Previous A' }
      ],
      message: 'Current Q'
    });

    expect(messages).toEqual([
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'Example Q' },
      { role: 'assistant', content: 'Example A' },
      { role: 'user', content: 'Previous Q' },
      { role: 'assistant', content: 'Previous A' },
      { role: 'user', content: 'Current Q' }
    ]);
  });

  it('preserves multiline user message and appends current message exactly once', () => {
    const multilineMsg = 'Line 1\nLine 2\nLine 3';
    const messages = buildMessages({
      message: multilineMsg
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      role: 'user',
      content: multilineMsg
    });
  });

  it('omits empty system sections when nothing is provided', () => {
    const messages = buildMessages({
      systemInstructions: '   ',
      companyBackground: '',
      customMessages: [],
      history: [],
      message: 'Just a user question'
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      role: 'user',
      content: 'Just a user question'
    });
  });

  it('throws an error if message is empty or whitespace only', () => {
    expect(() => {
      buildMessages({ message: '   ' });
    }).toThrow('Current user message cannot be empty');
  });

  it('throws an error if a custom message has an invalid role', () => {
    expect(() => {
      buildMessages({
        customMessages: [{ role: 'admin', content: 'illegal role' }],
        message: 'Hello'
      });
    }).toThrow('Invalid custom message role "admin"');
  });

  it('throws an error if history contains invalid roles like system', () => {
    expect(() => {
      buildMessages({
        history: [{ role: 'system', content: 'illegal in history' }],
        message: 'Hello'
      });
    }).toThrow('Invalid history role "system"');
  });
});
