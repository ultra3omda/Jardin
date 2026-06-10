# ✅ Checklist Go-To-Market — avant de facturer un vrai client

> État de préparation au lancement commercial de Klasso. À cocher avant
> d'ouvrir les paiements à un établissement payant. Maintenu par l'équipe.
> Voir les runbooks détaillés dans [`docs/operations/`](operations/).

## Légende
- ✅ Fait — 🚧 En cours — ⛔ Bloquant non démarré — 👤 Action utilisateur (compte externe / décision)

---

## 1. Sécurité & conformité

| Item | État | Réf. |
|---|---|---|
| Isolation multi-tenant câblée globalement + test garde-fou CI | ✅ | PR #140 |
| Rate limiting effectif (login, reset, paiements, demo) | ✅ | PR #141-142 |
| Lockout de compte après échecs répétés | ✅ | PR #142 |
| Plafond de taille des listes + redaction PII des logs | ✅ | PR #143 |
| Export / suppression RGPD par utilisateur | ✅ | espace profil |
| Pages légales (confidentialité, CGU/CGV, mentions, cookies) | 🚧 | [PR #146] — templates à **faire valider par un juriste** 👤 |
| Infos entité juridique remplies (raison sociale, adresse, matricule fiscal, DPO) | ⛔ 👤 | `apps/web/lib/legal/content.ts` (marqueurs `[À COMPLÉTER]`) |
| DPA (accord de traitement) prêt pour signature B2B | ⛔ 👤 | à rédiger avec le juriste |
| Postgres RLS (defense-in-depth) | 📋 | reporté hardening (extension Prisma suffit) |

## 2. Paiement & facturation

| Item | État | Réf. |
|---|---|---|
| Plans d'abonnement seedés (prix réels par élève) | ✅ | PR #145 |
| Checkout par élève + gardes de palier | ✅ | PR #145 |
| Credentials ClicToPay **production** obtenus de Monétique Tunisie | ⛔ 👤 | [clictopay-production-activation.md](operations/clictopay-production-activation.md) |
| URL de callback enregistrée chez la banque | ⛔ 👤 | idem |
| Test de paiement réel (petit montant) en prod | ⛔ 👤 | idem |
| Modalités TVA / remboursement / résiliation arrêtées | ⛔ 👤 | CGV — `[À COMPLÉTER]` |

## 3. Opérations

| Item | État | Réf. |
|---|---|---|
| DSN Sentry configurés en prod (web + API) | ⛔ 👤 | [monitoring.md](operations/monitoring.md) |
| Monitoring uptime (3 URLs) + alertes | ⛔ 👤 | [monitoring.md](operations/monitoring.md) |
| Sauvegarde Neon : PITR vérifié (test de restauration) | ⛔ 👤 | [backup-restore.md](operations/backup-restore.md) |
| Versioning R2 activé sur les buckets | ⛔ 👤 | [backup-restore.md](operations/backup-restore.md) |
| Secrets GitHub Actions complets et validés | 🚧 👤 | [deployment-secrets.md](operations/deployment-secrets.md) |
| Domaine email `support@klasso.tn` vérifié (SPF/DKIM/DMARC) | ⛔ 👤 | [email-domain-setup.md](operations/email-domain-setup.md) |
| `EMAIL_FROM` basculé sur le domaine vérifié | ⛔ 👤 | idem |

## 4. Produit & support

| Item | État | Réf. |
|---|---|---|
| Pricing landing aligné sur la facturation réelle | ✅ | PR #145 |
| Subdomain `*.klasso.tn` activé (argument « 1 URL par école ») | 📋 👤 | [subdomain-activation.md](operations/subdomain-activation.md) |
| Adresse email support active et relevée | ⛔ 👤 | Google Workspace / Resend routing |
| Apps mobiles soumises aux stores | 📋 👤 | Phase 4 — `apps/mobile/STORE_SUBMISSION.md` |

---

## Ordre recommandé avant le 1er client payant

1. **Juriste** : remplir l'entité + valider les pages légales + le DPA. (parallélisable)
2. **Monétique Tunisie** : demander les credentials ClicToPay prod + enregistrer le callback. (délai externe → démarrer tôt)
3. **Ops 1 journée** : Sentry DSN, monitoring uptime, test de restauration backup, versioning R2.
4. **Email** : vérifier `klasso.tn` dans Resend, basculer `EMAIL_FROM`.
5. **Pilote** : 1-3 écoles en réel (gratuit 1-2 mois) avant d'ouvrir la facturation.
