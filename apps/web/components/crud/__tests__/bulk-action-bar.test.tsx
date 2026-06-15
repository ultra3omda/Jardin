import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BulkActionBar } from '../bulk-action-bar';

describe('BulkActionBar', () => {
  it('ne rend rien quand count = 0', () => {
    const { container } = render(<BulkActionBar count={0} onClear={() => {}}><button>X</button></BulkActionBar>);
    expect(container).toBeEmptyDOMElement();
  });
  it('affiche le compte, les actions et déclenche onClear', () => {
    const onClear = vi.fn();
    render(<BulkActionBar count={3} onClear={onClear}><button>Exporter</button></BulkActionBar>);
    expect(screen.getByText(/3 sélectionnés/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exporter' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Désélectionner/ }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
