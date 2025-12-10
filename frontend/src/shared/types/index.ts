/**
 * Re-export backend types for frontend use
 * This ensures type safety across frontend and backend
 */

export type {
  Language,
  ModelType,
  Provider,
  Settings,
  ChatImage,
  ChatMessage,
  TranslateParams,
  PolishParams,
  ChatParams,
  NoteRole,
  Note,
  NoteGenerationParams,
  NoteGenerationResult,
  QueryTransformParams,
  RAGRetrieveParams,
  RAGRetrieveResult,
  SynthesisParams,
  MCPTrace,
  CollectionType,
  FAQItem,
  Result,
  MessageRequest,
  MessageResponse,
  StreamMessage
} from 'backend/types.js';

