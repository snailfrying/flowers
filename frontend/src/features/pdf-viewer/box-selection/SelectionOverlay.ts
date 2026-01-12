import { SelectionManager } from './SelectionManager';
import { TextExtractor, Rect } from './TextExtractor';

export class SelectionOverlay {
    private container: HTMLElement;
    private overlay: HTMLElement;
    private selectionBox: HTMLElement;
    private manager: SelectionManager;
    private extractor: TextExtractor;

    // Callback for when translation is triggered
    public onTranslate?: (text: string, rect: Rect) => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.manager = new SelectionManager();
        this.extractor = new TextExtractor();

        this.overlay = document.createElement('div');
        this.overlay.className = 'flowers-selection-overlay';
        this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      cursor: crosshair;
      pointer-events: auto;
    `;

        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'flowers-selection-box';
        this.selectionBox.style.cssText = `
      position: absolute;
      border: 2px solid #1a73e8;
      background-color: rgba(26, 115, 232, 0.2);
      display: none;
      pointer-events: none;
    `;

        this.overlay.appendChild(this.selectionBox);
        this.container.appendChild(this.overlay);

        this.bindEvents();
    }

    private bindEvents() {
        this.overlay.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.overlay.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.overlay.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Allow exiting mode with Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.destroy(); // Or just disable?
            }
        });
    }

    public setEnabled(enabled: boolean) {
        this.overlay.style.pointerEvents = enabled ? 'auto' : 'none';
        this.overlay.style.display = enabled ? 'block' : 'none';
        if (!enabled) {
            this.selectionBox.style.display = 'none';
            this.manager.endSelection();
        }
    }

    private onMouseDown(e: MouseEvent) {
        // Prevent default to avoid Selecting text natively in PDF viewer
        e.preventDefault();
        e.stopPropagation();

        // const rect = this.overlay.getBoundingClientRect();
        const x = e.clientX; // Use client coords for consistency with getBoundingClientRect
        const y = e.clientY;

        this.manager.startSelection(x, y);
        this.updateVisuals();
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.manager.isActive()) return;

        e.preventDefault();
        const x = e.clientX;
        const y = e.clientY;

        this.manager.updateSelection(x, y);
        this.updateVisuals();
    }

    private onMouseUp(e: MouseEvent) {
        if (!this.manager.isActive()) return;

        this.manager.updateSelection(e.clientX, e.clientY);
        this.manager.endSelection();

        const bounds = this.manager.getSelectionBounds();
        if (bounds) {
            this.handleSelectionComplete(bounds);
        }

        // Hide box after a short delay or keep it until closed? 
        // Usually keep it until user clicks away or close result.
        // For now, let's keep it visible.
    }

    private updateVisuals() {
        const bounds = this.manager.getSelectionBounds();
        if (bounds) {
            // Need to convert ClientRect bounds back to relative to overlay if overlay is not fixed
            // But overlay is 100% of container, and assuming container is relative.

            const containerRect = this.overlay.getBoundingClientRect();

            this.selectionBox.style.left = `${bounds.left - containerRect.left}px`;
            this.selectionBox.style.top = `${bounds.top - containerRect.top}px`;
            this.selectionBox.style.width = `${bounds.width}px`;
            this.selectionBox.style.height = `${bounds.height}px`;
            this.selectionBox.style.display = 'block';
        } else {
            this.selectionBox.style.display = 'none';
        }
    }

    private async handleSelectionComplete(bounds: Rect) {
        // Find ALL textLayers (one per page)
        const textLayers = Array.from(this.container.querySelectorAll('.textLayer')) as HTMLElement[];

        if (textLayers.length === 0) {
            console.warn('No textLayers found in container');
            return;
        }

        let fullText = '';

        // Iterate through all layers to find intersecting text
        // This supports selections that might span pages (though rare for box select) 
        // or just finding the correct page.
        for (const layer of textLayers) {
            const text = this.extractor.extractText(layer, bounds);
            if (text && text.trim().length > 0) {
                fullText += (fullText ? ' ' : '') + text;
            }
        }

        if (fullText.trim().length > 0) {
            console.log('Selected Text:', fullText);
            if (this.onTranslate) {
                this.onTranslate(fullText, bounds);
            }
        } else {
            console.log('No text found in selection bounds');
        }
    }

    public destroy() {
        this.overlay.remove();
    }
}
