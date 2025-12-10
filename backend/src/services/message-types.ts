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
  Language,
  StreamMessage,
  MCPTrace,
  StreamChunk
} from '../types.js';
import type { PromptKey } from './prompts/index.js';

/**
 * Type-safe message action definitions
 */
export type MessageAction =
  // Agent actions
  | 'agent:translate'
  | 'agent:polish'
  | 'agent:generateNote'
  | 'agent:chat'
  | 'agent:chatStream'
  | 'agent:askWithContext'
  // Notes actions
  | 'notes:create'
  | 'notes:read'
  | 'notes:readAll'
  | 'notes:update'
  | 'notes:delete'
  | 'notes:deleteBatch'
  | 'notes:search'
  | 'notes:export'
  // FAQ actions
  | 'faqs:import'
  // Settings actions
  | 'settings:get'
  | 'settings:update'
  | 'settings:setBaseUrl'
  | 'settings:setApiKey'
  | 'settings:setLanguage'
  | 'settings:setChatModel'
  | 'settings:setEmbeddingModel'
  | 'settings:setProvider'
  // Prompt actions
  | 'prompts:getAll'
  | 'prompts:setOverride'
  | 'prompts:resetOverride';

/**
 * Type-safe message request parameter types
 */
export interface MessageRequestParams {
  'agent:translate': TranslateParams;
  'agent:polish': PolishParams;
  'agent:generateNote': NoteGenerationParams;
  'agent:chat': ChatParams & { mcpEnabled?: boolean };
  'agent:chatStream': ChatParams & { mcpEnabled?: boolean; stream: true };
  'agent:askWithContext': { text: string; sourceUrl?: string };
  'notes:create': Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
  'notes:read': string;
  'notes:readAll': void;
  'notes:update': { id: string; updates: Partial<Omit<Note, 'id' | 'createdAt'>> };
  'notes:delete': string;
  'notes:deleteBatch': string[];
  'notes:search': { query: string; tags?: string[] };
  'notes:export': { format: 'json' | 'markdown' };
  'faqs:import': Array<{ question: string; answer: string; tags?: string[] }>;
  'settings:get': void;
  'settings:update': Partial<Settings>;
  'settings:setBaseUrl': string;
  'settings:setApiKey': string;
  'settings:setLanguage': Language;
  'settings:setChatModel': { model: string; type?: 'llm' | 'vlm' };
  'settings:setEmbeddingModel': string;
  'settings:setProvider': Settings['provider'];
  'prompts:getAll': { lang?: Language };
  'prompts:setOverride': { key: PromptKey; lang: Language; value: string };
  'prompts:resetOverride': { key: PromptKey; lang: Language };
}

/**
 * Type-safe message response data types
 */
export interface MessageResponseData {
  'agent:translate': string;
  'agent:polish': string;
  'agent:generateNote': import('../types.js').NoteGenerationResult;
  'agent:chat': { response: string; trace?: MCPTrace };
  'agent:chatStream': StreamChunk & { trace?: MCPTrace };
  'agent:askWithContext': { response: string; trace?: MCPTrace };
  'notes:create': Note;
  'notes:read': Note | null;
  'notes:readAll': Note[];
  'notes:update': Note;
  'notes:delete': boolean;
  'notes:deleteBatch': boolean;
  'notes:search': Note[];
  'notes:export': string;
  'faqs:import': { success: number; failed: number; errors: string[] };
  'settings:get': Omit<Settings, 'apiKey' | 'baseUrl'> & { baseUrl?: string };
  'settings:update': Omit<Settings, 'apiKey' | 'baseUrl'> & { baseUrl?: string };
  'settings:setBaseUrl': boolean;
  'settings:setApiKey': boolean;
  'settings:setLanguage': boolean;
  'settings:setChatModel': boolean;
  'settings:setEmbeddingModel': boolean;
  'settings:setProvider': boolean;
  'prompts:getAll': Record<string, { default: string; override?: string }>;
  'prompts:setOverride': boolean;
  'prompts:resetOverride': boolean;
}

/**
 * Type-safe message request helper
 */
export type TypedMessageRequest<A extends MessageAction> = MessageRequest<MessageRequestParams[A]> & {
  action: A;
};

/**
 * Type-safe message response helper
 */
export type TypedMessageResponse<A extends MessageAction> = MessageResponse<MessageResponseData[A]> & {
  requestId?: string;
};

