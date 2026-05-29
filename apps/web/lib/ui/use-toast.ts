'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export const AUTO_DISMISS_MS = 4000;

interface ToastStore {
  toasts: Toast[];
  push: (message: string, variant: ToastVariant) => void;
  dismiss: (id: string) => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}-${Date.now()}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, variant) => {
    const id = nextId();
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, AUTO_DISMISS_MS);
    }
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export function useToast(): ToastApi {
  const push = useToastStore((s) => s.push);
  return {
    success: (message) => push(message, 'success'),
    error: (message) => push(message, 'error'),
    info: (message) => push(message, 'info'),
  };
}
