/**
 * LLM configuration utilities
 * Shared utilities for handling LLM config and model selection
 */

import { getSettingsSync } from '../storage/settings.js';
import type { LLMConfig } from '../types.js';

/**
 * Get chat model from LLM config or settings cache
 * Priority: params.llmConfig > backend settings cache
 * 
 * @param llmConfig - Optional LLM config from frontend
 * @returns Model name string
 * @throws Error if model is not configured
 */
export function getChatModel(llmConfig?: LLMConfig): string {
    // Try to get from frontend config first
    const fromConfig = llmConfig?.chatModel?.trim();
    if (fromConfig) {
        return fromConfig;
    }

    const settings = getSettingsSync();

    // Try to get from active/default provider
    // Priority: 
    // 1. Default Provider (settings.defaultProviderId)
    // 2. Active Chat Provider (settings.activeChatProviderId) - Fallback

    let targetProviderId = settings.defaultProviderId;

    // Fallback logic matching CoreAgent.getClient
    if (!targetProviderId) {
        targetProviderId = settings.activeChatProviderId;
    }

    if (targetProviderId && settings.providers) {
        const provider = settings.providers.find(p => p.id === targetProviderId);
        if (provider?.chatModel) {
            return provider.chatModel;
        }
        // Fallback to first available model if chatModel is not set
        if (provider?.models && provider.models.length > 0) {
            return provider.models[0];
        }
    }

    // Fallback to legacy settings cache
    const fromSettings = settings.chat?.model?.trim();

    if (!fromSettings || fromSettings === '') {
        throw new Error(
            'Chat model is not configured. Please configure it in the extension settings or env.yaml.'
        );
    }

    return fromSettings;
}

/**
 * Get embedding model from LLM config or settings cache
 * 
 * @param llmConfig - Optional LLM config from frontend
 * @returns Embedding model name string
 * @throws Error if embedding model is not configured
 */
export function getEmbeddingModel(llmConfig?: LLMConfig): string {
    // Try to get from frontend config first
    const fromConfig = llmConfig?.embeddingModel?.trim();
    if (fromConfig) {
        return fromConfig;
    }

    const settings = getSettingsSync();

    // Try to get from active embedding provider or default provider
    const targetProviderId = settings.activeEmbeddingProviderId || settings.defaultProviderId;
    if (targetProviderId && settings.providers) {
        const provider = settings.providers.find(p => p.id === targetProviderId);
        // Some providers might store embedding model in a different field or just 'model'
        // But based on types, let's check embeddingModel or fallback to chatModel if it's a unified model (unlikely for embeddings but safe)
        if (provider?.embeddingModel) {
            return provider.embeddingModel;
        }
        // Fallback to first available model if embeddingModel is not set
        // Note: This might pick a chat model if models list is mixed, but it's better than failing
        if (provider?.models && provider.models.length > 0) {
            return provider.models[0];
        }
    }

    // Fallback to backend settings cache
    const fromSettings = settings.embedding?.model?.trim();

    if (!fromSettings || fromSettings === '') {
        throw new Error(
            'Embedding model is not configured. Please configure it in the extension settings or env.yaml.'
        );
    }

    return fromSettings;
}

/**
 * Validate that required LLM configuration is present
 * 
 * @param llmConfig - LLM config to validate
 * @param requireEmbedding - Whether embedding model is required
 * @throws Error if required configuration is missing
 */
export function validateLLMConfig(
    llmConfig?: LLMConfig,
    requireEmbedding = false
): void {
    getChatModel(llmConfig); // Will throw if missing

    if (requireEmbedding) {
        getEmbeddingModel(llmConfig); // Will throw if missing
    }
}

/**
 * OCR does not pre-check model VLM support. It directly calls the API with image.
 * If the model does not support vision, the API will return an error which is
 * passed through to the user. This avoids maintaining a hardcoded VLM list as
 * models are updated frequently.
 */
