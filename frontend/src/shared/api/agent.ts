/**
 * Agent API client (frontend wrapper)
 * Wraps backend agentAPI for frontend use
 */

// @ts-ignore - Runtime import, types from backend/types.js
import { agentAPI } from 'backend/index.js';

// Simple retry wrapper to survive cold service worker startup
async function withRetry<T>(fn: () => Promise<T>, tries = 2, delayMs = 350): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Known transient errors when SW is cold: message port closed / context invalidated
      const transient = /message port closed|context invalidated|Extension context invalidated/i.test(msg);
      lastErr = e;
      if (!transient || i === tries - 1) break;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
import type { TranslateParams as BackendTranslateParams, PolishParams, ChatParams, NoteGenerationParams } from 'backend/types.js';

// Frontend widens targetLang to string to support multi-language targets.
type TranslateParams = Omit<BackendTranslateParams, 'targetLang'> & { targetLang: string };

export const translate = (params: TranslateParams) => withRetry(() => agentAPI.translate(params as unknown as BackendTranslateParams));
export const polish = (params: PolishParams) => withRetry(() => agentAPI.polish(params));
export const generateNote = (params: NoteGenerationParams) => withRetry(() => agentAPI.generateNote(params));
export const chat = (params: ChatParams & { mcpEnabled?: boolean }) => withRetry(() => agentAPI.chat(params));
export const chatStream = (params: ChatParams & { mcpEnabled?: boolean }) => agentAPI.chatStream(params);
export const askWithContext = (params: { text: string; sourceUrl?: string }) => withRetry(() => agentAPI.askWithContext(params));

