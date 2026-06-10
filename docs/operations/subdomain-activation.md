# Runbook — Activation des sous-domaines `*.klasso.tn`

> Le code (middleware host-resolver) est livré mais **dormant**. Cette procédure
> active `<slug>.klasso.tn` pour donner à chaque école son URL dédiée (argument
> commercial « 1 web + 3 apps par école »). Tant que c'est inactif, l'URL tenant
> effective reste le path-based `/t/<slug>/`.

## Variables qui gouvernent la bascule

| Variable | Plateforme | Effet |
|---|---|---|
| `ENABLE_SUBDOMAIN_RESOLVER` | Vercel (web middleware, server-side) | active la résolution d'hôte `<slug>.klasso.tn` |
| `NEXT_PUBLIC_ENABLE_SUBDOMAIN` | Vercel (web, client) | fait générer des URLs en `<slug>.klasso.tn` |
| `NEXT_PUBLIC_BASE_DOMAIN` | Vercel (web) | domaine de base (`klasso.tn`) |

Code de référence : `apps/web/middleware.ts`, `apps/web/lib/tenant/build-tenant-url.ts`.

## Prérequis

- [ ] Domaine `klasso.tn` géré (OVH) et déjà pointé sur Vercel pour l'apex.
- [ ] Décision prise sur le DNS : le wildcard Vercel exige une validation que le
      DNS externe (OVH) ne permet pas toujours en CNAME wildcard. Voir D25 dans
      `docs/roadmap.md` — historiquement bloquant (et le switch DNS Vercel
      casserait la messagerie OVH). À traiter idéalement avec la migration email.

## Procédure

1. **DNS (OVH)** : ajouter `*.klasso.tn` → `cname.vercel-dns.com` (CNAME wildcard).
   Confirmer l'email de validation OVH le cas échéant.
2. **Vercel** : projet web → Settings → Domains → ajouter `*.klasso.tn` ; vérifier
   la résolution.
3. **Variables** :
   - Web (Vercel) : `NEXT_PUBLIC_ENABLE_SUBDOMAIN=true`, `NEXT_PUBLIC_BASE_DOMAIN=klasso.tn`,
     `ENABLE_SUBDOMAIN_RESOLVER=true`.
   - Redéployer.
4. **Validation** :
   - `nslookup ecole-test.klasso.tn` → résout vers Vercel.
   - Ouvrir `https://ecole-test.klasso.tn/login` → page brandée du tenant.
   - Login → dashboard ; vérifier les cookies partagés sur `.klasso.tn`.
   - Surveiller Sentry / logs pour des erreurs CORS.

## Rollback

Repasser les 3 variables à `false` et redéployer : le path-based `/t/<slug>/`
redevient l'URL effective sans interruption. Le wildcard DNS peut rester en place.
