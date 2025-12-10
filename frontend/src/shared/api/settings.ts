/**
 * Settings API client (frontend wrapper)
 */

// @ts-ignore - Runtime import, types from backend/types.js
import { settingsAPI } from 'backend/index.js';
import type { Settings, Language } from 'backend/types.js';

export const getSettings = () => settingsAPI.get();
export const updateSettings = (updates: Partial<Settings>) => settingsAPI.update(updates);
export const setBaseUrl = (url: string) => settingsAPI.setBaseUrl(url);
export const setApiKey = (key: string) => settingsAPI.setApiKey(key);
export const setLanguage = (lang: Language) => settingsAPI.setLanguage(lang);
export const setChatModel = (model: string, type?: 'llm' | 'vlm') => settingsAPI.setChatModel(model, type);
export const setEmbeddingModel = (model: string) => settingsAPI.setEmbeddingModel(model);
export const setProvider = (provider: Settings['provider']) => settingsAPI.setProvider(provider);

