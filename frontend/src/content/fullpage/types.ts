export interface TranslatableNode {
    id: string;
    element: HTMLElement;
    originalText: string;
    translatedText?: string;
    status: 'pending' | 'translating' | 'translated' | 'error';
    priority: number; // 0-10, 10 is highest (e.g. in viewport)
}

export interface TranslationTask {
    node: TranslatableNode;
    resolve: (translation: string) => void;
    reject: (error: any) => void;
}

export interface FullPageTranslationSettings {
    enabled: boolean;
    targetLang: string;
    displayMode: 'bilingual' | 'translation-only';
}
