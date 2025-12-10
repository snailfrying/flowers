import { create } from 'zustand';

export interface AppError {
  id: string;
  message: string;
  code?: string;
  details?: any;
  context?: string;
  requestId?: string;
  url?: string;
  status?: number;
  model?: string;
  responsePreview?: string;
  ts: number;
}

interface ErrorStore {
  errors: AppError[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  push: (err: Omit<AppError, 'id' | 'ts'>) => void;
  clear: () => void;
}

export const useErrorStore = create<ErrorStore>((set, get) => ({
  errors: [],
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  push: (err) => {
    const entry: AppError = {
      ...err,
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ts: Date.now()
    };
    set({ errors: [entry, ...get().errors].slice(0, 20), isOpen: true });
  },
  clear: () => set({ errors: [] })
}));


