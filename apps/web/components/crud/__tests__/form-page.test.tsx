import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormPage, FormSection, FormField } from '../form-page';

vi.mock('@/i18n/routing', () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

describe('FormPage', () => {
  it("rend les sections, l'erreur (alert) et soumet", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <FormPage title="Nouvelle org." onSubmit={onSubmit} error="Boom" submitLabel="Créer" cancelHref="/x">
        <FormSection legend="Établissement">
          <FormField label="Nom"><input aria-label="Nom" /></FormField>
        </FormSection>
      </FormPage>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nouvelle org.');
    expect(screen.getByText('Établissement')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('désactive le submit quand submitting', () => {
    render(<FormPage onSubmit={(e) => e.preventDefault()} submitting submitLabel="Créer"><div /></FormPage>);
    expect(screen.getByRole('button', { name: /patienter|Créer/i })).toBeDisabled();
  });
});
