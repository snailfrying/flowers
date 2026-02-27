/**
 * Service Worker entry point
 * Connects backend to Chrome Extension runtime
 */
// Minimal Chrome typings for TS build (MV3 runtime only)
// @ts-ignore
declare const chrome: {
  runtime: {
    onInstalled: { addListener: (cb: (details: any) => void) => void };
    onMessage: { addListener: (cb: (message: any, sender: any, sendResponse: (res: any) => void) => void) => void };
    sendMessage: (message: any) => Promise<any>;
    lastError?: { message?: string };
    id: string;
    getURL: (path: string) => string;
  };
  storage?: { local: { set: (items: Record<string, any>) => Promise<void> } };
  sidePanel?: { open: (opts?: { tabId?: number; windowId?: number }) => Promise<void> };
  contextMenus?: { create: (options: any, cb?: () => void) => void; onClicked: { addListener: (cb: (info: any, tab?: any) => void) => void } };
  tabs?: { sendMessage: (tabId: number, message: any) => Promise<any>; update: (tabId: number, opts: any) => Promise<any> };
};
// 禁用 WASM，防止任何库在 SW 中尝试 instantiate（提供最小桩对象，避免 instanceof/构造器访问报错）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebAssembly = (globalThis as any).WebAssembly ?? ({
  RuntimeError: Error as any,
  CompileError: Error as any,
  LinkError: Error as any
} as any);
// 标记：在 SW 中禁用任何向量加速库（供后端判断）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__CHROMA_SW__ = true;

// Guard against libraries that probe DOM globals
// In Service Worker, there is no window/document; define as undefined to avoid ReferenceError
// and let feature-detection branches short-circuit safely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = undefined;
// Provide minimal document stub for libraries that read document.baseURI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).document = (globalThis as any).document ?? { baseURI: (self as any).location?.href || '' };

// Block eval-based code paths so libs fallback to safe branches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).eval = undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Function = undefined;

// Delay import until after guards are set
async function bootstrap() {
  console.log('[Service Worker] Bootstrap starting...');
  try {
    const mod: any = await import('backend/index.js');
    console.log('[Service Worker] Backend module imported');

    // expose for request handling
    // @ts-ignore
    ; (globalThis as any).__CHROMA_BACKEND__ = mod;

    // Note: env.yaml loading is skipped in Service Worker (Chrome Extension context)
    // Settings will be loaded from Chrome Storage (user configuration)
    // env.yaml is only used in Node.js development environment

    // Load settings from Chrome Storage before initializing
    // This ensures settings (especially API key) are loaded from user configuration
    // Priority: Frontend configuration > env.yaml defaults
    if (mod.loadSettingsFromStorage) {
      console.log('[Service Worker] Loading settings from storage...');
      await mod.loadSettingsFromStorage();
      console.log('[Service Worker] Settings loaded from Chrome Storage');
    }

    if (mod.loadPromptOverridesFromStorage) {
      console.log('[Service Worker] Loading prompt overrides from storage...');
      await mod.loadPromptOverridesFromStorage();
      console.log('[Service Worker] Prompt overrides loaded');
    }

    if (mod.initializeServiceWorker) {
      console.log('[Service Worker] Initializing backend service worker...');
      mod.initializeServiceWorker();
      console.log('[Service Worker] Backend service worker initialized');
    } else {
      console.warn('[Service Worker] initializeServiceWorker not found in backend module');
    }

    console.log('[Service Worker] Bootstrap completed successfully');
  } catch (e: any) {
    console.error('[Service Worker] Bootstrap error:', e);
    console.error('[Service Worker] Error details:', e?.message || e);
    if (e?.stack) console.error('[Service Worker] Stack:', e.stack);
  }
}

// Helper to ensure PDF redirect rule is up-to-date
// This is critical because the extension ID can change in development, 
// and the rule must be registered with the correct ID.
async function ensurePDFRedirectRule() {
  const RULE_ID = 1001;

  try {
    // Check existing rules
    // @ts-ignore
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRule = existingRules.find((r: any) => r.id === RULE_ID);

    // Construct the target redirect URL
    const redirectUrl = `chrome-extension://${chrome.runtime.id}/src/pages/pdf-viewer/index.html?file=\\0`;

    // If rule exists and has correct redirect, skip update
    if (existingRule && existingRule.action.redirect.regexSubstitution === redirectUrl) {
      console.log('[Service Worker] PDF redirect rule is already up-to-date');
      return;
    }

    console.log('[Service Worker] Updating PDF redirect rule...', {
      oldSubstitution: existingRule?.action?.redirect?.regexSubstitution,
      newSubstitution: redirectUrl
    });

    const rule = {
      id: RULE_ID,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          // @ts-ignore
          regexSubstitution: redirectUrl
        }
      },
      condition: {
        // Matches:
        // 1. URLs ending in .pdf (with optional query params)
        // 2. URLs containing /pdf/ path segment (like arxiv.org/pdf/1234)
        regexFilter: "^(http|https|file)://.*(\\.pdf(\\?.*)?|/pdf/.*)$",
        resourceTypes: ['main_frame'],
        // @ts-ignore
        excludedInitiatorDomains: [chrome.runtime.id]
      }
    };

    // @ts-ignore
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
      addRules: [rule]
    });
    console.log('[Service Worker] PDF redirect rule updated successfully');
  } catch (e) {
    console.error('[Service Worker] Failed to update PDF redirect rules:', e);
  }
}

// Handle extension install/update
// @ts-ignore - Chrome API
chrome.runtime.onInstalled.addListener(async (details: any) => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('Chroma Notes installed/updated');
    // Open side panel on install if possible
    // @ts-ignore
    chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

    // Create Context Menu for manual open
    // @ts-ignore
    chrome.contextMenus.create({
      id: 'open-in-flowers-pdf',
      title: 'Open in Flowers PDF Reader',
      contexts: ['page', 'link']
    }, () => {
      if (chrome.runtime.lastError) {
        // Ignore error if item already exists
      }
    });

    // Create Context Menu for image OCR (Extract Text)
    // @ts-ignore
    chrome.contextMenus.create({
      id: 'flowers-image-ocr',
      title: 'Extract Text (Flowers)',
      contexts: ['image']
    }, () => {
      if (chrome.runtime.lastError) {
        // Ignore error if item already exists
      }
    });

    // Ensure rules are set up immediately on install
    await ensurePDFRedirectRule();
  }
});

// Handle Context Menu Clicks
// @ts-ignore
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'open-in-flowers-pdf') {
    const targetUrl = info.linkUrl || info.pageUrl;
    if (targetUrl && tab?.id) {
      const viewerUrl = chrome.runtime.getURL(`src/pages/pdf-viewer/index.html?file=${encodeURIComponent(targetUrl)}`);
      (chrome as any).tabs?.update(tab.id, { url: viewerUrl });
    }
    return;
  }

  if (info.menuItemId === 'flowers-image-ocr' && info.srcUrl && tab?.id && chrome.tabs) {
    handleImageOCR(info.srcUrl, tab.id);
  }
});

/** Fetch image as base64. Caller must clear refs after use to avoid memory bloat. */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { base64: match[2], mimeType: match[1] || 'image/png' };
  }
  if (url.startsWith('blob:')) {
    throw new Error('Blob URL images must be processed in the page. Please try a different image.');
  }
  const res = await fetch(url, { headers: { Accept: 'image/*' } });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const blob = await res.blob();
  const sizeKB = blob.size / 1024;
  if (sizeKB > 10240) throw new Error(`Image too large (${Math.round(sizeKB)}KB). Max 10MB.`);
  const mimeType = blob.type || 'image/png';
  const buf = await blob.arrayBuffer();
  const arr = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.subarray(i, Math.min(i + chunkSize, arr.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);
  return { base64, mimeType };
}

async function handleImageOCR(srcUrl: string, tabId: number) {
  const tabs = (chrome as any).tabs;
  if (!tabs) return;
  try {
    tabs.sendMessage(tabId, { action: 'showOCRLoading', imageUrl: srcUrl }).catch(() => {});
  } catch (_e) { /* content script may not be ready */ }

  let imageBase64: string | null = null;
  let mimeType = 'image/png';

  try {
    const fetched = await fetchImageAsBase64(srcUrl);
    imageBase64 = fetched.base64;
    mimeType = fetched.mimeType;

    const backend = (globalThis as any).__CHROMA_BACKEND__;
    if (!backend?.ServiceWorkerMessageHandler) {
      tabs.sendMessage(tabId, {
        action: 'showOCRError',
        error: 'Extension not ready. Please refresh the page and try again.'
      });
      return;
    }

    const handler = new backend.ServiceWorkerMessageHandler();
    const response = await handler.handleMessage({
      action: 'agent:ocr',
      params: { imageBase64, mimeType },
      requestId: `ocr_${Date.now()}_${Math.random().toString(36).slice(2)}`
    });

    imageBase64 = null;

    if (response.success && response.data) {
      tabs.sendMessage(tabId, {
        action: 'showOCRResult',
        text: response.data.text,
        imageUrl: srcUrl,
        confidence: response.data.confidence ?? 0.9
      });
    } else {
      const errMsg = response.error?.message || response.error || 'OCR failed';
      tabs.sendMessage(tabId, { action: 'showOCRError', error: errMsg, imageUrl: srcUrl });
    }
  } catch (e: any) {
    const errMsg = e?.message || String(e);
    tabs.sendMessage(tabId, { action: 'showOCRError', error: errMsg, imageUrl: srcUrl }).catch(() => {});
  } finally {
    imageBase64 = null;
  }
}

// Handle action click (open side panel)
// This is the modern MV3 way to toggle side panel on icon click
// @ts-ignore
chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

// Fallback for older Chrome versions or if setPanelBehavior fails
// @ts-ignore
chrome.action?.onClicked?.addListener((tab: any) => {
  // @ts-ignore
  chrome.sidePanel?.open({ tabId: tab.id });
});

// Bridge messages from content scripts → side panel / storage actions
// This listener handles simple content script messages and converts them to MessageRequest format
// before passing to the main ServiceWorkerMessageHandler
// IMPORTANT: This listener must be added BEFORE initializeServiceWorker() sets up its listener
// Set up this listener immediately, before bootstrap() completes
// @ts-ignore - Chrome API types in MV3
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: (res: any) => void) => {
  console.info('[Service Worker] Simple message listener called:', {
    action: message?.action,
    hasMessage: !!message,
    messageKeys: message ? Object.keys(message) : []
  });

  // Check if this is a simple content script message we should handle
  const isSimpleContentScriptMessage = message && message.action &&
    (message.action === 'openSidePanelWithContext' ||
      message.action === 'polish' ||
      message.action === 'translate' ||
      message.action === 'generateNote' ||
      message.action === 'askWithContext');

  console.info('[Service Worker] Is simple content script message?', isSimpleContentScriptMessage);

  if (!isSimpleContentScriptMessage) {
    // Not a simple content script message, let other listeners handle it
    console.info('[Service Worker] Not a simple message, passing to other listeners');
    return false; // Let other listeners handle it
  }

  // We will handle this message, so return true to keep channel open
  // and prevent other listeners from processing it

  // Handle asynchronously
  let responseSent = false;
  const safeSendResponse = (response: any) => {
    if (!responseSent) {
      responseSent = true;
      try {
        console.info('[Service Worker] safeSendResponse called with:', {
          hasOk: 'ok' in response,
          ok: response.ok,
          hasResult: 'result' in response,
          resultType: typeof response.result,
          resultLength: typeof response.result === 'string' ? response.result.length : (response.result?.length || 0),
          fullResponse: JSON.stringify(response).slice(0, 200)
        });
        sendResponse(response);
        console.info('[Service Worker] sendResponse called successfully');
      } catch (e: any) {
        console.error('[Service Worker] Failed to send response:', e);
        // Try to send error response as fallback
        try {
          sendResponse({ ok: false, error: e?.message || String(e) });
        } catch (e2) {
          console.error('[Service Worker] Failed to send error response:', e2);
        }
      }
    } else {
      console.warn('[Service Worker] Response already sent, ignoring duplicate call');
    }
  };

  (async () => {
    try {
      console.info('[Service Worker] Message received:', {
        action: message.action,
        textLength: message.text?.length || 0,
        hasText: !!message.text,
        targetLang: message.targetLang,
        sourceUrl: message.sourceUrl
      });

      const backend: any = (globalThis as any).__CHROMA_BACKEND__;
      console.info('[Service Worker] Backend status:', {
        hasBackend: !!backend,
        hasServiceWorkerMessageHandler: !!backend?.ServiceWorkerMessageHandler,
        hasCoreAgent: !!backend?.CoreAgent
      });

      // Special handling for openSidePanelWithContext (content script convenience)
      if (message.action === 'openSidePanelWithContext') {
        const payload = {
          text: message.text || '',
          sourceUrl: message.sourceUrl || (sender?.tab?.url ?? ''),
          ts: Date.now()
        };
        if (chrome.storage?.local?.set) {
          await chrome.storage.local.set({ pendingChatContext: payload });
        }
        try {
          if (chrome.sidePanel?.open) {
            await chrome.sidePanel.open({ tabId: sender?.tab?.id });
          }
        } catch { }
        safeSendResponse({ ok: true });
        return;
      }

      // Handle navigation requests from popup
      if (message.action === 'navigate' && message.route) {
        if (chrome.storage?.local?.set) {
          await chrome.storage.local.set({ pendingNavigation: { route: message.route, ts: Date.now() } });
        }
        if (message.openPanel && chrome.sidePanel?.open) {
          try {
            await chrome.sidePanel.open({ tabId: sender?.tab?.id });
          } catch { }
        }
        safeSendResponse({ ok: true });
        return;
      }

      // Handle simple content script messages (polish, translate, generateNote, askWithContext)
      // Convert to MessageRequest format and process directly
      if (!backend) {
        console.error('[Service Worker] Backend not initialized');
        safeSendResponse({ ok: false, error: 'Backend not initialized' });
        return;
      }

      // Convert simple message to MessageRequest format
      let backendMessage: any;
      if (message.action === 'polish') {
        backendMessage = {
          action: 'agent:polish',
          params: { text: message.text || '' },
          requestId: `polish_${Date.now()}_${Math.random().toString(36).slice(2)}`
        };
        console.info('[Service Worker] Converted to MessageRequest:', backendMessage);
      } else if (message.action === 'translate') {
        backendMessage = {
          action: 'agent:translate',
          params: {
            text: message.text || '',
            targetLang: message.targetLang || 'en',
            mode: message.mode
          },
          requestId: `translate_${Date.now()}_${Math.random().toString(36).slice(2)}`
        };
        console.info('[Service Worker] Converted to MessageRequest:', backendMessage);
      } else if (message.action === 'generateNote') {
        backendMessage = {
          action: 'agent:generateNote',
          params: {
            selectedText: message.text || '',
            sourceUrl: message.sourceUrl || (sender?.tab?.url ?? ''),
            context: []
          },
          requestId: `generateNote_${Date.now()}_${Math.random().toString(36).slice(2)}`
        };
        console.info('[Service Worker] Converted to MessageRequest:', backendMessage);
      } else if (message.action === 'askWithContext') {
        backendMessage = {
          action: 'agent:askWithContext',
          params: {
            text: message.text || '',
            sourceUrl: message.sourceUrl || (sender?.tab?.url ?? '')
          },
          requestId: `askWithContext_${Date.now()}_${Math.random().toString(36).slice(2)}`
        };
        console.info('[Service Worker] Converted to MessageRequest:', backendMessage);
      }

      // Use ServiceWorkerMessageHandler to process the message
      if (backend.ServiceWorkerMessageHandler) {
        console.info('[Service Worker] Creating ServiceWorkerMessageHandler...');
        const handler = new backend.ServiceWorkerMessageHandler();
        console.info('[Service Worker] Calling handleMessage...');
        const response = await handler.handleMessage(backendMessage);
        console.info('[Service Worker] Handler response:', {
          success: response.success,
          hasData: !!response.data,
          dataType: typeof response.data,
          dataLength: typeof response.data === 'string' ? response.data.length : (response.data?.length || 0),
          error: response.error,
          fullResponse: JSON.stringify(response).slice(0, 500) // First 500 chars for debugging
        });
        if (response.success) {
          const resultData = response.data;

          // Special handling for generateNote: persist note and return structured info
          if (message.action === 'generateNote') {
            try {
              const gen = resultData || {};
              const notePayload = {
                title: gen.title || (message.text || '').slice(0, 50) || 'Untitled',
                content: gen.content || (message.text || ''),
                tags: Array.isArray(gen.tags) ? gen.tags : [],
                role: 'note' as const,
                sourceUrl: message.sourceUrl || (sender?.tab?.url ?? '') || ''
              };
              // Create note via backend handler to ensure sync/RAG hooks
              const createRes = await handler.handleMessage({
                action: 'notes:create',
                params: notePayload,
                requestId: `notes_create_${Date.now()}_${Math.random().toString(36).slice(2)}`
              });
              if (createRes?.success && createRes?.data?.id) {
                const createdId = createRes.data.id as string;
                // persist lastCreatedNoteId for sidepanel to pick up and focus
                if (chrome.storage?.local?.set) {
                  await chrome.storage.local.set({ lastCreatedNoteId: createdId, lastCreatedAt: Date.now() });
                }
                // Return structured payload including created note id
                safeSendResponse({ ok: true, result: { ...gen, id: createdId } });
              } else {
                // Fallback: still report success of generation
                safeSendResponse({ ok: true, result: resultData });
              }
            } catch (persistErr: any) {
              console.error('[Service Worker] Failed to persist generated note:', persistErr);
              // Return generation result even if persistence failed
              safeSendResponse({ ok: true, result: resultData });
            }
          } else {
            // Default behavior: convert to string for simple actions
            const resultString = typeof resultData === 'string' ? resultData : String(resultData || '');
            console.info('[Service Worker] Sending success response:', {
              ok: true,
              resultType: typeof resultString,
              resultLength: resultString.length,
              resultPreview: resultString.slice(0, 100),
              willSend: { ok: true, result: resultString }
            });
            const responseToSend = { ok: true, result: resultString };
            console.info('[Service Worker] Response object:', responseToSend);
            safeSendResponse(responseToSend);
            console.info('[Service Worker] Response sent successfully');
          }
        } else {
          // Serialize error properly for logging
          const errorMsg = response.error?.message || JSON.stringify(response.error) || 'Unknown error';
          console.error('[Service Worker] Handler failed:', {
            error: response.error,
            errorMessage: errorMsg,
            errorCode: response.error?.code,
            errorDetails: response.error?.details,
            fullError: JSON.stringify(response.error).slice(0, 500)
          });
          safeSendResponse({ ok: false, error: errorMsg });
        }
      } else {
        console.error('[Service Worker] ServiceWorkerMessageHandler not available');
        safeSendResponse({ ok: false, error: 'ServiceWorkerMessageHandler not available' });
      }
    } catch (e: any) {
      // Serialize error properly for logging
      let errorMsg = e?.message || String(e);
      if (errorMsg === '[object Object]') {
        try {
          errorMsg = JSON.stringify(e);
        } catch {
          errorMsg = String(e);
        }
      }

      console.error('[Service Worker] Message handler error:', {
        error: e,
        message: errorMsg,
        name: e?.name,
        code: e?.code,
        stack: e?.stack
      });
      safeSendResponse({ ok: false, error: errorMsg });
    }
  })();

  return true; // Keep channel open for async response (prevents other listeners from being called)
});

// Initialize backend after setting up message listeners
// Initialize backend after setting up message listeners
bootstrap();
ensurePDFRedirectRule().catch(e => console.error('[Service Worker] Failed to ensure PDF rules on startup:', e));
