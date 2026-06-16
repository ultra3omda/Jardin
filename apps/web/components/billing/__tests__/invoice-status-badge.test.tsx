import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoiceStatusBadge } from '../invoice-status-badge';

describe('InvoiceStatusBadge', () => {
  it('renders the French label for a status', () => {
    render(<InvoiceStatusBadge status="OVERDUE" />);
    expect(screen.getByText('En retard')).toBeTruthy();
  });

  it('applies a tone class per status', () => {
    render(<InvoiceStatusBadge status="PAID" />);
    expect(screen.getByText('Payé').className).toContain('green');
  });
});
