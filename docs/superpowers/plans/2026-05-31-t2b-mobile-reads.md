# T2b — Lectures mobiles (Journal · Activités · Cantine) — Plan

> **Spec :** `docs/superpowers/specs/2026-05-29-t2b-operational-modules-design.md` §5.4 + §10.
> **Branche :** `feat/t2b-mobile-reads`. **Aucune migration / aucun changement backend** (API déjà livrée).
> **Gabarit :** écrans Expo existants (`app/(app)/messages.tsx`, `notifications.tsx`) + `lib/api/notifications.ts`.

---

## 1. Objectif

Combler le **seul critère T2b §10 non rempli** : exposer en **lecture mobile** les domaines à forte valeur
terrain — **cahier de liaison (journal), activités, menu cantine** — scopés par rôle :
- **PARENT** : journal + activités + menu cantine (données scopées à ses enfants côté serveur).
- **TEACHER** : journal + activités (pas d'accès cantine, conforme RBAC §4.8).

Lecture seule, **aucun CRUD admin mobile** (hors périmètre T2b). Le backend (RBAC + scoping parent) est déjà en place.

---

## 2. Intégration navigation

Un **seul onglet hub `life`** (« Vie scolaire ») ajouté à `PARENT_TABS` et `TEACHER_TABS` dans
`apps/mobile/lib/tabs.ts` — évite de saturer la tab bar (max constaté = 6). Le hub porte un **segmented
control** dont les segments dépendent du rôle :
- PARENT → `Journal · Activités · Cantine`
- TEACHER → `Journal · Activités`

(Les autres rôles ne déclarent pas l'onglet → écran masqué, comme `messages` l'est pour l'admin.)

---

## 3. Tâches

### Task 1 — Client API mobile
`apps/mobile/lib/api/school-life.ts` : types alignés sur les DTOs backend (`DailyLogEntry`, `Activity`,
`CanteenMenu`) + 3 hooks TanStack Query (`useJournal`, `useActivities`, `useCanteenMenus`) via `fetchApi`
(`GET /api/journal`, `/api/activities`, `/api/canteen-menus`). Clés de requête namespacées.

### Task 2 — Sections (lecture)
`apps/mobile/components/school-life/{journal,activities,canteen}-section.tsx` : chacune consomme son hook,
gère **loading (CardSkeleton) / empty (EmptyView) / error (ErrorView + retry)**, rend une liste de cartes
(date, contenu). Libellés FR ; humeur (mood) et catégorie mappées en libellés/emoji. Pas de scroll imbriqué
(rendu `.map` dans le ScrollView du hub).

### Task 3 — Écran hub
`apps/mobile/app/(app)/life.tsx` : segmented control role-aware + en-tête adapté au type d'établissement
(KG « Cahier de liaison » vs primaire « Vie scolaire »), rend la section active.

### Task 4 — Onglet
`apps/mobile/lib/tabs.ts` : ajouter `{ name: 'life', label: 'Vie scolaire' }` à PARENT_TABS et TEACHER_TABS.

### Task 5 — Gate + PR
`pnpm --filter @klasso/mobile type-check` (+ lint) vert ; push ; PR vers `main` ; CI verte → merge auto.

---

## 4. Hors-périmètre
CRUD admin mobile, santé/discipline/sécurité/transport sur mobile (web-only en T2b), notifications,
pièces jointes. Aucune modif backend / migration / CI / `package.json` racine.

## 5. Critères d'acceptation
- [ ] Onglet « Vie scolaire » visible pour PARENT et TEACHER uniquement.
- [ ] Journal / Activités / (Cantine pour parent) en lecture, données réelles serveur, scopées par rôle.
- [ ] États loading/empty/error+retry sur chaque section ; aucun contenu codé en dur.
- [ ] `type-check` mobile vert ; CI verte → merge auto.
