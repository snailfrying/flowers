export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class TextExtractor {
  /**
   * Extract text from the textLayer within the given bounds.
   * Strings are sorted by visual order (top-down, left-right).
   */
  public extractText(textLayer: HTMLElement, selectionBounds: Rect): string {
    const spans = Array.from(textLayer.querySelectorAll('span'));
    const intersectingSpans: { span: HTMLSpanElement, rect: Rect }[] = [];

    // Get the bounding rect of the textLayer to calculate relative coordinates if needed.
    // However, usually selectionBounds are relative to the viewport/page container.
    // Ideally, we compare ClientRects.

    // Assumption: selectionBounds is in Client/Page coordinates matching getBoundingClientRect()
    
    for (const span of spans) {
      const rect = span.getBoundingClientRect();
      const relativeRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };

      if (this.isIntersecting(selectionBounds, relativeRect)) {
        intersectingSpans.push({ span, rect: relativeRect });
      }
    }

    // Sort by Top, then Left
    intersectingSpans.sort((a, b) => {
      // Allow for some small vertical misalignment (e.g. 5px) to be considered "same line"
      const Y_TOLERANCE = 5;
      if (Math.abs(a.rect.top - b.rect.top) > Y_TOLERANCE) {
        return a.rect.top - b.rect.top;
      }
      return a.rect.left - b.rect.left;
    });

    return intersectingSpans.map(item => item.span.textContent).join(' ');
  }

  private isIntersecting(r1: Rect, r2: Rect): boolean {
    return !(r2.left > r1.left + r1.width || 
             r2.left + r2.width < r1.left || 
             r2.top > r1.top + r1.height || 
             r2.top + r2.height < r1.top);
  }
}
