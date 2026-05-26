# ADR 0007 — Landing page publique bilingue FR/AR (V0 commercial)

**Date** : 2026-05-26
**Statut** : Accepté
**Auteurs** : équipe Klasso

## Contexte

V2 (Module Élèves) a livré le premier produit métier complet. Le domaine `klasso.tn` est configuré sur Vercel (apex + www Valid Configuration ; wildcard reporté V11 — Vercel ne sait pas valider un wildcard CNAME via DNS externe). Mais `/` redirigeait vers `/login` — aucune surface publique pour présenter le produit aux écoles tunisiennes.

Pour la livraison commerciale (démos écoles primaires/maternelles TN, démarchage MENA), il fallait une landing publique bilingue qui présente la valeur en 30 secondes et capture les demandes de démo.

## Décisions

### D1 — Routing i18n sub-paths `/fr` et `/ar`

Sub-paths choisis vs cookie-based : SEO bilingue indispensable pour le marché AR. Conséquence : migration de tout `app/(app)/` et `app/(auth)/` sous `app/[locale]/` (36 fichiers). ~0.5j d'effort réel.

### D2 — Style éditorial institutionnel (vs SaaS startup moderne)

Cible primaire : directeurs/directrices d'écoles primaires/maternelles TN. Ton : sobre, hiérarchique, citations, photos école. Évite l'esthétique "startup tech" qui peut éloigner cette cible.

### D3 — Pricing par élève/mois (vs forfait établissement)

Starter 5 TND / Standard 4 TND / Pro 3 TND par élève/mois. Justification :
- Transparent et scalable (les écoles connaissent leur effectif)
- Aligne le coût plateforme à la taille de l'établissement
- Standard tier featured pour ancrage prix

Forfait fixe rejeté (moins lisible pour petites structures).

### D4 — Cloudflare Turnstile invisible (vs honeypot only)

Anti-spam choisi : Turnstile invisible. Avantages : robustesse contre bots avancés, gratuit illimité, zero friction utilisateur. +30 min setup pour le widget + verify backend.

Honeypot rejeté (insuffisant face aux bots modernes). hCaptcha rejeté (friction UX visible).

### D5 — next-intl v4 routing module (vs next/link partout)

Utilisation du pattern officiel next-intl v4 : `apps/web/i18n/routing.ts` exporte `Link`, `useRouter`, `usePathname` via `createNavigation(defineRouting({...}))`. Ces helpers prepend automatiquement la locale courante aux liens internes.

15 fichiers migrés `from 'next/link'` → `from '@/i18n/routing'`. 10 fichiers `useRouter` migrés de `next/navigation` vers `@/i18n/routing`.

### D6 — TDD pour le DemoRequest backend

Pattern V2 réutilisé : tests d'abord (red), puis implémentation (green). 5 unit tests + 3 e2e couvrant :
- Turnstile valid → email envoyé + audit log
- Turnstile invalid → 400 TURNSTILE_FAILED + no email
- AR locale → email subject en arabe
- Resend failure → graceful degradation (success client malgré tout)
- Cloudflare siteverify URL correctement construit

## Alternatives rejetées

- **Switcher Vercel DNS pour wildcard `*.klasso.tn`** : rejeté — casse mail OVH actif. Wildcard reporté V11 avec migration Google Workspace.
- **Page FAQ remplie V0** : rejeté — placeholder suffit, FAQ V1 après retours utilisateurs réels.
- **Témoignages clients V0** : rejeté — zéro client en prod, ne pas inventer.
- **Vidéo démo intégrée** : rejeté V2.1+ — coût production élevé, V0 doit aller vite.
- **PostHog analytics** : rejeté V0 — V11 selon roadmap.
- **Migration partielle (landing seule sous [locale])** : rejeté — incohérence SEO, mieux faire d'un coup.

## Conséquences

### Positives

- Surface commerciale `klasso.tn/` dispo immédiatement après merge
- SEO FR + AR bilingue indexé par Google distinctement
- Form démo → super-admin email pipeline manuel V0 (suffit pour 10-20 prospects/semaine)
- Infrastructure i18n posée pour V3+ (Module Parents bilingue, V4 Enseignants, etc.)
- Pattern TDD V2 confirmé : 5 unit + 3 e2e tests = couverture suffisante pour un endpoint public

### Négatives / migration future

- **Mail destinataire sur `ultra3omda@gmail.com`** (V0) → migrer vers `demo@klasso.tn` post Google Workspace setup. Variable `DEMO_REQUEST_TO_EMAIL` permet zéro redéploiement.
- **Wildcard `*.klasso.tn`** reporté V11 (Vercel DNS migration + Google Workspace en même temps).
- **Hero image non-optimisée** : V0 ship avec gradient background uniquement. Ajout image CC0 + next/image optimization reporté V0.5 (Task 25 dans plan, deferred).
- **Lighthouse + a11y audit manuels** : à exécuter par l'équipe en preview Vercel avant promotion prod (Task 26 dans plan, deferred).
- **Migration routing risquée** : tous les Links/usePathname/useRouter migrés. Mitigation : smoke test login en preview Vercel avant merge.

### Effort

- Plan initial : ~1.7j (28 tasks bite-sized)
- Réel : ~1.7j (proche estimate). Quelques deviations mineures pour adapter aux API existantes :
  - next-intl v4 API (`requestLocale: Promise` au lieu du `{ locale }` du plan)
  - ResendService.send signature (`template` au lieu de `react`)
  - 5 shim files V1.6 tenant-branded à mettre à jour (non anticipé dans le plan)

## Références

- Spec : `docs/superpowers/specs/2026-05-25-landing-klasso-design.md`
- Plan : `docs/superpowers/plans/2026-05-25-landing-klasso.md`
- Pattern Resend réutilisé : `apps/api/src/common/email/templates/invite.tsx` (V1.5)
- Pattern Throttler : `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot(...)`)
- next-intl v4 docs : https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
- Cloudflare Turnstile docs : https://developers.cloudflare.com/turnstile/get-started/
- Lock décision : D25 dans `docs/roadmap.md`
