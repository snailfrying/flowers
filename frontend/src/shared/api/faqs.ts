/**
 * FAQs API client (frontend wrapper)
 */

// @ts-ignore - Runtime import, types from backend/types.js
import { faqsAPI } from 'backend/index.js';

export const importFAQs = (faqs: Array<{ question: string; answer: string; tags?: string[] }>) =>
  faqsAPI.import(faqs);

