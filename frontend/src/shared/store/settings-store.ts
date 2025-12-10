/**
 * Settings store (Zustand)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Language, Settings, MCPServiceConfig } from 'backend/types.js';
import * as settingsAPI from '../api/settings.js';
import i18n from '../i18n/i18n.js';

// Chrome types declaration
declare const chrome: {
  storage: {
    local: {
      get: (keys?: string[] | string | null) => Promise<Record<string, any>>;
      set: (items: Record<string, any>) => Promise<void>;
    };
  };
};

interface SettingsStore {
  // State
  language: Language;
  theme: 'light' | 'dark' | 'system';
  settings: Partial<Omit<Settings, 'apiKey'>> & { baseUrl?: string }; // baseUrl is included but apiKey is not
  isLoading: boolean;

  // Actions
  // Actions
  loadSettings: () => Promise<void>;
  updateLanguage: (lang: Language) => Promise<void>;
  updateTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;

  // Provider Actions
  addProvider: (provider: Omit<import('backend/types').ModelProvider, 'id'>) => Promise<void>;
  updateProvider: (id: string, updates: Partial<import('backend/types').ModelProvider>) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setDefaultProvider: (id: string) => Promise<void>;
  setActiveChatProvider: (id: string) => Promise<void>;
  setActiveEmbeddingProvider: (id: string) => Promise<void>;
  addMcpService: (service: Omit<MCPServiceConfig, 'id'>) => Promise<void>;
  updateMcpService: (id: string, updates: Partial<MCPServiceConfig>) => Promise<void>;
  removeMcpService: (id: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set: (partial: Partial<SettingsStore> | ((state: SettingsStore) => Partial<SettingsStore>)) => void, get: () => SettingsStore) => ({
      language: 'zh',
      theme: 'system',
      settings: {
        providers: [],
        defaultProviderId: undefined,
        activeChatProviderId: undefined,
        activeEmbeddingProviderId: undefined,
        mcpServices: []
      },
      isLoading: false,

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          const settings = await settingsAPI.getSettings();



          set({ settings, isLoading: false });
        } catch (error) {
          console.error('Failed to load settings:', error);
          set({ isLoading: false });
        }
      },

      updateLanguage: async (lang: Language) => {
        try {
          console.log('[Settings Store] updateLanguage called with:', lang);
          // Update i18n immediately for current context
          i18n.changeLanguage(lang);
          console.log('[Settings Store] i18n.changeLanguage called, current language:', i18n.language);
          // Update Zustand store - persist middleware will handle chrome.storage sync
          // Content-script listens to 'chroma-notes-settings' key and will also update
          set({ language: lang });
          console.log('[Settings Store] Zustand state updated');
          await settingsAPI.setLanguage(lang);
          console.log('[Settings Store] Language persisted to backend');
        } catch (error) {
          console.error('Failed to update language:', error);
        }
      },

      updateTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });
        const root = document.documentElement;
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.toggle('dark', prefersDark);
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
      },

      updateSettings: async (updates: Partial<Settings>) => {
        try {
          // CRITICAL FIX: Use chrome.storage.local directly to avoid Service Worker port closure
          // The Service Worker can be terminated before async message responses complete
          const STORAGE_KEY = 'chroma-settings';

          // 1. Get current settings from chrome.storage
          const result = await chrome.storage.local.get(STORAGE_KEY);
          const currentStoredSettings = result[STORAGE_KEY] || {};

          // 2. Merge updates
          const updatedSettings = {
            ...currentStoredSettings,
            ...updates,
            chat: { ...currentStoredSettings.chat, ...(updates.chat || {}) },
            embedding: { ...currentStoredSettings.embedding, ...(updates.embedding || {}) }
          };

          // 3. Save directly to chrome.storage (bypasses Service Worker)
          await chrome.storage.local.set({ [STORAGE_KEY]: updatedSettings });
          console.info('[Settings Store] Saved settings directly to chrome.storage:', {
            providersCount: updatedSettings.providers?.length || 0
          });

          // 4. Update local Zustand state
          const current = get().settings;
          set({ settings: { ...current, ...updates } });

          // 5. Notify backend to invalidate cache (fire-and-forget, no await)
          // This keeps backend cache in sync but doesn't block the save operation
          settingsAPI.updateSettings(updates).catch((error) => {
            console.warn('[Settings Store] Backend cache invalidation failed (non-critical):', error);
          });
        } catch (error) {
          console.error('Failed to update settings:', error);
          throw error; // Re-throw so UI can show error
        }
      },

      addProvider: async (providerData) => {
        const newProvider = { ...providerData, id: crypto.randomUUID() };
        const currentSettings = get().settings;
        const newProviders = [...(currentSettings.providers || []), newProvider];

        // If first provider, set as default
        const updates: Partial<Settings> = { providers: newProviders };
        if (!currentSettings.defaultProviderId) {
          updates.defaultProviderId = newProvider.id;
          updates.activeChatProviderId = newProvider.id;
          updates.activeEmbeddingProviderId = newProvider.id;
        }

        await get().updateSettings(updates);
      },

      updateProvider: async (id, updates) => {
        const currentSettings = get().settings;
        const newProviders = (currentSettings.providers || []).map(p =>
          p.id === id ? { ...p, ...updates } : p
        );
        await get().updateSettings({ providers: newProviders });
      },

      removeProvider: async (id) => {
        const currentSettings = get().settings;
        const newProviders = (currentSettings.providers || []).filter(p => p.id !== id);
        const updates: Partial<Settings> = { providers: newProviders };

        // Reset defaults if removed
        if (currentSettings.defaultProviderId === id) {
          updates.defaultProviderId = newProviders[0]?.id;
        }
        if (currentSettings.activeChatProviderId === id) {
          updates.activeChatProviderId = newProviders[0]?.id;
        }
        if (currentSettings.activeEmbeddingProviderId === id) {
          updates.activeEmbeddingProviderId = newProviders[0]?.id;
        }

        await get().updateSettings(updates);
      },

      setDefaultProvider: async (id) => {
        await get().updateSettings({ defaultProviderId: id });
      },

      setActiveChatProvider: async (id) => {
        await get().updateSettings({ activeChatProviderId: id });
      },

      setActiveEmbeddingProvider: async (id) => {
        await get().updateSettings({ activeEmbeddingProviderId: id });
      },

      addMcpService: async (serviceData) => {
        const currentSettings = get().settings;
        const newService: MCPServiceConfig = {
          ...serviceData,
          id: crypto.randomUUID(),
          enabled: serviceData.enabled ?? true,
          protocol: 'modelscope'
        };
        const updatedServices: MCPServiceConfig[] = [...(currentSettings.mcpServices || []), newService];
        await get().updateSettings({ mcpServices: updatedServices });
      },

      updateMcpService: async (id, updates) => {
        const currentSettings = get().settings;
        const updatedServices: MCPServiceConfig[] = (currentSettings.mcpServices || []).map((svc) =>
          svc.id === id ? { ...svc, ...updates, protocol: 'modelscope' } : svc
        );
        await get().updateSettings({ mcpServices: updatedServices });
      },

      removeMcpService: async (id) => {
        const currentSettings = get().settings;
        const updatedServices = (currentSettings.mcpServices || []).filter((svc) => svc.id !== id);
        await get().updateSettings({ mcpServices: updatedServices });
      }
    }),
    {
      name: 'chroma-notes-settings',
      storage: createJSONStorage(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return {
            getItem: async (key: string): Promise<string | null> => {
              const result = await chrome.storage.local.get(key);
              return result[key] ? JSON.stringify(result[key]) : null;
            },
            setItem: async (key: string, value: string): Promise<void> => {
              const parsed = JSON.parse(value);
              console.log('[Persist Middleware] setItem called:', { key, parsed });
              await chrome.storage.local.set({ [key]: parsed });
              console.log('[Persist Middleware] chrome.storage.local.set completed');
            },
            removeItem: async (key: string): Promise<void> => {
              await chrome.storage.local.set({ [key]: null });
            }
          };
        }
        return localStorage;
      }),
      partialize: (state: SettingsStore) => ({ language: state.language, theme: state.theme })
    }
  )
);

