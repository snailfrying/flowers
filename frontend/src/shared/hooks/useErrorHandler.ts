/**
 * Unified error handling hook
 */

import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/common/Toaster';
import { extractErrorMessage } from '@/shared/utils/error-handler';
import { useErrorStore } from '@/shared/store/error-store';

export function useErrorHandler() {
  const { t } = useTranslation();
  const { error: showError } = useToast();
  const pushError = useErrorStore((s) => s.push);

  const handleError = (
    error: unknown,
    defaultMessageKey?: string,
    context?: string
  ): void => {
    const message = extractErrorMessage(error);
    const displayMessage = message || (defaultMessageKey ? t(defaultMessageKey) : t('error.unknown'));
    
    if (context) {
      console.error(`[${context}]`, error);
    } else {
      console.error(error);
    }

    showError(t('error.title'), displayMessage);
    try {
      const details = (error as any) || {};
      pushError({
        message: displayMessage,
        code: details?.code,
        details,
        context
      });
    } catch {}
  };

  return { handleError };
}

