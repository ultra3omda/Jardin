# Design — Refonte UX TEACHER (Vague 3)

> **Statut** : validé (cadrage 2026-06-16) — prêt pour exécution sous-PR par sous-PR.
> **Programme** : refonte UX profonde par persona. **Vague 3 = persona TEACHER** : appliquer les
> patterns Vague 1 (PageHeader/ScreenHeader, Skeleton/EmptyState/ErrorState, badges réutilisables)
> aux écrans **spécifiques enseignant** encore legacy.
> **Plateformes** : web (`apps/web`) + mobile (`apps/mobile` / `@klasso/ui-mobile`).
> **Fondations** : Phase 0 + Vague 1 (gabarits) + Vague 2 (primitives, badges, helpers).

---

## 1. Contexte & constat

Beaucoup d'écrans enseignant ont **déjà été modernisés en Vague 2** (écrans partagés) :
nav shell, `notes` (branche staff→classes), `schedule` (vue « mon EDT »), `homework-client` (web),
`announcements`, `messages`, dashboard shell. La Vague 3 est donc **ciblée et plus courte** : seuls
les écrans **spécifiques enseignant** restés legacy/partiels sont concernés.

**Objectif :** que la **saisie pédagogique** (cœur du métier enseignant) et les écrans de gestion
hérités passent sous les états/gabarits standard — sans refonte métier ni backend.

## 2. Périmètre (écrans encore legacy/partiel, par domaine)

| Domaine | Web | Mobile |
|---|---|---|
| Pédagogie — saisie notes/évals | `evaluations/page.tsx` (legacy), `classes/[id]/grades/grades-client.tsx` (pas de primitives) | `pedagogy/evaluations/{index,[id],new}` (ActivityIndicator) |
| Présences — saisie | `absences` `StaffAbsencesView` (legacy) | (à confirmer) |
| Devoirs — création/édition | reste teacher-actions `homework-client` | `pedagogy/homework/{index,[id],new}` |
| Dashboard enseignant | branche TEACHER (à confirmer) | idem |

**Hors vague** : refonte métier profonde, autres personas, landing.

## 3. Décisions validées (cadrage)
- Démarrage par **3.1 Pédagogie web** (cœur métier, plus legacy).
- **Spec Vague 3 d'abord** (ce document), puis exécution sous-PR par sous-PR.
- **Refonte UX uniquement** : réutiliser primitives/gabarits ; logique CRUD/mutations inchangée.

## 4. Découpage en sous-PR (Vague 3)
- **3.1 — Pédagogie web** : `evaluations/page.tsx` + `classes/[id]/grades/grades-client.tsx`
  (PageHeader + Skeleton/EmptyState/ErrorRetry, erreurs surfacées) + helper testé `parseScoreInput`.
- **3.2 — Pédagogie mobile** : `pedagogy/evaluations/*` (Skeleton/ErrorState) ; confirmer `pedagogy/index` (teacher).
- **3.3 — Présences (saisie)** : `StaffAbsencesView` web (réutilise `AttendanceStatusBadge`) ; mobile si présent.
- **3.4 — Devoirs management** : teacher-actions web + `pedagogy/homework/*` mobile.
- **3.5 — Dashboard enseignant + transverse** : confirmer/polir le dashboard teacher ; a11y/RTL ; **e2e teacher**. Clôt la vague.

Chaque sous-PR : type-check + lint + tests verts → CI verte → merge ; **STOP** entre sous-PR.
Worktree isolé branché sur `origin/main` ; install `--frozen-lockfile`.

## 5. Composants/primitives réutilisés
Web : `PageHeader`, `TableSkeleton`/`Skeleton`, `EmptyState`, `ErrorRetry`, `ConfirmDialog`,
`AttendanceStatusBadge` (V2). Mobile : `ScreenHeader`, `Skeleton`, `ErrorState`, `EmptyState`.

## 6. Tests
Web : Vitest (helpers purs : `parseScoreInput`, …). e2e Playwright teacher (3.5, login persona
« Enseignant »). Mobile : présentationnel (type-check) + helpers si pertinents.

## 7. Risques & mitigations
- **Saisie de notes = sensible** → 3.1 ne touche PAS la logique de mutation/validation serveur ;
  refonte UI + helper de parsing client seulement. Période clôturée (`isClosed`) respectée.
- **Surface partagée déjà modernisée** → ne pas re-toucher les écrans V2 ; cibler le teacher-only.
- **Quota Actions / Docker flaky / install non-gelée** → leçons V2 appliquées (frozen install, re-run).

## 8. Hors scope / différé
Refonte métier (moyennes, statistiques avancées), `FormPage` gabarit sur les modals CRUD (gardés
en l'état), autres personas, QA RTL visuelle approfondie.
