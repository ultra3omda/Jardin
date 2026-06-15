# SCHOOL_ADMIN Shell 1.1 — Navigation deux-niveaux + Cmd+K — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la navigation web SCHOOL_ADMIN en deux niveaux (rail de domaines → sous-menu contextuel) avec la taxonomie validée, et ajouter une palette de commandes globale (Cmd+K : Aller à + Actions, extensible aux entités).

**Architecture:** `lib/nav/menu.ts` produit déjà `NavSection[]` (domaine → items) ; on affine la taxonomie SCHOOL_ADMIN puis on refait la *présentation* de la sidebar en deux colonnes (DomainRail + DomainPanel). La palette est un composant overlay autonome alimenté par des « providers » (nav, actions) dérivés de la même source de nav, ouvert par un hook clavier global. Aucune dépendance ajoutée (Radix dialog absent → overlay maison sur le pattern `CrudModal`).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript strict, Tailwind (tokens V7), lucide-react, Vitest + @testing-library/react. i18n via `@/i18n/routing` `Link`. Auth via `useAuthStore` (`@/lib/auth/use-auth-store`).

---

## Contraintes d'environnement

- Travail dans le **worktree isolé** `C:\Users\ultra\Desktop\Projets\ecole-saas\.claude\worktrees\design-system`, branche `feat/school-admin-shell` (basée sur `origin/main`). Un process concurrent tourne sur le dépôt → ne jamais opérer hors du worktree, ne jamais `git checkout` une autre branche dans ce worktree.
- **Vitest non exécutable en local** (Application Control policy Windows bloque le binaire natif rollup). En local : `pnpm --filter @ecole-saas/web type-check` et `pnpm --filter @ecole-saas/web exec eslint <files>`. Les tests Vitest **tournent en CI** (job « Lint, Type-check & Build », déjà vert en Phase 0). Pour chaque tâche : écrire le test, vérifier qu'il *compile* (type-check) + lint, et se fier à la CI pour l'exécution.
- Commits depuis le worktree ; pousser avec `Remove-Item Env:GIT_ASKPASS` au préalable (gotcha Cursor/Windows). Ne jamais `--admin` au merge.

## File Structure

| Fichier | Responsabilité |
|---|---|
| `apps/web/lib/nav/menu.ts` *(modifier)* | Taxonomie validée pour `schoolAdminNav` (fusionne « Administration », sort « RH » de Finance, Périodes/Matières → Paramètres, Absences/Discipline → Vie école). |
| `apps/web/lib/nav/__tests__/menu.test.ts` *(existe — étendre)* | Garde-fou sur la structure des domaines SCHOOL_ADMIN. |
| `apps/web/lib/nav/commands.ts` *(créer)* | Pur : aplatit `NavSection[]` en commandes « Aller à » + liste d'« Actions », et filtre par requête (fuzzy simple). |
| `apps/web/lib/nav/__tests__/commands.test.ts` *(créer)* | Tests des helpers de commandes. |
| `apps/web/lib/ui/use-command-palette.ts` *(créer)* | Hook : état ouvert/fermé + raccourci Cmd/Ctrl+K global. |
| `apps/web/lib/ui/__tests__/use-command-palette.test.ts` *(créer)* | Tests du hook. |
| `apps/web/components/app-shell/command-palette.tsx` *(créer)* | Overlay accessible (combobox/listbox), groupes, navigation clavier, exécution. |
| `apps/web/components/app-shell/__tests__/command-palette.test.tsx` *(créer)* | Tests du composant. |
| `apps/web/components/app-shell/domain-rail.tsx` *(créer)* | Colonne niveau 1 (domaines, icône + label, actif). |
| `apps/web/components/app-shell/domain-panel.tsx` *(créer)* | Colonne niveau 2 (entrées du domaine actif). |
| `apps/web/components/app-shell/sidebar.tsx` *(modifier)* | Compose DomainRail + DomainPanel (remplace la pile de `NavSection`). |
| `apps/web/components/app-shell/topbar.tsx` *(modifier)* | Le placeholder de recherche devient le déclencheur Cmd+K. |
| `apps/web/lib/nav/active.ts` *(créer)* | Pur : détection du domaine/entrée actif depuis le pathname (segment exact, plus de faux positif `startsWith`). |
| `apps/web/lib/nav/__tests__/active.test.ts` *(créer)* | Tests de la détection d'actif. |

---

## Task 1 : Taxonomie SCHOOL_ADMIN validée

**Files:**
- Modify: `apps/web/lib/nav/menu.ts` (fonction `schoolAdminNav`)
- Test: `apps/web/lib/nav/__tests__/menu.test.ts`

- [ ] **Step 1 : Écrire le test garde-fou (échec attendu)**

Ajouter à `apps/web/lib/nav/__tests__/menu.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { getNavForUser } from '@/lib/nav/menu';
import type { AuthUser, AuthTenant } from '@/lib/auth/types';

const adminUser = { id: 'u1', role: 'SCHOOL_ADMIN', firstName: 'A', lastName: 'B', email: 'a@b.tn' } as unknown as AuthUser;
const primaryTenant = { id: 't1', name: 'École', slug: 'ecole', type: 'PRIMARY_SCHOOL' } as unknown as AuthTenant;

describe('schoolAdminNav — taxonomie validée (V1.1)', () => {
  const ids = getNavForUser(adminUser, primaryTenant).map((s) => s.id);

  it('expose les domaines validés dans l’ordre', () => {
    expect(ids).toEqual([
      'accueil', 'scolarite', 'pedagogie', 'vieEcole',
      'finance', 'rh', 'communication', 'parametres', 'compte',
    ]);
  });

  it('n’a plus de domaine "administration" (fusionné)', () => {
    expect(ids).not.toContain('administration');
  });

  it('sort RH de Finance', () => {
    const sections = getNavForUser(adminUser, primaryTenant);
    const finance = sections.find((s) => s.id === 'finance')!;
    const rh = sections.find((s) => s.id === 'rh')!;
    expect(finance.items.some((i) => i.id === 'hrPayroll')).toBe(false);
    expect(rh.items.map((i) => i.id)).toContain('hr');
  });

  it('met Absences et Discipline dans Vie école', () => {
    const vie = getNavForUser(adminUser, primaryTenant).find((s) => s.id === 'vieEcole')!;
    const itemIds = vie.items.map((i) => i.id);
    expect(itemIds).toContain('absences');
    expect(itemIds).toContain('discipline');
  });

  it('met Matières et Périodes dans Paramètres', () => {
    const params = getNavForUser(adminUser, primaryTenant).find((s) => s.id === 'parametres')!;
    const itemIds = params.items.map((i) => i.id);
    expect(itemIds).toEqual(expect.arrayContaining(['subjects', 'gradePeriods', 'establishment', 'branding']));
  });
});
```

- [ ] **Step 2 : Vérifier que ça échoue (en CI / logiquement)**

Run (local) : `pnpm --filter @ecole-saas/web type-check`
Attendu : compile. L'exécution Vitest échouera en CI car la taxonomie actuelle a `administration` et `hrPayroll` dans `finance`.

- [ ] **Step 3 : Réécrire `schoolAdminNav`**

Remplacer la fonction `schoolAdminNav` dans `apps/web/lib/nav/menu.ts` par :

```ts
function schoolAdminNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  const pedagogieItems: NavItem[] = isKG
    ? [
        { id: 'journal',      label: 'Journal quotidien', href: '/journal',      icon: ICONS.journal },
        { id: 'activities',   label: 'Activités',         href: '/activities',   icon: ICONS.activities },
        { id: 'observations', label: 'Observations',      href: '/observations', icon: ICONS.observations },
      ]
    : [
        { id: 'notes',        label: 'Notes',          href: '/notes',        icon: ICONS.notes },
        { id: 'bulletins',    label: 'Bulletins',      href: '/bulletins',    icon: ICONS.bulletins },
        { id: 'evaluations',  label: 'Évaluations',    href: '/evaluations',  icon: ICONS.evaluations },
        { id: 'homework',     label: 'Devoirs',        href: '/homework',     icon: ICONS.evaluations },
        { id: 'observations', label: 'Observations',   href: '/observations', icon: ICONS.observations },
      ];

  const vieEcoleItems: NavItem[] = [
    { id: 'absences',   label: 'Présences/Absences', href: '/absences',   icon: ICONS.absences },
    ...(isKG ? [] : [{ id: 'discipline', label: 'Discipline', href: '/discipline', icon: ICONS.discipline } as NavItem]),
    { id: 'canteen',             label: 'Cantine',              href: '/canteen',              icon: ICONS.canteen },
    { id: 'canteenDishes',       label: 'Plats',                href: '/canteen/dishes',       icon: ICONS.canteenDishes },
    { id: 'canteenReservations', label: 'Réservations cantine', href: '/canteen/reservations', icon: ICONS.canteenReservations },
    { id: 'canteenStats',        label: 'Stats cantine',        href: '/canteen/stats',        icon: ICONS.canteenStats },
    { id: 'transport',  label: 'Transport',          href: '/transport',  icon: ICONS.transport },
    { id: 'health',     label: 'Santé',              href: '/health',     icon: ICONS.health },
    { id: 'activities', label: 'Activités',          href: '/activities', icon: ICONS.activities },
  ];

  return [
    {
      id: 'accueil',
      label: 'Accueil',
      items: [{ id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ICONS.dashboard }],
    },
    {
      id: 'scolarite',
      label: 'Scolarité',
      items: [
        { id: 'students',       label: isKG ? 'Enfants' : 'Élèves',         href: '/students',          icon: ICONS.students },
        { id: 'classes',        label: isKG ? "Groupes d'âge" : 'Classes',  href: '/classes',           icon: ICONS.classes },
        { id: 'enrollments',    label: 'Inscriptions',                      href: '/enrollments',       icon: ICONS.enrollments },
        { id: 'schedule',       label: 'Emploi du temps',                   href: '/schedule',          icon: ICONS.schedule },
        { id: 'teachers',       label: isKG ? 'Animateurs' : 'Enseignants', href: '/teachers',          icon: ICONS.teachers },
        { id: 'parents',        label: 'Parents',                           href: '/parents',           icon: ICONS.parents },
        { id: 'classPromotion', label: 'Passage de classe',                 href: '/classes/promotion', icon: ICONS.classPromotion },
      ],
    },
    { id: 'pedagogie', label: 'Pédagogie', items: pedagogieItems },
    { id: 'vieEcole', label: 'Vie école', items: vieEcoleItems },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { id: 'billing',      label: 'Facturation',          href: '/billing',           icon: ICONS.billing },
        { id: 'feeTypes',     label: 'Référentiel de frais', href: '/frais/types',       icon: ICONS.feeTypes },
        { id: 'feeAssign',    label: 'Affectation de frais', href: '/frais/affectation', icon: ICONS.feeAssign },
        { id: 'feeUnpaid',    label: 'Impayés',              href: '/frais/impayes',     icon: ICONS.feeUnpaid },
        { id: 'payments',     label: 'Paiements',            href: '/payments',          icon: ICONS.payments },
        { id: 'cashRegister', label: 'Caisse',               href: '/caisse',            icon: ICONS.cashRegister },
        { id: 'cashClosures', label: 'Clôtures',             href: '/caisse/closures',   icon: ICONS.cashClosures },
        { id: 'expenses',     label: 'Dépenses',             href: '/depenses',          icon: ICONS.expenses },
        { id: 'suppliers',    label: 'Fournisseurs',         href: '/fournisseurs',      icon: ICONS.suppliers },
      ],
    },
    {
      id: 'rh',
      label: 'RH',
      items: [{ id: 'hr', label: 'Contrats · Congés · Paie', href: '/hr', icon: ICONS.hrPayroll }],
    },
    {
      id: 'communication',
      label: 'Communication',
      items: [
        { id: 'messages',      label: 'Messages',    href: '/messages',      icon: ICONS.messages },
        { id: 'announcements', label: 'Annonces',    href: '/announcements', icon: ICONS.announcements },
        { id: 'calendar',      label: 'Calendrier',  href: '/calendar',      icon: ICONS.calendar },
        { id: 'appointments',  label: 'Rendez-vous', href: '/appointments',  icon: ICONS.appointments },
      ],
    },
    {
      id: 'parametres',
      label: 'Paramètres',
      items: [
        { id: 'establishment', label: 'Établissement', href: '/settings/establishment', icon: ICONS.establishment },
        { id: 'subjects',      label: 'Matières',      href: '/settings/subjects',      icon: ICONS.subjects },
        { id: 'gradePeriods',  label: 'Périodes',      href: '/settings/grade-periods', icon: ICONS.gradePeriods },
        { id: 'branding',      label: 'Apparence',     href: '/settings/branding',      icon: ICONS.branding },
        { id: 'imports',       label: 'Importer',      href: '/imports',                icon: ICONS.imports },
      ],
    },
    {
      id: 'compte',
      label: 'Compte',
      items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }],
    },
  ];
}
```

- [ ] **Step 4 : Vérifier compile + lint**

Run : `pnpm --filter @ecole-saas/web type-check` (attendu : OK) puis
`pnpm --filter @ecole-saas/web exec eslint lib/nav/menu.ts lib/nav/__tests__/menu.test.ts` (attendu : clean).

- [ ] **Step 5 : Commit**

```bash
git add apps/web/lib/nav/menu.ts apps/web/lib/nav/__tests__/menu.test.ts
git commit -m "feat(web): SCHOOL_ADMIN nav taxonomy V1.1 (domains)"
```

---

## Task 2 : Helpers de commandes (Aller à / Actions)

**Files:**
- Create: `apps/web/lib/nav/commands.ts`
- Test: `apps/web/lib/nav/__tests__/commands.test.ts`

- [ ] **Step 1 : Écrire le test**

`apps/web/lib/nav/__tests__/commands.test.ts` :

```ts
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
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `pnpm --filter @ecole-saas/web type-check` → FAIL (`@/lib/nav/commands` introuvable).

- [ ] **Step 3 : Implémenter**

`apps/web/lib/nav/commands.ts` :

```ts
import type { NavSection } from '@/lib/nav/menu';

export type Command =
  | { id: string; kind: 'goto'; label: string; href: string; group: string }
  | { id: string; kind: 'action'; label: string; group?: string; run: () => void };

/** Aplatit les sections de nav en commandes "Aller à" (groupées par domaine). */
export function navToCommands(sections: NavSection[]): Command[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({
      id: `goto:${item.id}`,
      kind: 'goto' as const,
      label: item.label,
      href: item.href,
      group: section.label,
    })),
  );
}

/** Normalise : minuscules + suppression des diacritiques (accents). */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtre par sous-chaîne normalisée sur le label. Requête vide = tout. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const q = normalize(query.trim());
  if (!q) return commands;
  return commands.filter((c) => normalize(c.label).includes(q));
}
```

- [ ] **Step 4 : Vérifier**

Run : `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint lib/nav/commands.ts lib/nav/__tests__/commands.test.ts` (clean).

- [ ] **Step 5 : Commit**

```bash
git add apps/web/lib/nav/commands.ts apps/web/lib/nav/__tests__/commands.test.ts
git commit -m "feat(web): command palette data helpers (goto + actions)"
```

---

## Task 3 : Hook `useCommandPalette` (raccourci Cmd/Ctrl+K)

**Files:**
- Create: `apps/web/lib/ui/use-command-palette.ts`
- Test: `apps/web/lib/ui/__tests__/use-command-palette.test.ts`

- [ ] **Step 1 : Écrire le test**

`apps/web/lib/ui/__tests__/use-command-palette.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from '@/lib/ui/use-command-palette';

describe('useCommandPalette', () => {
  it('démarre fermé puis ouvre/ferme', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('ouvre sur Cmd/Ctrl+K', () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    });
    expect(result.current.open).toBe(true);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `pnpm --filter @ecole-saas/web type-check` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter**

`apps/web/lib/ui/use-command-palette.ts` :

```ts
'use client';

import { useEffect, useState } from 'react';

/** État de la palette + raccourci global Cmd/Ctrl+K (toggle). */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}
```

- [ ] **Step 4 : Vérifier**

Run : `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint lib/ui/use-command-palette.ts lib/ui/__tests__/use-command-palette.test.ts`.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/lib/ui/use-command-palette.ts apps/web/lib/ui/__tests__/use-command-palette.test.ts
git commit -m "feat(web): useCommandPalette hook (Cmd+K shortcut)"
```

---

## Task 4 : Composant `CommandPalette`

**Files:**
- Create: `apps/web/components/app-shell/command-palette.tsx`
- Test: `apps/web/components/app-shell/__tests__/command-palette.test.tsx`

- [ ] **Step 1 : Écrire le test**

`apps/web/components/app-shell/__tests__/command-palette.test.tsx` :

```tsx
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
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `pnpm --filter @ecole-saas/web type-check` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter**

`apps/web/components/app-shell/command-palette.tsx` :

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { filterCommands, type Command } from '@/lib/nav/commands';

interface Props {
  open: boolean;
  commands: Command[];
  onClose: () => void;
  /** Appelé pour un goto (le parent route via next-intl). */
  onNavigate: (href: string) => void;
}

/** Palette de commandes globale (Cmd+K). Overlay accessible, navigation clavier. */
export function CommandPalette({ open, commands, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function exec(cmd: Command) {
    onClose();
    if (cmd.kind === 'goto') onNavigate(cmd.href);
    else cmd.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[active]) { e.preventDefault(); exec(results[active]); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche et commandes"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-autocomplete="list"
          placeholder="Rechercher une page, une action…"
          className="w-full border-b border-border px-4 py-3 text-sm outline-none"
        />
        <ul id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-ink-500">Aucun résultat.</li>
          ) : (
            results.map((cmd, i) => (
              <li key={cmd.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => exec(cmd)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm',
                    i === active ? 'bg-paper-100 text-navy-900' : 'text-ink-700',
                  )}
                >
                  <span>{cmd.label}</span>
                  <span className="text-xs text-ink-300">{cmd.group ?? (cmd.kind === 'action' ? 'Action' : '')}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : Vérifier**

Run : `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint components/app-shell/command-palette.tsx components/app-shell/__tests__/command-palette.test.tsx`.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/app-shell/command-palette.tsx apps/web/components/app-shell/__tests__/command-palette.test.tsx
git commit -m "feat(web): CommandPalette component (accessible Cmd+K overlay)"
```

---

## Task 4bis : Recherche d'entités « Élèves » dans la palette

> Ajoute le groupe « Élèves » (recherche serveur debouncée) à la palette. APIs connues :
> `listStudents(token, { search, pageSize })` → `{ items: StudentSummary[] }`
> (`apps/web/lib/api/students.ts`), token via `useAuthStore((s) => s.accessToken)`
> (`apps/web/lib/auth/use-auth-store.ts`). Les résultats d'entités sont **déjà filtrés
> côté serveur** : ils ne repassent pas par `filterCommands` — ils sont fournis en `extraResults`.

**Files:**
- Create: `apps/web/lib/nav/use-student-commands.ts`
- Test: `apps/web/lib/nav/__tests__/use-student-commands.test.tsx`
- Modify: `apps/web/components/app-shell/command-palette.tsx` (props `extraResults` / `extraLoading` / `onQueryChange`)
- Modify: `apps/web/components/app-shell/topbar.tsx` (câbler le hook)

- [ ] **Step 1 : Test du hook**

`apps/web/lib/nav/__tests__/use-student-commands.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api/students', () => ({
  listStudents: vi.fn(async () => ({ items: [{ id: 's1', firstName: 'Lina', lastName: 'Ben Ali' }], total: 1, page: 1, pageSize: 5 })),
}));
vi.mock('@/lib/auth/use-auth-store', () => ({
  useAuthStore: (sel: (s: { accessToken: string | null }) => unknown) => sel({ accessToken: 'tok' }),
}));

import { useStudentCommands } from '@/lib/nav/use-student-commands';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useStudentCommands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne cherche pas en dessous de 2 caractères', () => {
    const { result } = renderHook(() => useStudentCommands('l'), { wrapper });
    expect(result.current.results).toEqual([]);
  });

  it('mappe les élèves en commandes goto après debounce', async () => {
    const { result } = renderHook(() => useStudentCommands('lina'), { wrapper });
    await waitFor(() => expect(result.current.results.length).toBe(1));
    expect(result.current.results[0]).toMatchObject({
      kind: 'goto', label: 'Lina Ben Ali', href: '/students/s1', group: 'Élèves',
    });
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — `pnpm --filter @ecole-saas/web type-check` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter le hook**

`apps/web/lib/nav/use-student-commands.ts` :

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStudents } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import type { Command } from '@/lib/nav/commands';

/** Recherche d'élèves (serveur, debouncée 200ms) → commandes "goto" pour la palette. */
export function useStudentCommands(query: string): { results: Command[]; loading: boolean } {
  const token = useAuthStore((s) => s.accessToken);
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = !!token && debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ['cmdk-students', debounced],
    queryFn: () => listStudents(token as string, { search: debounced, pageSize: 5 }),
    enabled,
  });

  const results: Command[] = (data?.items ?? []).map((s) => ({
    id: `student:${s.id}`,
    kind: 'goto',
    label: `${s.firstName} ${s.lastName}`,
    href: `/students/${s.id}`,
    group: 'Élèves',
  }));

  return { results, loading: enabled && isFetching };
}
```

- [ ] **Step 4 : Étendre `CommandPalette`** (props optionnelles, sans casser les tests de la Task 4)

Dans `apps/web/components/app-shell/command-palette.tsx` :

1. Ajouter aux props :
```tsx
  /** Résultats d'entités déjà filtrés côté serveur (non re-filtrés). */
  extraResults?: Command[];
  /** Indicateur de chargement des entités. */
  extraLoading?: boolean;
  /** Notifie le parent à chaque frappe (pour piloter une recherche serveur). */
  onQueryChange?: (q: string) => void;
```
2. Déstructurer `extraResults = [], extraLoading = false, onQueryChange` et, dans l'input `onChange`, appeler aussi `onQueryChange?.(e.target.value)`.
3. Calculer la liste navigable complète : `const all = [...results, ...extraResults];` et utiliser `all` (à la place de `results`) pour la navigation clavier (`active`, `Enter`) et le rendu de la liste.
4. Avant la liste des entités, afficher un libellé de groupe « Élèves » si `extraResults.length > 0`, et une ligne « Recherche… » si `extraLoading`.

Extrait de rendu (remplace le bloc `<ul>` de la Task 4) :
```tsx
<ul id="cmdk-list" role="listbox" className="max-h-80 overflow-y-auto py-2">
  {all.length === 0 && !extraLoading ? (
    <li className="px-4 py-6 text-center text-sm text-ink-500">Aucun résultat.</li>
  ) : (
    all.map((cmd, i) => (
      <li key={cmd.id} role="option" aria-selected={i === active}>
        <button
          type="button"
          onMouseEnter={() => setActive(i)}
          onClick={() => exec(cmd)}
          className={cn(
            'flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm',
            i === active ? 'bg-paper-100 text-navy-900' : 'text-ink-700',
          )}
        >
          <span>{cmd.label}</span>
          <span className="text-xs text-ink-300">{cmd.group ?? (cmd.kind === 'action' ? 'Action' : '')}</span>
        </button>
      </li>
    ))
  )}
  {extraLoading ? <li className="px-4 py-2 text-xs text-ink-300">Recherche…</li> : null}
</ul>
```

> Les tests de la Task 4 restent valides : `extraResults` par défaut `[]`, donc `all === results`.

- [ ] **Step 5 : Câbler dans `Topbar`**

Dans `apps/web/components/app-shell/topbar.tsx`, ajouter :
```tsx
import { useState } from 'react';
import { useStudentCommands } from '@/lib/nav/use-student-commands';
// ...
const [paletteQuery, setPaletteQuery] = useState('');
const { results: studentCmds, loading: studentsLoading } = useStudentCommands(paletteQuery);
```
et passer à `<CommandPalette … onQueryChange={setPaletteQuery} extraResults={studentCmds} extraLoading={studentsLoading} />`.

- [ ] **Step 6 : Vérifier** — `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint lib/nav/use-student-commands.ts components/app-shell/command-palette.tsx components/app-shell/topbar.tsx`.

- [ ] **Step 7 : Commit**

```bash
git add apps/web/lib/nav/use-student-commands.ts apps/web/lib/nav/__tests__/use-student-commands.test.tsx apps/web/components/app-shell/command-palette.tsx apps/web/components/app-shell/topbar.tsx
git commit -m "feat(web): Cmd+K entity search — students provider"
```

---

## Task 5 : Détection d'actif (segment exact)

**Files:**
- Create: `apps/web/lib/nav/active.ts`
- Test: `apps/web/lib/nav/__tests__/active.test.ts`

- [ ] **Step 1 : Écrire le test**

`apps/web/lib/nav/__tests__/active.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { isItemActive } from '@/lib/nav/active';

describe('isItemActive', () => {
  it('matche le segment exact (pas de faux positif startsWith)', () => {
    expect(isItemActive('/fr/absences', '/absences')).toBe(true);
    expect(isItemActive('/fr/absence', '/absences')).toBe(false); // faux positif évité
  });
  it('matche les sous-routes du même segment', () => {
    expect(isItemActive('/fr/students/123', '/students')).toBe(true);
  });
  it('ne matche pas un autre segment', () => {
    expect(isItemActive('/fr/classes', '/students')).toBe(false);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `pnpm --filter @ecole-saas/web type-check` → FAIL (module introuvable).

- [ ] **Step 3 : Implémenter**

`apps/web/lib/nav/active.ts` :

```ts
/**
 * Vrai si `href` correspond au `pathname` courant. Compare au niveau du segment
 * (après le préfixe de locale) pour éviter le faux positif `/absence` ⊂ `/absences`.
 */
export function isItemActive(pathname: string, href: string): boolean {
  // retire le préfixe de locale: /fr/students -> /students
  const path = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  if (path === href) return true;
  return path.startsWith(href + '/');
}
```

- [ ] **Step 4 : Vérifier**

Run : `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint lib/nav/active.ts lib/nav/__tests__/active.test.ts`.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/lib/nav/active.ts apps/web/lib/nav/__tests__/active.test.ts
git commit -m "feat(web): exact-segment nav active detection"
```

---

## Task 6 : Sidebar deux niveaux (DomainRail + DomainPanel)

**Files:**
- Create: `apps/web/components/app-shell/domain-rail.tsx`
- Create: `apps/web/components/app-shell/domain-panel.tsx`
- Modify: `apps/web/components/app-shell/sidebar.tsx`

- [ ] **Step 1 : Implémenter `DomainRail`**

`apps/web/components/app-shell/domain-rail.tsx` :

```tsx
'use client';

import type { NavSection } from '@/lib/nav/menu';

interface Props {
  sections: NavSection[];
  activeId: string;
  onSelect: (id: string) => void;
}

/** Niveau 1 : colonne d'icônes/labels de domaines (navy). */
export function DomainRail({ sections, activeId, onSelect }: Props) {
  return (
    <nav aria-label="Domaines" className="flex w-[112px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/5 py-3">
      {sections.map((s) => {
        const Icon = s.items[0]?.icon;
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-current={active ? 'true' : undefined}
            className={`mx-2 flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] ${
              active ? 'bg-white/10 text-white' : 'text-[#c8cdd6] hover:bg-white/5 hover:text-white'
            }`}
          >
            {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
            <span className="text-center leading-tight">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2 : Implémenter `DomainPanel`**

`apps/web/components/app-shell/domain-panel.tsx` :

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';
import type { NavSection } from '@/lib/nav/menu';
import { isItemActive } from '@/lib/nav/active';

interface Props {
  section: NavSection | undefined;
  onNavigate?: () => void;
}

/** Niveau 2 : entrées du domaine sélectionné. */
export function DomainPanel({ section, onNavigate }: Props) {
  const pathname = usePathname() ?? '';
  if (!section) return null;
  return (
    <nav aria-label={section.label} className="flex-1 overflow-y-auto px-2 py-3">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">{section.label}</p>
      {section.items.map((item) => {
        const active = isItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
              active ? 'bg-navy-800 text-white' : 'text-[#c8cdd6] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3 : Recomposer `sidebar.tsx`**

Dans `apps/web/components/app-shell/sidebar.tsx` : remplacer l'import de `NavSection` (composant) par les deux nouveaux composants, ajouter l'état du domaine actif (initialisé sur le domaine qui contient la route courante via `isItemActive`), et remplacer le `<nav>` qui mappe les sections par la paire rail+panel :

```tsx
// imports en tête
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { DomainRail } from './domain-rail';
import { DomainPanel } from './domain-panel';
import { isItemActive } from '@/lib/nav/active';
// (retirer: import { NavSection } from './nav-section')
```

```tsx
// dans le composant, après `const sections = getNavForUser(user, tenant);`
const pathname = usePathname() ?? '';
const initialDomain =
  sections.find((s) => s.items.some((it) => isItemActive(pathname, it.href)))?.id
  ?? sections[0]?.id
  ?? '';
const [activeDomain, setActiveDomain] = useState(initialDomain);
const current = sections.find((s) => s.id === activeDomain) ?? sections[0];
```

Remplacer le bloc `<nav className="flex-1 ...">{sections.map(...)}</nav>` par :

```tsx
<div className="flex flex-1 overflow-hidden">
  <DomainRail sections={sections} activeId={activeDomain} onSelect={setActiveDomain} />
  <DomainPanel section={current} onNavigate={onClose} />
</div>
```

- [ ] **Step 4 : Vérifier**

Run : `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint components/app-shell/domain-rail.tsx components/app-shell/domain-panel.tsx components/app-shell/sidebar.tsx`.

> Note : si `components/app-shell/nav-section.tsx` n'est plus importé nulle part après ce changement, le laisser en place (peut servir ailleurs) — ne pas le supprimer dans cette PR.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/app-shell/domain-rail.tsx apps/web/components/app-shell/domain-panel.tsx apps/web/components/app-shell/sidebar.tsx
git commit -m "feat(web): two-level sidebar (domain rail + contextual panel)"
```

---

## Task 7 : Brancher la palette dans la Topbar

**Files:**
- Modify: `apps/web/components/app-shell/topbar.tsx`

- [ ] **Step 1 : Remplacer le placeholder par le déclencheur Cmd+K**

Réécrire `apps/web/components/app-shell/topbar.tsx` :

```tsx
'use client';

import { Menu, Search } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

import { NotificationBell } from './notification-bell';
import { UserPill } from './user-pill';
import { CommandPalette } from './command-palette';
import { useCommandPalette } from '@/lib/ui/use-command-palette';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { getNavForUser } from '@/lib/nav/menu';
import { navToCommands } from '@/lib/nav/commands';

interface Props {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: Props) {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const commands = user ? navToCommands(getNavForUser(user, tenant)) : [];

  return (
    <header className="flex items-center gap-2 px-4 py-4 bg-paper-50 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-500 shadow-sm hover:text-ink-900 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-ink-300 shadow-sm hover:text-ink-500"
        aria-label="Rechercher (Cmd+K)"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Rechercher…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[11px] sm:inline">⌘K</kbd>
      </button>

      <NotificationBell />
      <UserPill variant="topbar" />

      <CommandPalette
        open={open}
        commands={commands}
        onClose={() => setOpen(false)}
        onNavigate={(href) => router.push(href)}
      />
    </header>
  );
}
```

> Note d'implémentation : vérifier que `@/i18n/routing` exporte bien `useRouter` (il exporte `Link` — utilisé par la sidebar). S'il n'expose pas `useRouter`, utiliser `useRouter` de `next/navigation` et préfixer la locale, ou le helper de navigation maison. Confirmer avant d'écrire l'appel.

- [ ] **Step 2 : Vérifier**

Run : `pnpm --filter @ecole-saas/web type-check` (OK) +
`pnpm --filter @ecole-saas/web exec eslint components/app-shell/topbar.tsx`.

- [ ] **Step 3 : Commit**

```bash
git add apps/web/components/app-shell/topbar.tsx
git commit -m "feat(web): wire Cmd+K palette into topbar"
```

---

## Task 8 : Vérification finale + PR

- [ ] **Step 1 : Type-check global web**

Run : `pnpm --filter @ecole-saas/web type-check` → OK.

- [ ] **Step 2 : ESLint sur tous les fichiers touchés**

Run : `pnpm --filter @ecole-saas/web exec eslint lib/nav components/app-shell lib/ui/use-command-palette.ts` → clean.

- [ ] **Step 3 : Pousser + PR**

```bash
# depuis le worktree
Remove-Item Env:GIT_ASKPASS -ErrorAction SilentlyContinue   # PowerShell
git push -u origin feat/school-admin-shell
gh pr create --base main --title "feat(web): SCHOOL_ADMIN nav two-level + Cmd+K (1.1)" --body-file <body>
```

- [ ] **Step 4 : CI verte → merge (sans --admin)**

Surveiller `gh pr checks <n> --watch`. Le check `Vercel – klasso-mobile` peut être rouge (rate-limit infra, non bloquant). Quand les jobs réels (Lint/Type/Build, API, E2E) sont verts : `gh pr merge <n> --merge`. **STOP** — récap avant la sous-PR 1.2.

---

## Self-Review (relecture vs spec)

- **Couverture spec §4.1 (nav web)** : taxonomie (T1), deux niveaux rail+panel (T6), détection d'actif corrigée (T5), entrée Cmd+K topbar (T7) ✔.
- **§7.1 Cmd+K portée (c)** : « Aller à » + « Actions » livrés (T2, T4, T7). **Recherche d'entités** : l'interface `Command` + la palette les acceptent (kind extensible) ; les *providers d'entités* (élèves, factures…) seront ajoutés au fil des modules (sous-PR ultérieures) une fois les endpoints de recherche confirmés — **noté comme extension explicite**, pas un placeholder de logique cœur.
- **§8 a11y** : `role="dialog"/combobox/listbox/option`, `aria-current`, navigation clavier ↑/↓/Enter/Échap, focus à l'ouverture ✔.
- **RTL** : sidebar en flex + bordures `border-r`/`border-l` → à repasser en logique (`border-e`) lors de la passe transverse 1.4 (hors périmètre 1.1, noté).
- **Placeholders** : aucun TBD ; les deux « Note d'implémentation » (useRouter de `@/i18n/routing`, nav-section non supprimé) sont des points de **vérification** bornés, pas des trous de logique.
- **Cohérence des types** : `Command` (commands.ts) utilisé identiquement dans la palette + topbar ; `NavSection`/`NavItem` réutilisés tels quels.

> Décalage assumé vs spec : la **recherche d'entités** Cmd+K est architecturée ici mais ses providers concrets arrivent avec les modules — à confirmer à la revue. Si tu veux au moins le provider « élèves » dans 1.1, je l'ajoute (Task 4bis) en câblant l'endpoint de recherche élèves existant.
