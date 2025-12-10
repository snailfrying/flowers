/**
 * Type-safe API client for frontend
 * Provides typed wrappers for Service Worker message communication
 */

import type {
  MessageRequest,
  MessageResponse,
  Result,
  StreamMessage,
  TranslateParams,
  PolishParams,
  ChatParams,
  NoteGenerationParams,
  Note,
  FAQItem,
  Settings,
  Language
} from '../types.js';

// Chrome Extension types (for frontend context)
declare const chrome: {
  runtime: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    lastError?: { message: string };
    connect: (options: { name: string }) => {
      postMessage: (message: any) => void;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
        removeListener: (callback: (message: any) => void) => void;
      };
      disconnect: () => void;
    };
  };
};
import type {
  MessageAction,
  MessageRequestParams,
  MessageResponseData,
  TypedMessageRequest,
  TypedMessageResponse
} from './message-types.js';
import type { PromptKey } from './prompts/index.js';

/**
 * Generic message sender with type safety
 */
async function sendMessage<A extends MessageAction>(
  action: A,
  params?: MessageRequestParams[A]
): Promise<MessageResponseData[A]> {
  const requestId = `${action}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const request: TypedMessageRequest<A> = {
    action,
    params,
    requestId
  } as any;

  return new Promise((resolve, reject) => {
    let settled = false;
    // Timeout extended to 120 seconds for slow local Ollama models
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Request timeout'));
      }
    }, 120000);

    chrome.runtime.sendMessage(request, (response: TypedMessageResponse<A>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response && (response as any).success && (response as any).data !== undefined) {
        resolve((response as any).data);
      } else {
        reject(new Error((response as any)?.error?.message || 'Unknown error'));
      }
    });
  });
}

/**
 * Generic stream sender with type safety
 */
function sendStream<A extends MessageAction>(
  action: A,
  params?: MessageRequestParams[A]
): AsyncIterable<MessageResponseData[A]> {
  const requestId = `${action}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const port = chrome.runtime.connect({ name: `${action}_${requestId}` });

  return {
    async *[Symbol.asyncIterator]() {
      port.postMessage({ action, params, stream: true, requestId });

      while (true) {
        const message = await new Promise<StreamMessage>((resolve, reject) => {
          const listener = (msg: StreamMessage) => {
            if (msg.requestId === requestId) {
              port.onMessage.removeListener(listener);
              resolve(msg);
            }
          };
          port.onMessage.addListener(listener);

          // Timeout extended to 180 seconds for slow local Ollama models with RAG
          setTimeout(() => {
            port.onMessage.removeListener(listener);
            reject(new Error('Stream timeout'));
          }, 180000);
        });

        if (message.type === 'chunk') {
          yield { content: message.content!, trace: message.trace } as any;
        } else if (message.type === 'done') {
          break;
        } else if (message.type === 'error') {
          throw new Error(message.error?.message || 'Stream error');
        }
      }

      port.disconnect();
    }
  };
}

/**
 * Agent API client
 */
export const agentAPI = {
  translate: (params: TranslateParams) => sendMessage('agent:translate', params),
  polish: (params: PolishParams) => sendMessage('agent:polish', params),
  generateNote: (params: NoteGenerationParams) => sendMessage('agent:generateNote', params),
  chat: (params: ChatParams & { mcpEnabled?: boolean }) => sendMessage('agent:chat', params),
  chatStream: (params: ChatParams & { mcpEnabled?: boolean }) => sendStream('agent:chatStream', { ...params, stream: true } as any),
  askWithContext: (params: { text: string; sourceUrl?: string }) => sendMessage('agent:askWithContext', params)
};

/**
 * Notes API client
 */
export const notesAPI = {
  create: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => sendMessage('notes:create', note),
  read: (id: string) => sendMessage('notes:read', id),
  readAll: () => sendMessage('notes:readAll', undefined),
  update: (id: string, updates: Partial<Note>) => sendMessage('notes:update', { id, updates }),
  delete: (id: string) => sendMessage('notes:delete', id),
  deleteBatch: (ids: string[]) => sendMessage('notes:deleteBatch', ids),
  search: (query: string, tags?: string[]) => sendMessage('notes:search', { query, tags }),
  export: (format: 'json' | 'markdown') => sendMessage('notes:export', { format })
};

/**
 * FAQ API client
 */
export const faqsAPI = {
  import: (faqs: Array<{ question: string; answer: string; tags?: string[] }>) =>
    sendMessage('faqs:import', faqs)
};

/**
 * Settings API client
 */
export const settingsAPI = {
  get: () => sendMessage('settings:get', undefined),
  update: (updates: Partial<Settings>) => sendMessage('settings:update', updates),
  setBaseUrl: (url: string) => sendMessage('settings:setBaseUrl', url),
  setApiKey: (key: string) => sendMessage('settings:setApiKey', key),
  setLanguage: (lang: Language) => sendMessage('settings:setLanguage', lang),
  setChatModel: (model: string, type?: 'llm' | 'vlm') => sendMessage('settings:setChatModel', { model, type }),
  setEmbeddingModel: (model: string) => sendMessage('settings:setEmbeddingModel', model),
  setProvider: (provider: Settings['provider']) => sendMessage('settings:setProvider', provider)
};

/**
 * Prompts API client
 */
export const promptsAPI = {
  getAll: (lang?: Language) => sendMessage('prompts:getAll', { lang }),
  setOverride: (key: PromptKey, lang: Language, value: string) =>
    sendMessage('prompts:setOverride', { key, lang, value }),
  resetOverride: (key: PromptKey, lang: Language) => sendMessage('prompts:resetOverride', { key, lang })
};

