/**
 * Content Script
 * Injected into all web pages to handle text selection
 */

console.log('[Chroma] Content Script loaded at', new Date().toISOString());

// Chrome types declaration
// @ts-ignore - Global chrome object
declare const chrome: {
  runtime: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => void) => void;
    };
  };
};

// Prevent duplicate injection on the same page and skip iframes to avoid duplicated UI
try {
  if (window.top !== window) {
    console.log('[Chroma] Skipping content script in iframe');
    // Early return to avoid binding listeners in iframes
    throw new Error('IFRAME_SKIP');
  }
  // @ts-ignore
  if ((window as any).__CHROMA_NOTES_CS_LOADED__) {
    console.warn('[Chroma] Content Script already loaded, skipping duplicate injection');
  } else {
    // @ts-ignore
    (window as any).__CHROMA_NOTES_CS_LOADED__ = true;
    console.log('[Chroma] Content Script initialized');
  }
} catch (_e) { }

// Import React and necessary components dynamically to avoid bundling issues
let ReactModule: any;
let ReactDOMModule: any;
let SelectionPopover: any;
let ToastProvider: any;
let RouterProvider: any;
let I18nextProvider: any;
let i18nInstance: any;

async function loadDependencies() {
  if (!ReactModule) {
    ReactModule = (await import('react')).default;
    // Import i18n init to avoid react-i18next warning in content script context

    i18nInstance = (await import('../shared/i18n/i18n')).default;
    // Provider
    I18nextProvider = (await import('react-i18next')).I18nextProvider;
    // react-dom/client doesn't have default export; grab the module namespace
    ReactDOMModule = await import('react-dom/client');

    const popoverModule = await import('../components/popover/SelectionPopover');
    SelectionPopover = popoverModule.SelectionPopover;
    const toastModule = await import('../components/common/Toaster');
    ToastProvider = toastModule.ToastProvider;
    const routerModule = await import('../shared/router');
    RouterProvider = routerModule.RouterProvider;

    // Initialize settings sync after dependencies are loaded
    syncSettings();
  }
}

// Sync settings (Theme & Language) from Chrome Storage
type PersistedSettings = {
  language?: 'zh' | 'en';
  theme?: 'light' | 'dark' | 'system';
};

/**
 * Normalize payload coming from persist middleware
 * It can be:
 *  - stringified JSON
 *  - { state: { language, theme }, version }
 *  - { language, theme }
 */
function normalizeSettingsPayload(payload: any): PersistedSettings | null {
  if (!payload) return null;

  let value = payload;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch (error) {
      console.warn('[Chroma] Failed to parse settings payload', error);
      return null;
    }
  }

  if (value && typeof value === 'object') {
    if ('state' in value && typeof value.state === 'object') {
      value = value.state;
    }
    const settings: PersistedSettings = {};
    if (value.language) settings.language = value.language;
    if (value.theme) settings.theme = value.theme;
    if (settings.language || settings.theme) {
      return settings;
    }
  }
  return null;
}

async function syncSettings() {
  if (!i18nInstance) {
    console.warn('[Chroma] i18n not ready, skipping settings sync');
    return;
  }

  const applySettings = (raw: any) => {
    const settings = normalizeSettingsPayload(raw);
    if (!settings) return;

    console.log('[Chroma] Applying settings:', settings);

    // Sync Language - settings is already the persisted partial state { language, theme }
    if (settings.language && i18nInstance.language !== settings.language) {
      console.log('[Chroma] Changing language to:', settings.language);
      i18nInstance.changeLanguage(settings.language);

      // Force re-render if popover is open
      if (lastPopoverState && popoverRoot) {
        console.log('[Chroma] Forcing re-render for language change');
        showPopover(lastPopoverState.text, lastPopoverState.position).catch(e => console.error(e));
      }
    }

    // Sync Theme - apply to shadow root containers
    if (settings.theme) {
      const isDark = settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      console.log('[Chroma] Applying theme:', settings.theme, 'isDark:', isDark);

      // Apply to all containers in shadow DOM
      if (shadowRootRef) {
        const containers = [
          shadowRootRef.getElementById('chroma-notes-popover-root'),
          shadowRootRef.getElementById('chroma-portal-root')
        ];

        containers.forEach(container => {
          if (container) {
            if (isDark) {
              container.classList.add('dark');
            } else {
              container.classList.remove('dark');
            }
          }
        });
      }
    }
  };

  // Initial load
  try {
    // @ts-ignore
    const data = await chrome.storage.local.get('chroma-notes-settings');
    console.log('[Chroma] Initial settings load:', data);
    if (data && data['chroma-notes-settings']) {
      applySettings(data['chroma-notes-settings']);
    }
  } catch (e) {
    console.error('[Chroma] Failed to load settings', e);
  }

  // Listen for changes
  // @ts-ignore
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['chroma-notes-settings']) {
      try {
        const newValue = changes['chroma-notes-settings'].newValue;
        console.log('[Chroma] Settings changed:', newValue);
        if (newValue) {
          applySettings(newValue);
        }
      } catch (e) {
        console.error('[Chroma] Failed to process settings change', e);
      }
    }
  });
}

// ------ Floating UI (smart positioning) ------
let floatingMod: any = null;
async function ensureFloating() {
  if (!floatingMod) {
    try {
      floatingMod = await import(/* @vite-ignore */ '@floating-ui/dom');
    } catch (_e) {
      try { console.warn('[Chroma] Floating UI not available, fallback to basic positioning'); } catch (_ee) { }
      floatingMod = null;
    }
  }
  return floatingMod;
}

// Removed buildDictHtml and renderMarkdownBasic - all rendering now handled by ReactMarkdown component

let popoverContainer: HTMLDivElement | null = null;
let shadowHost: HTMLDivElement | null = null;
let shadowRootRef: ShadowRoot | null = null;
let bodyFallbackContainer: HTMLDivElement | null = null;
let uiBodyContainer: HTMLDivElement | null = null; // active UI container anchored to body
let popoverRoot: any = null;
let reactRendered = false;
let currentSelection: Selection | null = null;
let isFixed = false;
let isHovering = false;
let uiInteracting = false;
let lastShowAt = 0;
let debugBeacon: HTMLDivElement | null = null;
let lastVirtualRef: { getBoundingClientRect: () => DOMRect } | null = null;
let lastPointer: { x: number; y: number } | null = null; // last mouseup point
let selectionTimeout: number | null = null; // Debounce timer for text selection
let isUnfixing = false; // 标志：正在取消固定，防止被关闭
const SELECTION_DEBOUNCE_DELAY = 150; // ms - wait for selection to stabilize
const MIN_SELECTION_CHARS = 2; // Minimum characters required to trigger popover
let isMouseDown = false; // Track if user is still dragging selection

function isEditableNode(node: EventTarget | null): boolean {
  const el = node as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as any).isContentEditable) return true;
  // Some sites wrap editors; climb a bit
  let p: HTMLElement | null = el;
  for (let i = 0; i < 3 && p; i++) {
    if (p.isContentEditable) return true;
    p = p.parentElement;
  }
  return false;
}

function getSelectedText(): string | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const text = selection.toString().trim();
  return text || null;
}

// Handle clicks outside the popover to hide it
document.addEventListener('mousedown', (e: MouseEvent) => {
  if (isFixed || uiInteracting || isDraggingGlobal) {
    return;
  }

  const target = e.target as HTMLElement;
  // If clicked inside popoverHost or portal, ignore
  if (shadowHost && shadowHost.contains(target)) {
    return;
  }

  // If we are showing popover, hide it
  if (popoverContainer && popoverContainer.style.opacity === '1') {
    console.log('[Chroma] Click outside detected, hiding popover');
    hidePopover();
  }
}, { capture: true, passive: true });

// Listen for selection changes to handle dynamic text selection
document.addEventListener('selectionchange', () => {
  try {
    // 保护：正在交互、拖动或取消固定时，不处理
    if (uiInteracting || isDraggingGlobal || isUnfixing) {
      return;
    }
    const selectedText = getSelectedText();
    const textLen = selectedText ? selectedText.length : 0;
    console.log('[Chroma] selectionchange textLen=', textLen);


    if (!(textLen >= MIN_SELECTION_CHARS && !isMouseDown)) {
      // No text selected
      // Only hide if not fixed AND no pending selection processing
      const now = Date.now();
      const justOpened = (now - lastShowAt) < 300;
      if (!isFixed && !selectionTimeout && !justOpened) {
        console.log('[Chroma] No text in selectionchange, hiding popover');
        hidePopover();
      } else if (isFixed) {
        console.log('[Chroma] Popover is fixed, not hiding on selectionchange');
      } else if (selectionTimeout) {
        console.log('[Chroma] Selection processing pending, not hiding yet');
      }
    }
  } catch (err) {
    console.error('[Chroma] Error in selectionchange handler:', err);
  }
}, { passive: true });

function getSelectionPosition(): { x: number; y: number } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // fallback to pointer if available
    if (lastPointer) return { x: lastPointer.x, y: lastPointer.y };
    return { x: 0, y: 0 };
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  // keep a virtual reference for Floating UI placement
  try { lastVirtualRef = { getBoundingClientRect: () => rect } as any; } catch (_e) { }
  // Clamp to viewport to avoid absurd coordinates from transformed elements/iframes
  const vx = Math.max(8, Math.min(Math.round(rect.left), window.innerWidth - 8));
  const vy = Math.max(8, Math.min(Math.round(rect.bottom + 10), window.innerHeight - 8));
  return { x: vx, y: vy };
}

function createPopoverContainer(): HTMLDivElement {
  if (popoverContainer) return popoverContainer;

  // Suppress Radix UI aria-hidden error for Shadow DOM Portal
  // This error occurs because Radix UI tries to set aria-hidden on body,
  // but our Portal container is in Shadow DOM, not directly in body
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorMsg = args.join(' ');
    // Filter out the aria-hidden error from Radix UI
    if (errorMsg.includes('aria-hidden') && errorMsg.includes('not contained inside')) {
      // Silently ignore this error - it doesn't affect functionality
      return;
    }
    // Call original console.error for other errors
    originalConsoleError.apply(console, args);
  };

  // Create shadow host to isolate styles from page
  // Check if one already exists and remove it to prevent duplicates
  const existingHost = document.getElementById('chroma-notes-host');
  if (existingHost) {
    try { existingHost.remove(); } catch (_e) { }
  }

  shadowHost = document.createElement('div');
  shadowHost.id = 'chroma-notes-host';
  shadowHost.style.cssText = `
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2147483647;
    pointer-events: none; /* host ignores events; inner container will enable */
  `;
  document.documentElement.appendChild(shadowHost);

  shadowRootRef = shadowHost.attachShadow({ mode: 'open' });

  // Inject minimal reset styles inside shadow root
  const style = document.createElement('style');
  style.textContent = `
    :host{ all:initial; }
    *, *::before, *::after { box-sizing: border-box; }
  `;
  shadowRootRef.appendChild(style);

  // Inject extension CSS (Tailwind/shadcn) into shadow root so UI styles apply
  try {
    // Check if extension context is still valid
    // @ts-ignore - Chrome runtime types
    const chromeRuntime = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : null;
    // @ts-ignore
    if (chromeRuntime && chromeRuntime.id && chromeRuntime.getURL) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      // content-script.css is emitted to dist at the same relative path as in manifest
      // Use runtime URL to resolve the final asset path
      // @ts-ignore
      const cssUrl = chromeRuntime.getURL('src/content/content-script.css');
      link.href = cssUrl;
      shadowRootRef.appendChild(link);

      // Additionally inline CSS as a fallback to avoid sites blocking external link loads
      // Fetch and inject as <style> to guarantee styles apply inside shadow root
      try {
        fetch(cssUrl)
          .then((res) => res.ok ? res.text() : Promise.reject(new Error('css fetch ' + res.status)))
          .then((css) => {
            const inline = document.createElement('style');
            inline.textContent = css;
            shadowRootRef!.appendChild(inline);
            try { console.log('[Chroma] Inlined content-script.css into shadow root'); } catch (_e) { }
          })
          .catch((err) => {
            try { console.warn('[Chroma] Failed to inline CSS:', String(err)); } catch (_e) { }
          });
      } catch (_ee) { }
    } else {
      // Extension context invalidated, use fallback
      try { console.warn('[Chroma] Extension context invalidated, using minimal styles'); } catch (_e) { }
    }
  } catch (e) {
    try {
      const errMsg = String(e);
      if (!errMsg.includes('Extension context invalidated')) {
        console.error('[Chroma] Failed to inject shadow stylesheet', e);
      }
    } catch (_e) { }
  }

  // Create Portal container for Radix UI components (Select, Dialog, etc.)
  // This ensures all Portal-rendered content stays within Shadow DOM
  // z-index must be higher than popoverContainer to show dropdowns on top
  const portalContainer = document.createElement('div');
  portalContainer.id = 'chroma-portal-root';
  portalContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 2147483647;
    isolation: isolate;
  `;
  shadowRootRef.appendChild(portalContainer);

  // Track clicks on Portal container (for Select dropdowns)
  portalContainer.addEventListener('mousedown', () => { uiInteracting = true; }, { passive: true });
  portalContainer.addEventListener('mouseup', () => {
    setTimeout(() => { uiInteracting = false; }, 300);
  }, { passive: true });
  portalContainer.addEventListener('click', () => {
    uiInteracting = true;
    setTimeout(() => { uiInteracting = false; }, 300);
  }, { passive: true });

  // Expose portal container globally for React components
  if (typeof window !== 'undefined') {
    (window as any).__CHROMA_PORTAL_ROOT__ = portalContainer;
    // Expose function to set uiInteracting flag from React components
    (window as any).__CHROMA_SET_UI_INTERACTING = (value: boolean) => {
      uiInteracting = value;
    };
  }

  // Inject styles for Portal elements and label backgrounds
  const portalStyle = document.createElement('style');
  portalStyle.textContent = `
    #chroma-portal-root > * {
      pointer-events: auto;
    }
    /* Radix Select Content position override - ensure it stays within viewport */
    #chroma-portal-root [data-radix-select-viewport] {
      scrollbar-width: thin;
      scrollbar-color: hsl(var(--border)) transparent;
    }
  `;
  shadowRootRef.appendChild(portalStyle);

  // Real container inside shadow (lower z-index than portal for proper layering)
  popoverContainer = document.createElement('div');
  popoverContainer.id = 'chroma-notes-popover-root';
  popoverContainer.style.cssText = `
    position: absolute;
    z-index: 100;
    pointer-events: auto;
    box-shadow: none !important;
  `;
  // Track mousedown/mouseup for interaction detection (don't interfere with click)
  popoverContainer.addEventListener('mousedown', () => { uiInteracting = true; }, { passive: true });
  popoverContainer.addEventListener('mouseup', () => {
    // Delay reset to allow React click handlers to execute first
    setTimeout(() => { uiInteracting = false; }, 300);
  }, { passive: true });

  // Initial state hidden to prevent flash
  popoverContainer.style.opacity = '0';
  popoverContainer.style.transition = 'opacity 0.15s ease-out';

  shadowRootRef.appendChild(popoverContainer);

  // Setup drag handling at Shadow DOM level for better control
  setupDragHandling();

  return popoverContainer;
}

// Global drag state
let isDraggingGlobal = false;
let dragStartX = 0;
let dragStartY = 0;
let dragInitialLeft = 0;
let dragInitialTop = 0;

// Store last popover state for re-rendering
let lastPopoverState: { text: string; position: { x: number; y: number } } | null = null;

function setupDragHandling() {
  if (!shadowRootRef || !popoverContainer) return;

  // Listen for mousedown on draggable elements WITHIN Shadow DOM
  shadowRootRef.addEventListener('mousedown', (e: Event) => {
    const me = e as MouseEvent;
    const target = me.target as HTMLElement;
    const draggableHeader = target.closest('[data-draggable="true"]');

    if (target.closest('button') || target.closest('input') ||
      target.closest('textarea') || target.closest('select')) {
      return;
    }

    if (draggableHeader && popoverContainer) {
      isDraggingGlobal = true;
      uiInteracting = true;
      dragStartX = me.clientX;
      dragStartY = me.clientY;

      const rect = popoverContainer.getBoundingClientRect();
      dragInitialLeft = rect.left;
      dragInitialTop = rect.top;

      if (popoverContainer.style.position !== 'fixed') {
        popoverContainer.style.position = 'fixed';
        popoverContainer.style.left = `${dragInitialLeft}px`;
        popoverContainer.style.top = `${dragInitialTop}px`;
        popoverContainer.style.transform = 'none';
      }

      me.preventDefault();
      popoverContainer.style.cursor = 'grabbing';

      let currentX = me.clientX;
      let currentY = me.clientY;
      let rafId: number | null = null;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingGlobal || !popoverContainer) return;
        uiInteracting = true;

        currentX = moveEvent.clientX;
        currentY = moveEvent.clientY;

        if (rafId) return;

        rafId = requestAnimationFrame(() => {
          if (!isDraggingGlobal || !popoverContainer) return;

          const dx = currentX - dragStartX;
          const dy = currentY - dragStartY;

          let newLeft = dragInitialLeft + dx;
          let newTop = dragInitialTop + dy;

          const maxLeft = window.innerWidth - popoverContainer.offsetWidth;
          const maxTop = window.innerHeight - popoverContainer.offsetHeight;

          newLeft = Math.max(0, Math.min(newLeft, maxLeft));
          newTop = Math.max(0, Math.min(newTop, maxTop));

          popoverContainer.style.left = `${newLeft}px`;
          popoverContainer.style.top = `${newTop}px`;

          rafId = null;
        });
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        isDraggingGlobal = false;
        if (rafId) cancelAnimationFrame(rafId);

        document.removeEventListener('mousemove', onMouseMove, { capture: true });
        document.removeEventListener('mouseup', onMouseUp, { capture: true });

        if (popoverContainer) {
          popoverContainer.style.cursor = '';
        }

        setTimeout(() => {
          uiInteracting = false;
        }, 300);
        upEvent.preventDefault();
      };

      document.addEventListener('mousemove', onMouseMove, { capture: true });
      document.addEventListener('mouseup', onMouseUp, { capture: true });
    }
  }, { capture: true });
}

async function placePopoverWithFloating() {
  if (!popoverContainer || !lastVirtualRef) return;
  const mod = await ensureFloating();
  if (!mod) {
    try {
      const pos = lastPointer || getSelectionPosition();
      popoverContainer.style.position = 'absolute';
      popoverContainer.style.left = `${Math.max(8, Math.min(pos.x, window.innerWidth - 20))}px`;
      popoverContainer.style.top = `${Math.max(8, Math.min((pos.y + 12), window.innerHeight - 20))}px`;
      popoverContainer.style.transform = 'none';
    } catch (_e) { }
    return;
  }
  try {
    const { computePosition, offset, flip, shift } = mod;
    const ref = (lastVirtualRef as any) || (lastPointer
      ? { getBoundingClientRect: () => new DOMRect(lastPointer!.x, lastPointer!.y, 0, 0) }
      : (lastVirtualRef as any));
    const preferTop = lastPointer ? lastPointer.y > window.innerHeight * 0.6 : false;
    const placement = preferTop ? 'top-start' : 'bottom-start';
    const { x, y } = await computePosition(ref as any, popoverContainer, {
      placement,
      middleware: [offset(16), flip(), shift({ padding: 8 })]
    });
    const SAFE = 18;
    let safeY = Math.round(y);
    if (lastPointer && Math.abs(safeY - lastPointer.y) < SAFE) {
      safeY = preferTop ? safeY - SAFE : safeY + SAFE;
    }
    popoverContainer.style.position = 'absolute';
    popoverContainer.style.left = `${Math.round(x)}px`;
    popoverContainer.style.top = `${safeY}px`;
    popoverContainer.style.transform = 'none';
  } catch (_e) { }
}

function ensureBodyFallbackContainer(): HTMLDivElement {
  if (bodyFallbackContainer) return bodyFallbackContainer;
  bodyFallbackContainer = document.createElement('div');
  bodyFallbackContainer.id = 'chroma-notes-popover-body';
  bodyFallbackContainer.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    pointer-events: auto;
  `;
  document.body.appendChild(bodyFallbackContainer);
  return bodyFallbackContainer;
}

async function showPopover(text: string, position: { x: number; y: number }) {
  lastShowAt = Date.now();
  let depsLoaded = false;
  try {
    await loadDependencies();
    depsLoaded = true;
  } catch (e) {
    try { console.error('[Chroma] loadDependencies failed, using basic UI fallback', e); } catch (_e) { }
  }
  const centerPos = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
  try { console.info('[Chroma] showPopover', { text: text.slice(0, 30), position, forced: centerPos, depsLoaded }); } catch (_e) { }

  // Update last state
  lastPopoverState = { text, position };

  if (!popoverContainer || !popoverContainer.isConnected) {
    popoverContainer = createPopoverContainer();
    if (popoverRoot) {
      popoverRoot = null;
      reactRendered = false;
    }
  }

  if (depsLoaded) {
    if (!popoverRoot) {
      const createRoot = (ReactDOMModule as any).createRoot || (ReactDOMModule as any).default?.createRoot;
      if (createRoot && popoverContainer) {
        popoverRoot = createRoot(popoverContainer);
      }
    }
  }

  const sourceUrl = window.location.href;
  if (depsLoaded && popoverRoot) {
    try {
      if (!isFixed) {
        await placePopoverWithFloating();
      } else {
        popoverContainer!.style.position = 'fixed';
        if (!popoverContainer!.style.left || popoverContainer!.style.left === '0px') {
          popoverContainer!.style.left = '50%';
          popoverContainer!.style.top = '50%';
          popoverContainer!.style.transform = 'translate(-50%, -50%)';
        }
      }

      popoverRoot.render(
        ReactModule.createElement(
          RouterProvider,
          null,
          ReactModule.createElement(
            I18nextProvider,
            { i18n: i18nInstance as any },
            ReactModule.createElement(
              ToastProvider,
              null,
              ReactModule.createElement(SelectionPopover, {
                selectedText: text,
                sourceUrl: sourceUrl,
                position: position,
                onClose: hidePopover,
                onFixed: (fixed: boolean) => {
                  isFixed = fixed;
                  if (fixed) {
                    isUnfixing = false;
                    if (popoverContainer) {
                      // When fixing, ensure we keep the current visual position
                      const rect = popoverContainer.getBoundingClientRect();
                      popoverContainer.style.position = 'fixed';
                      popoverContainer.style.left = `${rect.left}px`;
                      popoverContainer.style.top = `${rect.top}px`;
                      popoverContainer.style.transform = 'none';
                    }
                  } else {
                    isUnfixing = true;
                    if (popoverContainer) {
                      // When unfixing, we also use viewport coordinates because shadowHost is fixed
                      const rect = popoverContainer.getBoundingClientRect();
                      popoverContainer.style.position = 'absolute';
                      popoverContainer.style.left = `${rect.left}px`;
                      popoverContainer.style.top = `${rect.top}px`;
                      popoverContainer.style.transform = 'none';
                    }
                    setTimeout(() => {
                      isUnfixing = false;
                    }, 500);
                  }
                }
              })
            )
          )
        )
      );
      reactRendered = true;

      requestAnimationFrame(() => {
        if (popoverContainer) {
          popoverContainer.style.opacity = '1';
        }
      });

      return;
    } catch (err) {
      console.error('[Chroma] React UI render failed, will try minimal UI fallback', err);
      console.error('[Chroma] Error details:', err);
      // Reset root on error
      popoverRoot = null;
      reactRendered = false;
    }
  } else {
    console.error('[Chroma] Cannot render popover:', {
      depsLoaded,
      hasPopoverRoot: !!popoverRoot,
      hasPopoverContainer: !!popoverContainer,
      hasReactModule: !!ReactModule,
      hasReactDOM: !!ReactDOMModule,
      hasSelectionPopover: !!SelectionPopover
    });
    // Try to show error message in console
    if (!depsLoaded) {
      console.error('[Chroma] Dependencies failed to load. Check extension context.');
    }
    if (!popoverRoot) {
      console.error('[Chroma] React root not created. Check popoverContainer:', popoverContainer);
    }
  }

  // No DOM fallback: if React fails, we silently abort to avoid duplicate vertical toolbars
  // (This avoids conflicting UI when sites inject their own selection widgets.)

  // If dependencies couldn't load, ensure container is positioned
  if (!depsLoaded && popoverContainer) {
    popoverContainer.style.left = `${position.x}px`;
    popoverContainer.style.top = `${position.y}px`;
    popoverContainer.style.transform = 'translate(-50%, -50%)';
  }
}

function hidePopover() {
  try {
    if (reactRendered && popoverRoot) {
      try {
        popoverRoot.render(null);
      } catch (_e) {
        console.error('[Chroma] Error unmounting React root', _e);
      }
    }
    if (!isFixed) {
      // Clear React root reference
      popoverRoot = null;
      reactRendered = false;

      // Safely remove elements if still connected
      if (popoverContainer && (popoverContainer as any).isConnected) {
        try { (popoverContainer as any).remove(); } catch (_e) { }
      }
      popoverContainer = null;

      if (uiBodyContainer && (uiBodyContainer as any).isConnected) {
        try { (uiBodyContainer as any).remove(); } catch (_e) { }
      }
      uiBodyContainer = null;

      if (bodyFallbackContainer && (bodyFallbackContainer as any).isConnected) {
        try { (bodyFallbackContainer as any).remove(); } catch (_e) { }
      }
      bodyFallbackContainer = null;

      if (shadowHost && (shadowHost as any).isConnected) {
        try { (shadowHost as any).remove(); } catch (_e) { }
      }
      shadowHost = null;
      shadowRootRef = null;
    }
  } catch (_e) {
    console.error('[Chroma] Error in hidePopover', _e);
  }
}

function handleTextSelection() {
  try {
    // Clear any pending timeout
    if (selectionTimeout) {
      clearTimeout(selectionTimeout);
      selectionTimeout = null;
    }

    console.log('[Chroma] handleTextSelection called');
    const selectedText = getSelectedText();
    console.log('[Chroma] Selected text:', selectedText ? `"${selectedText.substring(0, 50)}..." (${selectedText.length} chars)` : 'null');

    if (selectedText && selectedText.length >= MIN_SELECTION_CHARS) {
      const position = getSelectionPosition();
      console.log('[Chroma] Selection position:', position);
      showPopover(selectedText, position);
      currentSelection = window.getSelection();
    } else {
      console.log('[Chroma] No text selected');
      // Only hide if not fixed and no pending selection and not dragging/unfixing and not interacting with UI
      if (!isFixed && !selectionTimeout && !isDraggingGlobal && !isUnfixing && !uiInteracting) {
        console.log('[Chroma] Hiding popover (not fixed, no pending selection)');
        hidePopover();
      } else {
        if (isDraggingGlobal) {
          console.log('[Chroma] Currently dragging, not hiding');
        }
        if (isUnfixing) {
          console.log('[Chroma] Currently unfixing, not hiding');
        }
        if (uiInteracting) {
          console.log('[Chroma] Currently interacting with UI, not hiding');
        }
      }
    }
  } catch (err) {
    console.error('[Chroma] Error in handleTextSelection:', err);
  }
}

// Debounced version of handleTextSelection to wait for selection to stabilize
function scheduleHandleTextSelection() {
  // Clear existing timeout
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

  // Schedule new execution after debounce delay
  selectionTimeout = window.setTimeout(() => {
    selectionTimeout = null;
    handleTextSelection();
  }, SELECTION_DEBOUNCE_DELAY);
}


// Listen for mouse up (text selection)
document.addEventListener('mouseup', (e) => {
  // store pointer point for positioning under mouse
  try { lastPointer = { x: e.clientX, y: e.clientY }; } catch (_e) { }

  // Defer to next frame to ensure selection range is finalized
  try {
    console.log('[Chroma] mouseup event detected');
  } catch (_e) { }

  // Check if clicked inside popover (only if popover already exists)
  if (popoverContainer || shadowHost || uiBodyContainer) {
    const path = (e.composedPath && e.composedPath()) || [];
    const clickedInside = path.some((el: any) => {
      if (!el) return false;
      return el === popoverContainer || el === shadowHost || el === shadowRootRef || el === uiBodyContainer ||
        (el instanceof Node && shadowRootRef && shadowRootRef.contains(el));
    });
    if (clickedInside) {
      console.log('[Chroma] Clicked inside popover, ignoring');
      return; // ignore mouseup inside our UI to prevent re-render
    }
  }

  // Skip editable fields (native editors)
  if (isEditableNode(e.target)) {
    console.log('[Chroma] Mouseup on editable element, skip popover');
    return;
  }

  console.log('[Chroma] Scheduling debounced handleTextSelection');
  // Use debounced version to wait for selection to stabilize
  scheduleHandleTextSelection();
}, { passive: true });

// Reposition on resize for unfixed popover
window.addEventListener('resize', () => { if (!isFixed) placePopoverWithFloating(); }, { passive: true });

// Track mouse down to avoid triggering while dragging
// Note: This is set globally, but dragging logic in SelectionPopover will handle its own state
document.addEventListener('mousedown', () => { isMouseDown = true; }, { passive: true });
document.addEventListener('mouseup', () => {
  // Delay reset to allow drag handlers to process
  setTimeout(() => { isMouseDown = false; }, 100);
}, { passive: true });

// Listen for keyboard selection
document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta') {
    try { console.log('[Chroma] keyup', e.key); } catch (_e) { }
    scheduleHandleTextSelection();
  }
});

// Close popover on click outside
// Use bubble phase (default) to allow React handlers to execute first
document.addEventListener('click', (e) => {
  // 如果正在交互，不关闭（React事件已设置此标志）
  if (uiInteracting) {
    return;
  }
  // 如果正在拖动，不关闭
  if (isMouseDown || isDraggingGlobal) {
    return;
  }
  // 如果正在取消固定，不关闭
  if (isUnfixing) {
    return;
  }
  if (Date.now() - lastShowAt < 300) {
    // Ignore the immediate click right after showing the popover
    return;
  }
  if ((popoverContainer || uiBodyContainer) && !isFixed) {
    const path = (e.composedPath && e.composedPath()) || [];
    // 检查是否点击在弹窗内部（包括Shadow DOM和Portal容器）
    const clickedInside = path.some((el: any) => {
      if (!el) return false;
      // 直接匹配容器
      if (el === popoverContainer || el === shadowHost || el === shadowRootRef || el === uiBodyContainer) {
        return true;
      }
      // 检查是否在Shadow DOM内
      if (shadowRootRef && el instanceof Node && shadowRootRef.contains(el)) {
        return true;
      }
      // 检查Portal容器（更严格的检测）
      const portalRoot = typeof window !== 'undefined' ? (window as any).__CHROMA_PORTAL_ROOT__ : null;
      if (portalRoot) {
        // 直接匹配 Portal 容器
        if (el === portalRoot) {
          return true;
        }
        // 检查是否在 Portal 容器内
        if (el instanceof Node && portalRoot.contains(el)) {
          return true;
        }
        // 检查元素的父节点是否在 Portal 内
        let parent = el.parentElement || el.parentNode;
        while (parent && parent !== document.body) {
          if (parent === portalRoot || (parent instanceof Node && portalRoot.contains(parent))) {
            return true;
          }
          parent = parent.parentElement || parent.parentNode;
        }
      }
      // 检查元素ID
      if (el.id === 'chroma-popover' || el.id === 'chroma-portal-root' || el.id === 'chroma-notes-popover-root') {
        return true;
      }
      // 检查是否在弹窗元素内
      if (el.closest && (el.closest('#chroma-popover') || el.closest('#chroma-portal-root'))) {
        return true;
      }
      // 检查data属性标记的元素（label等）
      if (el.hasAttribute && (el.hasAttribute('data-label') || el.closest('[data-label]'))) {
        return true;
      }
      // 检查Radix UI Select相关元素
      if (el.hasAttribute && (
        el.hasAttribute('data-radix-select-trigger') ||
        el.hasAttribute('data-radix-select-item') ||
        el.hasAttribute('data-radix-select-content') ||
        el.closest('[data-radix-select-trigger]') ||
        el.closest('[data-radix-select-item]') ||
        el.closest('[data-radix-select-content]')
      )) {
        return true;
      }
      // 检查按钮元素（在弹窗内的所有按钮）
      if (el.tagName === 'BUTTON' && shadowRootRef && shadowRootRef.contains(el)) {
        return true;
      }
      return false;
    });
    if (clickedInside) {
      return; // 点击在内部，不关闭
    }
    // Not fixed: click anywhere outside should close immediately
    hidePopover();
  }
}, { passive: true }); // 使用默认的bubble阶段，不阻止React事件

// 未固定：滚动即认为用户离开当前选区，直接关闭；固定则不受影响
window.addEventListener('scroll', () => {
  // 保护：拖动或取消固定时，不关闭
  if (!isFixed && !isDraggingGlobal && !isUnfixing) {
    hidePopover();
  }
}, true);

// Global hotkey: Alt+Q to force open popover at screen center with current selection
document.addEventListener('keydown', (e) => {
  try {
    const key = (e.key || '').toLowerCase();
    // Alt+D debug-beacon removed
    if (e.altKey && key === 'd') { return; }
    const triggerHotkey = (e.altKey && key === 'q') || (e.ctrlKey && e.shiftKey && key === 'y') || key === 'f2';
    if (triggerHotkey) {
      let text = getSelectedText();
      if (!text) {
        // Fallback text so the shortcut always produces something visible
        text = document.title || window.location.href;
      }
      const center = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
      showPopover(text, center);
      e.preventDefault();
      e.stopPropagation();
    }
  } catch (_e) { }
}, true);

// Listen for messages from Service Worker
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response: any) => void) => {
    if (message.action === 'hidePopover') {
      hidePopover();
      sendResponse({ success: true });
    }
    return true; // Keep channel open for async response
  });
}
// Debug beacon removed completely

// Event listeners attached (log suppressed)

// Initialize Video Subtitle Translation
import('./video/VideoSubtitleTranslationManager').then(({ VideoSubtitleTranslationManager }) => {
  try {
    const videoSubtitleManager = new VideoSubtitleTranslationManager();
    videoSubtitleManager.init();
  } catch (e) {
    console.error('[Chroma] Failed to initialize VideoSubtitleTranslationManager', e);
  }
}).catch(err => console.error('[Chroma] Failed to load VideoSubtitleTranslationManager module', err));

// Initialize Full Page Translation
import('./fullpage/FullPageTranslationManager').then(({ FullPageTranslationManager }) => {
  try {
    const fullPageManager = new FullPageTranslationManager();
    fullPageManager.init();
  } catch (e) {
    console.error('[Chroma] Failed to initialize FullPageTranslationManager', e);
  }
}).catch(err => console.error('[Chroma] Failed to load FullPageTranslationManager module', err));

