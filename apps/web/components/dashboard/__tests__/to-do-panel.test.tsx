import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Wallet } from 'lucide-react';
import { ToDoPanel, type ToDoItem } from '../to-do-panel';

vi.mock('@/i18n/routing', () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const items: ToDoItem[] = [
  { id: 'unpaid', icon: Wallet, label: 'paiements en retard', value: '3', detail: '1250 TND à recouvrer', href: '/frais/impayes', cta: 'Voir', tone: 'danger' },
];

describe('ToDoPanel', () => {
  it('rend chaque item avec sa valeur, son libellé et un lien CTA', () => {
    render(<ToDoPanel items={items} />);
    expect(screen.getByText(/paiements en retard/)).toBeInTheDocument();
    expect(screen.getByText('1250 TND à recouvrer')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Voir' });
    expect(cta).toHaveAttribute('href', '/frais/impayes');
  });
  it('affiche un état vide positif quand rien à traiter', () => {
    render(<ToDoPanel items={[]} />);
    expect(screen.getByText(/tout est à jour/i)).toBeInTheDocument();
  });
});
