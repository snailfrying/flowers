import type {
  MessageRequest,
  MessageResponse,
  Result,
  TranslateParams,
  PolishParams,
  ChatParams,
  NoteGenerationParams,
  Note,
  FAQItem,
  Settings,
  Language
} from '../types.js';
import { CoreAgent } from '../agent/index.js';
import { SyncService } from '../storage/syncService.js';
import { RAGService } from '../services/rag/index.js';
import { ChromeStorageNotesStore } from '../storage/notesStore.js';
import { createClientByProvider } from '../services/clientFactory.js';
import {
  getSettings,
  getSettingsSafe,
  overrideSettings,
  setBaseUrl,
  setApiKey,
  setLanguage,
  setChatModel,
  setEmbeddingModel,
  setProvider
} from '../storage/settings.js';
import {
  getPrompt,
  getAllPrompts,
  setPromptOverride,
  resetPromptOverride,
  loadPromptOverridesFromStorage,
  type PromptKey
} from '../services/prompts/index.js';
import { setLang } from '../services/i18n/index.js';

/**
 * Unified Service Worker message handler
 * Handles all messages from frontend and routes to backend services
 */
export class ServiceWorkerMessageHandler {
  private agent: CoreAgent | null = null;
  private syncService: SyncService | null = null;
  private notesStore: ChromeStorageNotesStore;

  constructor() {
    // Only initialize lightweight services in constructor
    // Delay RAGService initialization to avoid DOM access issues in Service Worker
    this.notesStore = new ChromeStorageNotesStore();
    // Load prompt overrides from storage on initialization
    loadPromptOverridesFromStorage().catch((err) => {
      console.error('[Backend] Failed to load prompt overrides:', err);
    });
  }

  private async initializeServices(): Promise<void> {
    if (this.agent && this.syncService) return;

    console.info('[Backend] initializeServices started');
    // Load settings from Chrome Storage before initializing services
    // Use getSettings() instead of getSettingsSafe() to include apiKey for backend logic
    const settings = await getSettings();
    setLang(settings.language || 'zh');
    console.info('[Backend] Settings loaded for initialization:', {
      hasBaseUrl: !!settings.baseUrl,
      baseUrl: settings.baseUrl || '(empty)',
      hasApiKey: !!settings.apiKey,
      apiKeyLength: settings.apiKey?.length || 0,
      hasChatModel: !!settings.chat?.model,
      chatModel: settings.chat?.model || '(empty)',
      hasEmbeddingModel: !!settings.embedding?.model,
      embeddingModel: settings.embedding?.model || '(empty)',
      provider: settings.provider
    });

    // Check if required settings are missing
    const hasLegacyConfig = settings.baseUrl && settings.baseUrl.trim() !== '';
    const hasProviders = settings.providers && settings.providers.length > 0;

    if (!hasLegacyConfig && !hasProviders) {
      console.warn('[Backend] No LLM providers configured. Please add a provider in Settings.');
    }

    // Check chat model
    const hasLegacyModel = settings.chat?.model && settings.chat.model.trim() !== '';
    const hasProviderModel = settings.providers?.some(p => p.chatModel || p.models?.length > 0);

    if (!hasLegacyModel && !hasProviderModel) {
      console.warn('[Backend] No chat model configured.');
    }

    // Initialize backend services lazily
    let ragService: RAGService;
    try {
      const embeddingClient = createClientByProvider(undefined, settings.activeEmbeddingProviderId || settings.defaultProviderId);
      ragService = new RAGService(embeddingClient);
    } catch (e: any) {
      // If LLM settings are not configured, fall back to a no-op RAG service
      console.warn('[Backend] Failed to create embedding client, using no-op RAG service:', e?.message || String(e));
      // Minimal no-op implementation to keep notes CRUD working without vector features
      const noop = {
        indexNote: async () => { },
        updateNote: async () => { },
        deleteNote: async () => { },
        indexFAQ: async () => { },
        updateFAQ: async () => { },
        deleteFAQ: async () => { },
        retrieve: async () => ({ chunks: [] as any[] })
      } as unknown as RAGService;
      ragService = noop;
    }

    this.agent = new CoreAgent(ragService);
    this.syncService = new SyncService(this.notesStore, ragService);
    console.info('[Backend] initializeServices completed');
  }

  /**
   * Handle incoming message and return unified Result format
   */
  async handleMessage<T = any>(request: MessageRequest): Promise<MessageResponse<T>> {
    const { action, params, requestId } = request;

    try {
      console.info('[Backend] MessageHandler received:', { action, requestId, paramsKeys: Object.keys(params || {}) });

      // Initialize services if needed (lazy initialization)
      await this.initializeServices();
      console.info('[Backend] Services initialized:', { hasAgent: !!this.agent, hasSyncService: !!this.syncService });

      let data: any;

      switch (action) {
        // Agent actions
        case 'agent:translate':
          console.info('[Backend] Calling agent.translate...', { textLength: (params as TranslateParams).text?.length || 0 });
          data = await this.agent!.translate(params as TranslateParams);
          console.info('[Backend] agent.translate result:', { resultLength: data?.length || 0 });
          break;

        case 'agent:translateFullPage':
          console.info('[Backend] Calling agent.translate (full-page)...', {
            textLength: (params as TranslateParams).text?.length || 0,
            targetLang: (params as TranslateParams).targetLang,
            requestId
          });
          data = await this.agent!.translate({ ...(params as TranslateParams), mode: 'full-page' });
          console.info('[Backend] agent.translate (full-page) result:', {
            resultLength: data?.length || 0,
            requestId
          });
          break;

        case 'agent:polish':
          console.info('[Backend] Calling agent.polish...', { textLength: (params as PolishParams).text?.length || 0 });
          data = await this.agent!.polish(params as PolishParams);
          console.info('[Backend] agent.polish result:', { resultLength: data?.length || 0 });
          break;

        case 'agent:generateNote': {
          console.info('[Backend] Calling agent.generateNote...', {
            selectedTextLength: (params as NoteGenerationParams).selectedText?.length || 0,
            sourceUrl: (params as NoteGenerationParams).sourceUrl
          });
          const result = await this.agent!.generateNote(params as NoteGenerationParams);
          console.info('[Backend] agent.generateNote result:', {
            hasResult: !!result,
            title: result?.title,
            contentLength: result?.content?.length || 0,
            tagsCount: result?.tags?.length || 0
          });
          data = result;
          break;
        }

        case 'agent:chat': {
          const { mcpEnabled = false, ...chatParams } = params as ChatParams & { mcpEnabled?: boolean };
          const result = await this.agent!.chat(chatParams, mcpEnabled);
          data = result;
          break;
        }

        case 'agent:askWithContext': {
          const { text, sourceUrl } = params as { text: string; sourceUrl?: string };
          const result = await this.agent!.askWithContext({ text, sourceUrl });
          data = result;
          break;
        }

        case 'agent:ocr': {
          const { imageBase64, mimeType } = params as { imageBase64: string; mimeType: string };
          console.info('[Backend] Calling agent.ocr...', {
            imageSizeKB: imageBase64 ? Math.round(imageBase64.length * 0.75 / 1024) : 0,
            mimeType
          });
          const result = await this.agent!.ocr({ imageBase64, mimeType });
          console.info('[Backend] agent.ocr result:', { textLength: result?.text?.length || 0 });
          data = result;
          break;
        }

        // Notes actions
        case 'notes:create':
          data = await this.syncService!.createNote(params as Omit<Note, 'id' | 'createdAt' | 'updatedAt'>);
          break;

        case 'notes:read':
          data = await this.syncService!.readNote(params as string);
          break;

        case 'notes:readAll':
          data = await this.syncService!.readAllNotes();
          break;

        case 'notes:update': {
          const { id, updates } = params as { id: string; updates: Partial<Note> };
          data = await this.syncService!.updateNote(id, updates);
          break;
        }

        case 'notes:delete':
          await this.syncService!.deleteNote(params as string);
          data = true;
          break;

        case 'notes:deleteBatch':
          await this.syncService!.deleteNotes(params as string[]);
          data = true;
          break;

        case 'notes:search': {
          const { query, tags } = params as { query: string; tags?: string[] };
          await this.initializeServices(); // RAG search needs services
          data = await this.syncService!.searchNotes(query, tags);
          break;
        }

        case 'notes:export': {
          const { format } = params as { format: 'json' | 'markdown' };
          data = await this.syncService!.exportNotes(format);
          break;
        }

        // FAQ actions
        case 'faqs:import': {
          const faqs = params as Array<{ question: string; answer: string; tags?: string[] }>;
          await this.initializeServices(); // FAQ import needs RAGService
          data = await this.syncService!.importFAQs(faqs);
          break;
        }

        // Settings actions
        case 'settings:get':
          data = await getSettingsSafe();
          break;

        case 'settings:update': {
          const updates = params as Partial<Settings>;
          await overrideSettings(updates);
          data = await getSettingsSafe();
          break;
        }

        case 'settings:setBaseUrl':
          await setBaseUrl(params as string);
          data = true;
          break;

        case 'settings:setApiKey':
          await setApiKey(params as string);
          data = true;
          break;

        case 'settings:setLanguage': {
          const lang = params as Language;
          await setLanguage(lang);
          setLang(lang); // Sync with i18n
          data = true;
          break;
        }

        case 'settings:setChatModel': {
          const { model, type } = params as { model: string; type?: 'llm' | 'vlm' };
          await setChatModel(model, type);
          data = true;
          break;
        }

        case 'settings:setEmbeddingModel':
          await setEmbeddingModel(params as string);
          data = true;
          break;

        case 'settings:setProvider':
          await setProvider(params as Settings['provider']);
          data = true;
          break;

        // Prompt actions
        case 'prompts:getAll': {
          const settings = await getSettings();
          const lang = (params as { lang?: Language })?.lang || settings.language;
          data = getAllPrompts(lang);
          break;
        }

        case 'prompts:setOverride': {
          const { key, lang, value } = params as { key: PromptKey; lang: Language; value: string };
          setPromptOverride(key, lang, value);
          data = true;
          break;
        }

        case 'prompts:resetOverride': {
          const { key, lang } = params as { key: PromptKey; lang: Language };
          resetPromptOverride(key, lang);
          data = true;
          break;
        }

        default:
          return {
            success: false,
            error: {
              code: 'UNKNOWN_ACTION',
              message: `Unknown action: ${action}`
            },
            requestId
          };
      }

      console.info('[Backend] MessageHandler success:', { action, requestId, hasData: !!data });
      return {
        success: true,
        data,
        requestId
      };
    } catch (error: any) {
      // Serialize error object properly for logging
      const errorInfo = {
        message: error?.message || String(error),
        name: error?.name,
        code: error?.code,
        stack: error?.stack,
        details: error?.details
      };

      // Try to extract more information from the error
      let errorMessage = error?.message || String(error);
      if (errorMessage === '[object Object]') {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = String(error);
        }
      }

      console.error('[Backend] MessageHandler error:', errorInfo);
      console.error('[Backend] Full error object:', error);

      return {
        success: false,
        error: {
          code: error?.code || 'INTERNAL_ERROR',
          message: errorMessage,
          details: error?.details || errorInfo
        },
        requestId
      };
    }
  }

  /**
   * Handle stream messages (for chatStream)
   * Returns async generator for stream chunks
   */
  async * handleStream(request: MessageRequest & { stream: true }): AsyncIterable<import('../types.js').StreamChunk & { trace?: import('../types.js').MCPTrace }> {
    const { action, params } = request;

    if (action !== 'agent:chatStream') {
      throw new Error(`Stream action not supported: ${action}`);
    }

    // Initialize services if needed
    await this.initializeServices();

    const { mcpEnabled = false, ...chatParams } = params as ChatParams & { mcpEnabled?: boolean };

    try {
      for await (const chunk of this.agent!.chatStream(chatParams, mcpEnabled)) {
        yield chunk;
      }
    } catch (error: any) {
      // Stream error will be sent via StreamMessage.error, not in chunk
      throw error;
    }
  }
}

/**
 * Helper function to create Result from async operation
 */
export async function toResult<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || String(error),
        details: error.details
      }
    };
  }
}

