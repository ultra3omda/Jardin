'use client';

import { useEffect, type ReactNode } from 'react';

export interface CrudModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function CrudModal({ open, title, onClose, children }: CrudModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-navy-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}
