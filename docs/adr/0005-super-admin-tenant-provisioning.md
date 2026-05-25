# ADR 0005 — Super_admin tenant provisioning UI

**Date** : 2026-05-25
**Statut** : Accepté
**Référence spec** : docs/superpowers/specs/2026-05-25-v1.8-tenant-provisioning-ui-design.md

## Contexte

Avant V2 (modules métier Élèves), besoin d'un flow visible bout-en-bout :
super_admin crée une école → l'école est immédiatement utilisable sur le web
(/t/<slug>/login) et le mobile (saisie slug). Sans cette UI, créer une école
nécessitait curl ou Swagger.

## Décision

1. **M1 mobile confirmé** : pas de Vercel project ni de build EAS par école.
   Apps shared `ecole-saas` (web) + `klasso-mobile` (mobile web preview).
2. **SUPER_ADMIN only** : pas de self-service public en V1.8.
3. **Single atomic endpoint** `POST /admin/tenants` : tenant + admin placeholder
   + InviteToken en transaction Prisma. Email Resend post-commit (best-effort).
4. **Réutilise `InviteEmail` template V1.6** (tenantName-aware) — pas de doublon.

## Conséquences

- L'admin invité s'inscrit via `/register?token=...` (V1.5) → consomme l'invite,
  set son password, lance verification email.
- Tenant créé AVANT que l'admin se connecte → status pending/consumed/expired.
- Resend = nouvel InviteToken (l'ancien reste pour audit) + nouvel email.
