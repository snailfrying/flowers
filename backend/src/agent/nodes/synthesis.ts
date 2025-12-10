import type { LLMClient, SynthesisParams, ChatMessage, LLMConfig } from '../../types.js';
import { getPrompt } from '../../services/prompts/index.js';
import { getSettingsSync } from '../../storage/settings.js';

export async function synthesisNode(
  client: LLMClient,
  params: SynthesisParams & { llmConfig?: LLMConfig }
): Promise<string> {
  // Priority: frontend config > active chat provider > default provider > legacy chat model
  const model =
    params.llmConfig?.chatModel?.trim() ||
    (() => {
      const settings = getSettingsSync();

      const pickProviderModel = (providerId?: string): string | undefined => {
        if (!providerId) return undefined;
        const provider = settings.providers?.find((p) => p.id === providerId);
        if (!provider) return undefined;
        return provider.chatModel?.trim() || provider.models?.[0]?.trim();
      };

      return (
        pickProviderModel(settings.activeChatProviderId) ||
        pickProviderModel(settings.defaultProviderId) ||
        settings.chat.model?.trim() ||
        ''
      );
    })();

  if (!model || model === '') {
    throw new Error('Chat model is not configured for synthesis.');
  }
  
  const context = params.retrievedContext || [];
  console.info('[SynthesisNode] Starting synthesis:', {
    originalInput: params.originalInput?.substring(0, 100),
    contextCount: context.length,
    contextLengths: context.map(c => c.length),
    contextPreviews: context.map(c => c.substring(0, 50))
  });
  
  const system = getPrompt('answer_synth_system');
  
  // Verify context array before rendering
  if (context.length === 0) {
    console.warn('[SynthesisNode] WARNING: No context provided, synthesis may not work correctly');
  }
  
  const user = getPrompt('answer_synth_user', undefined as any, {
    originalInput: params.originalInput,
    context: context
  });
  
  console.info('[SynthesisNode] Generated prompt:', {
    systemLength: system.length,
    userLength: user.length,
    userPreview: user.substring(0, 500),
    contextInPrompt: user.includes(context[0]?.substring(0, 50) || ''),
    contextCountInPrompt: (user.match(/上下文片段/g) || []).length
  });
  
  const messages: ChatMessage[] = [
    { role: 'system' as const, content: system },
    ...(params.chatHistory || []),
    { role: 'user' as const, content: user }
  ];
  const result = await client.chat({
    model,
    messages
  });
  console.info('[SynthesisNode] Synthesis completed:', {
    resultLength: result.length,
    resultPreview: result.substring(0, 200)
  });
  return result.trim();
}

