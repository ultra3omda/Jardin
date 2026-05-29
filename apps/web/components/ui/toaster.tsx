'use client';

import { useToastStore, type ToastVariant } from '@/lib/ui/use-toast';

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-green-500/40 bg-green-50 text-green-900',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-navy-500/30 bg-slate-50 text-navy-900',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${VARIANT_CLASSES[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 opacity-70 transition hover:opacity-100"
            aria-label="Fermer la notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
