/**
 * Prompts API client (frontend wrapper)
 */

// @ts-ignore - Runtime import, types from backend/types.js
import { promptsAPI } from 'backend/index.js';
import type { Language } from 'backend/types.js';
import type { PromptKey } from 'backend/services/prompts/index.js';

export const getAllPrompts = (lang?: Language) => promptsAPI.getAll(lang);
export const setPromptOverride = (key: PromptKey, lang: Language, value: string) =>
  promptsAPI.setOverride(key, lang, value);
export const resetPromptOverride = (key: PromptKey, lang: Language) =>
  promptsAPI.resetOverride(key, lang);

