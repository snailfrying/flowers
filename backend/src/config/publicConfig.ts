import { getSettingsSync } from '../storage/settings.js';

export interface PublicModelCatalog {
  chatLLM: string[];
  chatVLM: string[];
  embedding: string[];
}

export interface PublicConfig {
  configured: boolean; // whether required fields are set
  models: PublicModelCatalog; // available options (non-secret)
  current: {
    chatType: 'llm' | 'vlm';
    chatModel: string | null; // masked name only
    embeddingModel: string | null; // masked name only
  };
}

function maskValue(v?: string): string | null {
  if (!v) return null;
  // do not leak hostnames/URLs or API keys; for models we can return the model id string
  return v;
}

export function getPublicConfig(): PublicConfig {
  const s = getSettingsSync();
  // You may optionally populate candidates via env or remote fetch; keep empty arrays by default
  const models: PublicModelCatalog = {
    chatLLM: [],
    chatVLM: [],
    embedding: []
  };
  return {
    configured: Boolean(s.baseUrl && (s.chat.model || s.embedding.model)),
    models,
    current: {
      chatType: s.chat.type,
      chatModel: maskValue(s.chat.model),
      embeddingModel: maskValue(s.embedding.model)
    }
  };
}

