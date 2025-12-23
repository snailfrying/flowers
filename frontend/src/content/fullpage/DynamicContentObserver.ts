import { NodeSelector } from './NodeSelector';
import { BatchProcessor } from './BatchProcessor';
import { TranslatableNode } from './types';

export class DynamicContentObserver {
    private observer: MutationObserver | null = null;
    private selector: NodeSelector;
    private processor: BatchProcessor;
    private nodes: Map<string, TranslatableNode>;
    private throttleTimer: any = null;

    constructor(
        selector: NodeSelector,
        processor: BatchProcessor,
        nodes: Map<string, TranslatableNode>
    ) {
        this.selector = selector;
        this.processor = processor;
        this.nodes = nodes;
    }

    public start() {
        if (this.observer) return;

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    public stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.throttleTimer) {
            clearTimeout(this.throttleTimer);
            this.throttleTimer = null;
        }
    }

    private handleMutations(_mutations: MutationRecord[]) {
        // Throttle processing to avoid performance issues on heavy pages
        if (this.throttleTimer) return;

        this.throttleTimer = setTimeout(() => {
            this.throttleTimer = null;
            this.processNewContent();
        }, 2000); // 2 second throttle
    }

    private processNewContent() {
        console.debug('[DynamicObserver] Checking for new content...');

        // Select all nodes again, but only process those we haven't seen
        const allNodes = this.selector.selectNodes();
        const newNodes: TranslatableNode[] = [];

        allNodes.forEach(node => {
            // We use the element itself as a check if possible, or a combination of text and element
            // For now, let's check if any existing node has the same element
            let exists = false;
            for (const existingNode of this.nodes.values()) {
                if (existingNode.element === node.element) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                this.nodes.set(node.id, node);
                newNodes.push(node);
            }
        });

        if (newNodes.length > 0) {
            console.info(`[DynamicObserver] Found ${newNodes.length} new translatable nodes.`);
            this.processor.addNodes(newNodes);
        }
    }
}
