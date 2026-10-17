/**
 * Deterministically constructs the effective messages array for Groq Chat Completions.
 *
 * Rules:
 * 1. Combine base systemInstructions, organization background, and custom messages with role === 'system'
 *    into a single unified system message at index 0. Omit if all are empty.
 * 2. Append custom few-shot messages (roles 'user' or 'assistant') in their configured order.
 * 3. Append conversation history turns in chronological order (must have role 'user' or 'assistant').
 * 4. Append the current user draft message exactly once.
 * 5. Reject invalid roles and empty message content.
 */

export const ALLOWED_ROLES = ['system', 'user', 'assistant'];

export function buildMessages({
  systemInstructions = '',
  companyBackground = '',
  customMessages = [],
  history = [],
  message = ''
} = {}) {
  // Validate current message
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  if (!trimmedMessage) {
    throw new Error('Current user message cannot be empty');
  }

  // 1. Build system components
  const systemSections = [];

  const trimmedInstructions = typeof systemInstructions === 'string' ? systemInstructions.trim() : '';
  if (trimmedInstructions) {
    systemSections.push(trimmedInstructions);
  }

  const trimmedBackground = typeof companyBackground === 'string' ? companyBackground.trim() : '';
  if (trimmedBackground) {
    systemSections.push(`## Organization Reference\n${trimmedBackground}`);
  }

  // Collect custom messages
  const customFewShots = [];
  if (Array.isArray(customMessages)) {
    for (let i = 0; i < customMessages.length; i++) {
      const item = customMessages[i];
      if (!item || typeof item !== 'object') continue;
      const role = item.role;
      const content = typeof item.content === 'string' ? item.content.trim() : '';

      if (!content) continue; // Omit empty custom messages

      if (!ALLOWED_ROLES.includes(role)) {
        throw new Error(`Invalid custom message role "${role}". Allowed roles: ${ALLOWED_ROLES.join(', ')}`);
      }

      if (role === 'system') {
        systemSections.push(content);
      } else {
        customFewShots.push({ role, content: item.content });
      }
    }
  }

  const finalMessages = [];

  // If there are any system sections, join them into a single system message
  if (systemSections.length > 0) {
    finalMessages.push({
      role: 'system',
      content: systemSections.join('\n\n')
    });
  }

  // 2. Append non-system custom messages (few-shots)
  for (const item of customFewShots) {
    finalMessages.push({
      role: item.role,
      content: item.content
    });
  }

  // 3. Append history
  if (Array.isArray(history)) {
    for (let i = 0; i < history.length; i++) {
      const turn = history[i];
      if (!turn || typeof turn !== 'object') continue;
      const role = turn.role;
      const content = typeof turn.content === 'string' ? turn.content.trim() : '';

      if (!content) continue; // Omit empty history turns

      if (role !== 'user' && role !== 'assistant') {
        throw new Error(`Invalid history role "${role}". Only "user" and "assistant" turns are allowed in history`);
      }

      finalMessages.push({
        role,
        content: turn.content
      });
    }
  }

  // 4. Append current user message exactly once
  finalMessages.push({
    role: 'user',
    content: message
  });

  return finalMessages;
}
