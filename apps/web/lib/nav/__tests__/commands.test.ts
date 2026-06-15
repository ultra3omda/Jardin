import { describe, it, expect } from 'vitest';
import { navToCommands, filterCommands, type Command } from '@/lib/nav/commands';
import type { NavSection } from '@/lib/nav/menu';

const sections = [
  { id: 'scolarite', label: 'Scolarité', items: [
    { id: 'students', label: 'Élèves', href: '/students', icon: (() => null) as never },
  ]},
] as unknown as NavSection[];

const actions: Command[] = [
  { id: 'new-student', kind: 'action', label: 'Nouvel élève', run: () => {} },
];

describe('navToCommands', () => {
  it('aplatit les entrées de nav en commandes "goto"', () => {
    const cmds = navToCommands(sections);
    expect(cmds).toHaveLength(1);
    expect(cmds[0]).toMatchObject({ kind: 'goto', label: 'Élèves', href: '/students', group: 'Scolarité' });
  });
});

describe('filterCommands', () => {
  const all = [...navToCommands(sections), ...actions];
  it('retourne tout quand la requête est vide', () => {
    expect(filterCommands(all, '')).toHaveLength(2);
  });
  it('filtre par sous-chaîne insensible à la casse/accents', () => {
    expect(filterCommands(all, 'eleve').map((c) => c.label)).toEqual(['Élèves']);
  });
  it('matche aussi les actions', () => {
    expect(filterCommands(all, 'nouvel').map((c) => c.label)).toEqual(['Nouvel élève']);
  });
});
