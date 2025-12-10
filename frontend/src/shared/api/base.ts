/**
 * Base API client utilities
 * Handles Chrome runtime message communication
 */

// Chrome types declaration for API client
declare const chrome: {
  runtime: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    lastError?: { message: string };
    connect: (options: { name: string }) => {
      postMessage: (message: any) => void;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
        removeListener: (callback: (message: any) => void) => void;
      };
      disconnect: () => void;
    };
  };
};

/**
 * Check if Chrome runtime is available
 */
export function isChromeRuntimeAvailable(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
}

/**
 * Wait for Chrome runtime to be ready
 */
export function waitForChromeRuntime(): Promise<void> {
  return new Promise((resolve) => {
    if (isChromeRuntimeAvailable()) {
      resolve();
      return;
    }
    // Wait up to 5 seconds for runtime to be available
    const timeout = setTimeout(() => resolve(), 5000);
    const checkInterval = setInterval(() => {
      if (isChromeRuntimeAvailable()) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
  });
}

