import type { ChatParams, ChatMessage, LLMClient, ModelType } from '../../types.js';
import { getPrompt } from '../../services/prompts/index.js';
import { getSettingsSync } from '../../storage/settings.js';

export async function chatNode(client: LLMClient, params: ChatParams): Promise<string> {
  // Priority: frontend config > backend cache
  const model = params.llmConfig?.chatModel?.trim() || 
    (() => {
      const settings = getSettingsSync();
      return params.modelType === 'vlm' && settings.chat.type === 'vlm' 
        ? (settings.chat.model?.trim() || '') 
        : (settings.chat.model?.trim() || '');
    })();
  
  if (!model || model === '') {
    throw new Error('Chat model is not configured. Please configure it in the extension settings or env.yaml.');
  }
  console.info('[ChatNode] Using model:', model, 'modelType:', params.modelType, 'from:', params.llmConfig ? 'frontend' : 'backend cache');
  
  const system = getPrompt('chat_system');
  const history: ChatMessage[] = params.history || [];
  const messages: ChatMessage[] = [{ role: 'system', content: system }, ...history, { role: 'user', content: params.userInput }];
  if (params.modelType === 'vlm' && params.images?.length) {
    messages[messages.length - 1] = { role: 'user', content: params.userInput, images: params.images };
  }
  return client.chat({ model: model, messages, stream: false });
}

export async function* chatNodeStream(client: LLMClient, params: ChatParams) {
  // Priority: frontend config > backend cache
  const model = params.llmConfig?.chatModel?.trim() || (() => {
    const settings = getSettingsSync();
    return settings.chat.model?.trim() || '';
  })();
  
  if (!model || model === '') {
    throw new Error('Chat model is not configured. Please configure it in the extension settings or env.yaml.');
  }
  console.info('[ChatNodeStream] Using model:', model, 'modelType:', params.modelType, 'from:', params.llmConfig ? 'frontend' : 'backend cache');
  
  const system = getPrompt('chat_system');
  const history: ChatMessage[] = params.history || [];
  const messages: ChatMessage[] = [{ role: 'system', content: system }, ...history, { role: 'user', content: params.userInput }];
  if (params.modelType === 'vlm' && params.images?.length) {
    messages[messages.length - 1] = { role: 'user', content: params.userInput, images: params.images };
  }
  if (!client.chatStream) {
    yield { content: await client.chat({ model: model, messages, stream: false }), done: true };
    return;
  }
  for await (const chunk of client.chatStream({ model: model, messages, stream: true })) {
    yield chunk;
  }
}

