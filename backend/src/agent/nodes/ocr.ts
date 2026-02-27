/**
 * OCR Node - Extract text from images using VLM (Vision Language Model)
 * Requires a model that supports vision (GPT-4o, Claude 3, Gemini, Qwen-VL, etc.)
 */

import type { LLMClient, ChatMessage, ChatImage } from '../../types.js';
import { getSettingsSync } from '../../storage/settings.js';
import { getPrompt } from '../../services/prompts/index.js';

export interface OCRParams {
  imageBase64: string;
  mimeType: string;
  llmConfig?: { chatModel?: string };
}

export interface OCRResult {
  text: string;
  confidence: number;
}

/**
 * Extract text from image using VLM
 * @throws Error if model does not support vision - user must configure a VLM
 */
export async function ocrNode(client: LLMClient, params: OCRParams): Promise<OCRResult> {
  const settings = getSettingsSync();

  const model = params.llmConfig?.chatModel?.trim() ||
    (() => {
      const providerId = settings.defaultProviderId || settings.activeChatProviderId;
      const provider: { chatModel?: string; models?: string[] } | undefined =
        providerId && settings.providers ? settings.providers.find(p => p.id === providerId) : undefined;
      return provider?.chatModel || provider?.models?.[0] || settings.chat?.model || '';
    })();

  if (!model || model.trim() === '') {
    throw new Error(
      'Chat model is not configured. Please configure a model in Settings → Model Config.'
    );
  }

  const systemPrompt = getPrompt('ocr_system');
  const userPrompt = getPrompt('ocr_user');

  const images: ChatImage[] = [{
    mimeType: params.mimeType,
    data: params.imageBase64
  }];

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt, images }
  ];

  const raw = await client.chat({
    model,
    messages,
    stream: false
  });

  const text = (raw || '').trim();
  const normalized = text === '[NO_TEXT_DETECTED]' ? '' : text;

  return {
    text: normalized,
    confidence: normalized ? 0.9 : 0
  };
}
