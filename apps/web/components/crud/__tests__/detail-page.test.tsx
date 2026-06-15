import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DetailPage } from '../detail-page';

vi.mock('@/i18n/routing', () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

describe('DetailPage', () => {
  const tabs = [{ id: 'overview', label: 'Infos' }, { id: 'grades', label: 'Notes' }];
  const panels = { overview: <p>Bloc infos</p>, grades: <p>Bloc notes</p> };

  it('rend le titre, le lien retour et le 1er panneau par défaut', () => {
    render(<DetailPage backHref="/dashboard" backLabel="Retour" title="Lina Ben Ali" subtitle="CM2" tabs={tabs} panels={panels} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lina Ben Ali');
    expect(screen.getByRole('link', { name: /Retour/ })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByText('Bloc infos')).toBeInTheDocument();
    expect(screen.queryByText('Bloc notes')).toBeNull();
  });

  it('change de panneau au clic sur un onglet', () => {
    render(<DetailPage backHref="/x" backLabel="Retour" title="T" tabs={tabs} panels={panels} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Notes' }));
    expect(screen.getByText('Bloc notes')).toBeInTheDocument();
  });
});
