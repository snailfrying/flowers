import { NodeSelector } from './NodeSelector';
import { BatchProcessor } from './BatchProcessor';
import { DOMInjector } from './DOMInjector';
import { DynamicContentObserver } from './DynamicContentObserver';
import { FloatingButton } from './FloatingButton';
import { TranslatableNode } from './types';

declare const chrome: any;

export class FullPageTranslationManager {
    private selector: NodeSelector;
    private processor: BatchProcessor;
    private injector: DOMInjector;
    private observer: DynamicContentObserver;
    private floatingBtn: FloatingButton;
    private nodes: Map<string, TranslatableNode> = new Map();
    private isEnabled = false;

    constructor() {
        this.selector = new NodeSelector();
        this.processor = new BatchProcessor();
        this.injector = new DOMInjector();
        this.observer = new DynamicContentObserver(this.selector, this.processor, this.nodes);
        this.floatingBtn = new FloatingButton(() => this.toggleTranslation());
    }

    public init() {
        this.floatingBtn.mount();
        this.initEventListeners();
        this.initSettingsListener();
    }

    private initEventListeners() {
        window.addEventListener('flowers:node-translated', (event: any) => {
            const { nodeId, translation } = event.detail;
            const node = this.nodes.get(nodeId);
            if (node) {
                this.injector.inject(node, translation);
            }
        });
    }

    private async initSettingsListener() {
        // Initial load
        try {
            const data = await chrome.storage.local.get('chroma-notes-settings');
            this.handleSettingsUpdate(data['chroma-notes-settings']);
        } catch (e) {
            console.error('[FullPageManager] Failed to load settings:', e);
        }

        // Listen for changes
        chrome.storage.onChanged.addListener((changes: any, area: string) => {
            if (area === 'local' && changes['chroma-notes-settings']) {
                this.handleSettingsUpdate(changes['chroma-notes-settings'].newValue);
            }
        });
    }

    private handleSettingsUpdate(payload: any) {
        // Handle Zustand persist wrapper
        const settings = payload?.state || payload;

        const fullPageEnabled = settings?.fullPageEnabled ?? false;
        this.floatingBtn.setState(fullPageEnabled);
        const targetLang = settings?.language ?? 'zh';

        this.processor.setTargetLang(targetLang);

        if (fullPageEnabled && !this.isEnabled) {
            this.start();
        } else if (!fullPageEnabled && this.isEnabled) {
            this.stop();
        }
    }

    public start() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        console.info('[FullPageManager] Starting full-page translation...');

        // 1. Extract context
        const context = this.extractPageContext();
        this.processor.setContext(context);

        // 2. Select nodes
        const newNodes = this.selector.selectNodes();
        newNodes.forEach(node => this.nodes.set(node.id, node));

        // 3. Add to processor
        this.processor.addNodes(newNodes);

        // 4. Start dynamic observer
        this.observer.start();
    }

    public stop() {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        console.info('[FullPageManager] Stopping full-page translation...');

        this.injector.clear();
        this.nodes.clear();
        this.observer.stop();
    }

    private toggleTranslation() {
        chrome.storage.local.get('chroma-notes-settings').then((result: any) => {
            const settings = result['chroma-notes-settings'] || {};
            const newState = !this.isEnabled;

            // Update storage - this will trigger syncSettings via listener
            chrome.storage.local.set({
                'chroma-notes-settings': {
                    ...settings,
                    state: {
                        ...(settings.state || {}),
                        fullPageEnabled: newState
                    }
                }
            });
        });
    }

    private extractPageContext(): string {
        const title = document.title;
        const h1 = document.querySelector('h1')?.innerText || '';
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

        return `Title: ${title}\nMain Heading: ${h1}\nDescription: ${description}`.trim();
    }
}
