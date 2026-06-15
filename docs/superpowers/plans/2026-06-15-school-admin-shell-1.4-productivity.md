# SCHOOL_ADMIN Shell 1.4 — Productivité (bulk + filtre + export) sur la liste Élèves — Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Fournir des composants de productivité réutilisables (`BulkActionBar`, export CSV) et les appliquer à la liste **Élèves** (sélection multiple + suppression groupée + export CSV + filtre par classe), sans casser la recherche/pagination existantes.

**Tech:** Next.js 14 / React 18 / TS strict / Tailwind V7 / TanStack Query v5 / Vitest+RTL. Réutilise les helpers de sélection purs de `@ecole-saas/shared` (`initSelection/toggleStudent/…`), `ConfirmDialog`/`Button` (Phase 0), `deleteStudent`/`listStudents` (`lib/api/students.ts`), `listClasses` (`lib/api/classes.ts`).

## Environnement
Worktree `C:\Users\ultra\Desktop\Projets\ecole-saas\.claude\worktrees\design-system`, branche `feat/school-admin-productivity` (base origin/main). Process concurrent actif → jamais changer de branche ; git depuis le worktree ; **PowerShell** (préfixe `Set-Location <worktree>`). **Vitest non exécutable en local (WDAC)** → `type-check` + `eslint`, tests en CI. Chemins `[ ]`/`( )` → quoter.

---

## Task P1 — Util export CSV

**Files:** Create `apps/web/lib/ui/export-csv.ts` ; Test `apps/web/lib/ui/__tests__/export-csv.test.ts`.

- [ ] **Step 1 — Test (de la fonction pure `toCsv`)**
```ts
import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/ui/export-csv';

interface Row { a: string; b: number; }
const cols = [
  { header: 'A', value: (r: Row) => r.a },
  { header: 'B', value: (r: Row) => r.b },
];

describe('toCsv', () => {
  it('produit en-tête + lignes', () => {
    expect(toCsv([{ a: 'x', b: 1 }], cols)).toBe('A,B\nx,1');
  });
  it('échappe virgules, guillemets et retours ligne', () => {
    const out = toCsv([{ a: 'a,b', b: 2 }, { a: 'he said "hi"', b: 3 }], cols);
    expect(out).toBe('A,B\n"a,b",2\n"he said ""hi""",3');
  });
});
```

- [ ] **Step 2 — Échec** : `pnpm --filter @ecole-saas/web type-check` → FAIL.

- [ ] **Step 3 — Implémenter** `apps/web/lib/ui/export-csv.ts`
```ts
/** Échappe une valeur CSV (RFC 4180) : entoure de guillemets si elle contient , " ou \n. */
function escapeCsv(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Construit une chaîne CSV (en-tête + lignes). */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(','));
  return [head, ...body].join('\n');
}

/** Déclenche le téléchargement d'un CSV (BOM UTF-8 pour Excel). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4 — Vérifier** : `type-check` OK + `eslint lib/ui/export-csv.ts lib/ui/__tests__/export-csv.test.ts` clean.
- [ ] **Step 5 — Commit** : `git add apps/web/lib/ui/export-csv.ts apps/web/lib/ui/__tests__/export-csv.test.ts && git commit -m "feat(web): CSV export util (toCsv + downloadCsv)"`

---

## Task P2 — `BulkActionBar`

**Files:** Create `apps/web/components/crud/bulk-action-bar.tsx` ; Test `apps/web/components/crud/__tests__/bulk-action-bar.test.tsx`.

- [ ] **Step 1 — Test**
```tsx
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
```

- [ ] **Step 2 — Échec** : `type-check` → FAIL.

- [ ] **Step 3 — Implémenter** `apps/web/components/crud/bulk-action-bar.tsx`
```tsx
'use client';

import type { ReactNode } from 'react';

interface Props {
  count: number;
  onClear: () => void;
  /** Boutons d'action (export, suppression…). */
  children: ReactNode;
}

/** Barre d'actions groupées, visible quand des lignes sont sélectionnées. */
export function BulkActionBar({ count, onClear, children }: Props) {
  if (count === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-navy-900 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      <span className="font-medium">
        {count} sélectionné{count > 1 ? 's' : ''}
      </span>
      <div className="ml-auto flex items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-white/70 hover:text-white"
      >
        Désélectionner
      </button>
    </div>
  );
}
```

- [ ] **Step 4 — Vérifier** : `type-check` OK + `eslint` clean sur les 2 fichiers.
- [ ] **Step 5 — Commit** : `git add apps/web/components/crud/bulk-action-bar.tsx apps/web/components/crud/__tests__/bulk-action-bar.test.tsx && git commit -m "feat(web): BulkActionBar component"`

---

## Task P3 — Intégrer sélection + filtre classe + bulk delete/export dans la liste Élèves

**Files:** Modify `apps/web/app/[locale]/(app)/students/students-list.tsx`.

> **READ the file first.** Comportement existant à PRÉSERVER : recherche debouncée, pagination, états loading/error/empty, colonnes du tableau, lien « Voir → ». On AJOUTE (de façon additive) : un filtre par classe, une colonne de cases à cocher (admin seulement), une `BulkActionBar` (export CSV + suppression groupée avec `ConfirmDialog`).

- [ ] **Step 1 — Imports** à ajouter :
```tsx
import { useMemo, useState } from 'react'; // (compléter l'import react existant)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listStudents, deleteStudent, type StudentSummary } from '@/lib/api/students';
import { listClasses } from '@/lib/api/classes';
import {
  initSelection, toggleStudent, selectAllStudents, clearSelection,
  isStudentSelected, isAllSelected, selectionToArray, selectionCount,
  type StudentSelection,
} from '@ecole-saas/shared';
import { BulkActionBar } from '@/components/crud/bulk-action-bar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { toCsv, downloadCsv } from '@/lib/ui/export-csv';
```

- [ ] **Step 2 — État + query** :
  - Ajouter `const [classId, setClassId] = useState<string>('');` ; `const [selection, setSelection] = useState<StudentSelection>(() => initSelection([], 'none'));` ; `const [confirmOpen, setConfirmOpen] = useState(false);` ; `const qc = useQueryClient();`.
  - Passer `classId: classId || undefined` à `listStudents(...)` et l'ajouter à `queryKey: ['students', page, debounced, classId]`.
  - Charger les classes : `const { data: classesData } = useQuery({ queryKey: ['classes', 'options'], queryFn: () => listClasses(accessToken!), enabled: !!accessToken && canWrite });` → `const classOptions = classesData?.items ?? [];`.
  - **Reset sélection** quand la page change (la sélection est par page) : remplacer `const students = data?.items ?? [];` et, juste après, `const pageIds = useMemo(() => students.map((s) => s.id), [students]);` ; et un `useEffect(() => { setSelection(initSelection([], 'none')); }, [page, debounced, classId]);`.
  - Quand on change `classId` ou la recherche, repasser `setPage(1)` (le `debounced` le fait déjà ; ajouter un `onChange` du select qui fait `setClassId(v); setPage(1);`).

- [ ] **Step 3 — UI filtre classe** : à côté de l'`<input type="search">`, envelopper les deux dans un `<div className="flex flex-wrap gap-3">`. Ajouter (si `canWrite`) :
```tsx
<select
  value={classId}
  onChange={(e) => { setClassId(e.target.value); setPage(1); }}
  aria-label="Filtrer par classe"
  className="h-10 rounded-md border px-3 text-sm"
>
  <option value="">Toutes les classes</option>
  {classOptions.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
</select>
```

- [ ] **Step 4 — BulkActionBar + ConfirmDialog** : juste avant le bloc tableau, ajouter :
```tsx
const selectedIds = selectionToArray(selection);
const count = selectionCount(selection);
const selectedStudents = students.filter((s) => isStudentSelected(selection, s.id));

const bulkDelete = useMutation({
  mutationFn: async () => { await Promise.all(selectedIds.map((id) => deleteStudent(accessToken!, id))); },
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setSelection(initSelection([], 'none')); setConfirmOpen(false); },
});

function exportCsv() {
  const csv = toCsv(selectedStudents, [
    { header: 'Nom', value: (s) => s.lastName },
    { header: 'Prénom', value: (s) => s.firstName },
    { header: 'Classe', value: (s) => s.classroom },
    { header: 'Parent', value: (s) => s.parentEmail },
    { header: 'Date de naissance', value: (s) => s.dateOfBirth },
  ]);
  downloadCsv('eleves.csv', csv);
}
```
Et dans le JSX (après les filtres, si `canWrite`) :
```tsx
<BulkActionBar count={count} onClear={() => setSelection(initSelection([], 'none'))}>
  <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>Exporter CSV</Button>
  <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>Supprimer</Button>
</BulkActionBar>
<ConfirmDialog
  open={confirmOpen}
  title={`Supprimer ${count} élève${count > 1 ? 's' : ''} ?`}
  description="Les élèves seront marqués comme supprimés. Les historiques (notes, paiements) sont préservés."
  confirmLabel="Supprimer"
  destructive
  loading={bulkDelete.isPending}
  onConfirm={() => bulkDelete.mutate()}
  onCancel={() => setConfirmOpen(false)}
/>
```

- [ ] **Step 5 — Colonne cases à cocher** (admin seulement) : dans `<thead>`, ajouter une 1ʳᵉ `<th>` avec une case « tout sélectionner » :
```tsx
{canWrite && (
  <th scope="col" className="w-10 px-4 py-3">
    <input
      type="checkbox"
      aria-label="Tout sélectionner"
      checked={pageIds.length > 0 && isAllSelected(selection, pageIds)}
      onChange={(e) => setSelection(e.target.checked ? selectAllStudents(pageIds) : clearSelection())}
    />
  </th>
)}
```
Et dans chaque `<tr>`, une 1ʳᵉ `<td>` :
```tsx
{canWrite && (
  <td className="px-4 py-3">
    <input
      type="checkbox"
      aria-label={`Sélectionner ${s.firstName} ${s.lastName}`}
      checked={isStudentSelected(selection, s.id)}
      onChange={() => setSelection(toggleStudent(selection, s.id))}
    />
  </td>
)}
```

- [ ] **Step 6 — Vérifier** : `pnpm --filter @ecole-saas/web type-check` (OK) + `pnpm --filter @ecole-saas/web exec eslint "app/[locale]/(app)/students/students-list.tsx"` (clean). Surveiller `react-hooks/rules-of-hooks` (tous les hooks au top-level, avant tout return). Garder la recherche/pagination/états inchangés.
- [ ] **Step 7 — Commit** : `git add "apps/web/app/[locale]/(app)/students/students-list.tsx" && git commit -m "feat(web): students list — bulk select/delete/export + class filter"`

---

## Task V — Vérif finale + PR
- [ ] `pnpm --filter @ecole-saas/web type-check` OK ; eslint clean sur tous les fichiers touchés.
- [ ] Push + `gh pr create --base main`. CI verte (sans `--admin`) → merge → **FIN Vague 1**.

## Self-Review
- Spec §7.2 bulk actions (multi-select + suppression/export) + §7.3 filtres/export : P1+P2+P3 sur la liste Élèves (pilote). Réutilise les helpers de sélection partagés (DRY) + `ConfirmDialog` (confirmation destructive).
- a11y : cases à cocher étiquetées (`aria-label`), `BulkActionBar` `role="status" aria-live`. Recherche déjà `aria-label`.
- Iso-comportement sur l'existant (recherche/pagination/états) ; sélection **par page** (simple, pas de sélection cross-pages).
- Différé : tri serveur (l'API n'expose pas de `sort`), généralisation aux autres listes, filtres persistés en URL — vagues ultérieures.
