import { createClientByProvider } from '../services/clientFactory.js';
import { getSettingsSync } from '../storage/settings.js';
import { translateNode } from './nodes/translate.js';
import { polishNode } from './nodes/polish.js';
import { chatNode, chatNodeStream } from './nodes/chat.js';
import { queryTransformNode } from './nodes/queryTransform.js';
import { synthesisNode } from './nodes/synthesis.js';
import { generateNoteNode } from './nodes/generateNote.js';
import { ocrNode, type OCRParams } from './nodes/ocr.js';
import { RAGService } from '../services/rag/index.js';
import type {
  Language,
  PolishParams,
  TranslateParams,
  ChatParams,
  StreamChunk,
  QueryTransformParams,
  RAGRetrieveParams,
  SynthesisParams,
  NoteGenerationParams,
  NoteGenerationResult,
  MCPTrace,
  LLMConfig,
  LLMClient
} from '../types.js';

const modelScopeSessionCache = new Map<string, { sessionId: string; expiresAt: number }>();

export class CoreAgent {
  private ragService?: RAGService;

  constructor(ragService?: RAGService) {
    this.ragService = ragService;
  }

  /**
   * Helper to get LLM client with robust fallback logic
   * Priority:
   * 1. Explicit providerId (if passed)
   * 2. Default Provider (settings.defaultProviderId)
   * 3. Active Chat Provider (settings.activeChatProviderId) - Fallback
   */
  private getClient(preferredProviderId?: string, llmConfig?: LLMConfig): LLMClient {
    const settings = getSettingsSync();

    // Determine which provider ID to use
    let targetProviderId = preferredProviderId || settings.defaultProviderId;

    // Fallback: If no target provider (or it's empty), try active chat provider
    if (!targetProviderId) {
      console.info('[CoreAgent] No default provider set, falling back to active chat provider');
      targetProviderId = settings.activeChatProviderId;
    }

    // Create client
    const client = createClientByProvider(llmConfig, targetProviderId);

    // Validate that we actually got a usable client
    // Note: createClientByProvider might return a client even if config is missing (legacy fallback), 
    // but we want to ensure we have a valid model config if possible.

    return client;
  }

  /**
   * Helper to prepare RAG context: Query Transform -> Retrieve
   */
  private async prepareRAGContext(params: {
    userInput: string;
    history?: ChatParams['history'];
    llmConfig?: LLMConfig;
    providerId?: string;
  }): Promise<{ ragContext: string[]; trace?: MCPTrace }> {
    if (!this.ragService) {
      return { ragContext: [] };
    }

    console.info('[CoreAgent] RAG enabled, starting query transform...');
    const transformedQuery = await this.queryTransform({
      userInput: params.userInput,
      chatHistory: params.history || [],
      llmConfig: params.llmConfig
    }, params.providerId);

    let trace: MCPTrace | undefined = { transformedQuery };

    console.info('[CoreAgent] RAG service available, retrieving context...');
    const retrieved = await this.retrieve({ query: transformedQuery, topK: 5 });
    console.info('[CoreAgent] RAG retrieval completed:', {
      chunksCount: retrieved.chunks.length
    });

    const ragContext = retrieved.chunks.map(c => c.text).filter(Boolean);
    trace = { ...trace, retrievedChunks: retrieved.chunks };

    return { ragContext, trace };
  }

  private async runMcpServices(serviceIds: string[], userInput: string): Promise<{
    contexts: string[];
    responses: Array<{ serviceId: string; serviceName: string; content: string }>;
  }> {
    const settings = getSettingsSync();
    const services = settings.mcpServices?.filter((svc) => serviceIds.includes(svc.id) && svc.enabled) || [];
    const contexts: string[] = [];
    const responses: Array<{ serviceId: string; serviceName: string; content: string }> = [];

    for (const service of services) {
      if (!service.serverUrl) continue;
      try {
        const result = await this.invokeModelScopeService(service, userInput);
        if (result.text) {
          contexts.push(`服务：${service.name}\n${result.text}`);
          responses.push({ serviceId: service.id, serviceName: service.name, content: result.text });
        } else {
          responses.push({ serviceId: service.id, serviceName: service.name, content: 'Empty response' });
        }
      } catch (error: any) {
        const message = error?.message || String(error);
        responses.push({ serviceId: service.id, serviceName: service.name, content: `Failed: ${message}` });
      }
    }

    return { contexts, responses };
  }

  private async invokeModelScopeService(service: any, userInput: string): Promise<{ text: string }> {
    const sessionId = await this.ensureModelScopeSession(service);
    
    // Step 1: Get available tools using tools/list
    const tools = await this.listModelScopeTools(service, sessionId);
    const toolNames = tools.map((t: any) => t?.name || t?.id || String(t)).filter(Boolean);
    console.info(`[MCP] Available tools for ${service.id}:`, toolNames);
    
    if (tools.length === 0) {
      throw new Error(`No tools found. Response may be in unexpected format. Please check console logs.`);
    }
    
    // Step 2: Find and call the appropriate tool (prefer bing_search for search queries)
    // Try multiple possible tool name variations
    const searchTool = tools.find((t: any) => 
      t?.name === 'bing_search' || 
      t?.name === 'search' || 
      t?.id === 'bing_search' ||
      t?.id === 'search' ||
      (t?.name && t.name.toLowerCase().includes('search')) ||
      (t?.name && t.name.toLowerCase().includes('bing'))
    );
    
    if (!searchTool) {
      const availableNames = toolNames.length > 0 ? toolNames.join(', ') : 'none';
      throw new Error(`No search tool found. Available tools: ${availableNames}`);
    }
    
    // Step 3: Call the tool using tools/call
    const toolName = searchTool.name || searchTool.id || 'bing_search';
    console.info(`[MCP] Selected tool: ${toolName} for ${service.id}`);
    return await this.callModelScopeTool(service, sessionId, toolName, { query: userInput });
  }

  private async listModelScopeTools(service: any, sessionId: string): Promise<any[]> {
    // First, check if we cached tools from initialize response
    const cached = modelScopeSessionCache.get(service.id + '_tools') as any;
    if (cached && cached.tools && Array.isArray(cached.tools) && cached.expiresAt > Date.now()) {
      console.info(`[MCP] Using cached tools from initialize for ${service.id}:`, cached.tools.length);
      return cached.tools;
    }
    
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json,text/event-stream',
      'mcp-session-id': sessionId
    };
    if (service.apiKey) {
      headers.Authorization = `Bearer ${service.apiKey}`;
    }
    
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/list',
      params: {}
    });
    
    console.info(`[MCP] Listing tools for ${service.id}, requestId: ${requestId}`);
    
    const res = await fetch(service.serverUrl, {
      method: 'POST',
      headers,
      body
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[MCP] tools/list failed for ${service.id}: ${res.status} ${errorText}`);
      // Try to parse error response for more details
      try {
        const errorData = JSON.parse(errorText);
        console.warn(`[MCP] Error details:`, JSON.stringify(errorData, null, 2));
      } catch {
        // Ignore parse errors
      }
      // If tools/list fails, try to use cached tools from initialize
      if (cached && cached.tools && Array.isArray(cached.tools)) {
        console.warn(`[MCP] tools/list failed, falling back to cached tools from initialize`);
        return cached.tools;
      }
      throw new Error(`MCP tools/list failed: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    console.info(`[MCP] tools/list response for ${service.id}:`, JSON.stringify(data, null, 2));
    
    // Try multiple possible response formats
    let tools: any[] = [];
    if (data?.result?.tools && Array.isArray(data.result.tools)) {
      tools = data.result.tools;
    } else if (data?.result?.capabilities?.tools && Array.isArray(data.result.capabilities.tools)) {
      tools = data.result.capabilities.tools;
    } else if (data?.tools && Array.isArray(data.tools)) {
      tools = data.tools;
    } else if (data?.result && Array.isArray(data.result)) {
      tools = data.result;
    } else if (Array.isArray(data)) {
      tools = data;
    } else if (data?.result && typeof data.result === 'object') {
      // Check if result itself contains tool information
      console.warn(`[MCP] Unexpected result format:`, data.result);
    }
    
    // Cache tools if we got them
    if (tools.length > 0) {
      modelScopeSessionCache.set(service.id + '_tools', {
        sessionId: sessionId,
        expiresAt: Date.now() + 10 * 60 * 1000,
        tools: tools
      } as any);
    }
    
    console.info(`[MCP] Parsed tools for ${service.id}:`, tools.length, tools.map((t: any) => ({ name: t?.name, id: t?.id, description: t?.description })));
    return tools;
  }

  private async callModelScopeTool(service: any, sessionId: string, toolName: string, arguments_: Record<string, any>): Promise<{ text: string }> {
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json,text/event-stream',
      'mcp-session-id': sessionId
    };
    if (service.apiKey) {
      headers.Authorization = `Bearer ${service.apiKey}`;
    }
    
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments_
      }
    });
    
    console.info(`[MCP] Calling tool ${toolName} for ${service.id}, requestId: ${requestId}, arguments:`, arguments_);
    
    const res = await fetch(service.serverUrl, {
      method: 'POST',
      headers,
      body
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`[MCP] tools/call failed for ${service.id}: ${res.status} ${errorText}`);
      
      if (this.isSessionError(errorText, res.status)) {
        console.info(`[MCP] Session error detected for ${service.id}, clearing cache and retrying...`);
        modelScopeSessionCache.delete(service.id);
        // retry once with new session
        const freshSession = await this.ensureModelScopeSession(service);
        const tools = await this.listModelScopeTools(service, freshSession);
        const searchTool = tools.find((t: any) => t.name === 'bing_search' || t.name === 'search');
        if (!searchTool) {
          throw new Error(`No search tool found after retry`);
        }
        return await this.callModelScopeTool(service, freshSession, searchTool.name, arguments_);
      }
      throw new Error(`MCP tools/call failed: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    return { text: this.extractTextFromMcpPayload(data) };
  }


  private async ensureModelScopeSession(service: any): Promise<string> {
    const cached = modelScopeSessionCache.get(service.id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.sessionId;
    }
    
    // Clear expired session from cache before re-initializing
    if (cached) {
      console.info(`[MCP] Session expired for ${service.id}, clearing cache and re-initializing`);
      modelScopeSessionCache.delete(service.id);
    }
    
    // For first-time initialization, don't send mcp-session-id header
    // Let the server generate a new session
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json,text/event-stream'
    };
    if (service.apiKey) {
      headers.Authorization = `Bearer ${service.apiKey}`;
    }
    
    const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
    console.info(`[MCP] Initializing session for ${service.id}, requestId: ${requestId}`);
    
    const res = await fetch(service.serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'initialize',
        params: {
          client: {
            name: 'Flowers MCP',
            version: '1.0.0'
          }
        }
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[MCP] Initialize failed for ${service.id}: ${res.status} ${errorText}`);
      throw new Error(`MCP init failed: ${res.status} ${errorText}`);
    }
    
    let serverSessionId: string | null = null;
    let initializeData: any = null;
    try {
      initializeData = await res.json();
      console.info(`[MCP] Initialize response for ${service.id}:`, JSON.stringify(initializeData, null, 2));
      
      // Try multiple possible locations for sessionId
      serverSessionId = 
        initializeData?.result?.sessionId || 
        initializeData?.sessionId || 
        res.headers.get('mcp-session-id') ||
        res.headers.get('session-id') ||
        null;
      
      console.info(`[MCP] Session initialized for ${service.id}, sessionId: ${serverSessionId || 'not provided by server'}`);
      
      // Check if tools are in initialize response (standard MCP format)
      // Tools might be in result.capabilities.tools or result.serverInfo.capabilities.tools
      if (initializeData?.result?.capabilities?.tools && Array.isArray(initializeData.result.capabilities.tools)) {
        console.info(`[MCP] Found tools in initialize response for ${service.id}:`, initializeData.result.capabilities.tools.length);
        // Cache tools for this service (we'll use this if tools/list fails)
        if (!modelScopeSessionCache.has(service.id + '_tools')) {
          modelScopeSessionCache.set(service.id + '_tools', {
            sessionId: serverSessionId || '',
            expiresAt: Date.now() + 10 * 60 * 1000,
            tools: initializeData.result.capabilities.tools
          } as any);
        }
      }
    } catch (e) {
      console.warn(`[MCP] Failed to parse initialize response for ${service.id}:`, e);
      serverSessionId = null;
    }
    
    if (!serverSessionId) {
      // If server didn't provide sessionId, generate one ourselves
      // This might be needed for some MCP implementations
      serverSessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
      console.warn(`[MCP] Server didn't provide sessionId for ${service.id}, using generated: ${serverSessionId}`);
    }
    
    // Cache the session for 10 minutes
    modelScopeSessionCache.set(service.id, {
      sessionId: serverSessionId,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    
    return serverSessionId;
  }

  private isSessionError(errorText: string, status: number): boolean {
    if (status === 401) return true;
    return /session/i.test(errorText);
  }

  private extractTextFromMcpPayload(payload: any): string {
    if (!payload) return '';
    if (typeof payload === 'string') return payload;
    if (payload.response) return payload.response;
    if (payload.content) return payload.content;
    if (Array.isArray(payload.messages)) {
      const assistant = payload.messages.find((msg: any) => msg.role === 'assistant') || payload.messages[payload.messages.length - 1];
      if (typeof assistant === 'string') return assistant;
      if (assistant?.content) return Array.isArray(assistant.content) ? assistant.content.join('\n') : assistant.content;
    }
    if (Array.isArray(payload.outputs)) {
      return payload.outputs.map((item: any) => (typeof item === 'string' ? item : JSON.stringify(item))).join('\n');
    }
    if (payload.result) return payload.result;
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  async translate(params: TranslateParams): Promise<string> {
    console.info('[CoreAgent] translate called:', { textLength: params.text?.length || 0, targetLang: params.targetLang });
    const client = this.getClient(undefined, params.llmConfig);
    console.info('[CoreAgent] LLM client created, calling translateNode...');
    const result = await translateNode(client, params);
    console.info('[CoreAgent] translateNode result:', { resultLength: result?.length || 0 });
    return result;
  }

  async polish(params: PolishParams): Promise<string> {
    console.info('[CoreAgent] polish called:', { textLength: params.text?.length || 0, style: params.style });
    const client = this.getClient(undefined, params.llmConfig);
    console.info('[CoreAgent] LLM client created, calling polishNode...');
    const result = await polishNode(client, params);
    console.info('[CoreAgent] polishNode result:', { resultLength: result?.length || 0 });
    return result;
  }

  async queryTransform(params: QueryTransformParams, providerId?: string): Promise<string> {
    console.info('[CoreAgent] Starting query transform:', {
      userInput: params.userInput?.substring(0, 100),
      historyLength: params.chatHistory?.length || 0
    });
    const client = this.getClient(providerId, params.llmConfig);
    const transformed = await queryTransformNode(client, params);
    console.info('[CoreAgent] Query transformed:', {
      original: params.userInput?.substring(0, 100),
      transformed: transformed?.substring(0, 100)
    });
    return transformed;
  }

  async retrieve(params: RAGRetrieveParams & { collections?: ('notes' | 'faqs')[] }): Promise<{ chunks: any[]; trace?: MCPTrace }> {
    console.info('[CoreAgent] Starting RAG retrieval:', {
      query: params.query?.substring(0, 100),
      topK: params.topK,
      collections: params.collections
    });
    if (!this.ragService) {
      console.warn('[CoreAgent] RAG service not available, cannot retrieve');
      return { chunks: [] };
    }
    const result = await this.ragService.retrieve(params);
    console.info('[CoreAgent] RAG retrieval completed:', {
      chunksCount: result.chunks?.length || 0,
      chunks: result.chunks?.map((c: any) => ({
        textLength: c.text?.length || 0,
        score: c.score,
        type: c.metadata?.type,
        noteId: c.metadata?.noteId
      }))
    });
    return { chunks: result.chunks };
  }

  async synthesis(params: SynthesisParams & { llmConfig?: LLMConfig }, providerId?: string): Promise<string> {
    const client = this.getClient(providerId, params.llmConfig);
    return synthesisNode(client, params);
  }

  async generateNote(params: NoteGenerationParams): Promise<NoteGenerationResult> {
    const client = this.getClient(undefined, params.llmConfig);
    // If RAG available, enrich params with transformed query and retrieved context
    let enriched = { ...params } as NoteGenerationParams;
    if (this.ragService) {
      try {
        const settings = getSettingsSync();
        // Use default provider or active chat provider for query transform in note generation
        const providerId = settings.defaultProviderId || settings.activeChatProviderId;
        const { ragContext } = await this.prepareRAGContext({
          userInput: params.selectedText,
          history: [],
          llmConfig: params.llmConfig,
          providerId
        });

        if (ragContext.length > 0) enriched = { ...enriched, context: ragContext };
      } catch (e) {
        // Continue without RAG if it fails
        console.warn('[CoreAgent] RAG enrich failed, falling back to direct generation:', (e as any)?.message || e);
      }
    }
    return generateNoteNode(client, enriched);
  }

  async chat(params: ChatParams, mcpEnabled = false): Promise<{ response: string; trace?: MCPTrace }> {
    const settings = getSettingsSync();
    const client = this.getClient(settings.activeChatProviderId, params.llmConfig);

    const model = params.llmConfig?.chatModel?.trim() || (() => {
      const settings = getSettingsSync();
      const chatProvider = settings.providers.find(p => p.id === settings.activeChatProviderId);
      if (chatProvider?.chatModel) return chatProvider.chatModel;
      if (chatProvider?.models && chatProvider.models.length > 0) return chatProvider.models[0];

      const defaultProvider = settings.providers.find(p => p.id === settings.defaultProviderId);
      if (defaultProvider?.chatModel) return defaultProvider.chatModel;
      if (defaultProvider?.models && defaultProvider.models.length > 0) return defaultProvider.models[0];

      return settings.chat.model;
    })();

    if (!model || model.trim() === '') {
      // Note: In the browser extension runtime, env.yaml is not used.
      // Users should configure the chat model via the Settings → Model page.
      throw new Error('Chat model is not configured. Please open Settings → Model and configure a Chat Model for the selected provider.');
    }

    let trace: MCPTrace | undefined;
    let ragContext: string[] = [];

    if (Array.isArray(params.ragContext) && params.ragContext.length > 0) {
      ragContext = [...params.ragContext];
    }

    const shouldUseRag = params.ragEnabled !== false;
    if (shouldUseRag && this.ragService) {
      try {
        const ragResult = await this.prepareRAGContext({
          userInput: params.userInput,
          history: params.history,
          llmConfig: params.llmConfig,
          providerId: settings.activeChatProviderId
        });
        if (ragResult.ragContext.length > 0) {
          ragContext = [...ragContext, ...ragResult.ragContext];
        }
        if (ragResult.trace) {
          trace = { ...trace, ...ragResult.trace };
        }
      } catch (error) {
        console.warn('[CoreAgent] RAG retrieval failed, continuing without context:', (error as any)?.message || error);
      }
    }

    if (mcpEnabled && params.mcpServices && params.mcpServices.length > 0) {
      const mcpResult = await this.runMcpServices(params.mcpServices, params.userInput);
      if (mcpResult.contexts.length) {
        ragContext = [...ragContext, ...mcpResult.contexts];
      }
      if (mcpResult.responses.length) {
        trace = { ...trace, mcpResponses: mcpResult.responses };
      }
    }

    if (ragContext.length > 0) {
      console.info('[CoreAgent] Synthesizing response with contextual knowledge...');
      const synthesisResult = await this.synthesis({
        originalInput: params.userInput,
        retrievedContext: ragContext,
        chatHistory: params.history,
        llmConfig: params.llmConfig
      }, settings.activeChatProviderId);
      return { response: synthesisResult, trace };
    }

    const response = await client.chat({ model, messages: this.#toMessages(params), stream: false });
    return { response, trace };
  }

  async askWithContext(params: { text: string; sourceUrl?: string }): Promise<{ response: string; trace?: MCPTrace }> {
    const { text, sourceUrl } = params;
    const prefix = sourceUrl
      ? (await import('../services/prompts/index.js')).getPrompt('ask_context_prefix_with_source', undefined as any, { sourceUrl })
      : (await import('../services/prompts/index.js')).getPrompt('ask_context_prefix');
    const userInput = `${prefix}\n\n${text}`;
    return this.chat({ userInput }, false);
  }

  async ocr(params: OCRParams): Promise<{ text: string; confidence: number }> {
    const client = this.getClient(undefined, params.llmConfig);
    return ocrNode(client, params);
  }

  async *chatStream(params: ChatParams, mcpEnabled = false): AsyncIterable<StreamChunk & { trace?: MCPTrace }> {
    const settings = getSettingsSync();
    const client = this.getClient(settings.activeChatProviderId, params.llmConfig);

    const model = params.llmConfig?.chatModel?.trim() || (() => {
      const settings = getSettingsSync();
      const chatProvider = settings.providers.find(p => p.id === settings.activeChatProviderId);
      if (chatProvider?.chatModel) return chatProvider.chatModel;
      if (chatProvider?.models && chatProvider.models.length > 0) return chatProvider.models[0];

      const defaultProvider = settings.providers.find(p => p.id === settings.defaultProviderId);
      if (defaultProvider?.chatModel) return defaultProvider.chatModel;
      if (defaultProvider?.models && defaultProvider.models.length > 0) return defaultProvider.models[0];

      return settings.chat.model;
    })();

    if (!model || model.trim() === '') {
      throw new Error('Chat model is not configured. Please set it in settings or env.yaml');
    }

    let ragContext: string[] = [];
    let trace: MCPTrace | undefined;

    if (Array.isArray(params.ragContext) && params.ragContext.length > 0) {
      ragContext = [...params.ragContext];
    }

    const shouldUseRag = params.ragEnabled !== false;
    if (shouldUseRag && this.ragService) {
      try {
        const ragPromise = this.prepareRAGContext({
          userInput: params.userInput,
          history: params.history,
          llmConfig: params.llmConfig,
          providerId: settings.activeChatProviderId
        });

        const ragResult = await Promise.race([
          ragPromise,
          new Promise<{ ragContext: string[]; trace?: MCPTrace }>((resolve) => {
            setTimeout(() => resolve({ ragContext: [], trace: undefined }), 5000);
          })
        ]);

        if (ragResult.ragContext.length > 0) {
          ragContext = [...ragContext, ...ragResult.ragContext];
        }
        if (ragResult.trace) {
          trace = { ...trace, ...ragResult.trace };
        }
      } catch (error) {
        console.error('[CoreAgent] RAG retrieval failed, falling back to direct chat:', error);
      }
    }

    if (mcpEnabled && params.mcpServices && params.mcpServices.length > 0) {
      const mcpResult = await this.runMcpServices(params.mcpServices, params.userInput);
      if (mcpResult.contexts.length) {
        ragContext = [...ragContext, ...mcpResult.contexts];
      }
      if (mcpResult.responses.length) {
        trace = { ...trace, mcpResponses: mcpResult.responses };
      }
    }

    if (ragContext.length > 0) {
      const synthesisParams: SynthesisParams & { llmConfig?: LLMConfig } = {
        originalInput: params.userInput,
        retrievedContext: ragContext,
        chatHistory: params.history,
        llmConfig: params.llmConfig
      };
      const fullResponse = await this.synthesis(synthesisParams, settings.activeChatProviderId);
      yield { content: fullResponse, trace, done: true };
      return;
    }

    if (!client.chatStream) {
      yield { content: await client.chat({ model, messages: this.#toMessages(params) }), trace, done: true };
      return;
    }
    for await (const chunk of client.chatStream({ model, messages: this.#toMessages(params), stream: true })) {
      yield { ...chunk, trace };
    }
  }

  #toMessages(params: ChatParams) {
    const history = params.history || [];
    const last = params.modelType === 'vlm' && params.images?.length
      ? { role: 'user', content: params.userInput, images: params.images }
      : { role: 'user', content: params.userInput };
    return [...history, last] as any;
  }
}


