# Design — Refonte SCHOOL_ADMIN : shell + patterns transverses (Vague 1)

> **Statut** : validé (brainstorming 2026-06-15) — prêt pour le plan d'implémentation.
> **Programme** : refonte UX profonde par persona. Vague 1 = le *shell* back-office partagé
> qui élève tous les écrans SCHOOL_ADMIN. S'appuie sur les fondations **Phase 0**
> (design system V7 « Médina », tokens partagés `@ecole-saas/shared/design-tokens`,
> composants standard `PageHeader`/`ConfirmDialog`/`Skeleton`/`EmptyState`/`ErrorState`,
> audit RTL ui-mobile).
> **Plateformes** : web (`apps/web`, Next.js 14) + mobile (`apps/mobile`/`@klasso/ui-mobile`, Expo).

---

## 1. Contexte & objectifs

Le persona **SCHOOL_ADMIN** (directeur d'établissement) couvre des dizaines d'écrans
répartis en ~9 domaines (web) et un hub de gestion à 17 cartes (mobile). L'audit a
relevé : navigation chargée (Finance ≈ 10 entrées à plat), pas de recherche globale,
états incohérents, pas d'actions groupées, gabarits dupliqués, titres/headers qui
dérivent, a11y partielle, RTL mobile incomplet.

**Objectif (moteur « équilibré ») :** repenser le *shell* sur trois axes simultanés —
**information architecture**, **productivité** et **cohérence/états** — pour que chaque
écran SCHOOL_ADMIN hérite d'une base solide, et que les vagues *module* suivantes soient
rapides. Branding V7 **verrouillé** (aucun changement d'identité).

**Critères de succès :**
- Toute liste/détail/formulaire passe par un gabarit unique avec états Skeleton/Empty/Error et confirmations destructives.
- Recherche globale (Cmd+K) disponible partout ; navigation à ≤ 2 niveaux.
- Actions groupées + filtres/tri/export normalisés sur les listes.
- WCAG 2.1 AA sur le shell ; RTL (arabe) fonctionnel sur le shell web et mobile.
- Aucune régression fonctionnelle ; parité web/mobile sur l'IA.

## 2. Périmètre

**Dans la vague (le shell + transverse, breadth-first) :**
1. Navigation & IA (web sidebar/topbar + mobile tab bar/hub de gestion).
2. Dashboard admin (web + mobile).
3. Gabarits `ListPage` / `DetailPage` / `FormPage` + états, appliqués aux écrans existants.
4. Couche productivité : Cmd+K, actions groupées (bulk), filtres/tri/export.
5. Passe transverse a11y WCAG AA + RTL + responsive sur le shell.

**Hors vague (vagues ultérieures) :** refonte métier *profonde* de chaque module
(logique, nouveaux champs, nouveaux flux), autres personas, refonte de la landing.

## 3. Décisions validées (brainstorming)

| Bloc | Décision |
|---|---|
| Navigation | **B — Deux niveaux** : colonne de domaines (niveau 1) → entrées du domaine (niveau 2). |
| Taxonomie | Accueil · Scolarité · Pédagogie · Vie école · Finance · RH · Communication · Paramètres · Compte. Périodes & Matières → **Paramètres**. Finance regroupée (6 entrées). |
| Dashboard | **Priority-first** : « À traiter aujourd'hui » proéminent, KPIs compacts dessous, activité en bas. |
| Détail | **Onglets** (Infos · Notes · Présences…). |
| Listes | **Tableau** (desktop) + bascule **cartes** (mobile). |
| Formulaires longs | **Page sectionnée** (pas d'assistant multi-étapes). |
| Cmd+K | Portée **(c)** : navigation + recherche d'entités + actions rapides. |
| Productivité | Actions groupées (bulk) + filtres/tri/export normalisés (mémorisés par écran). |

## 4. Bloc 1 — Navigation & IA

### 4.1 Web (`apps/web`)
- **Sidebar deux niveaux** (navy V7) : rail de **domaines** (niveau 1, icône + label) ;
  sélection d'un domaine → liste de ses **entrées** (niveau 2) en colonne contextuelle.
  Le domaine actif est mis en avant (accent teal/corail selon white-label).
- **Source de l'IA** : refondre `lib/nav/menu.ts` (`getNavForUser`) pour produire la
  taxonomie domaines→entrées (au lieu de sections plates), avec adaptation
  `tenant.type` (kindergarten/primary/mixed) conservée et affinée. Les composants
  `components/app-shell/sidebar.tsx` consomment la nouvelle forme.
- **Topbar** : entrée **Cmd+K** (champ/raccourci, remplace le placeholder de recherche
  actuel), cloche de notifications avec compteur accessible, `UserPill`.
- **Détection d'actif** : corriger le faux positif `startsWith` (matcher le segment exact).
- **RTL** : sidebar et colonnes en logique `start/end` ; `dir` déjà géré par next-intl.
- **Responsive** : drawer mobile-web (le rail+colonne devient un drawer empilé).

### 4.2 Mobile (`apps/mobile`)
- **Tab bar** : inchangée dans son principe (par persona) — `getTabsForRole`.
- **Hub de gestion** (`manage/index.tsx`) : remplacer les **17 cartes à plat** par des
  **sections groupées par domaine** (mêmes domaines que le web), avec en-têtes de section
  et cartes regroupées. Recherche locale dans le hub.
- Réutilise les tokens V7 + audit RTL Phase 0.

## 5. Bloc 2 — Dashboard admin (Priority-first)

- **« À traiter aujourd'hui »** (proéminent, en haut) : cartes d'action avec compteur +
  CTA — impayés à relancer, absences non justifiées, demandes de RDV en attente,
  bulletins à valider (selon période). Chaque item navigue vers la liste filtrée.
- **Bande KPIs compacte** (sous le panneau) : adaptative `tenant.type` — élèves, taux de
  présence, impayés (montant TND), moyenne générale / nb classes. Réutilise `KpiCard`.
- **Activité** (bas) : annonces récentes + derniers événements/calendrier.
- **Actions rapides** : créer élève, encaisser, nouvelle annonce (raccordées à Cmd+K).
- Web : refondre `app/[locale]/(app)/dashboard` + `lib/dashboard/config.ts`.
  Mobile : `app/(app)/dashboard.tsx` (même hiérarchie Priority-first).
- États : Skeleton (chargement), Empty (école vide / pas d'items à traiter), Error+retry.

## 6. Bloc 3 — Gabarits d'écran

> Tous les gabarits utilisent les primitives Phase 0 (`PageHeader`, `Skeleton`,
> `EmptyState`, `ErrorState`/`ErrorRetry`, `ConfirmDialog`).

### 6.1 `ListPage` (web : étendre `components/crud/resource-list-page.tsx`)
- `PageHeader` (titre + description + CTA primaire) → **barre d'outils** (recherche,
  filtres, tri) → **table** (`TanStack Table`) avec **sélection multiple** → **pagination**.
- Bascule **cartes** en mobile-web (breakpoint). États intégrés. Icône d'empty contextuelle
  (prop `emptyIcon` déjà ajoutée en Phase 0).
- Mobile (`@klasso/ui-mobile`) : équivalent liste (FlatList) + états + recherche + FAB.

### 6.2 `DetailPage` (nouveau gabarit)
- `PageHeader` (retour + titre + actions éditer/supprimer via `ConfirmDialog`) →
  **carte identité** → **onglets** (Infos, et selon l'entité : Notes, Présences, …) → contenu.
- Web : nouveau `components/crud/detail-page.tsx`. Mobile : `DetailScreen` patterné.

### 6.3 `FormPage` (nouveau gabarit)
- **Sections** claires (libellés de section), **validation inline** sous chaque champ
  (Zod + react-hook-form), **footer d'actions collant** (Annuler / Enregistrer), **garde
  anti-perte** (`ConfirmDialog` si modifications non enregistrées à la sortie).
- Web : nouveau `components/crud/form-page.tsx`. Mobile : `FormSheet`/`FormField` étendus.

## 7. Bloc 4 — Productivité

### 7.1 Recherche globale Cmd+K (portée c)
- Palette (overlay) ouverte par `Cmd/Ctrl+K` (et bouton topbar). Trois groupes :
  **Entités** (recherche élèves, classes, factures… via endpoints existants, debouncée),
  **Aller à** (toutes les pages de la nav scopées au rôle), **Actions** (créer élève,
  encaisser, nouvelle annonce…). Navigation clavier complète, ARIA `combobox`/`listbox`.
- Web : nouveau `components/app-shell/command-palette.tsx` + hook raccourci.
  Mobile : recherche d'entités via la barre du hub (pas de raccourci clavier natif).

### 7.2 Actions groupées (bulk)
- Sélection multiple dans `ListPage` → **barre d'actions** contextuelle (export, affecter,
  supprimer en masse avec `ConfirmDialog` récapitulant le nombre). Immutable, optimiste où sûr.

### 7.3 Filtres / tri / export
- **Chips de filtres actifs** retirables, panneau de filtres par écran, tri par colonne,
  **export** CSV / Excel / PDF (réutilise l'infra d'export existante). État de filtre/tri
  **mémorisé par écran** (URL querystring web ; store mobile).

## 8. Transverse — a11y / RTL / responsive

- **WCAG 2.1 AA** : `aria-label` sur boutons-icônes, labels d'inputs, focus visible
  (`ring-ring`), ordre de tabulation = ordre visuel, statut ≠ couleur seule,
  `role="alert"`/`aria-live` sur erreurs (déjà dans `ErrorRetry`/`ErrorState`).
- **RTL** : shell web (`dir` + logique start/end) ; shell mobile (props logiques Phase 0 +
  sélecteur de langue Phase 0). Vérifier sidebar, topbar, gabarits, palette.
- **Responsive** : 375 / 768 / 1024 / 1440 ; pas de scroll horizontal.

## 9. Inventaire des composants

**Web — nouveaux :** `command-palette.tsx`, `detail-page.tsx`, `form-page.tsx`,
`bulk-action-bar.tsx`, `filter-bar.tsx` (+ hooks recherche/raccourci/filtres-URL).
**Web — modifiés :** `lib/nav/menu.ts`, `components/app-shell/sidebar.tsx`,
`components/app-shell/topbar.tsx`, `components/crud/resource-list-page.tsx`,
`app/[locale]/(app)/dashboard/*`, `lib/dashboard/config.ts`.
**Mobile — nouveaux :** gabarits liste/détail/form patternés, recherche hub.
**Mobile — modifiés :** `app/(app)/manage/index.tsx` (hub groupé), `app/(app)/dashboard.tsx`,
`lib/tabs.ts` si besoin. Réutilise `@klasso/ui-mobile` (+ `Skeleton`/`ErrorState` Phase 0).

## 10. Découpage en sous-PR (Vague 1)

- **PR 1.1 — Navigation web + Cmd+K** : `menu.ts` (taxonomie domaines→entrées), sidebar
  deux niveaux, topbar + `command-palette` (portée c), détection d'actif. Tests + a11y.
- **PR 1.2 — Dashboard + hub mobile** : dashboard Priority-first (web + mobile) ; hub
  mobile groupé par domaine. Tests + états.
- **PR 1.3 — Gabarits** : `ListPage` étendu + `DetailPage` + `FormPage` (web) et
  équivalents mobile ; migration de 2-3 écrans de référence par gabarit. Tests.
- **PR 1.4 — Productivité + passe transverse** : bulk actions, `filter-bar`, export,
  filtres mémorisés ; passe a11y/RTL/responsive sur le shell. Tests + e2e.

Chaque sous-PR : type-check + lint + tests verts, CI verte → merge, **STOP** entre sous-PR
(récap). Worktree isolé conservé (process concurrent actif sur le repo).

## 11. Tests

- **Web** : Vitest (unitaire composants + hooks : palette, filtres, bulk, gabarits),
  Playwright e2e (navigation, recherche Cmd+K, bulk delete avec confirm, filtres/export).
- **Mobile** : Jest (logique : taxonomie hub, filtres, recherche), composants ui-mobile.
- **Garde-fous** : a11y (rôles/labels), pas de régression sur l'isolation multi-tenant
  (les listes restent scopées tenant). Couverture ≥ 70 % sur le code applicatif.

## 12. Risques & mitigations

- **Surface large** → découpage strict en 4 sous-PR, breadth-first, migration progressive
  des écrans (le gabarit accepte l'ancien usage le temps de la bascule).
- **Process concurrent sur le repo** → rester en **worktree isolé** ; brancher depuis
  `origin/main` à chaque sous-PR ; ne jamais committer hors worktree.
- **Vitest local bloqué (WDAC)** → vérifier en CI (déjà validé en Phase 0) ; type-check +
  eslint en local.
- **Cmd+K recherche d'entités** → réutiliser endpoints existants, debounce + pagination,
  scope tenant strict (sécurité).
- **RTL** → tester l'arabe sur le shell ; reload requis pour le flip mobile (documenté Phase 0).

## 13. Hors scope / différé

Refonte métier profonde des modules (au-delà du gabarit), nouveaux champs/flux, autres
personas, landing, dark mode mobile, `expo-updates` pour reload RTL automatique.
