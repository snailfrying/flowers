import type { Settings } from '../types.js';
import { envGet } from './env.js';

/**
 * Get default settings from env.yaml
 * No fallback values - if not configured, will throw error
 * Priority: Frontend configuration > env.yaml > Error
 */
export function getDefaultSettings(): Settings {
  // Check if we're in a browser/Service Worker environment
  // In Chrome Extension, env.yaml cannot be read, so we should use minimal defaults
  const isBrowser = typeof window !== 'undefined' || (typeof globalThis !== 'undefined' && (globalThis as any).__CHROMA_SW__);

  if (isBrowser) {
    // In browser/Service Worker, return minimal defaults
    // Settings will be loaded from Chrome Storage (user configuration)
    return {
      provider: 'dashscope' as any,
      baseUrl: '',
      chat: {
        type: 'llm',
        model: ''
      },
      embedding: {
        model: ''
      },
      apiKey: '',
      language: 'zh',
    providers: [],
    theme: 'system',
    mcpServices: []
    };
  }

  // In Node.js environment, try to read from env.yaml
  // Provider: required from env.yaml, but can be overridden by frontend
  const provider = envGet('LLM_PROVIDER', false) || 'dashscope';

  // Base URL: required from env.yaml, but can be overridden by frontend
  const baseUrl = envGet('DASHSCOPE_BASE_URL', true);

  // Chat model: required from env.yaml, but can be overridden by frontend
  const chatModel = envGet('DASHSCOPE_LLM_MODEL', true);

  // Embedding model: required from env.yaml, but can be overridden by frontend
  const embeddingModel = envGet('DASHSCOPE_EMBEDDING_MODEL', true);

  // API Key: optional from env.yaml (can be set by frontend)
  const apiKey = envGet('DASHSCOPE_API_KEY', false);

  // Language: optional, defaults to 'zh'
  const language = (envGet('APP_LANG', false) || 'zh') as 'zh' | 'en';

  return {
    provider: provider as any,
    baseUrl,
    chat: {
      type: 'llm',
      model: chatModel
    },
    embedding: {
      model: embeddingModel
    },
    apiKey: apiKey || '', // Empty if not configured - will be set by frontend
    language,
    providers: [],
    theme: 'system',
    mcpServices: []
  };
}

/**
 * Default settings - will be initialized from env.yaml
 * This is a lazy getter to avoid errors during module initialization
 */
let _defaultSettings: Settings | null = null;

export function getDefaultSettingsSafe(): Settings {
  if (!_defaultSettings) {
    try {
      _defaultSettings = getDefaultSettings();
    } catch (error: any) {
      // In Chrome Extension Service Worker, env.yaml might not be available
      // Return minimal settings - will be overridden by frontend configuration
      console.warn('[Defaults] Failed to load from env.yaml, using minimal defaults:', error?.message);
      _defaultSettings = {
        provider: 'dashscope' as any,
        baseUrl: '',
        chat: {
          type: 'llm',
          model: ''
        },
        embedding: {
          model: ''
        },
        apiKey: '',
        language: 'zh',
        providers: [],
        theme: 'system',
        mcpServices: []
      };
    }
  }
  return _defaultSettings;
}

export const DEFAULT_SETTINGS: Settings = getDefaultSettingsSafe();

export function getDefaultVlmModel(): string {
  try {
    return envGet('DASHSCOPE_VLM_MODEL', false);
  } catch {
    return '';
  }
}

export const DEFAULT_VLM_MODEL = getDefaultVlmModel();
