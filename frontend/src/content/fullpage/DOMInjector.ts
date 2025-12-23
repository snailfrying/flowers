import { TranslatableNode } from './types';

export class DOMInjector {
    private readonly TRANSLATED_CLASS = 'flowers-translated-text';
    private readonly CONTAINER_CLASS = 'flowers-bilingual-container';

    /**
     * Inject translated text into the node's element
     */
    public inject(node: TranslatableNode, translation: string) {
        if (!translation || !node.element) return;

        // Check if already injected
        if (node.element.querySelector(`.${this.TRANSLATED_CLASS}`)) {
            const existing = node.element.querySelector(`.${this.TRANSLATED_CLASS}`) as HTMLElement;
            existing.innerText = translation;
            return;
        }

        // Create translation element
        const translationElement = document.createElement('span');
        translationElement.className = this.TRANSLATED_CLASS;
        translationElement.innerText = translation;

        // Apply styles
        translationElement.style.cssText = `
      display: block;
      color: #666;
      font-size: 0.95em;
      margin-top: 4px;
      margin-bottom: 4px;
      font-style: italic;
      border-left: 2px solid #764ba2;
      padding-left: 8px;
      opacity: 0.9;
    `;

        // Ensure the parent has a relative position if needed, or just append
        // For most block elements, appending a block span works well.
        node.element.appendChild(translationElement);
        node.element.classList.add(this.CONTAINER_CLASS);
        node.element.setAttribute('data-flowers-translated', 'true');
    }

    /**
     * Remove all translations from the page
     */
    public clear() {
        const elements = document.querySelectorAll(`.${this.TRANSLATED_CLASS}`);
        elements.forEach(el => el.remove());

        const containers = document.querySelectorAll(`.${this.CONTAINER_CLASS}`);
        containers.forEach(el => {
            el.classList.remove(this.CONTAINER_CLASS);
            (el as HTMLElement).removeAttribute('data-flowers-translated');
        });
    }
}
