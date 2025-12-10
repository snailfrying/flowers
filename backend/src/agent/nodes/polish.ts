import type { LLMClient, PolishParams } from '../../types.js';
import { getPrompt } from '../../services/prompts/index.js';
import { getChatModel } from '../../utils/llm-config.js';
import { stripMarkdownWrapper } from '../../utils/markdown.js';
import { LRUCache, generateCacheKey } from '../../utils/cache.js';

// Create cache instance for polish results
// Cache up to 100 entries with 30 minute TTL
const polishCache = new LRUCache<string, string>({
  maxSize: 100,
  ttl: 30 * 60 * 1000
});

export async function polishNode(client: LLMClient, params: PolishParams): Promise<string> {
  console.info('[PolishNode] Starting polish...', { textLength: params.text?.length || 0, style: params.style });

  // Generate cache key from params
  const cacheKey = generateCacheKey({
    text: params.text,
    style: params.style || 'default',
    model: params.llmConfig?.chatModel || 'default'
  });

  // Check cache first
  const cached = polishCache.get(cacheKey);
  if (cached) {
    console.info('[PolishNode] Cache hit!');
    return cached;
  }
  console.info('[PolishNode] Cache miss, calling LLM...');

  // Get model using shared utility
  const model = getChatModel(params.llmConfig);
  console.info('[PolishNode] Using model:', model, 'from:', params.llmConfig ? 'frontend' : 'backend cache');

  const system = getPrompt('polish_system');
  const user = getPrompt('polish_user', undefined as any, { text: params.text, style: params.style });
  console.info('[PolishNode] Prompts generated, calling LLM client.chat...');
  console.info('[PolishNode] System prompt length:', system?.length || 0);
  console.info('[PolishNode] User prompt length:', user?.length || 0);

  const result = await client.chat({
    model: model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });
  console.info('[PolishNode] LLM response received:', { resultLength: result?.length || 0 });

  // Strip markdown wrapper using shared utility
  const cleaned = stripMarkdownWrapper(result);
  console.info('[PolishNode] Cleaned result:', { cleanedLength: cleaned.length });

  // Store in cache
  polishCache.set(cacheKey, cleaned);
  console.info('[PolishNode] Result cached. Cache stats:', polishCache.getStats());

  return cleaned;
}

