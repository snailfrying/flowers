import { OpenAICompatibleClient } from './llm/OpenAIClient.js';
import { OllamaClient } from './llm/OllamaClient.js';
import { getSettingsSync } from '../storage/settings.js';
import { getProviderCredentials } from '../config/env.js';
import type { LLMClient, LLMConfig, Settings, ModelProvider } from '../types.js';

/**
 * Get provider by ID from settings
 */
function getProviderById(settings: Settings, providerId?: string): ModelProvider | null {
  if (!providerId || !settings.providers || settings.providers.length === 0) {
    return null;
  }
  return settings.providers.find(p => p.id === providerId) || null;
}

/**
 * Create LLM client with config from frontend (preferred) or backend cache (fallback)
 * 
 * @param llmConfig - Optional config from frontend (baseUrl, chatModel, etc.)
 * @param providerId - Optional provider ID to use (defaults to defaultProviderId)
 * @returns LLM client instance
 */
export function createClientByProvider(llmConfig?: LLMConfig, providerId?: string): LLMClient {
  const settings = getSettingsSync();

  // Priority: frontend config > provider config > legacy config
  let baseUrl: string | undefined;
  let apiKey: string | undefined;
  let provider: string | undefined;

  // 1. Try to get config from specified provider or default provider
  const targetProviderId = providerId || settings.defaultProviderId;
  const providerConfig = getProviderById(settings, targetProviderId);

  if (providerConfig) {
    // Use provider config from settings.providers array
    baseUrl = llmConfig?.baseUrl || providerConfig.baseUrl;
    provider = providerConfig.type;

    // Special handling for Ollama - it doesn't require API key
    const isOllama =
      llmConfig?.provider === 'ollama' ||
      providerConfig.type === 'ollama' ||
      providerConfig.name?.toLowerCase().includes('ollama') ||
      baseUrl?.includes('localhost:11434') ||
      baseUrl?.includes('127.0.0.1:11434') ||
      baseUrl?.includes('ollama');

    if (isOllama) {
      console.info('[ClientFactory] Using native OllamaClient');
      return new OllamaClient({
        baseUrl: baseUrl || 'http://localhost:11434',
        model: llmConfig?.chatModel || providerConfig.chatModel
      });
    } else {
      apiKey = providerConfig.apiKey;
    }

    console.info('[ClientFactory] Using provider config:', {
      providerId: providerConfig.id,
      providerName: providerConfig.name,
      providerType: providerConfig.type,
      baseUrl: baseUrl || '(empty)',
      hasApiKey: !!apiKey,
      isOllama
    });
  } else if (llmConfig?.baseUrl) {
    // Fallback: Use config from frontend (for backward compatibility)
    baseUrl = llmConfig.baseUrl;
    provider = llmConfig.provider;

    // Check if it's Ollama
    const isOllama =
      provider === 'ollama' ||
      baseUrl?.includes('localhost:11434') ||
      baseUrl?.includes('127.0.0.1:11434') ||
      baseUrl?.includes('ollama');

    if (isOllama) {
      console.info('[ClientFactory] Using native OllamaClient (frontend fallback)');
      return new OllamaClient({
        baseUrl: baseUrl || 'http://localhost:11434',
        model: llmConfig.chatModel
      });
    } else {
      // Always get API key from backend storage
      const cred = getProviderCredentials(provider || settings.provider);
      apiKey = cred.apiKey || settings.apiKey;
    }

    console.info('[ClientFactory] Using frontend config:', {
      baseUrl: baseUrl || '(empty)',
      provider: provider || '(empty)',
      hasApiKey: !!apiKey,
      isOllama,
      source: 'frontend llmConfig'
    });
  } else {
    // Final fallback: Use legacy settings fields
    baseUrl = settings.baseUrl;
    provider = settings.provider;

    const cred = getProviderCredentials(provider);
    apiKey = cred.apiKey || settings.apiKey;

    // Check for Ollama in legacy config
    const isOllama =
      provider === 'ollama' ||
      baseUrl?.includes('localhost:11434') ||
      baseUrl?.includes('127.0.0.1:11434');

    if (isOllama) {
      console.info('[ClientFactory] Using native OllamaClient (legacy fallback)');
      return new OllamaClient({
        baseUrl: baseUrl || 'http://localhost:11434',
        model: settings.chat.model
      });
    }

    console.info('[ClientFactory] Using legacy config:', {
      baseUrl: baseUrl || '(empty)',
      provider: provider || '(empty)',
      hasApiKey: !!apiKey,
      source: 'legacy settings'
    });
  }

  if (!baseUrl) {
    const errorMsg = 'LLM baseUrl is not configured. Please add a provider in Settings → Model Config.';
    console.error('[ClientFactory]', errorMsg);
    throw new Error(errorMsg);
  }

  // For many providers we can use OpenAI-compatible gateways
  return new OpenAICompatibleClient({
    apiKey,
    baseUrl
  });
}
