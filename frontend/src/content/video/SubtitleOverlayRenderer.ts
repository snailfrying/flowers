
import { SubtitleCue } from './SubtitleExtractor';

export interface SubtitleOverlayConfig {
    position: 'top' | 'bottom';
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
}

export class SubtitleOverlayRenderer {
    private overlay: HTMLElement | null = null;
    private hideTimer: number | null = null;
    private displayDuration = 5000; // Show for 5 seconds after last update

    constructor(
        private video: HTMLVideoElement,
        private config: SubtitleOverlayConfig = {
            position: 'bottom',
            fontSize: 18,
            fontColor: '#ffff00', // Yellow for better visibility
            backgroundColor: '#000000',
            backgroundOpacity: 0.75
        }
    ) { }

    init() {
        this.createOverlay();
    }

    dispose() {
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    updateTranslation(_cue: SubtitleCue, translated: string) {
        if (!translated || translated.trim() === '') return;

        console.log('[SubtitleOverlayRenderer] Showing translation:', translated);

        this.showSubtitle(translated);

        // Reset hide timer
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
        }
        this.hideTimer = window.setTimeout(() => {
            this.hideSubtitle();
        }, this.displayDuration);
    }

    private showSubtitle(text: string) {
        if (!this.overlay) return;
        this.overlay.textContent = text;
        this.overlay.style.opacity = '1';
        this.overlay.style.display = 'block';
    }

    private hideSubtitle() {
        if (!this.overlay) return;
        this.overlay.style.opacity = '0';
        // After fade out, hide completely
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
        }, 300);
    }

    private createOverlay() {
        // Try to find the best container
        // For YouTube, .html5-video-player is the main player container
        const playerContainer = this.video.closest('.html5-video-player');
        const container = (playerContainer as HTMLElement) || this.video.parentElement || document.body;

        console.log('[SubtitleOverlayRenderer] Creating overlay in container:', container.className || container.tagName);

        // Ensure container is positioned so we can absolute position the overlay
        const containerStyle = window.getComputedStyle(container);
        if (containerStyle.position === 'static') {
            container.style.position = 'relative';
        }

        this.overlay = document.createElement('div');
        this.overlay.id = 'flowers-subtitle-overlay';

        // Base styles
        Object.assign(this.overlay.style, {
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            pointerEvents: 'none', // Let clicks pass through to video controls
            zIndex: '2147483647', // Max z-index
            padding: '8px 16px',
            borderRadius: '4px',
            transition: 'opacity 0.3s ease',
            width: 'auto',
            maxWidth: '90%',
            whiteSpace: 'pre-wrap',
            textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9)',
            fontWeight: 'bold',
            lineHeight: '1.4',
            display: 'none'
        });

        this.applyConfigStyles();

        container.appendChild(this.overlay);
    }

    private applyConfigStyles() {
        if (!this.overlay) return;

        this.overlay.style.fontSize = `${this.config.fontSize}px`;
        this.overlay.style.color = this.config.fontColor;
        this.overlay.style.backgroundColor = this.hexToRgba(this.config.backgroundColor, this.config.backgroundOpacity);

        if (this.config.position === 'bottom') {
            this.overlay.style.bottom = '15%'; // Higher than original subtitles
            this.overlay.style.top = 'auto';
        } else {
            this.overlay.style.top = '10%';
            this.overlay.style.bottom = 'auto';
        }
    }

    private hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
