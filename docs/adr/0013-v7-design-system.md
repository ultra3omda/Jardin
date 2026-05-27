# 0013 — V7 Design System (Klasio-inspired + Dynamic Nav + Demo Mode)

**Date:** 2026-05-27
**Status:** Accepted
**Deciders:** User

## Context

V6 livré le 2026-05-27. Le frontend a deux problèmes :
1. Incohérence visuelle entre landing éditorial Tunisian + login/dashboard shadcn Indigo défaut.
2. Navigation non-adaptative : pas de menu dynamique par rôle × type d'établissement.

L'utilisateur a fourni 2 captures Klasio comme cible visuelle pixel-perfect.

## Decision

### Design tokens

- Sidebar navy `#0f1419` quasi-noir + active state `#1a2028` + border-left ambre `#fbb13c`.
- Surface paper `#f4f4ef` (replace Tunisian sand dans l'app, sand reste sur landing pour V7-A).
- Accent ambre `#fbb13c → #e89218` pour CTA et notes pills.
- KPI gradient icons : blue / green / orange / amber / pink / purple selon contexte.
- Typo : Cormorant Garamond pour brand/hero, system-ui pour body.

### Navigation dynamique

`getNavForUser(user, tenant): NavSection[]` dans `apps/web/lib/nav/menu.ts` résout le menu sidebar selon la matrice 5 rôles × 3 tenant types. Renommages KINDERGARTEN : Élèves→Enfants, Enseignants→Animateurs, Classes→Groupes d'âge, Notes/Bulletins/Discipline masqués remplacés par Journal/Activités.

### Dashboard widgets

`getDashboardConfig(role, tenantType): DashboardConfig` résout 8 variantes de dashboard (KPIs + quick actions + panels) adaptées au persona × type.

### Demo accounts

`POST /api/auth/demo-login` body `{ persona: DemoPersona }` retourne `{ user, tenant, accessToken, refreshToken }`. Rate-limited 60/h/IP via `@nestjs/throttler`. 8 personas seedés : admin/teacher/parent/staff × (primary/kindergarten) + super-admin. Pas de password check — pour démos commerciales publiques uniquement.

### Wave numbering

V7 (ce travail) prend la place de l'ancien V7-Finance qui bumps à V8. Toutes les vagues subséquentes glissent de +1 dans la roadmap.

## Consequences

**Positive:**
- Cohérence visuelle 100% landing→login→app shell.
- 8 démos commerciales publiques en 1 clic = forte conversion sur le landing.
- Menu/dashboard scalent avec les vagues futures (V8 Finance, V9 Vie École, etc.) sans refonte structurelle.

**Negative:**
- Refonte large (~28 fichiers V7-A web). Risque régression CI E2E.
- Demo accounts en prod = surface d'abuse (mitigation rate-limit + données non-PII).
- Mobile V7-B reporté en plan séparé (cohérence visuelle web-only en attendant).

## V7-A explicit out-of-scope (V7-B)

- Mobile design system (3 apps Expo) — `packages/ui-mobile` à créer
- RTL / AR direction support
- Demo data reset cron hourly
- Animation polish + Framer Motion
- A11y audit WCAG 2.1 AA (V12 Hardening)

## References

- Spec : `docs/superpowers/specs/2026-05-27-v7-design-refactor.md`
- Plan : `docs/superpowers/plans/2026-05-27-v7-design-refactor.md`
- API : `apps/api/src/demo-login/`
- Tokens : `apps/web/app/globals.css` (V7 vars) + `apps/web/tailwind.config.ts`
- Nav matrix : `apps/web/lib/nav/menu.ts` + tests
- Dashboard config : `apps/web/lib/dashboard/config.ts`
- Components : `apps/web/components/app-shell/*`, `apps/web/components/dashboard/*`, `apps/web/components/auth/demo-accounts-block.tsx`, `apps/web/components/landing/top-nav.tsx`
