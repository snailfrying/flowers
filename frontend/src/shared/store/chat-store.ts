/**
 * Chat store (Zustand)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ChatMessage, ChatImage, MCPTrace } from 'backend/types.js';
import * as agentAPI from '../api/agent.js';
import { settingsAPI } from 'backend/index.js';

// Chrome types declaration
declare const chrome: {
  storage: {
    local: {
      get: (keys?: string[] | string | null) => Promise<Record<string, any>>;
      set: (items: Record<string, any>) => Promise<void>;
    };
  };
};

interface ChatStore {
  // State
  history: ChatMessage[];
  isLoading: boolean;
  enabledTools: { rag: boolean; mcp: boolean };
  modelType: 'llm' | 'vlm';
  selectedModel: string | null; // User-selected model from current provider
  mcpTrace: MCPTrace | null;
  currentStream: string | null; // Current streaming content
  pendingContext: { text: string; sourceUrl?: string } | null;
  activeMcpServices: string[];

  // Actions
  sendMessage: (input: string, images?: ChatImage[]) => Promise<void>;
  sendStream: (input: string, images?: ChatImage[]) => Promise<AsyncIterable<{ content: string; trace?: MCPTrace }>>;
  toggleTool: (tool: 'rag' | 'mcp') => void;
  setModelType: (type: 'llm' | 'vlm') => void;
  setSelectedModel: (model: string) => void;
  clearHistory: () => void;
  appendToHistory: (message: ChatMessage) => void;
  setCurrentStream: (content: string | null) => void;
  setMCPTrace: (trace: MCPTrace | null) => void;
  injectContext: (context: string, sourceUrl?: string) => void;
  clearInjectedContext: () => void;
  askWithContext: (context: string, sourceUrl?: string) => Promise<void>;
  setActiveMcpServices: (ids: string[]) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set: (partial: Partial<ChatStore> | ((state: ChatStore) => Partial<ChatStore>)) => void, get: () => ChatStore) => ({
      history: [],
      isLoading: false,
      enabledTools: { rag: true, mcp: false },
      modelType: 'llm',
      selectedModel: null,
      mcpTrace: null,
      currentStream: null,
      pendingContext: null,
      activeMcpServices: [],

      sendMessage: async (input: string, images?: ChatImage[]) => {
        const { history, enabledTools, modelType, pendingContext, activeMcpServices } = get();
        set({ isLoading: true, currentStream: null });

        // Get LLM config from frontend settings - use provider-based config
        let llmConfig: any = undefined;
        try {
          const s = await settingsAPI.get();

          // Find the active chat provider
          const chatProvider = s.providers?.find(p => p.id === s.activeChatProviderId);

          if (!chatProvider) {
            throw new Error('Chat provider is not configured. Please select a chat provider in settings.');
          }

          // Use selected model from UI, or provider's chatModel, or fallback to legacy
          const chatModel = get().selectedModel || chatProvider.chatModel || s.chat?.model;

          if (!chatModel || chatModel.trim() === '') {
            throw new Error('Chat model is not configured.');
          }

          // Build LLM config from provider configuration
          llmConfig = {
            baseUrl: chatProvider.baseUrl,
            chatModel: chatModel,
            chatType: s.chat?.type,
            provider: chatProvider.type
            // Don't pass apiKey - backend will use its own from storage
          };
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }

        // Add user message
        const userMessage: ChatMessage = {
          role: 'user',
          content: input,
          ...(images && images.length > 0 && { images })
        };
        set((state: ChatStore) => ({ history: [...state.history, userMessage] }));

        try {
          const result = await agentAPI.chat({
            userInput: input,
            history,
            modelType,
            images,
            stream: false,
            ragContext: pendingContext ? [pendingContext.text] : undefined,
            ragEnabled: enabledTools.rag,
            mcpEnabled: enabledTools.mcp,
            mcpServices: enabledTools.mcp ? activeMcpServices : undefined,
            llmConfig
          });

          // Add assistant message
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: result.response
          };
          set((state: ChatStore) => ({
            history: [...state.history, assistantMessage],
            mcpTrace: result.trace || null,
            isLoading: false,
            pendingContext: null
          }));
        } catch (error) {
          console.error('Failed to send message:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      sendStream: async (input: string, images?: ChatImage[]) => {
        const { history, enabledTools, modelType, pendingContext, activeMcpServices } = get();
        set({ isLoading: true, currentStream: '' });

        // Add user message
        const userMessage: ChatMessage = {
          role: 'user',
          content: input,
          ...(images && images.length > 0 && { images })
        };
        set((state: ChatStore) => ({ history: [...state.history, userMessage] }));

        // Get LLM config from frontend settings - use provider-based config
        let llmConfig: any = undefined;
        try {
          const s = await settingsAPI.get();

          // Find the active chat provider
          const chatProvider = s.providers?.find(p => p.id === s.activeChatProviderId);

          if (chatProvider) {
            // Use selected model from UI, or provider's chatModel, or fallback to legacy
            const chatModel = get().selectedModel || chatProvider.chatModel || s.chat?.model;

            llmConfig = {
              baseUrl: chatProvider.baseUrl,
              chatModel: chatModel,
              chatType: s.chat?.type,
              provider: chatProvider.type
            };
          }
        } catch (e) {
          console.warn('Failed to get LLM config, will use backend cache:', e);
        }

        // Return async generator
        return (async function* () {
          try {
            let fullContent = '';
            let trace: MCPTrace | undefined;

            for await (const chunk of agentAPI.chatStream({
              userInput: input,
              history,
              modelType,
              images,
              stream: true,
              ragContext: pendingContext ? [pendingContext.text] : undefined,
              ragEnabled: enabledTools.rag,
              mcpEnabled: enabledTools.mcp,
              mcpServices: enabledTools.mcp ? activeMcpServices : undefined,
              llmConfig
            })) {
              fullContent += chunk.content;
              set({ currentStream: fullContent });

              if (chunk.trace && !trace) {
                trace = chunk.trace;
                set({ mcpTrace: trace });
              }

              yield { content: chunk.content, trace: chunk.trace };
            }

            // Add assistant message after stream completes
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: fullContent
            };
            set((state: ChatStore) => ({
              history: [...state.history, assistantMessage],
              isLoading: false,
              currentStream: null,
              pendingContext: null
            }));
          } catch (error) {
            console.error('Failed to send stream:', error);
            set({ isLoading: false, currentStream: null });
            throw error;
          }
        })();
      },

      toggleTool: (tool: 'rag' | 'mcp') => {
        set((state: ChatStore) => ({
          enabledTools: {
            ...state.enabledTools,
            [tool]: !state.enabledTools[tool]
          }
        }));
      },

      setModelType: (type: 'llm' | 'vlm') => {
        set({ modelType: type });
      },

      setSelectedModel: (model: string) => {
        set({ selectedModel: model });
      },

      clearHistory: () => {
        set({ history: [], mcpTrace: null, currentStream: null, pendingContext: null });
      },

      appendToHistory: (message: ChatMessage) => {
        set((state: ChatStore) => ({ history: [...state.history, message] }));
      },

      setCurrentStream: (content: string | null) => {
        set({ currentStream: content });
      },

      setMCPTrace: (trace: MCPTrace | null) => {
        set({ mcpTrace: trace });
      },

      injectContext: (context: string, sourceUrl?: string) => {
        set({ pendingContext: { text: context, sourceUrl } });
      },

      clearInjectedContext: () => {
        set({ pendingContext: null });
      },

      askWithContext: async (context: string, sourceUrl?: string) => {
        // Show a user message, then call backend to compose prefix and respond
        const userMessage: ChatMessage = { role: 'user', content: context };
        set((state: ChatStore) => ({ history: [...state.history, userMessage], isLoading: true }));
        try {
          const result = await agentAPI.askWithContext({ text: context, sourceUrl });
          const assistantMessage: ChatMessage = { role: 'assistant', content: result.response };
          set((state: ChatStore) => ({ history: [...state.history, assistantMessage], isLoading: false, mcpTrace: result.trace || null }));
        } catch (error) {
          console.error('Failed to ask with context:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      setActiveMcpServices: (ids: string[]) => {
        set({ activeMcpServices: ids });
      }
    }),
    {
      name: 'chroma-notes-chat',
      storage: createJSONStorage(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          return {
            getItem: async (key: string): Promise<string | null> => {
              const result = await chrome.storage.local.get(key);
              return result[key] ? JSON.stringify(result[key]) : null;
            },
            setItem: async (key: string, value: string): Promise<void> => {
              await chrome.storage.local.set({ [key]: JSON.parse(value) });
            },
            removeItem: async (key: string): Promise<void> => {
              await chrome.storage.local.set({ [key]: null });
            }
          };
        }
        return localStorage;
      }),
      partialize: (state: ChatStore) => ({
        history: state.history.slice(-50), // Keep last 50 messages
        enabledTools: state.enabledTools,
        modelType: state.modelType,
        selectedModel: state.selectedModel,
        activeMcpServices: state.activeMcpServices
      })
    }
  )
);

