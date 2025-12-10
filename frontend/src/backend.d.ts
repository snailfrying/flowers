/**
 * Type declarations for backend imports
 */

declare module '../../../backend/dist/index.js' {
  export * from 'backend/types.js';
  // Re-export runtime modules (will be resolved at build time)
  export const agentAPI: any;
  export const notesAPI: any;
  export const settingsAPI: any;
  export const promptsAPI: any;
  export const faqsAPI: any;
  export const initializeServiceWorker: () => void;
}

