/**
 * Chrome Extension Service Worker adapter
 * Wraps ServiceWorkerMessageHandler for Chrome Extension runtime
 */

import { ServiceWorkerMessageHandler } from './message-handler.js';
import type { MessageRequest, MessageResponse, StreamMessage } from '../types.js';

// Chrome Extension types (for Service Worker context)
declare const chrome: {
  runtime: {
    onMessage: {
      addListener: (callback: (request: any, sender: any, sendResponse: (response: any) => void) => boolean | void) => void;
    };
    onConnect: {
      addListener: (callback: (port: any) => void) => void;
    };
  };
};

// Global handler instance
let handler: ServiceWorkerMessageHandler | null = null;

function getHandler(): ServiceWorkerMessageHandler {
  if (!handler) {
    handler = new ServiceWorkerMessageHandler();
  }
  return handler;
}

/**
 * Chrome runtime message listener
 * Handles all messages from frontend (popup, sidepanel, content script)
 */
export function setupMessageListener(): void {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('Chrome runtime not available, message listener not set up');
    return;
  }

  chrome.runtime.onMessage.addListener(
    (request: any, sender: any, sendResponse: (response: MessageResponse) => void) => {
      console.info('[SW Adapter] Incoming message:', {
        action: request?.action,
        requestId: request?.requestId,
        sender: sender?.tab?.url || 'extension'
      });
      // Convert simple content script messages to MessageRequest format
      // Content script sends: { action: 'polish', text: '...' }
      // Backend expects: { action: 'agent:polish', params: { text: '...' }, requestId: '...' }
      let messageRequest: MessageRequest;

      if (request && typeof request === 'object' && request.action) {
        // Check if this is a simple content script message that needs conversion
        if (request.action === 'polish' && 'text' in request) {
          messageRequest = {
            action: 'agent:polish',
            params: { text: request.text || '' },
            requestId: `polish_${Date.now()}_${Math.random().toString(36).slice(2)}`
          };
          console.info('[SW Adapter] Converted simple message to MessageRequest:', messageRequest);
        } else if (request.action === 'translate' && 'text' in request) {
          messageRequest = {
            action: 'agent:translate',
            params: { text: request.text || '', targetLang: request.targetLang || 'en' },
            requestId: `translate_${Date.now()}_${Math.random().toString(36).slice(2)}`
          };
          console.info('[SW Adapter] Converted simple message to MessageRequest:', messageRequest);
        } else if (request.action === 'generateNote' && 'text' in request) {
          messageRequest = {
            action: 'agent:generateNote',
            params: {
              selectedText: request.text || '',
              sourceUrl: request.sourceUrl || (sender?.tab?.url ?? ''),
              context: []
            },
            requestId: `generateNote_${Date.now()}_${Math.random().toString(36).slice(2)}`
          };
          console.info('[SW Adapter] Converted simple message to MessageRequest:', messageRequest);
        } else {
          // Already in MessageRequest format or other action
          messageRequest = request as MessageRequest;
        }
      } else {
        // Invalid request format
        sendResponse({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request format'
          },
          requestId: request?.requestId || 'unknown'
        });
        return false; // Synchronous response, no need to return true
      }

      // Handle async response
      // IMPORTANT: Immediately invoke the async handler to ensure the Service Worker
      // stays alive during async operations (like chrome.storage.local.set)
      (async () => {
        try {
          console.info('[SW Adapter] Processing message:', messageRequest.action);
          const response = await getHandler().handleMessage(messageRequest);
          console.info('[SW Adapter] Sending response for:', messageRequest.action, { success: response.success });
          sendResponse(response);
        } catch (error: any) {
          console.error('[SW Adapter] Message handler failed:', error);
          sendResponse({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: error.message || String(error)
            },
            requestId: messageRequest.requestId
          });
        }
      })();

      return true; // Indicates async response
    }
  );
}

/**
 * Chrome runtime port listener (for stream responses)
 * Handles streaming messages (e.g., chatStream)
 */
export function setupPortListener(): void {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('Chrome runtime not available, port listener not set up');
    return;
  }

  chrome.runtime.onConnect.addListener((port: any) => {
    port.onMessage.addListener(async (request: MessageRequest & { stream: true }) => {
      if (!request.stream) {
        port.postMessage({
          type: 'error',
          error: { code: 'INVALID_REQUEST', message: 'Stream request must have stream: true' },
          requestId: request.requestId
        } as StreamMessage);
        return;
      }

      try {
        const handler = getHandler();
        const stream = handler.handleStream(request);

        for await (const chunk of stream) {
          port.postMessage({
            type: 'chunk',
            content: chunk.content,
            trace: chunk.trace,
            requestId: request.requestId
          } as StreamMessage);
        }

        port.postMessage({
          type: 'done',
          requestId: request.requestId
        } as StreamMessage);
      } catch (error: any) {
        port.postMessage({
          type: 'error',
          error: {
            code: error.code || 'STREAM_ERROR',
            message: error.message || String(error)
          },
          requestId: request.requestId
        } as StreamMessage);
      }
    });
  });
}

/**
 * Initialize Service Worker listeners
 * Call this in your service-worker.ts entry point
 */
export function initializeServiceWorker(): void {
  setupMessageListener();
  setupPortListener();
}

