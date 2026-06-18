# Runbook — Provisioning de domaine tenant (OVH + Vercel)

> **Date :** 2026-06-18  
> **Feature :** Tenant Domain Automation (PR-3 — activation web)  
> **Spec de référence :** [`docs/superpowers/specs/2026-06-18-tenant-domain-automation-ovh-design.md`](../specs/2026-06-18-tenant-domain-automation-ovh-design.md)

---

## 1. Checklist d'activation — variables d'environnement

Ces opérations sont **manuelles** (OPS humain). Le code est déjà déployé et gaté ; il suffit d'activer les variables.

### Web — Vercel, projet `ecole-saas` (Production + Preview)

| Variable | Valeur |
|---|---|
| `ENABLE_SUBDOMAIN_RESOLVER` | `true` |
| `NEXT_PUBLIC_BASE_DOMAIN` | `klasso.tn` |
| `NEXT_PUBLIC_ENABLE_SUBDOMAIN` | `true` |

### API — Railway, projet `ecole-saasapi-production`

| Variable | Valeur |
|---|---|
| `ENABLE_TENANT_DOMAIN_AUTOMATION` | `true` |
| `OVH_APP_KEY` | *(clé OVH — voir gestionnaire de secrets)* |
| `OVH_APP_SECRET` | *(secret OVH — voir gestionnaire de secrets)* |
| `OVH_CONSUMER_KEY` | *(consumer key OVH — voir §2)* |
| `OVH_DNS_ZONE` | `klasso.tn` |
| `OVH_API_BASE` | `https://eu.api.ovh.com/1.0` |
| `DOMAIN_CNAME_TARGET` | `cname.vercel-dns.com.` *(avec point final)* |
| `VERCEL_TOKEN` | *(token Vercel — voir gestionnaire de secrets)* |
| `VERCEL_PROJECT_ID` | `prj_DsqPNx90qY3R98l71Pr92DHPoE7R` |
| `VERCEL_TEAM_ID` | *(ID team Vercel `ultra3omda-6664s-projects`)* |
| `NEXT_PUBLIC_BASE_DOMAIN` | `klasso.tn` |

---

## 2. ⚠️ Restriction de la consumer key OVH (obligatoire)

**La consumer key OVH DOIT être restreinte au strict minimum** (moindre privilège — DA9 / R2).  
Lors de la création via [https://eu.api.ovh.com/createToken](https://eu.api.ovh.com/createToken), n'autoriser **que** les routes suivantes :

| Méthode | Route |
|---|---|
| `GET` | `/domain/zone/klasso.tn/record*` |
| `POST` | `/domain/zone/klasso.tn/record*` |
| `DELETE` | `/domain/zone/klasso.tn/record*` |
| `POST` | `/domain/zone/klasso.tn/refresh` |
| `GET` | `/auth/time` |

Toute autre route (MX, TXT, NS, apex `@`, autres zones) doit être **absente** de la liste d'autorisations.

---

## 3. Recette manuelle — 8 étapes

Exécuter ces étapes dans l'ordre, en environnement staging avant de pousser en production.

### Étape 1 — Créer un tenant de test

Via la console super-admin (`/platform/tenants`), créer un tenant avec le slug `test-dns`.  
**Résultat attendu :** la réponse API contient `domainStatus: "PROVISIONING"` et `invite: null` (l'invitation n'est pas envoyée immédiatement).

### Étape 2 — Vérifier le CNAME OVH

```bash
dig +short test-dns.klasso.tn CNAME
```

**Résultat attendu :** `cname.vercel-dns.com.` (avec point final).  
Si le CNAME n'apparaît pas dans les 2 minutes, vérifier les logs Railway (`DomainProvisioningService`) et contrôler les credentials OVH.

### Étape 3 — Vérifier le certificat SSL

```bash
curl -sI https://test-dns.klasso.tn/login
```

**Résultat attendu :** `HTTP/2 200` avec un certificat SSL valide émis pour `test-dns.klasso.tn`.  
Le polling Vercel peut prendre jusqu'à 30 minutes (180 tentatives × 10 s). Surveiller `domainStatus` via `GET /admin/tenants/:id`.

### Étape 4 — Vérifier l'email d'invitation

Vérifier la boîte email de l'administrateur de l'école `test-dns`.  
**Résultat attendu :** email reçu avec un lien de la forme :

```
https://test-dns.klasso.tn/register?token=<token>
```

### Étape 5 — Inscription, connexion et dashboard brandé

Suivre le lien d'invitation → s'inscrire → se connecter.  
**Résultat attendu :** le dashboard s'affiche à `https://test-dns.klasso.tn/fr/dashboard` avec le branding du tenant (logo, couleurs configurés dans `Tenant.brand`).

### Étape 6 — Vérification de l'isolation

Ouvrir `https://<autre-tenant>.klasso.tn/login` (utiliser un autre tenant existant).  
**Résultat attendu :** le branding de *cet* autre tenant s'affiche, sans aucune fuite de données du tenant `test-dns`. Confirmer que l'isolation JWT est bien en place (invariant D3 — le `Host` n'affecte jamais la portée des données).

### Étape 7 — Test d'échec et retry

Créer un second tenant avec un slug qui ne peut pas être validé côté Vercel (ex. slug trop long ou invalide selon les règles Vercel).  
**Résultat attendu :**
- `domainStatus` passe à `FAILED` avec un `domainError` non vide.
- L'email d'invitation fallback est envoyé avec une URL **path-based** : `https://klasso.tn/fr/t/<slug>/register?token=…`.
- La console super-admin affiche le badge « Échec domaine » et le bouton **« Réessayer le provisioning »**.
- Cliquer « Réessayer » → `domainStatus` repasse à `PROVISIONING` et un nouveau cycle de provisioning démarre.

### Étape 8 — Déprovisionner

Via l'action admin (déprovision), supprimer le domaine du tenant `test-dns`.  
**Résultat attendu :**
- `dig +short test-dns.klasso.tn CNAME` ne retourne plus rien (ou NXDOMAIN après propagation TTL).
- Le domaine `test-dns.klasso.tn` n'apparaît plus dans la liste des domaines du projet Vercel.
- `domainStatus` repasse à `NONE` en base.

---

## 4. Comment ça fonctionne

À la création d'un tenant (flag `ENABLE_TENANT_DOMAIN_AUTOMATION=true`), le service `DomainProvisioningService` est déclenché **en arrière-plan** (détaché de la transaction HTTP). Il orchestre :

1. **OVH** — création d'un enregistrement CNAME `<slug>.klasso.tn → cname.vercel-dns.com.` via l'API OVH signée (SHA1 maison, zéro dépendance externe).
2. **Vercel** — ajout du domaine au projet via l'API Vercel REST ; poll jusqu'à `verified && !misconfigured` (SSL actif).
3. **Email** — si ACTIVE : invitation avec l'URL subdomain brandée ; si FAILED : invitation fallback avec l'URL path-based (`/fr/t/<slug>/…`) pour ne jamais bloquer l'école.

L'état est tracé dans `Tenant.domainStatus` (`NONE | PROVISIONING | ACTIVE | FAILED`). Au redémarrage de l'API, `reconcilePending()` reprend automatiquement les tenants laissés en `PROVISIONING`.

Pour la conception complète (interfaces, machine à états, garde-fous DNS DA9, séquence de provisioning), consulter la spec :  
[`docs/superpowers/specs/2026-06-18-tenant-domain-automation-ovh-design.md`](../specs/2026-06-18-tenant-domain-automation-ovh-design.md)
