import type { Language } from '../../types.js';

let current: Language = 'zh';

export function setLang(lang: Language): void {
  current = lang;
}

export function getLang(): Language {
  return current;
}

