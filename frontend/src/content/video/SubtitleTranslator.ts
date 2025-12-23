import { SubtitleCue } from './SubtitleExtractor';

// Declare chrome type locally to avoid dependency issues
declare const chrome: {
    runtime: {
        sendMessage: (message: any, callback?: (response: any) => void) => void;
        lastError?: { message: string };
    };
};

export class SubtitleTranslator {
    private queue: SubtitleCue[] = [];
    private batchTimer: number | null = null;
    private translatedCache = new Map<string, string>();
    private streamBuffer: string = '';
    private streamTimer: number | null = null;
    private lastProcessedText: string = '';
    private isContextInvalidated = false;

    constructor(
        private targetLang: string = 'zh',
        private batchDelay = 400 // Delay to wait for sentence completion
    ) { }

    setTargetLang(lang: string) {
        this.targetLang = lang;
        this.translatedCache.clear();
        this.streamBuffer = '';
        this.lastProcessedText = '';
    }

    async addSubtitle(cue: SubtitleCue): Promise<string> {
        const newText = cue.text.trim();
        if (!newText) return '';

        // Check cache first (for exact matches)
        const cached = this.translatedCache.get(newText);
        if (cached) return cached;

        return new Promise<string>((resolve) => {
            const MAX_BUFFER_LENGTH = 50; // Characters - flush if too long

            const isExtension = newText.startsWith(this.streamBuffer) || this.streamBuffer.startsWith(newText);

            if (isExtension) {
                // Update buffer to the longer/newer version
                if (newText.length > this.streamBuffer.length) {
                    this.streamBuffer = newText;
                }
                // Reset timer to wait for more
                if (this.streamTimer) clearTimeout(this.streamTimer);

                // Check if buffer is too long - flush immediately
                if (this.streamBuffer.length >= MAX_BUFFER_LENGTH) {
                    console.log('[SubtitleTranslator] Buffer too long, flushing immediately');
                    this.triggerTranslation(this.streamBuffer, resolve);
                    this.streamBuffer = '';
                    return;
                }
            } else {
                // New sentence detected!
                // 1. Flush the *previous* streamBuffer if it wasn't processed yet
                if (this.streamBuffer && this.streamBuffer !== this.lastProcessedText) {
                    this.triggerTranslation(this.streamBuffer);
                }

                // 2. Start new buffer
                this.streamBuffer = newText;
                if (this.streamTimer) clearTimeout(this.streamTimer);
            }

            // Always schedule a translation for the current buffer state
            this.streamTimer = window.setTimeout(() => {
                if (this.streamBuffer && this.streamBuffer !== this.lastProcessedText) {
                    this.triggerTranslation(this.streamBuffer, resolve);
                }
            }, this.batchDelay);
        });
    }

    private async triggerTranslation(text: string, resolve?: (val: string) => void) {
        this.lastProcessedText = text;

        // Add to queue for batch processing
        const cue = { text, startTime: 0, endTime: 0 } as SubtitleCue;
        if (resolve) {
            (cue as any)._resolve = resolve;
        }
        this.queue.push(cue);

        this.processBatch();
    }

    private async processBatch() {
        if (this.queue.length === 0 || this.isContextInvalidated) return;

        const batch = this.queue.splice(0);
        const texts = batch.map((cue: SubtitleCue) => cue.text);

        const textToTranslate = texts.join('\n');

        try {
            const translatedBlock = await this.callTranslateApi(textToTranslate);

            // Split results
            const translations = translatedBlock.split('\n').map((t: string) => t.trim());
            console.log('[SubtitleTranslator] Translated batch:', translations);

            batch.forEach((cue: SubtitleCue, index: number) => {
                // Fallback if lines don't match
                const translation = translations[index] || (index === 0 ? translatedBlock : '');

                this.translatedCache.set(cue.text, translation);

                // Resolve the promise
                if ((cue as any)._resolve) {
                    (cue as any)._resolve(translation);
                }
            });

        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            if (errorMsg.includes('Extension context invalidated')) {
                console.warn('[SubtitleTranslator] Extension context invalidated. Stopping translation.');
                this.isContextInvalidated = true;
                this.queue = [];
                if (this.batchTimer) {
                    clearTimeout(this.batchTimer);
                    this.batchTimer = null;
                }
                batch.forEach((cue: SubtitleCue) => {
                    if ((cue as any)._resolve) {
                        (cue as any)._resolve('请刷新页面以继续使用');
                    }
                });
                return;
            }

            console.error('[SubtitleTranslator] Translation failed:', error);
            batch.forEach((cue: SubtitleCue) => {
                if ((cue as any)._resolve) {
                    (cue as any)._resolve('[Translation Error]');
                }
            });
        }
    }

    private callTranslateApi(text: string): Promise<string> {
        if (this.isContextInvalidated) {
            return Promise.reject(new Error('Extension context invalidated'));
        }
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage({
                    action: 'translate',
                    text,
                    targetLang: this.targetLang,
                    mode: 'subtitle'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        const msg = chrome.runtime.lastError.message || '';
                        if (msg.includes('Extension context invalidated')) {
                            this.isContextInvalidated = true;
                        }
                        console.error('[SubtitleTranslator] Runtime error:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else if (response && (response.ok || response.success)) {
                        resolve(response.result || response.data);
                    } else {
                        console.error('[SubtitleTranslator] API error response:', response);
                        const errorMsg = response?.error?.message || response?.error || 'Unknown error';
                        reject(new Error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg));
                    }
                });
            } catch (e: any) {
                if (e.message && e.message.includes('Extension context invalidated')) {
                    this.isContextInvalidated = true;
                }
                reject(e);
            }
        });
    }
}
