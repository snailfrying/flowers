/**
 * Toast Provider - Compatibility wrapper for shadcn/ui Toast system
 * Maintains API compatibility with custom ToastProvider while using shadcn/ui under the hood
 */

import { ReactNode } from 'react';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { useToast as useShadcnToast } from '@/hooks/use-toast';

// Re-export shadcn/ui Toaster component
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ShadcnToaster />
    </>
  );
}

// Compatibility wrapper for useToast hook
export function useToast() {
  const { toast: shadcnToast } = useShadcnToast();

  return {
    toast: (options: { title: string; description?: string; variant?: 'default' | 'success' | 'error' | 'warning'; duration?: number }) => {
      const { variant, duration, ...rest } = options;
      shadcnToast({
        ...rest,
        variant: variant === 'error' ? 'destructive' : 'default',
        duration: duration || 3000
      });
    },
    success: (title: string, description?: string) => {
      shadcnToast({
        title,
        description,
        variant: 'default'
      });
    },
    error: (title: string, description?: string) => {
      shadcnToast({
        title,
        description,
        variant: 'destructive'
      });
    },
    warning: (title: string, description?: string) => {
      shadcnToast({
        title,
        description,
        variant: 'default'
      });
    }
  };
}

