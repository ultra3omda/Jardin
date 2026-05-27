# Plan V8 — Clôture de la phase de développement

**Date** : 2026-05-27  
**Branche** : `feat/v8-dev-closure`  
**Objectif** : Finaliser toutes les fonctionnalités manquantes pour une sortie production.

---

## État actuel (audit V8)

| Axe | Fait | Manquant |
|-----|------|----------|
| API Backend | 15 modules, 20 modèles Prisma | Finance (billing), Notifications, tests classes/users |
| Web Back-office | Dashboard, élèves, classes, messages, branding, admin | Matières, Trimestres, Relations parents, Invite tokens, Finance, Notifications bell |
| Mobile | Login, school-code, dashboard, students, messages (mock), pedagogy (mock), profile | API réelle sur messages + pedagogy, écran Classes, Bulletin viewer, Notifications push, 0 tests |
| Tests | 15 spec API, 7 web | 0 mobile, 0 spec classes/users API |
| Production | CI/CD Vercel opérationnel | Error boundaries, Empty states, Skeletons, Rate-limit review |

---

## Axe A — Intégration API mobile (4 tâches)

### A1 · Hooks API mobile (TanStack Query)
**Fichiers à créer** :
- `apps/mobile/lib/api/messaging.ts` — `useConversations()`, `useConversation(id)`, `useSendMessage()`
- `apps/mobile/lib/api/evaluations.ts` — `useMyGrades()`, `useClassEvaluations(classId)`, `useAdminPerf()`
- `apps/mobile/lib/api/classes.ts` — `useMyClasses()` (teacher), `useClassDetail(id)`

Chaque hook : TanStack Query v5 + `useAuthStore` (token) + base URL depuis env.

### A2 · Messages.tsx → vraie API
- Remplacer les arrays THREADS_* statiques par `useConversations()`
- Skeleton loading state (4 lignes grises)
- Error state avec retry
- Vider le "coming soon" block

### A3 · Pedagogy.tsx → vraie API
- `TeacherView` : `useMyClasses()` → vraies classes et moyennes
- `ParentView` : `useMyGrades()` → vraies notes par enfant
- `AdminView` : `useAdminPerf()` → vraies stats de classe
- KG flag depuis tenant.type

### A4 · Deux nouveaux écrans mobile
- `apps/mobile/app/(app)/classes.tsx` — liste des classes du prof + bouton "Saisir notes" (ouvre web)
- `apps/mobile/app/(app)/bulletin/[id].tsx` — viewer bulletin PDF (WebView)
- Ajouter liens dans dashboard.tsx et navigation

---

## Axe B — Pages web manquantes (4 tâches)

### B1 · Page `/settings/subjects` (Matières)
- Table : Nom, Couleur/Emoji, Actions
- Modal Create/Edit avec `POST /subjects`, `PATCH /subjects/:id`
- Delete avec confirmation
- Design : V7 navy+ambre, cohérent avec `/settings/branding`

### B2 · Page `/settings/grade-periods` (Trimestres)
- Table : Nom, Date début/fin, Statut (ouvert/fermé), Actions
- Modal Create avec `POST /grade-periods`
- Bouton "Clôturer" → `POST /grade-periods/:id/close`
- Badge statut coloré

### B3 · Relations parents dans `/students/[id]`
- Onglet "Parents" dans la fiche élève
- Liste des parents liés avec `GET /parent-relations?studentId=`
- Bouton "Lier un parent" → recherche user par email → `POST /parent-relations`
- Bouton "Délier" → `DELETE /parent-relations/:id`

### B4 · Page `/admin/invite-tokens`
- Table : Email, Rôle, Expiré le, Statut (utilisé/actif/expiré)
- Bouton "Créer invitation" → formulaire email + rôle
- Bouton "Révoquer" → `DELETE /admin/invite-tokens/:id`

---

## Axe C — Module Finance / Facturation (4 tâches)

### C1 · Prisma : modèles Finance
Nouveaux modèles : Invoice, InvoiceItem, Payment, enum InvoiceStatus
Migration : `20260527000000_v8_finance`

### C2 · API module `billing`
- `GET /billing/invoices` (list, filtres status/student)
- `POST /billing/invoices` (create)
- `GET /billing/invoices/:id` (detail + items + payments)
- `PATCH /billing/invoices/:id` (update)
- `POST /billing/invoices/:id/payments` (enregistrer paiement)
- `DELETE /billing/invoices/:id` (soft delete)
- Guard : SCHOOL_ADMIN seulement
- Tests : `billing.service.spec.ts`

### C3 · Web proxies
- `app/api/billing/[...action]/route.ts`

### C4 · Page web `/billing`
- KPI cards (Total facturé, Encaissé, En attente, En retard)
- Table des factures avec filtres + pagination
- Modal "Nouvelle facture" + Modal "Enregistrer paiement"
- Badge statut coloré

---

## Axe D — Notifications (3 tâches)

### D1 · Prisma : modèle Notification
Modèle Notification avec type enum (MESSAGE, GRADE, ATTENDANCE, INVOICE, ANNOUNCEMENT, SYSTEM)

### D2 · API module `notifications`
- `GET /notifications` (mes notifs, paginées)
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- Fanout automatique via hooks Prisma
- Tests : `notifications.service.spec.ts`

### D3 · Bell web + mobile
- **Web** : Bell dans layout avec badge + dropdown
- **Mobile** : `apps/mobile/app/(app)/notifications.tsx` + badge TabBar

---

## Axe E — Tests (4 tâches)

### E1 · `classes.service.spec.ts`
- CRUD + addTeacher/removeTeacher + createTimeslot
- Test isolation multi-tenant

### E2 · `users.service.spec.ts`
- getMe, updateMe, changePassword, listSessions, deleteAccount

### E3 · Mobile tests (Jest)
- `lib/auth/__tests__/store.test.ts` — setSession, clear
- `lib/auth/__tests__/secure-storage.test.ts` — mock SecureStore
- `lib/tenant/__tests__/store.test.ts`

### E4 · Web E2E Playwright
- `e2e/billing.spec.ts` — create invoice → pay → PAID
- `e2e/settings.spec.ts` — create subject → create grade period
- `e2e/messaging.spec.ts` — send message → appears in list

---

## Axe F — Hardening production (3 tâches)

### F1 · Error boundaries + empty states
- `apps/web/components/error-boundary.tsx`
- `apps/web/components/ui/empty-state.tsx`
- Mobile : `ErrorView` + `EmptyView` components

### F2 · Loading skeletons
- `table-skeleton.tsx`, `kpi-skeleton.tsx`
- Appliquer sur toutes les pages avec data fetching

### F3 · Config production
- Rate limiting vérification
- CORS whitelist domaines
- Helmet headers CSP/HSTS
- Mobile app.json : version → 1.0.0

---

## Ordre d'exécution

```
Phase 1 (parallèle) : C1 (Prisma Finance) + D1 (Prisma Notifs) + E1 (test classes) + E2 (test users)
Phase 2 (parallèle) : C2 (API billing) + D2 (API notifs) + A1 (hooks mobile)
Phase 3 (parallèle) : A2+A3 (mobile API) + B1+B2 (web settings pages)
Phase 4 (parallèle) : C3+C4 (billing web) + D3 (notif bell) + A4 (classes mobile)
Phase 5 (parallèle) : B3+B4 (relations/invites) + E3 (mobile tests) + E4 (web E2E)
Phase 6 (séquentiel): F1 → F2 → F3 (hardening)
Phase 7            : PR + CI + merge + deploy
```

**Critères d'acceptation :**
- [ ] `pnpm lint && pnpm type-check && pnpm build` passe
- [ ] `pnpm test` : coverage API ≥ 70%, mobile > 0%
- [ ] Mobile messages + pedagogy : vraie API
- [ ] Finance : créer facture → payer → statut PAID
- [ ] Notifications : cloche web + notifs mobile
- [ ] CI verte → merge automatique
