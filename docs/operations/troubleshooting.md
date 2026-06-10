# Runbook — Dépannage production

> Symptômes fréquents et premiers réflexes. Pour les pannes de fond, voir
> [monitoring.md](monitoring.md) (Sentry/logs) et [backup-restore.md](backup-restore.md).

| Symptôme | Vérifier d'abord |
|---|---|
| **L'API ne démarre pas** | `DATABASE_URL` valide ? Secrets JWT ≥ 32 chars (l'API refuse de booter sinon) ? Logs Railway. |
| **`/health` ne répond pas** | État du service Railway ; migrations appliquées (`prisma migrate deploy` au boot) ; quota Neon. |
| **Login échoue pour tous** | Horloge serveur / expiration JWT ; `auth.login.*` dans les `AuditLog` ; throttle (10/min) ou lockout (10 échecs/15 min) actif ? |
| **Un compte précis est bloqué** | Lockout après échecs répétés → attendre la fenêtre (15 min) ou réinitialiser le mot de passe. Code `ACCOUNT_TEMPORARILY_LOCKED`. |
| **Emails non reçus** | `RESEND_API_KEY` ; `EMAIL_FROM` (domaine vérifié ? voir [email-domain-setup.md](email-domain-setup.md)) ; dashboard Resend (rebonds). |
| **Upload de fichier / photo échoue (503)** | Variables `R2_*` présentes ? Bucket + token valides ? |
| **Export RGPD échoue (503)** | R2 non configuré — voir ci-dessus. |
| **Paiement : checkout `PLAN_NOT_FOUND`** | Plans seedés ? Lancer `gh workflow run seed-prod.yml` (idempotent). |
| **Paiement : `NO_STUDENTS_TO_BILL`** | L'établissement n'a aucun élève actif — normal (facturation par élève). |
| **Paiement reste `PENDING`** | Callback ClicToPay enregistré chez la banque ? `getOrderStatus` réussit ? Voir [clictopay-production-activation.md](clictopay-production-activation.md). |
| **Page tenant en 404 sur `<slug>.klasso.tn`** | Subdomain non activé → utiliser `/t/<slug>/`. Voir [subdomain-activation.md](subdomain-activation.md). |
| **Le déploiement API ne se met pas à jour** | `RAILWAY_TOKEN` présent ? `deploy-api.yml` skip silencieusement sinon — voir [deployment-secrets.md](deployment-secrets.md). |
| **CI rouge sur le type-check (`@react-email` TS2786)** | Flake connu (hoisting types React 18/19 sous `node-linker=hoisted`) — relancer le job. |

## Données démo

Comptes et mots de passe : `docs/DEMO_CREDENTIALS.md`. Le demo-login est
self-healing (re-seed auto au 1er appel). Re-seed manuel : `gh workflow run seed-prod.yml`.
