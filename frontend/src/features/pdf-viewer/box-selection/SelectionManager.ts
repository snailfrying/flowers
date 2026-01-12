import { Rect } from './TextExtractor';

export class SelectionManager {
    private isSelecting: boolean = false;
    private startPoint: { x: number; y: number } | null = null;
    private endPoint: { x: number; y: number } | null = null;

    public startSelection(x: number, y: number) {
        this.isSelecting = true;
        this.startPoint = { x, y };
        this.endPoint = { x, y };
    }

    public updateSelection(x: number, y: number) {
        if (!this.isSelecting) return;
        this.endPoint = { x, y };
    }

    public endSelection() {
        this.isSelecting = false;
    }

    public getSelectionBounds(): Rect | null {
        if (!this.startPoint || !this.endPoint) return null;

        const left = Math.min(this.startPoint.x, this.endPoint.x);
        const top = Math.min(this.startPoint.y, this.endPoint.y);
        const width = Math.abs(this.endPoint.x - this.startPoint.x);
        const height = Math.abs(this.endPoint.y - this.startPoint.y);

        if (width < 5 || height < 5) return null; // Filter out clicks or tiny selections

        return { left, top, width, height };
    }

    public isActive(): boolean {
        return this.isSelecting;
    }
}
