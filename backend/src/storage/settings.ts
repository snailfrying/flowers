import { getDefaultSettingsSafe } from '../config/defaults.js';
import type { Settings, ModelType, Provider } from '../types.js';

// Chrome Extension types (for Service Worker context)
declare const chrome: {
  storage?: {
    local?: {
      get: (keys?: string[] | string | null) => Promise<Record<string, any>>;
      set: (items: Record<string, any>) => Promise<void>;
    };
  };
};

const STORAGE_KEY = 'chroma-settings';

// In-memory cache (will be refreshed on each getSettings call in SW)
let current: Settings | null = null;
let lastLoadTime = 0;
const CACHE_TTL = 100; // 100ms cache to avoid redundant reads

/**
 * Load settings from Chrome Storage - always fresh, no stale cache
 */
export async function loadSettingsFromStorage(): Promise<Settings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const defaults = getDefaultSettingsSafe();

      if (result[STORAGE_KEY]) {
        const saved: Partial<Settings> = result[STORAGE_KEY];
        // Merge saved settings with defaults
        const merged: Settings = {
          ...defaults,
          ...saved,
          chat: { ...defaults.chat, ...(saved.chat || {}) },
          embedding: { ...defaults.embedding, ...(saved.embedding || {}) },
          mcpServices: Array.isArray(saved.mcpServices) ? saved.mcpServices : defaults.mcpServices
        };

        // Migration: If no providers but legacy config exists, create a default provider
        if ((!merged.providers || merged.providers.length === 0) && merged.baseUrl) {
          const legacyProvider: import('../types.js').ModelProvider = {
            id: crypto.randomUUID(),
            name: 'Default Provider',
            type: merged.provider || 'openai_compatible',
            baseUrl: merged.baseUrl,
            apiKey: merged.apiKey,
            models: merged.chat?.model ? [merged.chat.model] : [],
            enabled: true
          };
          merged.providers = [legacyProvider];
          merged.defaultProviderId = legacyProvider.id;
          merged.activeChatProviderId = legacyProvider.id;

          // Persist migration immediately
          await chrome.storage.local.set({ [STORAGE_KEY]: merged });
        }

        current = merged;
        lastLoadTime = Date.now();
        console.info('[Settings] Loaded from Chrome Storage:', {
          hasBaseUrl: !!merged.baseUrl,
          hasApiKey: !!merged.apiKey,
          provider: merged.provider,
          chatModel: merged.chat.model,
          providersCount: merged.providers?.length || 0
        });
        return merged;
      } else {
        // No saved settings, use defaults
        current = defaults;
        lastLoadTime = Date.now();
        console.info('[Settings] No saved settings, using defaults');
        return defaults;
      }
    } else {
      // Fallback to defaults
      const defaults = getDefaultSettingsSafe();
      current = defaults;
      return defaults;
    }
  } catch (error: any) {
    console.error('[Settings] Failed to load from Chrome Storage:', error);
    const defaults = getDefaultSettingsSafe();
    current = defaults;
    return defaults;
  }
}

/**
 * Save settings to Chrome Storage and invalidate cache
 */
async function saveSettingsToStorage(settings: Settings): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      // Save to Chrome Storage first
      await chrome.storage.local.set({ [STORAGE_KEY]: settings });
      // Immediately update cache to ensure consistency
      current = settings;
      lastLoadTime = Date.now();
      // Verify save by reading back (optional, but ensures consistency)
      const verify = await chrome.storage.local.get(STORAGE_KEY);
      if (verify[STORAGE_KEY]?.chat?.model !== settings.chat?.model) {
        console.warn('[Settings] Verification mismatch after save, retrying...');
        await chrome.storage.local.set({ [STORAGE_KEY]: settings });
        current = settings;
        lastLoadTime = Date.now();
      }
      console.info('[Settings] Saved to Chrome Storage:', {
        hasBaseUrl: !!settings.baseUrl,
        hasApiKey: !!settings.apiKey,
        chatModel: settings.chat.model
      });
    }
  } catch (error: any) {
    console.error('[Settings] Failed to save to Chrome Storage:', error);
    throw error;
  }
}

/**
 * Get settings - always fresh from storage (with short cache to avoid redundant reads)
 */
export async function getSettings(): Promise<Settings> {
  const now = Date.now();
  // Always refresh from storage to ensure consistency (Chrome Storage is fast)
  // Cache is only for performance optimization, but we prioritize consistency
  if (!current || (now - lastLoadTime) > CACHE_TTL) {
    return await loadSettingsFromStorage();
  }
  // Return a copy to prevent mutation
  return { ...current };
}

/**
 * Get settings synchronously (from cache) - use only when async is not possible
 * WARNING: May return stale data if cache hasn't been loaded yet
 */
export function getSettingsSync(): Settings {
  if (!current) {
    // Fallback to defaults if not loaded yet
    return getDefaultSettingsSafe();
  }
  return { ...current };
}

export async function getSettingsSafe(): Promise<Omit<Settings, 'apiKey'> & { hasApiKey?: boolean }> {
  const settings = await getSettings();
  // Do not expose apiKey for security reasons, but include a flag so UI can indicate saved state
  const { apiKey: _omit, ...rest } = settings;
  return { ...rest, hasApiKey: !!settings.apiKey } as any;
}

export async function setBaseUrl(url: string): Promise<void> {
  const settings = await getSettings();
  settings.baseUrl = url;
  await saveSettingsToStorage(settings);
}

export async function setApiKey(key?: string): Promise<void> {
  const settings = await getSettings();
  settings.apiKey = key || '';
  await saveSettingsToStorage(settings);
}

export async function setLanguage(lang: Settings['language']): Promise<void> {
  const settings = await getSettings();
  settings.language = lang;
  await saveSettingsToStorage(settings);
}

export async function setChatModel(model: string, type?: ModelType): Promise<void> {
  const settings = await getSettings();
  settings.chat.model = model;
  if (type) settings.chat.type = type;
  await saveSettingsToStorage(settings);
}

export async function setEmbeddingModel(model: string): Promise<void> {
  const settings = await getSettings();
  settings.embedding.model = model;
  await saveSettingsToStorage(settings);
}

export async function setProvider(provider: Provider): Promise<void> {
  const settings = await getSettings();
  settings.provider = provider;
  await saveSettingsToStorage(settings);
}

export async function overrideSettings(partial: Partial<Settings>): Promise<void> {
  const settings = await getSettings();
  const updated: Settings = {
    ...settings,
    ...partial,
    chat: { ...settings.chat, ...(partial.chat || {}) },
    embedding: { ...settings.embedding, ...(partial.embedding || {}) }
  };
  await saveSettingsToStorage(updated);
}

