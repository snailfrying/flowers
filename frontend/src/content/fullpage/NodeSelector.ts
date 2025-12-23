import { TranslatableNode } from './types';

export class NodeSelector {
    private readonly IGNORE_TAGS = new Set([
        'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'CANVAS', 'SVG', 'VIDEO', 'AUDIO',
        'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'
    ]);

    private readonly TECH_TAGS = new Set([
        'CODE', 'PRE', 'KBD', 'SAMP', 'VAR', 'MATH'
    ]);

    private readonly TECH_CLASSES = [
        'mermaid', 'katex', 'highlight', 'hljs', 'syntax-highlight', 'code-block'
    ];

    private readonly INTERNAL_CLASSES = [
        'flowers-translated-text',
        'flowers-bilingual-container'
    ];

    /**
     * Select all translatable nodes from the document
     */
    public selectNodes(root: HTMLElement = document.body): TranslatableNode[] {
        const nodes: TranslatableNode[] = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node: Node) => {
                    if (this.shouldSkip(node as HTMLElement)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (this.isTranslatable(node as HTMLElement)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let currentNode = walker.nextNode();
        while (currentNode) {
            const element = currentNode as HTMLElement;

            // Optimization: If we accept this node, we should ideally skip its children
            // to avoid nested translations. Since TreeWalker is depth-first,
            // we can check if any of our already selected nodes is an ancestor.
            const isNested = nodes.some(n => n.element.contains(element));

            if (!isNested) {
                const text = element.innerText.trim();
                if (text && text.length > 1) {
                    nodes.push({
                        id: Math.random().toString(36).substring(2, 11),
                        element,
                        originalText: text,
                        status: 'pending',
                        priority: this.calculatePriority(element)
                    });
                }
            }

            currentNode = walker.nextNode();
        }

        return nodes;
    }

    private shouldSkip(element: HTMLElement): boolean {
        // 1. Basic blacklist tags
        if (this.IGNORE_TAGS.has(element.tagName)) return true;

        // 2. Technical content tags
        if (this.TECH_TAGS.has(element.tagName)) return true;

        // 3. Specific class names (technical content)
        if (this.TECH_CLASSES.some(cls => element.classList.contains(cls))) return true;

        // 4. Internal translation UI classes or already translated
        if (this.INTERNAL_CLASSES.some(cls => element.classList.contains(cls)) ||
            element.hasAttribute('data-flowers-translated')) return true;

        // 5. Data attribute ignore
        if (element.hasAttribute('data-flowers-ignore')) return true;

        // 5. Ancestor check (up to 5 levels)
        let parent = element.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
            if (this.TECH_TAGS.has(parent.tagName) ||
                this.TECH_CLASSES.some(cls => parent!.classList.contains(cls)) ||
                this.INTERNAL_CLASSES.some(cls => parent!.classList.contains(cls)) ||
                parent.hasAttribute('data-flowers-translated') ||
                parent.hasAttribute('data-flowers-ignore')) {
                return true;
            }
            parent = parent.parentElement;
        }

        return false;
    }

    private isTranslatable(element: HTMLElement): boolean {
        // Content-rich tags
        const contentTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'SPAN', 'DIV', 'ARTICLE', 'SECTION'];
        if (!contentTags.includes(element.tagName)) return false;

        // Check if it has direct text nodes
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes[i];
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                return true;
            }
        }

        return false;
    }

    private calculatePriority(element: HTMLElement): number {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

        // Priority 10 for visible elements, 1 for others
        return isVisible ? 10 : 1;
    }
}
