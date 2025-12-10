import type { LLMClient, NoteGenerationParams, NoteGenerationResult } from '../../types.js';
import { getPrompt } from '../../services/prompts/index.js';
import { getChatModel } from '../../utils/llm-config.js';

function extractJsonPayload(text: string): string | null {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) return codeBlock[1].trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

function sanitizeTags(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag) => tag.length > 0)
    .slice(0, 5);
}

function deriveTitle(selectedText: string): string {
  const firstLine = selectedText.split('\n').map((line) => line.trim()).find(Boolean);
  return (firstLine || selectedText).slice(0, 80).trim() || 'Untitled';
}

function extractLinks(text: string): string[] {
  const regex = /https?:\/\/[^\s)]+/gi;
  const matches = text.match(regex) || [];
  const unique: string[] = [];
  for (const link of matches) {
    const normalized = link.trim().replace(/[)\],.;]*$/, '');
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized);
    }
  }
  return unique;
}

function appendReferences(content: string, links: string[]): string {
  const missing = links.filter((link) => !content.includes(link));
  if (!missing.length) return content;
  const references = missing.map((link) => `- ${link}`).join('\n');
  const separator = content.trim().length ? '\n\n' : '';
  return `${content.trim()}${separator}**References:**\n${references}`;
}

function tryParseJsonResult(
  raw: string,
  fallback: NoteGenerationResult
): NoteGenerationResult | null {
  const payload = extractJsonPayload(raw);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallback.title,
      content: typeof parsed.content === 'string' && parsed.content.trim() ? parsed.content.trim() : fallback.content,
      tags: sanitizeTags(parsed.tags)
    };
  } catch (error) {
    console.warn('[GenerateNoteNode] Failed to parse JSON note result:', error);
    return null;
  }
}

export async function generateNoteNode(
  client: LLMClient,
  params: NoteGenerationParams
): Promise<NoteGenerationResult> {
  const model = getChatModel(params.llmConfig);
  console.info('[GenerateNoteNode] Using model:', model, 'from:', params.llmConfig ? 'frontend' : 'backend cache');

  const system = getPrompt('note_gen_system');
  const user = getPrompt('note_gen_user', undefined as any, {
    selectedText: params.selectedText,
    sourceUrl: params.sourceUrl || '',
    context: params.context || []
  });

  const rawResult = await client.chat({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const fallback: NoteGenerationResult = {
    title: deriveTitle(params.selectedText),
    content: params.selectedText.trim(),
    tags: []
  };

  const parsed = tryParseJsonResult(rawResult, fallback) || fallback;

  const linkSet = new Set<string>(extractLinks(params.selectedText));
  if (params.sourceUrl) {
    linkSet.add(params.sourceUrl);
  }
  const links = Array.from(linkSet);
  if (links.length) {
    parsed.content = appendReferences(parsed.content, links);
  }

  return parsed;
}

