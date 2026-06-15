import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommandPalette } from '../command-palette';
import type { Command } from '@/lib/nav/commands';

const onClose = vi.fn();
const run = vi.fn();
const commands: Command[] = [
  { id: 'goto:students', kind: 'goto', label: 'Élèves', href: '/students', group: 'Scolarité' },
  { id: 'action:new', kind: 'action', label: 'Nouvel élève', group: 'Actions', run },
];

describe('CommandPalette', () => {
  it('ne rend rien quand fermé', () => {
    render(<CommandPalette open={false} commands={commands} onClose={onClose} onNavigate={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('rend un combobox accessible et liste les commandes quand ouvert', () => {
    render(<CommandPalette open commands={commands} onClose={onClose} onNavigate={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Élèves')).toBeInTheDocument();
    expect(screen.getByText('Nouvel élève')).toBeInTheDocument();
  });

  it('filtre à la frappe', () => {
    render(<CommandPalette open commands={commands} onClose={onClose} onNavigate={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'nouvel' } });
    expect(screen.queryByText('Élèves')).toBeNull();
    expect(screen.getByText('Nouvel élève')).toBeInTheDocument();
  });

  it('exécute une action et déclenche onNavigate pour un goto', () => {
    const onNavigate = vi.fn();
    render(<CommandPalette open commands={commands} onClose={onClose} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Nouvel élève'));
    expect(run).toHaveBeenCalledTimes(1);
    render(<CommandPalette open commands={commands} onClose={onClose} onNavigate={onNavigate} />);
    fireEvent.click(screen.getAllByText('Élèves')[0]);
    expect(onNavigate).toHaveBeenCalledWith('/students');
  });
});
