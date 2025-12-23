export class FloatingButton {
    private button: HTMLDivElement | null = null;
    private onClick: () => void;
    private isEnabled = false;

    constructor(onClick: () => void) {
        this.onClick = onClick;
    }

    public mount() {
        if (this.button) return;

        this.button = document.createElement('div');
        this.button.id = 'flowers-fullpage-btn';
        this.updateStyle();

        this.button.innerHTML = `
      <div class="flowers-btn-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 8l6 6 6-6" />
          <path d="M4 14h16" />
        </svg>
      </div>
    `;

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onClick();
        });

        document.body.appendChild(this.button);
        this.injectStyles();
    }

    public unmount() {
        if (this.button && this.button.parentNode) {
            this.button.parentNode.removeChild(this.button);
        }
        this.button = null;
    }

    public setState(isEnabled: boolean) {
        this.isEnabled = isEnabled;
        this.updateStyle();
    }

    private updateStyle() {
        if (!this.button) return;

        const color = this.isEnabled ? '#8b5cf6' : '#6b7280';
        const bgColor = this.isEnabled ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.9)';

        this.button.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${bgColor};
      border: 1px solid ${color};
      color: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
    `;

        if (this.isEnabled) {
            this.button.style.transform = 'scale(1.1)';
        } else {
            this.button.style.transform = 'scale(1)';
        }
    }

    private injectStyles() {
        if (document.getElementById('flowers-btn-styles')) return;
        const style = document.createElement('style');
        style.id = 'flowers-btn-styles';
        style.textContent = `
      #flowers-fullpage-btn:hover {
        transform: scale(1.15) !important;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }
      #flowers-fullpage-btn:active {
        transform: scale(0.95) !important;
      }
      .flowers-btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
        document.head.appendChild(style);
    }
}
