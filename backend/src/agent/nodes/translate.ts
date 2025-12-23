import type { LLMClient, TranslateParams } from '../../types.js';
import { getPrompt } from '../../services/prompts/index.js';
import { getChatModel } from '../../utils/llm-config.js';
import { stripMarkdownWrapper } from '../../utils/markdown.js';
import { LRUCache, generateCacheKey } from '../../utils/cache.js';

// Create cache instance for translate results
// Cache up to 100 entries with 30 minute TTL
const translateCache = new LRUCache<string, string>({
  maxSize: 100,
  ttl: 30 * 60 * 1000
});

export async function translateNode(client: LLMClient, params: TranslateParams): Promise<string> {
  // Get model using shared utility
  const model = getChatModel(params.llmConfig);
  console.info('[TranslateNode] Using model:', model, 'from:', params.llmConfig ? 'frontend' : 'backend cache');

  // Detect short token/phrase for dictionary-style output
  const raw = (params.text || '').trim();
  const isCJK = /[\u4e00-\u9fff]/.test(raw);
  const tokenCount = raw.split(/\s+/).filter(Boolean).length;
  const charCount = [...raw].length;
  const isSubtitle = params.mode === 'subtitle';
  const isFullPage = params.mode === 'full-page';
  // Only use dictionary mode if NOT subtitle or full-page mode
  const isDictionaryCase = !isSubtitle && !isFullPage && ((isCJK && charCount <= 4) || (!isCJK && tokenCount <= 3));

  // Generate cache key from params
  const cacheKey = generateCacheKey({
    text: params.text,
    targetLang: params.targetLang,
    isDictionary: isDictionaryCase,
    mode: params.mode || 'default',
    model: params.llmConfig?.chatModel || 'default',
    context: params.context,
    glossary: params.glossary
  });

  // Check cache first
  const cached = translateCache.get(cacheKey);
  if (cached) {
    console.info('[TranslateNode] Cache hit!');
    return cached;
  }
  console.info('[TranslateNode] Cache miss, calling LLM...');

  let system = '';
  let user = '';
  if (isFullPage) {
    system = getPrompt('translate_fullpage_system', undefined as any, { targetLang: params.targetLang });
    user = getPrompt('translate_fullpage_user', undefined as any, {
      targetLang: params.targetLang,
      text: raw,
      context: params.context,
      glossary: params.glossary
    });
  } else if (isSubtitle) {
    system = getPrompt('translate_subtitle_system', undefined as any, { targetLang: params.targetLang });
    user = getPrompt('translate_subtitle_user', undefined as any, { targetLang: params.targetLang, text: raw });
  } else if (isDictionaryCase) {
    system = getPrompt('translate_dict_system', undefined as any, {
      targetLang: params.targetLang,
      sourceLang: params.sourceLang || 'Source Language'
    });
    user = getPrompt('translate_dict_user', undefined as any, {
      targetLang: params.targetLang,
      sourceLang: params.sourceLang || 'Source Language',
      text: raw
    });
  } else {
    system = getPrompt('translate_system');
    user = getPrompt('translate_user', undefined as any, { targetLang: params.targetLang, text: raw });
  }

  const result = await client.chat({
    model: model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  // Strip markdown wrapper using shared utility
  const cleaned = stripMarkdownWrapper(result);

  // Store in cache
  translateCache.set(cacheKey, cleaned);
  console.info('[TranslateNode] Result cached. Cache stats:', translateCache.getStats());

  return cleaned;
}

