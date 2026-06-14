import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ConfirmDialog } from '../confirm-dialog';

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Supprimer cet élève ?"
      description="Cette action est irréversible."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('renders title + description as an accessible dialog when open', () => {
    setup();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Supprimer cet élève ?')).toBeInTheDocument();
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="X" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fires onConfirm and onCancel', () => {
    const { onConfirm, onCancel } = setup({ confirmLabel: 'Supprimer', cancelLabel: 'Annuler' });
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables the action and shows a pending label while loading', () => {
    setup({ loading: true, confirmLabel: 'Supprimer' });
    expect(screen.getByRole('button', { name: 'Veuillez patienter…' })).toBeDisabled();
  });
});
