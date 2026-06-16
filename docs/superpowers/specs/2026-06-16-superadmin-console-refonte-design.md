# Design — Refonte UX SUPER_ADMIN / COMMERCIAL (Vague 5)

> **Statut** : en cours — 2 sous-PR (5.1 commercial, 5.2 tenants/invites). Web only.
> **Programme** : refonte UX par persona. Vague 5 = console plateforme. Fondations : Phase 0 + V1-4.

## 1. Constat (mapping 2026-06-16)
- **MODERNE (déjà fait)** : `/admin` overview, audit, analytics, demo-requests (en `ResourceListPage`).
- **PARTIAL** : `admin/tenants/{list,[id],new}`, `admin/invite-tokens` (header maison, états client en texte).
- **LEGACY** : pipeline **commercial** — `commercial-orgs.tsx` + `agents-client.tsx` (« Chargement… », `border-dashed`, table/`<ul>` bruts, pas de retry).
- Pas de persona SUPER_ADMIN dans le demo-login → **pas d'e2e** ; web only.

## 2. Découpage
- **5.1 — Commercial pipeline** : `commercial/page` + `commercial-orgs` (→ `ResourceListPage`) ; `agents/page` + `agents-client` (liste → états) ; `new/page` (header → `PageHeader`).
- **5.2 — Tenants + invites** : `admin/tenants/{page,[id],new}` + `admin/invite-tokens` → `PageHeader` + états sur les clients.

## 3. Refonte 5.1 (détail)
- `commercial-orgs.tsx` : envelopper dans `ResourceListPage` (title « Organisations » + description + action « Nouvelle organisation signée » déplacés depuis `page.tsx` ; `isLoading`/`isError`+`refetch`/`isEmpty` ; `emptyIcon`). Table inchangée en `children`.
- `commercial/page.tsx` : retirer le `<header>` maison → rend juste le client dans le conteneur.
- `agents-client.tsx` : section liste « Commerciaux existants » → `Skeleton` (loading) / `ErrorRetry` (ajout `isError`+`refetch`) / `EmptyState`. Le **formulaire de création inchangé**.
- `agents/page.tsx` + `new/page.tsx` : `<header>` → `PageHeader`.

**Aucun backend** ; mutations/forms inchangés.

## 4. Tests
`type-check` web (install `--frozen-lockfile`) ; lint en CI. Présentationnel (pas de helper pur).

## 5. Risques
- `ResourceListPage` rend son propre `PageHeader` → ne pas doubler le header (le `page.tsx` perd le sien).
- Server components (`page.tsx`) : `PageHeader` est un composant simple, OK en RSC.
