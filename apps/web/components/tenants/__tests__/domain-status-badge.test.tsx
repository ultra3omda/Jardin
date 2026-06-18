import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DomainStatusBadge } from '../domain-status-badge';

describe('DomainStatusBadge', () => {
  it('renders the French label for PROVISIONING', () => {
    render(<DomainStatusBadge status="PROVISIONING" />);
    expect(screen.getByText('Domaine en cours…')).toBeTruthy();
  });

  it('renders the French label for ACTIVE', () => {
    render(<DomainStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Domaine actif')).toBeTruthy();
  });

  it('renders the French label for FAILED', () => {
    render(<DomainStatusBadge status="FAILED" />);
    expect(screen.getByText('Échec domaine')).toBeTruthy();
  });

  it('renders em-dash for NONE', () => {
    render(<DomainStatusBadge status="NONE" />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('applies amber tone class for PROVISIONING', () => {
    render(<DomainStatusBadge status="PROVISIONING" />);
    expect(screen.getByText('Domaine en cours…').className).toContain('amber');
  });

  it('applies emerald tone class for ACTIVE', () => {
    render(<DomainStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Domaine actif').className).toContain('emerald');
  });

  it('applies red tone class for FAILED', () => {
    render(<DomainStatusBadge status="FAILED" />);
    expect(screen.getByText('Échec domaine').className).toContain('red');
  });

  it('applies muted slate tone class for NONE', () => {
    render(<DomainStatusBadge status="NONE" />);
    expect(screen.getByText('—').className).toContain('slate');
  });
});
