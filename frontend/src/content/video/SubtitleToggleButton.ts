export class SubtitleToggleButton {
    private button: HTMLElement | null = null;
    private isEnabled = false;
    private checkInterval: number | null = null;

    constructor(
        private video: HTMLVideoElement,
        private platform: 'youtube' | 'netflix' | 'generic',
        private onToggle: (enabled: boolean) => void
    ) { }

    mount() {
        this.checkInterval = window.setInterval(() => {
            if (!this.button || !this.button.isConnected) {
                this.tryMount();
            }
        }, 1000);
        this.tryMount();
    }

    dispose() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.button) {
            this.button.remove();
            this.button = null;
        }
    }

    private tryMount() {
        if (this.platform === 'youtube') {
            this.mountYouTube();
        } else {
            this.mountGeneric();
        }
    }

    private mountYouTube() {
        // Try to find the right controls container
        // .ytp-right-controls is usually where Settings/CC/Fullscreen buttons are
        const controls = document.querySelector('.ytp-right-controls');
        if (!controls) return;

        // Check if we already injected
        if (controls.querySelector('.flowers-subtitle-toggle')) return;

        this.createButton();
        if (this.button) {
            // Insert before the settings button (usually .ytp-settings-button) or at the beginning
            const settingsBtn = controls.querySelector('.ytp-settings-button');
            if (settingsBtn && settingsBtn.parentNode) {
                settingsBtn.parentNode.insertBefore(this.button, settingsBtn);
            } else {
                controls.prepend(this.button);
            }
        }
    }

    private mountGeneric() {
        // For generic videos, we overlay a button on the video container
        const container = this.video.parentElement;
        if (!container) return;

        // Check if we already injected
        if (container.querySelector('.flowers-subtitle-toggle')) return;

        this.createButton();
        if (this.button) {
            // Position it in the bottom right, but above native controls if possible
            Object.assign(this.button.style, {
                position: 'absolute',
                bottom: '60px',
                right: '20px',
                zIndex: '2147483647'
            });
            container.appendChild(this.button);
        }
    }

    private createButton() {
        const btn = document.createElement('button');
        btn.className = 'flowers-subtitle-toggle ytp-button'; // ytp-button class makes it look native on YouTube
        btn.setAttribute('aria-label', 'Toggle Translation');
        btn.setAttribute('title', 'Toggle Translation');

        // Styles for generic platform or to override/ensure visibility
        if (this.platform !== 'youtube') {
            btn.style.cssText = `
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      `;
        } else {
            // YouTube specific adjustments
            btn.style.verticalAlign = 'top';
            // Ensure it has the same height as other buttons
            btn.style.height = '100%';
            btn.style.padding = '0 10px';
        }

        // Icon SVG (Translation icon)
        // Refined icon, slightly smaller to match YouTube's sizing
        const iconSvg = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="pointer-events: none;">
        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
      </svg>
    `;

        btn.innerHTML = iconSvg;

        // State handling
        this.updateButtonState(btn);

        btn.onclick = (e) => {
            e.stopPropagation(); // Prevent pausing video
            this.isEnabled = !this.isEnabled;
            this.updateButtonState(btn);
            this.onToggle(this.isEnabled);
        };

        this.button = btn;
    }

    private updateButtonState(btn: HTMLElement) {
        const svg = btn.querySelector('svg') as SVGElement;

        if (this.isEnabled) {
            if (this.platform === 'youtube') {
                // Native YouTube active style: Icon color change, no background
                if (svg) svg.style.fill = '#f00'; // YouTube Red
                btn.style.opacity = '1';
            } else {
                // Generic: Red background
                btn.style.background = 'rgba(255, 78, 78, 0.9)';
                btn.style.fill = '#fff';
            }
        } else {
            if (this.platform === 'youtube') {
                // Native YouTube inactive style: White icon
                if (svg) svg.style.fill = '#fff';
                btn.style.opacity = '1'; // Keep opacity 1, let fill handle it
            } else {
                // Generic: Dark background
                btn.style.background = 'rgba(0, 0, 0, 0.6)';
                btn.style.fill = '#fff';
                btn.style.opacity = '0.8';
            }
        }
    }
}
