import type { LLMClient, QueryTransformParams } from '../../types.js';
import { getPrompt } from '../../services/prompts/index.js';
import { getSettingsSync } from '../../storage/settings.js';

export async function queryTransformNode(
  client: LLMClient,
  params: QueryTransformParams
): Promise<string> {
  console.info('[QueryTransformNode] Transforming query:', {
    userInput: params.userInput?.substring(0, 100),
    historyLength: params.chatHistory?.length || 0
  });
  // Priority: frontend config > backend cache
  const model = params.llmConfig?.chatModel?.trim() || (() => {
    const settings = getSettingsSync();
    return settings.chat.model?.trim() || '';
  })();
  if (!model || model === '') {
    console.warn('[QueryTransformNode] Model not configured, using original input');
    return params.userInput;
  }
  const system = getPrompt('query_transform_system');
  const history = params.chatHistory.map(m => ({ role: m.role, content: m.content }));
  const user = getPrompt('query_transform_user', undefined as any, {
    history,
    userInput: params.userInput
  });
  try {
    const result = await client.chat({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    });
    const transformed = result.trim();
    console.info('[QueryTransformNode] Query transformed:', {
      original: params.userInput?.substring(0, 100),
      transformed: transformed?.substring(0, 100)
    });
    return transformed;
  } catch (error) {
    console.error('[QueryTransformNode] Query transform failed:', error);
    // Fallback to original input if transform fails
    return params.userInput;
  }
}

