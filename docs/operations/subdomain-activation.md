# Runbook — Activation des sous-domaines `*.klasso.tn`

> Le code (middleware host-resolver + routes brandées `/t/[slug]/*` + garde de
> cohérence de slug) est **livré et testé, mais dormant**. Cette procédure active
> `<slug>.klasso.tn` pour donner à chaque école son URL dédiée (argument
> commercial « 1 web + 3 apps par école »). Tant que c'est inactif, l'URL tenant
> effective reste le path-based `/t/<slug>/` — qui **continue de fonctionner même
> après** activation (les deux coexistent).

## TL;DR

1. Migrer le DNS de `klasso.tn` vers **Cloudflare** (en conservant les MX OVH).
2. Ajouter l'apex + le wildcard `*.klasso.tn` (CNAME → Vercel) côté Cloudflare.
3. Ajouter `klasso.tn` + `*.klasso.tn` dans le projet Vercel `ecole-saas`.
4. Passer **les trois flags** à `true` dans Vercel, puis redéployer.
5. Smoke tests, puis surveiller Sentry/logs.

Temps réel : ~30 min de config + propagation DNS (jusqu'à quelques heures), pas
les « 5 min » optimistes de la roadmap — la migration DNS est la vraie étape.

## Les trois flags qui gouvernent la bascule

| Variable | Plateforme | Effet | Défaut |
|---|---|---|---|
| `ENABLE_SUBDOMAIN_RESOLVER` | Vercel — web **middleware (server)** | active la réécriture `<slug>.klasso.tn/login` → `/t/<slug>/login` | `false` |
| `NEXT_PUBLIC_ENABLE_SUBDOMAIN` | Vercel — web **client (bundle)** | fait générer des URLs canoniques en `<slug>.klasso.tn` (`buildTenantUrl`) | `false` |
| `NEXT_PUBLIC_BASE_DOMAIN` | Vercel — web (les deux) | domaine de base comparé au `Host` | `klasso.tn` |

> ⚠️ **Les deux flags `*_ENABLE_*` doivent basculer ENSEMBLE.** Si seul
> `ENABLE_SUBDOMAIN_RESOLVER` est `true`, le middleware réécrit l'hôte mais les
> liens restent en `/t/<slug>/` (et la garde `shouldRedirectForSlugMismatch`
> reste inactive). Si seul `NEXT_PUBLIC_ENABLE_SUBDOMAIN` est `true`, l'app
> génère des liens `<slug>.klasso.tn` que le middleware ne sait pas résoudre →
> 404 sur les pages pré-auth. Les passer à `true`/`false` simultanément, dans le
> **même déploiement**.

Code de référence : `apps/web/middleware.ts`,
`apps/web/lib/tenant/subdomain-rewrite.ts`,
`apps/web/lib/tenant/build-tenant-url.ts`,
`apps/web/lib/tenant/subdomain-consistency.ts`.

## Pourquoi ce n'est pas « juste un CNAME chez OVH » (D25)

La voie naïve — ajouter le wildcard directement chez OVH — **ne fonctionne pas** :

- Vercel exige une **validation de domaine** pour émettre le certificat wildcard.
  En CNAME wildcard depuis un DNS externe (OVH), cette validation échoue souvent.
- Basculer la zone DNS de `klasso.tn` chez Vercel **casserait la messagerie OVH**
  (les enregistrements MX/`mx*.ovh.net` ne suivraient pas).

La solution retenue (cf. D20 « V11 » dans `docs/roadmap.md`) est de **déléguer la
zone à Cloudflare**, qui :

- supporte le **CNAME flattening à l'apex** (`klasso.tn` → `cname.vercel-dns.com`)
  et le **wildcard CNAME** (`*.klasso.tn`),
- laisse intacts les **MX OVH** (on recopie les enregistrements mail tels quels),
- fournit le statut de validation à Vercel sans déplacer le mail.

## Prérequis

- [ ] Accès au registrar OVH (changement des serveurs de noms / nameservers).
- [ ] Compte Cloudflare (plan gratuit suffisant).
- [ ] Accès au projet Vercel `ecole-saas` (équipe `ultra3omda-6664s-projects`).
- [ ] **Relevé complet de la zone OVH actuelle** (A/AAAA, CNAME, **MX**, TXT
      SPF/DKIM/DMARC) — à recréer à l'identique chez Cloudflare avant de couper.

## Procédure

### 1. Cloudflare — importer la zone

1. Cloudflare → *Add a site* → `klasso.tn` → plan Free.
2. Laisser Cloudflare scanner les enregistrements existants, puis **vérifier que
   les MX OVH et les TXT (SPF/DKIM/DMARC) sont bien importés** (les compléter à la
   main au besoin, à l'identique d'OVH). C'est l'étape qui protège le mail.
3. Ne pas encore changer les nameservers.

### 2. Cloudflare — DNS Vercel

1. Apex : `klasso.tn` → type **CNAME** → `cname.vercel-dns.com`, **Proxy = DNS
   only (gris)**. (Le CNAME flattening Cloudflare gère l'apex automatiquement.)
2. Wildcard : `*.klasso.tn` → type **CNAME** → `cname.vercel-dns.com`,
   **Proxy = DNS only (gris)**.
   > Le proxy orange de Cloudflare ne couvre pas le wildcard sur le plan Free et
   > interfère avec le SSL Vercel — garder **DNS only**.

### 3. OVH — déléguer à Cloudflare

1. OVH → `klasso.tn` → *Serveurs DNS* → remplacer par les 2 nameservers
   Cloudflare fournis à l'étape 1.
2. Attendre la propagation (Cloudflare affiche « Active »). **Vérifier que le mail
   fonctionne toujours** (envoi + réception) avant de continuer.

### 4. Vercel — ajouter les domaines

1. Projet `ecole-saas` → Settings → Domains → ajouter `klasso.tn` **et**
   `*.klasso.tn`.
2. Attendre le statut *Valid Configuration* / certificat émis pour le wildcard.

### 5. Vercel — flags + redeploy

Dans Settings → Environment Variables (Production) :

```
ENABLE_SUBDOMAIN_RESOLVER=true
NEXT_PUBLIC_ENABLE_SUBDOMAIN=true
NEXT_PUBLIC_BASE_DOMAIN=klasso.tn
```

Puis **redéployer** la production (les `NEXT_PUBLIC_*` sont inlinées au build —
un simple toggle ne suffit pas, il faut un nouveau build).

## Validation (smoke tests)

- [ ] `nslookup ecole-test.klasso.tn` → résout vers Vercel.
- [ ] `https://ecole-test.klasso.tn/login` → page **brandée** du tenant (logo +
      couleurs), pré-remplit le slug.
- [ ] `https://ecole-test.klasso.tn/fr/login` **et** `/en/login` /`/es/login`
      /`/ar/login` → réécrites correctement (toutes les locales).
- [ ] Login → redirige vers le dashboard ; cookie refresh posé sur `.klasso.tn`.
- [ ] Connecté au tenant A, ouvrir `https://tenant-b.klasso.tn/dashboard` →
      déconnexion + redirection vers le bon hôte (garde
      `shouldRedirectForSlugMismatch`).
- [ ] `https://klasso.tn/t/ecole-test/login` fonctionne toujours (coexistence).
- [ ] Surveiller Sentry / logs Vercel pour des erreurs CORS ou de cookie.
- [ ] Envoyer/recevoir un mail `@klasso.tn` → la messagerie OVH est intacte.

## Rollback

Repasser les **trois** variables à `false` (ou les deux `*_ENABLE_*`) et
redéployer : le path-based `/t/<slug>/` redevient l'URL effective sans
interruption. Le DNS Cloudflare + le wildcard peuvent rester en place (inertes
tant que les flags sont `false`).

Rollback DNS complet (si besoin) : remettre les nameservers OVH d'origine. À
n'utiliser qu'en dernier recours — c'est une nouvelle propagation.
