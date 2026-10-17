import { ALLOWED_ROLES } from './buildMessages.js';

export function validateChatPayload(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a valid JSON object');
  }

  const {
    model,
    systemInstructions = '',
    companyBackground = '',
    customMessages = [],
    history = [],
    message = '',
    options = {}
  } = body;

  if (!model || typeof model !== 'string' || !model.trim()) {
    throw new Error('Missing or invalid "model" parameter');
  }

  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('Missing or empty "message" parameter');
  }

  if (systemInstructions && typeof systemInstructions !== 'string') {
    throw new Error('"systemInstructions" must be a string');
  }

  if (companyBackground && typeof companyBackground !== 'string') {
    throw new Error('"companyBackground" must be a string');
  }

  if (!Array.isArray(customMessages)) {
    throw new Error('"customMessages" must be an array');
  }

  if (customMessages.length > 50) {
    throw new Error('Exceeded maximum number of custom messages (50)');
  }

  for (let i = 0; i < customMessages.length; i++) {
    const item = customMessages[i];
    if (!item || typeof item !== 'object') {
      throw new Error(`Custom message at index ${i} is invalid`);
    }
    if (!ALLOWED_ROLES.includes(item.role)) {
      throw new Error(`Invalid custom message role "${item.role}" at index ${i}`);
    }
    if (typeof item.content !== 'string') {
      throw new Error(`Custom message content at index ${i} must be a string`);
    }
  }

  if (!Array.isArray(history)) {
    throw new Error('"history" must be an array');
  }

  if (history.length > 200) {
    throw new Error('Exceeded maximum history length (200 turns)');
  }

  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (!turn || typeof turn !== 'object') {
      throw new Error(`History turn at index ${i} is invalid`);
    }
    if (turn.role !== 'user' && turn.role !== 'assistant') {
      throw new Error(`Invalid history role "${turn.role}" at index ${i}. Only "user" or "assistant" allowed`);
    }
    if (typeof turn.content !== 'string') {
      throw new Error(`History turn content at index ${i} must be a string`);
    }
  }

  // Validate options
  const validatedOptions = {
    temperature: 0.7,
    maxCompletionTokens: 1024
  };

  if (options && typeof options === 'object') {
    if (options.temperature !== undefined) {
      const temp = Number(options.temperature);
      if (Number.isNaN(temp) || temp < 0 || temp > 2) {
        throw new Error('"temperature" must be a number between 0 and 2');
      }
      validatedOptions.temperature = temp;
    }

    if (options.maxCompletionTokens !== undefined) {
      const maxTokens = parseInt(options.maxCompletionTokens, 10);
      if (Number.isNaN(maxTokens) || maxTokens < 1 || maxTokens > 32768) {
        throw new Error('"maxCompletionTokens" must be an integer between 1 and 32768');
      }
      validatedOptions.maxCompletionTokens = maxTokens;
    }
  }

  return {
    model: model.trim(),
    systemInstructions: typeof systemInstructions === 'string' ? systemInstructions : '',
    companyBackground: typeof companyBackground === 'string' ? companyBackground : '',
    customMessages,
    history,
    message: message.trim(),
    options: validatedOptions
  };
}
