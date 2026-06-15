# SCHOOL_ADMIN Shell 1.2 — Dashboard Priority-first + Hub mobile groupé — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Rendre le dashboard admin « Priority-first » (panneau « À traiter » en tête, données réelles existantes) et regrouper le hub de gestion mobile (18 cartes à plat → sections par domaine).

**Architecture:** Web — nouveau composant présentationnel `ToDoPanel` alimenté par le `getDashboardOverview` existant (impayés `pendingPayments`/`amountDue` + absences `todayAttendance`), rendu en tête du dashboard pour SCHOOL_ADMIN/STAFF. Mobile — extraire les entrées du hub + un helper de regroupement pur (testable), puis rendre des sections par domaine. Aucun changement backend.

**Tech:** Next.js 14 / React 18 / Tailwind V7 / lucide-react / Vitest+RTL (web) ; Expo / RN / @klasso/ui-mobile / Jest (mobile).

## Contraintes d'environnement
Worktree `C:\Users\ultra\Desktop\Projets\ecole-saas\.claude\worktrees\design-system`, branche `feat/school-admin-dashboard` (base origin/main, 1.1 inclus). Process concurrent actif → ne jamais changer de branche ; git uniquement depuis le worktree ; **PowerShell** (chaque commande préfixée `Set-Location <worktree>`). **Vitest non exécutable en local (WDAC)** → vérifier `type-check` + `eslint`, tests en CI. Mobile : `pnpm --filter "./apps/mobile" exec jest <pattern>` fonctionne en local.

---

## Task W1 — Composant `ToDoPanel`

**Files:** Create `apps/web/components/dashboard/to-do-panel.tsx` ; Test `apps/web/components/dashboard/__tests__/to-do-panel.test.tsx`.

- [ ] **Step 1 — Test**
```tsx
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
```

- [ ] **Step 2 — Vérifier l'échec** : `pnpm --filter @ecole-saas/web type-check` → FAIL (module introuvable).

- [ ] **Step 3 — Implémenter**
```tsx
import type { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/routing';

export interface ToDoItem {
  id: string;
  icon: LucideIcon;
  /** Grande valeur (compte ou montant), ex. "3" ou "1250 TND". */
  value: string;
  /** Libellé de l'item, ex. "paiements en retard". */
  label: string;
  /** Ligne secondaire optionnelle. */
  detail?: string;
  href: string;
  cta: string;
  tone: 'danger' | 'warn' | 'info';
}

const TONE: Record<ToDoItem['tone'], string> = {
  danger: 'bg-red-50 text-red-700',
  warn: 'bg-amber-50 text-amber-700',
  info: 'bg-sky-50 text-sky-700',
};

/** "À traiter aujourd'hui" — actions prioritaires en tête du dashboard. */
export function ToDoPanel({ items }: { items: ToDoItem[] }) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm" aria-label="À traiter aujourd'hui">
      <h2 className="mb-3 text-sm font-bold text-ink-900">À traiter aujourd&apos;hui</h2>
      {items.length === 0 ? (
        <p className="px-1 py-2 text-sm text-ink-300">Rien d&apos;urgent — tout est à jour.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[it.tone]}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {it.value} · {it.label}
                  </p>
                  {it.detail ? <p className="truncate text-xs text-ink-400">{it.detail}</p> : null}
                </div>
                <Link
                  href={it.href as never}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {it.cta}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4 — Vérifier** : `type-check` OK + `eslint components/dashboard/to-do-panel.tsx components/dashboard/__tests__/to-do-panel.test.tsx` clean.
- [ ] **Step 5 — Commit** : `git add apps/web/components/dashboard/to-do-panel.tsx apps/web/components/dashboard/__tests__/to-do-panel.test.tsx && git commit -m "feat(web): dashboard ToDoPanel (priority-first)"`

---

## Task W2 — Intégrer `ToDoPanel` en tête du dashboard

**Files:** Modify `apps/web/app/[locale]/(app)/dashboard/page.tsx`.

> Le composant page récupère déjà `data` via `useResource(['dashboard','overview'], getDashboardOverview)`. `data` expose `pendingPayments: number`, `amountDue: number`, `todayAttendance: { present; absent; late; excused }`. Le panneau n'est rendu que pour SCHOOL_ADMIN/STAFF.

- [ ] **Step 1** — Ajouter les imports en tête :
```tsx
import { Wallet, UserX } from 'lucide-react';
import { ToDoPanel, type ToDoItem } from '@/components/dashboard/to-do-panel';
```
(garder l'import `Sparkles` existant.)

- [ ] **Step 2** — Juste avant le `return (`, calculer les items :
```tsx
  const showToDo = user.role === 'SCHOOL_ADMIN' || user.role === 'STAFF';
  const toDoItems: ToDoItem[] = [];
  if (showToDo && data) {
    if (data.pendingPayments > 0) {
      toDoItems.push({
        id: 'unpaid',
        icon: Wallet,
        value: String(data.pendingPayments),
        label: data.pendingPayments > 1 ? 'paiements en retard' : 'paiement en retard',
        detail: `${data.amountDue} TND à recouvrer`,
        href: '/frais/impayes',
        cta: 'Voir',
        tone: 'danger',
      });
    }
    const absToday = data.todayAttendance.absent + data.todayAttendance.late;
    if (absToday > 0) {
      toDoItems.push({
        id: 'absences',
        icon: UserX,
        value: String(absToday),
        label: 'absences/retards du jour',
        href: '/absences',
        cta: 'Pointer',
        tone: 'warn',
      });
    }
  }
```

- [ ] **Step 3** — Dans le JSX, juste APRÈS le `</header>` et AVANT la `<section>` des KPIs, insérer :
```tsx
      {showToDo ? <ToDoPanel items={toDoItems} /> : null}
```

- [ ] **Step 4 — Vérifier** : `type-check` OK + `eslint "app/[locale]/(app)/dashboard/page.tsx"` clean.
- [ ] **Step 5 — Commit** : `git add "apps/web/app/[locale]/(app)/dashboard/page.tsx" && git commit -m "feat(web): priority-first admin dashboard (ToDoPanel on top)"`

---

## Task M1 — Hub mobile regroupé par domaine

**Files:** Create `apps/mobile/lib/manage-hub.ts` ; Test `apps/mobile/lib/__tests__/manage-hub.test.ts` ; Modify `apps/mobile/app/(app)/manage/index.tsx`.

- [ ] **Step 1 — Test du helper**
`apps/mobile/lib/__tests__/manage-hub.test.ts` :
```ts
import { MANAGE_ENTRIES, DOMAIN_ORDER, groupByDomain } from '@/lib/manage-hub';

describe('manage-hub grouping', () => {
  it('contient les 18 entrées avec un domaine valide chacune', () => {
    expect(MANAGE_ENTRIES).toHaveLength(18);
    for (const e of MANAGE_ENTRIES) {
      expect(DOMAIN_ORDER).toContain(e.domain);
    }
  });
  it('groupByDomain rend des sections dans l’ordre des domaines, sans groupe vide', () => {
    const groups = groupByDomain(MANAGE_ENTRIES);
    const ids = groups.map((g) => g.domain);
    expect(ids).toEqual(DOMAIN_ORDER.filter((d) => MANAGE_ENTRIES.some((e) => e.domain === d)));
    for (const g of groups) expect(g.entries.length).toBeGreaterThan(0);
  });
  it('place Finances/Caisse/Impayés dans le domaine finance', () => {
    const fin = groupByDomain(MANAGE_ENTRIES).find((g) => g.domain === 'finance')!;
    expect(fin.entries.map((e) => e.route)).toEqual(
      expect.arrayContaining(['/(app)/manage/finance', '/(app)/manage/caisse', '/(app)/manage/unpaid']),
    );
  });
});
```

- [ ] **Step 2 — Vérifier l'échec** : `pnpm --filter "./apps/mobile" exec jest manage-hub` → FAIL (module introuvable).

- [ ] **Step 3 — Implémenter le helper** `apps/mobile/lib/manage-hub.ts` :
```ts
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type ManageDomain =
  | 'scolarite' | 'pedagogie' | 'vieEcole' | 'finance' | 'rh' | 'communication' | 'parametres';

export interface ManageEntry {
  route: string;
  title: string;
  subtitle: string;
  icon: IoniconName;
  color: string;
  domain: ManageDomain;
}

export const DOMAIN_ORDER: ManageDomain[] = [
  'scolarite', 'pedagogie', 'vieEcole', 'finance', 'rh', 'communication', 'parametres',
];

export const DOMAIN_LABELS: Record<ManageDomain, string> = {
  scolarite: 'Scolarité',
  pedagogie: 'Pédagogie',
  vieEcole: 'Vie école',
  finance: 'Finance',
  rh: 'RH',
  communication: 'Communication',
  parametres: 'Paramètres',
};

export const MANAGE_ENTRIES: ManageEntry[] = [
  { route: '/(app)/manage/directory',   title: 'Annuaire',      subtitle: 'Enseignants, parents, personnel',     icon: 'people-outline',          color: '#3b82f6', domain: 'scolarite' },
  { route: '/(app)/manage/classes',     title: 'Classes',       subtitle: 'Créer une classe, affecter un enseignant', icon: 'school-outline',     color: '#22c55e', domain: 'scolarite' },
  { route: '/(app)/manage/subjects',    title: 'Matières',      subtitle: 'Référentiel des matières',            icon: 'book-outline',            color: '#a78bfa', domain: 'scolarite' },
  { route: '/(app)/manage/observations',title: 'Observations',  subtitle: 'Saisie rapide du fil pédagogique',    icon: 'eye-outline',             color: '#671bf0', domain: 'pedagogie' },
  { route: '/(app)/manage/canteen',     title: 'Cantine',       subtitle: 'Menus de la semaine',                 icon: 'restaurant-outline',      color: '#f59e0b', domain: 'vieEcole' },
  { route: '/(app)/manage/activities',  title: 'Activités',     subtitle: 'Ateliers, sorties, éveil',            icon: 'color-palette-outline',   color: '#ec4899', domain: 'vieEcole' },
  { route: '/(app)/manage/discipline',  title: 'Discipline',    subtitle: 'Incidents & sanctions',               icon: 'warning-outline',         color: '#ef4444', domain: 'vieEcole' },
  { route: '/(app)/manage/transport',   title: 'Transport',     subtitle: 'Lignes de bus & chauffeurs',          icon: 'bus-outline',             color: '#f97316', domain: 'vieEcole' },
  { route: '/(app)/manage/health',      title: 'Santé',         subtitle: 'Dossiers médicaux (RGPD)',            icon: 'medkit-outline',          color: '#ef4444', domain: 'vieEcole' },
  { route: '/(app)/manage/security',    title: 'Sécurité',      subtitle: 'Incidents, visiteurs, exercices',     icon: 'shield-checkmark-outline',color: '#0ea5e9', domain: 'vieEcole' },
  { route: '/(app)/manage/finance',     title: 'Finances',      subtitle: 'Factures & paiements',                icon: 'card-outline',            color: '#14b8a6', domain: 'finance' },
  { route: '/(app)/manage/caisse',      title: 'Caisse',        subtitle: 'Caisse du jour & clôture',            icon: 'cash-outline',            color: '#02a896', domain: 'finance' },
  { route: '/(app)/manage/unpaid',      title: 'Impayés',       subtitle: 'Échéances non réglées & relances',    icon: 'alert-circle-outline',    color: '#ef4444', domain: 'finance' },
  { route: '/(app)/manage/hr',          title: 'RH — Contrats', subtitle: 'Contrats du personnel',               icon: 'briefcase-outline',       color: '#7c3aed', domain: 'rh' },
  { route: '/(app)/manage/appointments',title: 'Rendez-vous',   subtitle: 'Demandes des parents, confirmation',  icon: 'calendar-outline',        color: '#02a896', domain: 'communication' },
  { route: '/(app)/manage/announcements',title: 'Annonces',     subtitle: 'Communiquer avec parents & équipe',   icon: 'megaphone-outline',       color: '#0ea5e9', domain: 'communication' },
  { route: '/(app)/manage/settings',    title: 'Réglages',      subtitle: 'Établissement & couleurs',            icon: 'settings-outline',        color: '#64748b', domain: 'parametres' },
  { route: '/(app)/manage/imports',     title: 'Imports',       subtitle: 'Importer des données (CSV/Excel)',    icon: 'cloud-upload-outline',    color: '#0284c7', domain: 'parametres' },
];

export interface ManageGroup { domain: ManageDomain; label: string; entries: ManageEntry[]; }

/** Regroupe les entrées par domaine, dans l'ordre DOMAIN_ORDER, sans groupe vide. */
export function groupByDomain(entries: ManageEntry[]): ManageGroup[] {
  return DOMAIN_ORDER
    .map((domain) => ({ domain, label: DOMAIN_LABELS[domain], entries: entries.filter((e) => e.domain === domain) }))
    .filter((g) => g.entries.length > 0);
}
```

- [ ] **Step 4 — Vérifier le helper** : `pnpm --filter "./apps/mobile" exec jest manage-hub` (PASS) + `pnpm --filter "./apps/mobile" type-check` (OK).

- [ ] **Step 5 — Réécrire l'écran** `apps/mobile/app/(app)/manage/index.tsx` pour rendre des sections (en-tête de domaine + cartes), en réutilisant le style de carte existant. Importer depuis `@/lib/manage-hub` (`groupByDomain`, `MANAGE_ENTRIES`). Conserver le `Pressable`/carte identiques (icône en pastille `color + '18'`, titre, sous-titre, chevron). Ajouter un en-tête de section :
```tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';
import { groupByDomain, MANAGE_ENTRIES } from '@/lib/manage-hub';

export default function ManageHubScreen() {
  const groups = groupByDomain(MANAGE_ENTRIES);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper[50] }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ fontSize: 13, color: colors.ink[500], marginBottom: 12 }}>
        Gérez votre établissement directement depuis le mobile.
      </Text>
      {groups.map((group) => (
        <View key={group.domain} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.ink[300], marginBottom: 8 }}>
            {group.label}
          </Text>
          {group.entries.map((e) => (
            <Pressable
              key={e.route}
              onPress={() => router.push(e.route as never)}
              accessibilityRole="button"
              accessibilityLabel={e.title}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paper[100], padding: 16, marginBottom: 10 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: e.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={e.icon} size={22} color={e.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink[900] }}>{e.title}</Text>
                <Text style={{ fontSize: 12, color: colors.ink[500], marginTop: 2 }}>{e.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.ink[300]} />
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 6 — Vérifier** : `pnpm --filter "./apps/mobile" type-check` (OK).
- [ ] **Step 7 — Commit** : `git add apps/mobile/lib/manage-hub.ts apps/mobile/lib/__tests__/manage-hub.test.ts "apps/mobile/app/(app)/manage/index.tsx" && git commit -m "feat(mobile): group management hub by domain"`

---

## Task V — Vérif finale + PR
- [ ] `pnpm --filter @ecole-saas/web type-check` + `pnpm --filter "./apps/mobile" type-check` OK ; eslint web clean ; `jest manage-hub` PASS.
- [ ] Push + `gh pr create --base main`. CI verte (sans `--admin`) → merge → STOP.

## Self-Review
- Spec §5 (Dashboard Priority-first) : ToDoPanel en tête (W1+W2), données réelles (impayés + absences). RDV/bulletins différés (pas d'endpoint) — **noté**, panneau extensible via `items`.
- Spec §4.2 (hub mobile groupé) : M1 regroupe les 18 cartes par les domaines de la taxonomie validée.
- Pas de placeholder ; types cohérents (`ToDoItem`, `ManageEntry`/`ManageGroup`).
- Hors scope (différé) : re-layout complet KPIs/panels, carte « à traiter » sur le dashboard mobile, RDV/bulletins.
