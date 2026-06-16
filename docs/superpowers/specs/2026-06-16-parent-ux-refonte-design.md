# Design — Refonte UX PARENT (Vague 2)

> **Statut** : **complète** — 2.1 dashboard web · 2.2 dashboard mobile · 2.3 finance · 2.4 pédagogie ·
> 2.5 communication · 2.6 vie scolaire · 2.7 transverse + e2e parent. Vague 2 livrée (PR #203-214).
> **Programme** : refonte UX profonde par persona. **Vague 1 = shell SCHOOL_ADMIN** (livrée).
> **Vague 2 = persona PARENT** : faire hériter tous les écrans parent des patterns établis
> (gabarits `ListPage`/`DetailPage`/`FormPage`, états Skeleton/Empty/Error, priority-first,
> a11y WCAG AA + RTL), sans changer le branding V7 (verrouillé).
> **Plateformes** : web (`apps/web`, Next.js 14) + mobile (`apps/mobile` / `@klasso/ui-mobile`).
> **Fondations** : Phase 0 (tokens partagés, primitives) + Vague 1 (gabarits web `components/crud/*`).

---

## 1. Contexte & objectifs

Le persona **PARENT** dispose déjà de tous ses écrans (livrés PR #128-134 : dashboard, EDT,
notes, bulletins, paiements, absences, devoirs, journal, messagerie). Mais ces écrans sont
en **patterns legacy** : `fetch`+`useState` ad hoc, headers maison, états de
chargement/vide/erreur incohérents ou absents, actions non accessibles (emoji-boutons).

**Objectif :** appliquer le *shell* et les *gabarits* de la Vague 1 à la surface PARENT —
**cohérence, états, accessibilité, priority-first** — sans refonte métier ni nouveaux flux.
Chaque écran parent doit, à l'issue de la vague : utiliser `PageHeader`/`ScreenHeader`,
les états Skeleton/Empty/Error+retry, des actions accessibles (aria-label, focus visible),
le RTL arabe, et la hiérarchie priority-first quand pertinent.

**Critères de succès :**
- Tout écran parent passe par les primitives Phase 0 et (web) un gabarit `ListPage`/`DetailPage`.
- États Skeleton (chargement), Empty (informatif), Error+retry partout — plus d'erreur avalée.
- Boutons-icônes accessibles (aria-label), contraste ≥ 4.5:1, navigation clavier, RTL OK.
- Aucune régression fonctionnelle ; parité web/mobile sur les patterns ; scope tenant strict conservé.

## 2. Périmètre

**Dans la vague (refonte UX, breadth-first) :**
1. Dashboard parent (web 2.1 ✅ + mobile 2.2 ✅).
2. Finance — paiements/factures (web + mobile).
3. Pédagogie — notes/évaluations (consultation) + bulletins (téléchargement PDF).
4. Communication — messagerie 1:1, annonces, notifications.
5. Vie scolaire — absences/présences, EDT, devoirs/TAF.
6. Passe transverse a11y / RTL / responsive sur la surface parent.

**Hors vague (différé) :**
- **Paiement en ligne ClicToPay côté parent** (checkout des factures enfants) → branche
  dédiée `feat/billing-ui-clictopay` ; ici on pose seulement l'affordance « Payer en ligne
  (bientôt) » cohérente web/mobile, pas le flux de paiement.
- Refonte *métier* profonde (nouveaux champs/flux), autres personas, landing, dark mode mobile.

## 3. Décisions validées

| Sujet | Décision |
|---|---|
| Ordre | 2.3 **Finance d'abord** (suite directe du CTA paiement du dashboard 2.1/2.2). |
| Cadrage | **Spec Vague 2 d'abord** (ce document), puis exécution sous-PR par sous-PR. |
| Nature | **Refonte UX uniquement** : réutiliser gabarits/états ; pas de nouveau backend. |
| Paiement en ligne | **Hors scope** Vague 2 ; affordance « bientôt » seulement (cf. §2). |
| Détail facture | **Inclus en 2.3** (web) : ligne → route `/payments/[id]` rendue avec **DetailPage**
  (onglets Infos = lignes, Historique = paiements). Alimenté par `my-invoices` (renvoie déjà
  `items`+`payments`) → **aucun backend**. Mobile : liste seule (pas de detail). |
| Patterns | Web : `PageHeader` + `KpiCard` + `ResourceListPage`/`DetailPage` + chips de statut
  normalisés. Mobile : `ScreenHeader` + `Skeleton`/`EmptyState`/`ErrorState` + cartes tokenisées. |

## 4. État actuel de la surface PARENT (audit)

| Domaine | Web | Mobile | État actuel |
|---|---|---|---|
| Dashboard | `(app)/dashboard` ✅ refait (2.1) | `(app)/dashboard.tsx` ✅ refait (2.2) | **modernisé** |
| Finance | `(app)/payments/page.tsx` | `(app)/parent/payments.tsx` | legacy (web), partiel (mobile) |
| Notes/Évals | `(app)/evaluations/page.tsx` | (pas encore parent) | ad hoc, pas d'états |
| Bulletins | `(app)/bulletins/page.tsx` | `(app)/parent/bulletin/` | ad hoc (parent = download) |
| Messagerie | `(app)/messages/page.tsx` → `MessagesList` | `(app)/parent/messages/` | TanStack, états à vérifier |
| Annonces | `(app)/announcements/page.tsx` | via notifications | ad hoc, pas d'états |
| Notifications | `NotificationBell` | `(app)/notifications.tsx` | ad hoc |
| Absences | `(app)/absences/page.tsx` (`ParentAbsencesView`) | via parent/observations | ad hoc |
| EDT | `(app)/schedule/page.tsx` | `(app)/parent/schedule.tsx` (`ScheduleGrid`) | ad hoc + `ActivityIndicator` |
| Devoirs/TAF | `(app)/homework/page.tsx` → `HomeworkClient` | `(app)/parent/homework.tsx` | ad hoc + `ActivityIndicator` |

## 5. Composants réutilisés (Phase 0 + Vague 1)

**Web :** `components/ui/page-header.tsx` (`PageHeader`), `skeleton.tsx`/`table-skeleton.tsx`,
`empty-state.tsx` (`EmptyState`), `error-retry.tsx` (`ErrorRetry`), `confirm-dialog.tsx`
(`ConfirmDialog`), `components/crud/resource-list-page.tsx` (`ResourceListPage` —
`isLoading/isError/isEmpty/onRetry/emptyIcon`), `components/crud/detail-page.tsx`
(`DetailPage` — `tabs/panels`), `components/dashboard/kpi-card.tsx` (`KpiCard`),
`components/dashboard/to-do-panel.tsx` + `lib/dashboard/to-do-items.ts` (`buildToDoItems`),
`components/app-shell/command-palette.tsx` (entité + actions).

**Mobile (`@klasso/ui-mobile`) :** `Skeleton`, `EmptyState`, `ErrorState`, `ScreenHeader`,
`Card`, `Button`, `KpiCard`, `Picker`, `ScheduleGrid`, `FormSheet`/`FormField`, `ConfirmDialog`.

**Tokens partagés :** `@ecole-saas/shared/design-tokens` (contrat web↔mobile, garde-fou test).

## 6. Découpage en sous-PR (Vague 2)

- **2.1 — Dashboard parent web** ✅ (PR #203) : `ToDoPanel` priority-first + `buildToDoItems`.
- **2.2 — Dashboard parent mobile** ✅ (PR #204) : priority-first + Skeleton/EmptyState.
- **2.3 — Finance (paiements/factures)** ← *prochain* : refonte web + mobile (cf. §7).
- **2.4 — Pédagogie** : notes/évaluations (consultation parent) + bulletins (download) sous
  états + (web) `ListPage`/`DetailPage`.
- **2.5 — Communication** : messagerie (états liste/conversation), annonces (liste + états),
  notifications (états + a11y).
- **2.6 — Vie scolaire** : absences (liste + états), EDT (`ScheduleGrid` + Skeleton),
  devoirs/TAF (liste + statut de rendu + états).
- **2.7 — Passe transverse** : a11y WCAG AA + RTL arabe + responsive sur tous les écrans parent ;
  e2e parent (Playwright web).

Chaque sous-PR : type-check + lint + tests verts → CI verte → merge ; **STOP** entre sous-PR
(récap). Worktree isolé branché sur `origin/main`.

## 7. Détail du sous-PR 2.3 — Finance (paiements/factures)

### 7.1 Web — `app/[locale]/(app)/payments/page.tsx`
- Remplacer `<header>`/`<h1>` maison par **`PageHeader`** (titre + description selon rôle).
- KPIs : remplacer les 3 cartes brutes par **`KpiCard`** (variants `success`/`warn`/`danger`).
- Liste : envelopper dans **`ResourceListPage`** avec `isLoading` (Skeleton table),
  `isError`+`onRetry` (plus d'erreur avalée — exposer l'échec du `fetch`), `isEmpty`
  (`EmptyState`, `emptyIcon` facture). Conserver le filtre statut (chip/`<select>` accessible).
- Statut : extraire un **`InvoiceStatusBadge`** (libellé + ton) réutilisable (web), aligné mobile.
- Action PDF : remplacer l'emoji 📄 par un **bouton-icône accessible** (icône lucide `FileDown`,
  `aria-label` déjà présent, focus visible).
- Affordance « Payer en ligne (bientôt) » : bouton **désactivé** sur factures `PENDING`/`OVERDUE`
  (cohérent mobile), sans flux de paiement.
- **`DetailPage`** facture (inclus) : nouvelle route `app/[locale]/(app)/payments/[id]/page.tsx`,
  ouverte au clic de ligne. Onglets **Infos** (lignes `items[]` + totaux) et **Historique**
  (`payments[]` : date, méthode, montant ; `EmptyState` si aucun règlement). Données issues de
  `my-invoices` (filtre par id côté client, scope parent appliqué serveur) → **aucun backend**.

### 7.2 Mobile — `app/(app)/parent/payments.tsx`
- Chargement : `ActivityIndicator` → **`Skeleton`** (placeholders de cartes).
- Erreur : `<Text>` brut → **`ErrorState`** (message + retry, refetch `useMyInvoices`).
- Garder `EmptyState` ; tokeniser la bannière « Solde à régler » (couleurs `colors`/`status`).
- Statut : badge cohérent avec le web (réutiliser `statusLabel`/couleurs centralisées).
- Conserver la note « paiement en ligne bientôt » comme affordance cohérente.

### 7.3 DRY (optionnel, contenu)
- Possibilité de centraliser libellés/tons de statut facture dans `@ecole-saas/shared`
  (consommé web + mobile). **Différé** par défaut (changement `shared` = maj tous consumers) ;
  sinon helper local par plateforme. À confirmer au plan 2.3.

## 8. Tests

- **Web** : Vitest — `InvoiceStatusBadge` (libellé/ton par statut), `computeParentStats`
  (extraction + cas vides), rendu des états (loading/empty/error) du gabarit. Playwright e2e
  (différé en 2.7) : parent voit ses factures, filtre, télécharge un PDF.
- **Mobile** : Jests/logique — mapping statut, calcul « solde à régler ». Composants ui-mobile.
- **Garde-fous** : scope tenant strict (parent ne voit que `my-invoices`), pas de régression
  d'isolation. Couverture ≥ 70 % sur le code applicatif touché.

## 9. Risques & mitigations

- **Facturation/paiement = checkpoint CLAUDE.md** → 2.3 ne touche **pas** au paiement réel ;
  refonte UI seule ; toute évolution du flux ClicToPay reste sur sa branche dédiée + validation.
- **Surface large** → découpage strict (un domaine par sous-PR), réutilisation maximale des gabarits.
- **Vitest local bloqué (WDAC)** → vérifier en CI ; type-check + eslint en local.
- **RTL** → vérifier l'arabe sur chaque écran refait ; reload requis pour le flip mobile (Phase 0).
- **Worktree concurrent** → rester en worktree isolé branché sur `origin/main`.

## 10. Hors scope / différé

Paiement en ligne ClicToPay parent (branche dédiée), refonte métier profonde, autres personas,
landing, dark mode mobile, DetailPage facture **mobile** (web seulement en 2.3).
