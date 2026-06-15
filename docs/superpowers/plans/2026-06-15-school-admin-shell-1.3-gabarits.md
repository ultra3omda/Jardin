# SCHOOL_ADMIN Shell 1.3 — Gabarits DetailPage + FormPage — Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Fournir deux gabarits réutilisables — `DetailPage` (onglets) et `FormPage` (sections + footer collant + garde anti-perte) — sur les primitives Phase 0, et les appliquer à un écran de référence chacun (faible risque), sans changement de comportement.

**Tech:** Next.js 14 / React 18 / TS strict / Tailwind V7 / lucide-react / Vitest+RTL. Alias `@/` → `apps/web/`.

## Environnement
Worktree `C:\Users\ultra\Desktop\Projets\ecole-saas\.claude\worktrees\design-system`, branche `feat/school-admin-gabarits` (base origin/main, 1.1+1.2 inclus). Process concurrent actif → jamais changer de branche ; git depuis le worktree ; **PowerShell** (préfixe `Set-Location <worktree>`). **Vitest non exécutable en local (WDAC)** → `type-check` + `eslint`, tests en CI. Chemins avec `[ ]`/`( )` → quoter en shell.

---

## Task G1 — `Tabs` + `DetailPage`

**Files:** Create `apps/web/components/ui/tabs.tsx`, `apps/web/components/crud/detail-page.tsx` ; Tests `apps/web/components/ui/__tests__/tabs.test.tsx`, `apps/web/components/crud/__tests__/detail-page.test.tsx`.

- [ ] **Step 1 — Tests**

`components/ui/__tests__/tabs.test.tsx` :
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Tabs } from '../tabs';

describe('Tabs', () => {
  it('rend les onglets avec aria-selected sur l’actif et notifie au clic', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={[{ id: 'a', label: 'Infos' }, { id: 'b', label: 'Notes' }]} active="a" onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(tabs[1]);
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

`components/crud/__tests__/detail-page.test.tsx` :
```tsx
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
```

- [ ] **Step 2 — Échec** : `pnpm --filter @ecole-saas/web type-check` → FAIL.

- [ ] **Step 3 — `components/ui/tabs.tsx`**
```tsx
'use client';

import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

/** Onglets accessibles (button group). Contrôlé par le parent. */
export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium',
              isActive ? 'border-primary text-navy-900' : 'border-transparent text-ink-500 hover:text-navy-900',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4 — `components/crud/detail-page.tsx`**
```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Tabs, type TabDef } from '@/components/ui/tabs';

interface Props {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  /** Avatar/initiales optionnel (carte identité). */
  avatar?: { initials: string; className?: string };
  /** Actions à droite du header (éditer/supprimer…). */
  actions?: ReactNode;
  tabs: TabDef[];
  /** Contenu par onglet : panels[tab.id]. */
  panels: Record<string, ReactNode>;
  defaultTab?: string;
}

/** Gabarit de fiche : retour + header (+ avatar/actions) + onglets + contenu. */
export function DetailPage({ backHref, backLabel, title, subtitle, avatar, actions, tabs, panels, defaultTab }: Props) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');
  return (
    <div className="space-y-5">
      <Link href={backHref as never} className="text-sm font-medium text-primary hover:underline">
        ← {backLabel}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatar ? (
            <span className={cn('flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold', avatar.className ?? 'bg-paper-100 text-navy-900')}>
              {avatar.initials}
            </span>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>

      {tabs.length > 1 ? <Tabs tabs={tabs} active={active} onChange={setActive} /> : null}
      <div role="tabpanel">{panels[active]}</div>
    </div>
  );
}
```

- [ ] **Step 5 — Vérifier** : `type-check` OK + `eslint components/ui/tabs.tsx components/crud/detail-page.tsx components/ui/__tests__/tabs.test.tsx components/crud/__tests__/detail-page.test.tsx` clean.
- [ ] **Step 6 — Commit** : `git add apps/web/components/ui/tabs.tsx apps/web/components/crud/detail-page.tsx apps/web/components/ui/__tests__/tabs.test.tsx apps/web/components/crud/__tests__/detail-page.test.tsx && git commit -m "feat(web): DetailPage + Tabs gabarit"`

---

## Task G2 — `FormPage` (+ `FormSection`, `FormField`) + `useUnsavedChanges`

**Files:** Create `apps/web/components/crud/form-page.tsx`, `apps/web/lib/ui/use-unsaved-changes.ts` ; Tests `apps/web/components/crud/__tests__/form-page.test.tsx`, `apps/web/lib/ui/__tests__/use-unsaved-changes.test.ts`.

- [ ] **Step 1 — Tests**

`components/crud/__tests__/form-page.test.tsx` :
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FormPage, FormSection, FormField } from '../form-page';

vi.mock('@/i18n/routing', () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

describe('FormPage', () => {
  it('rend les sections, l’erreur (alert) et soumet', () => {
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
    expect(screen.getByRole('button', { name: /patience|…|Créer/i })).toBeDisabled();
  });
});
```

`lib/ui/__tests__/use-unsaved-changes.test.ts` :
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnsavedChanges } from '@/lib/ui/use-unsaved-changes';

afterEach(() => vi.restoreAllMocks());

describe('useUnsavedChanges', () => {
  it('ajoute le listener beforeunload uniquement quand dirty', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const { rerender, unmount } = renderHook(({ d }) => useUnsavedChanges(d), { initialProps: { d: false } });
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    rerender({ d: true });
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
  });
});
```

- [ ] **Step 2 — Échec** : `type-check` → FAIL.

- [ ] **Step 3 — `lib/ui/use-unsaved-changes.ts`**
```ts
'use client';

import { useEffect } from 'react';

/** Avertit avant fermeture/rechargement de l'onglet quand le formulaire est modifié. */
export function useUnsavedChanges(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
```

- [ ] **Step 4 — `components/crud/form-page.tsx`**
```tsx
'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

interface FormPageProps {
  title?: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelHref?: string;
  onCancel?: () => void;
  children: ReactNode;
}

/** Gabarit de formulaire : header + sections + erreur + footer d'actions collant. */
export function FormPage({
  title,
  description,
  onSubmit,
  submitting = false,
  error,
  submitLabel = 'Enregistrer',
  cancelHref,
  onCancel,
  children,
}: FormPageProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {title ? <PageHeader title={title} description={description} /> : null}

      <div className="space-y-5 rounded-lg border bg-card p-6">{children}</div>

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t border-border bg-paper-50/90 px-2 py-3 backdrop-blur">
        {cancelHref ? (
          <Link href={cancelHref as never} className="text-sm font-medium text-muted-foreground hover:underline">
            Annuler
          </Link>
        ) : onCancel ? (
          <button type="button" onClick={onCancel} className="text-sm font-medium text-muted-foreground hover:underline">
            Annuler
          </button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Veuillez patienter…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Section de formulaire (légende + champs). */
export function FormSection({ legend, optional, children }: { legend: string; optional?: boolean; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-navy-900">
        {legend}
        {optional ? <span className="ml-1 text-xs font-normal text-muted-foreground">(optionnel)</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

/** Champ étiqueté (label + hint + contrôle). */
export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
```

- [ ] **Step 5 — Vérifier** : `type-check` OK + `eslint` clean sur les 4 fichiers.
- [ ] **Step 6 — Commit** : `git add apps/web/components/crud/form-page.tsx apps/web/lib/ui/use-unsaved-changes.ts apps/web/components/crud/__tests__/form-page.test.tsx apps/web/lib/ui/__tests__/use-unsaved-changes.test.ts && git commit -m "feat(web): FormPage gabarit + useUnsavedChanges"`

---

## Task G3 — Migrer `child-detail.tsx` sur `DetailPage`

**Files:** Modify `apps/web/app/[locale]/(app)/children/[id]/child-detail.tsx`.

> **READ the file first.** Comportement IDENTIQUE : mêmes fetch (`my-children`, `my-grades`, `attendance/my-children`), mêmes états (loading/introuvable), même contenu. On remplace seulement la structure (header + sections) par `DetailPage` avec 3 onglets : **Infos** (les 2 cartes Bulletins/Paiements), **Notes** (la section notes), **Présences** (la section présences). Le `loading` reste un message simple ; l'état « introuvable » garde le lien retour + message.

- [ ] **Step 1** — Importer `import { DetailPage } from '@/components/crud/detail-page';`.
- [ ] **Step 2** — Conserver toute la logique de chargement (token, states, `load`, `useEffect`, `loading`, `!child`). Remplacer le bloc `return (<div className="space-y-6">…</div>)` final (le cas nominal) par :
```tsx
  const initials = `${child.firstName[0] ?? ''}${child.lastName[0] ?? ''}`.toUpperCase();
  return (
    <DetailPage
      backHref="/dashboard"
      backLabel="Mes enfants"
      title={`${child.firstName} ${child.lastName}`}
      subtitle={child.className ?? 'Classe non assignée'}
      avatar={{ initials, className: 'bg-pink-100 text-pink-700' }}
      tabs={[
        { id: 'overview', label: 'Infos' },
        { id: 'grades', label: 'Notes' },
        { id: 'attendance', label: 'Présences' },
      ]}
      panels={{
        overview: (/* les 2 <Link> cartes Bulletins/Paiements, dans un <section className="grid gap-4 sm:grid-cols-2"> */),
        grades: (/* la <section> "Notes (période en cours)" inchangée */),
        attendance: (/* la <section> "Présences récentes" inchangée */),
      }}
    />
  );
```
Déplacer le JSX existant des 3 sections dans les `panels` correspondants **sans changer leur contenu**. Garder `loading` et `!child` tels quels (avant ce return).

- [ ] **Step 3 — Vérifier** : `type-check` OK + `eslint "app/[locale]/(app)/children/[id]/child-detail.tsx"` clean.
- [ ] **Step 4 — Commit** : `git add "apps/web/app/[locale]/(app)/children/[id]/child-detail.tsx" && git commit -m "refactor(web): child detail on DetailPage gabarit"`

---

## Task G4 — Migrer `create-organization-form.tsx` sur `FormPage`

**Files:** Modify `apps/web/app/[locale]/(app)/commercial/new/create-organization-form.tsx`.

> **READ the file first.** Comportement IDENTIQUE : mêmes state/handlers (`form`, `file`, `submitting`, `error`, `success`, `handleSubmit`, upload contrat, validation conditionnelle). On remplace seulement : les `<fieldset>/<legend>` par `<FormSection legend=…>`, le composant local `Field` par `FormField`, et le `<form>` + footer manuel par `<FormPage onSubmit={handleSubmit} submitting={submitting} error={error} submitLabel="Créer l'organisation" cancelHref="/commercial" title="Nouvelle organisation" description="Créez l'établissement et invitez son administrateur.">…</FormPage>`. Le rendu du `success` (carte verte) reste **inchangé** (early return avant le FormPage). Brancher `useUnsavedChanges(isDirty)` où `isDirty = form !== EMPTY (au moins un champ rempli) || file !== null` — calcule un booléen simple (ex. comparer quelques champs clés ou `JSON.stringify(form) !== JSON.stringify(EMPTY) || !!file`).

- [ ] **Step 1** — Imports : `import { FormPage, FormSection, FormField } from '@/components/crud/form-page';` et `import { useUnsavedChanges } from '@/lib/ui/use-unsaved-changes';`. Retirer l'import `Button` s'il n'est plus utilisé hors success (garder si utilisé dans le success).
- [ ] **Step 2** — Remplacer le `<form>…</form>` (cas nominal) par `<FormPage …>` contenant les 3 `<FormSection>` (Établissement / Administrateur à inviter / Contrat signé (optionnel, `optional`)) avec les mêmes inputs (réutiliser `inputClass`), via `FormField`. Supprimer le footer manuel (fourni par FormPage) et l'ancien composant local `Field` (remplacé par `FormField`).
- [ ] **Step 3** — Ajouter `const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY) || file !== null;` puis `useUnsavedChanges(isDirty);` au niveau du composant (avant les returns).
- [ ] **Step 4 — Vérifier** : `type-check` OK + `eslint "app/[locale]/(app)/commercial/new/create-organization-form.tsx"` clean.
- [ ] **Step 5 — Commit** : `git add "apps/web/app/[locale]/(app)/commercial/new/create-organization-form.tsx" && git commit -m "refactor(web): create-organization form on FormPage gabarit"`

---

## Task V — Vérif finale + PR
- [ ] `pnpm --filter @ecole-saas/web type-check` OK ; eslint clean sur tous les fichiers touchés.
- [ ] Push + `gh pr create --base main`. CI verte (sans `--admin`) → merge → STOP.

## Self-Review
- Spec §6.2 DetailPage (onglets) : G1 + G3 (child-detail). §6.3 FormPage (sections + footer collant + garde) : G2 + G4 (create-org) + `useUnsavedChanges`.
- Réutilise les primitives Phase 0 (`PageHeader`, `Button`). Pas de dépendance ajoutée (Tabs maison, pas de Radix).
- Migrations **iso-comportement** (logique/handlers inchangés) → risque borné ; vérif type-check/eslint + CI (Vitest + e2e).
- Différé : tabs pilotés par URL, garde de navigation in-app (au-delà de beforeunload), migration des écrans complexes (students/classes) — vagues module ultérieures.
