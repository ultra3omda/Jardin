'use client';

import { CrudModal } from '@/components/crud/crud-modal';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  /** Short, action-oriented title (e.g. "Supprimer cet élève ?"). */
  title: string;
  /** Optional body explaining the consequence. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for irreversible / destructive actions. */
  destructive?: boolean;
  /** Disables both buttons + shows a pending label while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive or consequential actions (delete, bulk
 * ops, class promotion…). Built on the accessible CrudModal (focus trap, Escape,
 * backdrop, restore focus) so callers get WCAG behaviour for free.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <CrudModal open={open} title={title} onClose={onCancel}>
      {description && <p className="mb-6 text-sm text-ink-500">{description}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Veuillez patienter…' : confirmLabel}
        </Button>
      </div>
    </CrudModal>
  );
}
