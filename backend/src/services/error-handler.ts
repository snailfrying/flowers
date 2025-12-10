/**
 * Unified error handling utilities
 */

import type { Result } from '../types.js';

/**
 * Error codes
 */
export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  
  // Agent errors
  AGENT_ERROR = 'AGENT_ERROR',
  TRANSLATION_ERROR = 'TRANSLATION_ERROR',
  POLISH_ERROR = 'POLISH_ERROR',
  GENERATION_ERROR = 'GENERATION_ERROR',
  
  // Notes errors
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  NOTE_CREATE_ERROR = 'NOTE_CREATE_ERROR',
  NOTE_UPDATE_ERROR = 'NOTE_UPDATE_ERROR',
  NOTE_DELETE_ERROR = 'NOTE_DELETE_ERROR',
  
  // Vector store errors
  VECTOR_STORE_ERROR = 'VECTOR_STORE_ERROR',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  RETRIEVAL_ERROR = 'RETRIEVAL_ERROR',
  
  // Settings errors
  SETTINGS_ERROR = 'SETTINGS_ERROR',
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  INVALID_MODEL = 'INVALID_MODEL',
  
  // Prompt errors
  PROMPT_NOT_FOUND = 'PROMPT_NOT_FOUND',
  PROMPT_ERROR = 'PROMPT_ERROR',
  
  // Stream errors
  STREAM_ERROR = 'STREAM_ERROR',
  STREAM_TIMEOUT = 'STREAM_TIMEOUT'
}

/**
 * Custom error class with error code
 */
export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }

  toResult<T>(): Result<T> {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

/**
 * Helper to create Result from error
 */
export function createErrorResult<T>(
  code: ErrorCode,
  message: string,
  details?: any
): Result<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}

/**
 * Helper to create success Result
 */
export function createSuccessResult<T>(data: T): Result<T> {
  return {
    success: true,
    data
  };
}

/**
 * Helper to wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR
): Promise<Result<T>> {
  try {
    const data = await fn();
    return createSuccessResult(data);
  } catch (error: any) {
    if (error instanceof APIError) {
      return error.toResult<T>();
    }
    return createErrorResult<T>(
      errorCode,
      error.message || String(error),
      error.details
    );
  }
}

