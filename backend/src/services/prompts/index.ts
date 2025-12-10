import type { Language } from '../../types.js';
import { getLang } from '../i18n/index.js';
import en from './templates/en.json';
import zh from './templates/zh.json';

type PromptKey = keyof typeof en & keyof typeof zh;

const templates: Record<Language, Record<string, string>> = { en, zh } as any;

const overrides: Partial<Record<string, Partial<Record<Language, string>>>> = {};

// Chrome Extension types (for Service Worker context)
declare const chrome: {
  storage?: {
    local?: {
      get: (keys?: string[] | string | null) => Promise<Record<string, any>>;
      set: (items: Record<string, any>) => Promise<void>;
    };
  };
};

const STORAGE_KEY = 'chroma-prompt-overrides';

/**
 * Load prompt overrides from Chrome Storage
 */
export async function loadPromptOverridesFromStorage(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        const loaded = result[STORAGE_KEY] as Partial<Record<string, Partial<Record<Language, string>>>>;
        // Merge loaded overrides into memory
        Object.assign(overrides, loaded);
        console.info('[Prompts] Loaded prompt overrides from storage:', Object.keys(loaded).length, 'keys');
      } else {
        console.info('[Prompts] No saved prompt overrides found');
      }
    }
  } catch (error: any) {
    console.error('[Prompts] Failed to load prompt overrides from storage:', error?.message || error);
  }
}

/**
 * Save prompt overrides to Chrome Storage
 */
async function savePromptOverridesToStorage(): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: overrides });
      console.info('[Prompts] Saved prompt overrides to storage');
    }
  } catch (error: any) {
    console.error('[Prompts] Failed to save prompt overrides to storage:', error?.message || error);
  }
}

export function setPromptOverride(key: PromptKey, lang: Language, value: string): void {
  overrides[key] = overrides[key] || {};
  overrides[key]![lang] = value;
  // Persist to Chrome Storage
  savePromptOverridesToStorage().catch((err) => {
    console.error('[Prompts] Failed to persist prompt override:', err);
  });
}

export function resetPromptOverride(key: PromptKey, lang: Language): void {
  if (overrides[key]) {
    delete overrides[key]![lang];
    if (Object.keys(overrides[key]!).length === 0) {
      delete overrides[key];
    }
  }
  // Persist to Chrome Storage
  savePromptOverridesToStorage().catch((err) => {
    console.error('[Prompts] Failed to persist prompt override reset:', err);
  });
}

export function getAllPrompts(lang: Language = getLang()): Record<string, { default: string; override?: string }> {
  const result: Record<string, { default: string; override?: string }> = {};
  const keys: PromptKey[] = Object.keys(templates[lang]) as PromptKey[];
  
  for (const key of keys) {
    result[key] = {
      default: templates[lang][key],
      override: overrides[key]?.[lang]
    };
  }
  
  return result;
}

export function getPrompt(key: PromptKey, lang: Language = getLang(), vars?: Record<string, any>): string {
  const base = overrides[key]?.[lang] || templates[lang][key];
  return render(base, vars);
}

function render(tpl: string, vars?: Record<string, any>): string {
  if (!vars) return tpl;
  
  // First, handle array sections {{#array}}{{.}}{{/array}} BEFORE simple variable replacement
  // This prevents {{.}} from being replaced incorrectly
  let out = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/(\w+)\}\}/g, (_m: string, k1: string, inner: string, k2: string) => {
    if (k1 !== k2) return '';
    const v = vars[k1 as keyof typeof vars];
    if (!v) {
      console.warn(`[PromptRender] Variable ${k1} is empty or undefined`);
      return '';
    }
    
    // If v is an array, iterate over each element
    if (Array.isArray(v)) {
      if (v.length === 0) {
        console.warn(`[PromptRender] Array ${k1} is empty`);
        return '';
      }
      const result = v.map((item: any) => {
        // Replace {{.}} with current array item
        const itemStr = String(item);
        // Replace {{.}} in inner template
        return inner.replace(/\{\{\s*\.\s*\}\}/g, () => itemStr);
      }).join('');
      console.info(`[PromptRender] Rendered array ${k1}:`, {
        arrayLength: v.length,
        innerTemplate: inner.substring(0, 50),
        innerTemplateRaw: inner,
        resultLength: result.length,
        resultPreview: result.substring(0, 300),
        firstItem: String(v[0]).substring(0, 100)
      });
      return result;
    }
    
    // If v is truthy but not an array, render inner with vars (recursively)
    return render(inner, vars);
  });
  
  // Then handle simple variable replacement {{var}}
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_: string, k: string) => {
    // Skip {{.}} as it should only be used inside {{#array}}...{{/array}}
    if (k === '.') return '{{.}}';
    const v = vars[k as keyof typeof vars];
    return v == null ? '' : String(v);
  });
  
  return out;
}

export type { PromptKey };

