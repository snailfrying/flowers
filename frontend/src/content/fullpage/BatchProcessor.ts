import { TranslatableNode } from './types';
import { TechContentProtector } from './TechContentProtector';

declare const chrome: any;

export class BatchProcessor {
    private queue: TranslatableNode[] = [];
    private isProcessing = false;
    private readonly BATCH_SIZE = 10; // Number of segments per batch
    private readonly MAX_BATCH_CHARS = 2000; // Max characters per batch
    private targetLang = 'zh';
    private context = '';
    private protector = new TechContentProtector();

    constructor(targetLang: string = 'zh', context: string = '') {
        this.targetLang = targetLang;
        this.context = context;
    }

    public setTargetLang(lang: string) {
        this.targetLang = lang;
    }

    public setContext(context: string) {
        this.context = context;
    }

    /**
     * Add nodes to the translation queue
     */
    public addNodes(nodes: TranslatableNode[]) {
        // Sort by priority (highest first)
        const sortedNodes = [...nodes].sort((a, b) => b.priority - a.priority);
        this.queue.push(...sortedNodes);
        this.processQueue();
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const batch: TranslatableNode[] = [];
            let currentChars = 0;

            // Build a batch
            while (
                this.queue.length > 0 &&
                batch.length < this.BATCH_SIZE &&
                currentChars < this.MAX_BATCH_CHARS
            ) {
                const node = this.queue.shift()!;
                batch.push(node);
                currentChars += node.originalText.length;
            }

            if (batch.length > 0) {
                await this.translateBatch(batch);
            }
        }

        this.isProcessing = false;
    }

    private async translateBatch(batch: TranslatableNode[]) {
        batch.forEach(node => node.status = 'translating');
        this.protector.clear();

        // Apply technical content protection
        const texts = batch.map(node => this.protector.protect(node.originalText));
        const combinedText = texts.join('\n---\n');

        try {
            const response = await this.callTranslateApi(combinedText);
            const translations = response.split('\n---\n').map(t => t.trim());

            batch.forEach((node, index) => {
                let translation = translations[index] || '';

                // Restore technical content
                translation = this.protector.restore(translation);

                node.translatedText = translation;
                node.status = 'translated';

                // Trigger a custom event for the injector to pick up
                const event = new CustomEvent('flowers:node-translated', {
                    detail: { nodeId: node.id, translation }
                });
                window.dispatchEvent(event);
            });
        } catch (error) {
            console.error('[BatchProcessor] Batch translation failed:', error);
            batch.forEach(node => node.status = 'error');
        }
    }

    private callTranslateApi(text: string): Promise<string> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'agent:translateFullPage',
                params: {
                    text,
                    targetLang: this.targetLang,
                    context: this.context,
                    mode: 'full-page'
                }
            }, (response: any) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error?.message || 'Unknown translation error'));
                }
            });
        });
    }
}
