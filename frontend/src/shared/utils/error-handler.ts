/**
 * Unified error handling utilities
 */

export interface ErrorInfo {
  code?: string;
  message: string;
  details?: any;
}

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error occurred';
}

/**
 * Extract error code if available
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('code' in error) {
      return String((error as { code: unknown }).code);
    }
    if ('error' in error && typeof (error as { error: unknown }).error === 'object') {
      const innerError = (error as { error: unknown }).error;
      if (innerError && typeof innerError === 'object' && 'code' in innerError) {
        return String((innerError as { code: unknown }).code);
      }
    }
  }
  return undefined;
}

/**
 * Parse error into structured ErrorInfo
 */
export function parseError(error: unknown): ErrorInfo {
  return {
    code: extractErrorCode(error),
    message: extractErrorMessage(error),
    details: error
  };
}

/**
 * Log error consistently
 */
export function logError(context: string, error: unknown): void {
  const errorInfo = parseError(error);
  console.error(`[${context}]`, errorInfo.message, {
    code: errorInfo.code,
    details: errorInfo.details
  });
}

