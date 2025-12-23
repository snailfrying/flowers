export type Language = 'zh' | 'en';

export type ModelType = 'llm' | 'vlm';

export type Provider =
  | 'openai_compatible'
  | 'ollama'
  | 'openrouter'
  | 'deepseek'
  | 'dashscope'
  | 'zhipu'
  | 'chatglm'
  | 'anthropic'
  | 'google';

export interface MCPServiceConfig {
  id: string;
  name: string;
  serverUrl: string;
  apiKey?: string;
  enabled: boolean;
  description?: string;
  protocol?: 'modelscope';
}

export interface ModelProvider {
  id: string;
  name: string;
  type: Provider;
  baseUrl: string;
  apiKey?: string;
  models: string[]; // Available models for this provider
  chatModel?: string; // Default model for chat
  embeddingModel?: string; // Default model for embedding
  enabled: boolean;
}

export interface Settings {
  // Legacy fields (kept for backward compatibility during migration)
  provider: Provider;
  baseUrl: string;
  chat: {
    type: ModelType;
    model: string;
  };
  embedding: {
    model: string;
  };
  apiKey?: string;

  // New Multi-provider fields
  providers: ModelProvider[];
  defaultProviderId?: string; // For popover/general tasks
  activeChatProviderId?: string; // For chat interface
  activeEmbeddingProviderId?: string; // For embedding/RAG tasks

  language: Language;
  theme: 'light' | 'dark' | 'system';
  fullPageEnabled?: boolean;
  mcpServices: MCPServiceConfig[];
}

export interface ChatImage {
  mimeType: string; // e.g. 'image/png'
  data: string; // base64 without data URI prefix
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: ChatImage[]; // used when type === 'vlm'
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  vectors: number[][]; // shape: [n, dim]
}

export interface StreamChunk {
  id?: string;
  content: string;
  done?: boolean;
}

export interface LLMClient {
  chat(request: ChatRequest): Promise<string>;
  chatStream?(request: ChatRequest): AsyncIterable<StreamChunk>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export interface TranslateParams {
  text: string;
  // Target language for translation; allow broader set beyond UI languages
  targetLang: string;
  // Optional human-readable source language name to guide dictionary prompts
  sourceLang?: string;
  llmConfig?: LLMConfig;
  mode?: 'default' | 'subtitle' | 'full-page';
  context?: string;
  glossary?: string;
}

export interface PolishParams {
  text: string;
  style?: 'concise' | 'formal' | 'friendly';
  llmConfig?: LLMConfig;
}

// LLM Configuration passed from frontend
export interface LLMConfig {
  baseUrl?: string;
  apiKey?: string;
  chatModel?: string;
  chatType?: ModelType;
  embeddingModel?: string;
  provider?: Provider;
}

export interface ChatParams {
  userInput: string;
  history?: ChatMessage[];
  modelType?: ModelType;
  images?: ChatImage[];
  ragContext?: string[];
  stream?: boolean;
  // LLM config from frontend (optional, falls back to backend cache if not provided)
  llmConfig?: LLMConfig;
  ragEnabled?: boolean;
  mcpServices?: string[];
}

export type NoteRole = 'user' | 'assistant' | 'system' | 'note';

export interface Note {
  id: string;
  title: string;
  content: string;
  sourceUrl?: string;
  tags: string[];
  role: NoteRole;
  embeddingId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteGenerationParams {
  selectedText: string;
  sourceUrl?: string;
  context?: string[]; // RAG-retrieved context
  llmConfig?: LLMConfig;
}

export interface NoteGenerationResult {
  title: string;
  content: string;
  tags: string[];
}

export interface QueryTransformParams {
  userInput: string;
  chatHistory: ChatMessage[];
  llmConfig?: LLMConfig;
}

export interface RAGRetrieveParams {
  query: string;
  topK?: number;
  tags?: string[];
}

export interface RAGRetrieveResult {
  chunks: Array<{
    text: string;
    metadata: { noteId: string; tags?: string[]; sourceUrl?: string };
    score?: number;
  }>;
}

export interface SynthesisParams {
  originalInput: string;
  retrievedContext: string[];
  chatHistory?: ChatMessage[];
}

export interface MCPTrace {
  transformedQuery?: string;
  retrievedChunks?: RAGRetrieveResult['chunks'];
  synthesisPrompt?: string;
  mcpResponses?: Array<{
    serviceId: string;
    serviceName: string;
    content: string;
  }>;
}

export type CollectionType = 'notes' | 'faqs';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// Unified result type for all API responses
export interface Result<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Service Worker message types
export interface MessageRequest<T = any> {
  action: string;
  params?: T;
  requestId?: string; // For response matching
}

export interface MessageResponse<T = any> extends Result<T> {
  requestId?: string;
}

// Stream message types (for Port communication)
export interface StreamMessage {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  trace?: MCPTrace;
  requestId?: string;
  error?: {
    code: string;
    message: string;
  };
}

