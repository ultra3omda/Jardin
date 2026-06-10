# Runbook — Secrets de déploiement

> Inventaire des secrets nécessaires au déploiement et à l'exécution en prod,
> et où les renseigner. Aucun secret n'est commité — tout passe par les
> dashboards des plateformes / GitHub Actions.

## GitHub Actions (CI/CD)

| Secret | Workflow | Rôle |
|---|---|---|
| `VERCEL_TOKEN` | `deploy-web.yml`, `deploy-mobile.yml` | déploiement Vercel (web + web mobile) |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | idem | cible Vercel |
| `RAILWAY_TOKEN` | `deploy-api.yml` | déploiement API (le job est **skip silencieux** si absent — vérifier qu'il est bien présent) |
| `EAS_TOKEN` | (builds mobiles natifs) | EAS Build/Submit, si automatisé |

> ⚠️ `deploy-api.yml` ne casse pas la CI si `RAILWAY_TOKEN` manque : il se
> contente de ne pas déployer. Vérifier explicitement sa présence.

## Railway (API) — variables d'environnement

Obligatoires : `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
(≥ 32 chars), `CORS_ORIGIN`, `WEB_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.

Recommandés en prod : `SENTRY_DSN_API`, `R2_*` (exports + assets tenants),
`DEMO_ACCOUNTS_ENABLED`, `BCRYPT_ROUNDS=12`.

Paiements / SMS / bot (optionnels) : `CLICTOPAY_*`, `ORANGE_SMS_*`, `TURNSTILE_SECRET_KEY`.

Subdomain (dormant) : `ENABLE_SUBDOMAIN_RESOLVER` (cf.
[subdomain-activation.md](subdomain-activation.md)).

## Vercel (web) — variables

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SENTRY_DSN_WEB`,
et pour le subdomain : `NEXT_PUBLIC_ENABLE_SUBDOMAIN`, `NEXT_PUBLIC_BASE_DOMAIN`.

## EAS (mobile)

`EXPO_PUBLIC_API_URL` (injecté au build via `app.config.ts`), credentials Apple
/ Google pour la soumission (voir `apps/mobile/STORE_SUBMISSION.md`).

## Rotation des secrets

En cas de compromission présumée :
1. Régénérer le secret sur la plateforme source.
2. Mettre à jour la variable (Railway / Vercel / GitHub).
3. Redéployer.
4. Pour les secrets JWT : la rotation invalide les sessions en cours (refresh
   tokens) — comportement attendu.

> Référence complète des variables : [`.env.example`](../../.env.example).
