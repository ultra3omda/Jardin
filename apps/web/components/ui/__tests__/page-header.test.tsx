import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders the title as the single h1', () => {
    render(<PageHeader title="Élèves" />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Élèves');
  });

  it('renders the description when provided', () => {
    render(<PageHeader title="Élèves" description="Gérez vos élèves" />);
    expect(screen.getByText('Gérez vos élèves')).toBeInTheDocument();
  });

  it('omits the description paragraph when absent', () => {
    const { container } = render(<PageHeader title="Élèves" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders actions', () => {
    render(<PageHeader title="Élèves" actions={<button type="button">Ajouter</button>} />);
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
  });
});
