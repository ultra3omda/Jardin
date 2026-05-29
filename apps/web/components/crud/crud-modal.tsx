'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface CrudModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog (WCAG 2.1 AA): labelled by its title, focus moves in
 * on open and is restored to the trigger on close, Tab is trapped inside, and
 * Escape / backdrop-click close it. Props are intentionally minimal so callers
 * stay unchanged.
 */
export function CrudModal({ open, title, onClose, children }: CrudModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the dialog on open; restore it to the previously-focused
  // element on close. Keyed on `open` ONLY: parents pass inline `onClose`
  // arrows whose identity changes every render, and including them here would
  // re-run this effect mid-interaction and steal focus back to the top.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    return () => previouslyFocused?.focus();
  }, [open]);

  // Escape to close + Tab focus-trap. Keyed on `onClose` too so the latest
  // handler is always invoked.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="mb-4 text-lg font-semibold text-navy-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
