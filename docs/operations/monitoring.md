# Runbook — Supervision (Sentry + uptime + logs)

> Mettre la prod sous surveillance : capture d'erreurs, disponibilité, logs.
> Sans cela, une panne API reste invisible jusqu'à ce qu'un client la signale.

## 1. Sentry (capture d'erreurs)

Le code est déjà instrumenté (web : `sentry.*.config.ts` ; API : `src/instrument.ts`).
Il suffit de **fournir les DSN en production** — sans DSN, l'app démarre mais
ne remonte rien.

- [ ] Créer/ouvrir les projets Sentry `klasso-web` et `klasso-api`.
- [ ] Renseigner les variables :
  - Vercel (web) : `NEXT_PUBLIC_SENTRY_DSN_WEB`
  - Railway (API) : `SENTRY_DSN_API`
- [ ] Redéployer, puis déclencher une erreur de test et vérifier sa réception.
- [ ] (Option) Augmenter `tracesSampleRate` (actuellement 0.1) si le volume le permet.

## 2. Uptime (disponibilité externe)

Aucun monitoring externe aujourd'hui (le healthcheck Railway ne sert qu'au
redémarrage, il n'alerte personne). Mettre en place **Better Stack** (tier
gratuit : 10 moniteurs) ou équivalent (UptimeRobot…).

- [ ] Créer 3 moniteurs HTTP :
  - `https://api.klasso.tn/health` (attendu : 200, `{"status":"ok"}`)
  - `https://klasso.tn/` (landing)
  - `https://klasso-mobile.vercel.app/` (web mobile)
- [ ] Configurer les alertes (email + éventuellement SMS/Slack).
- [ ] Définir une page de statut publique (optionnel).

## 3. Agrégation de logs (optionnel mais recommandé)

L'API journalise via Pino (avec redaction PII — voir
`apps/api/src/common/logger/logger.module.ts`), mais les logs ne vont que sur la
sortie standard Railway (rétention limitée, pas de recherche).

- [ ] Brancher un sink (Better Stack Logs / Datadog) via un transport Pino.
- [ ] Ajouter le token correspondant aux variables Railway.
- [ ] Vérifier que les champs sensibles (santé, paie, tokens) restent bien rédigés.

## 4. Base de données (Neon)

- [ ] Activer **Query Insights** dans la console Neon (gratuit) pour repérer les
      requêtes lentes / N+1.
- [ ] Définir les variables de pool si nécessaire côté Railway.

## Checklist minimale avant facturation

- [ ] Sentry DSN actifs (web + API) et testés.
- [ ] 3 moniteurs uptime actifs avec alertes.
- [ ] Au moins une personne reçoit les alertes.
