# 🚀 Guide de premier déploiement — Vague 0

Suivez ces étapes **dans l'ordre** pour avoir votre Hello World déployé en production en ~15 minutes.

---

## Étape 1 — Vérifier que ça build en local (2 min)

```bash
# À la racine du monorepo
nvm use                    # active Node 20
pnpm install               # installe toutes les deps
pnpm build                 # build complet
pnpm dev                   # lance localhost:3000
```

✅ Vous devez voir la page **"École SaaS v0.1 — Pipeline CI/CD opérationnel"** sur [localhost:3000](http://localhost:3000)

✅ L'endpoint health doit répondre : [localhost:3000/api/health](http://localhost:3000/api/health)

---

## Étape 2 — Premier push vers GitHub (3 min)

```bash
git init
git add .
git commit -m "feat: vague 0 - monorepo + CI/CD + hello world"

# Remplacez par votre URL de repo
git branch -M main
git remote add origin git@github.com:<votre-user>/<votre-repo>.git
git push -u origin main
```

➡️ Allez dans l'onglet **Actions** de votre repo GitHub.
Le workflow **CI** doit se lancer et passer au vert (lint + type-check + build).

---

## Étape 3 — Lier Vercel (5 min)

```bash
# Installer Vercel CLI
pnpm add -g vercel

# Se connecter
vercel login

# Aller dans apps/web et lier le projet
cd apps/web
vercel link
# Réponses :
# - Set up new project? Yes
# - Project name: ecole-saas-web
# - Directory: ./ (vous êtes déjà dans apps/web)

# Récupérer les IDs
cat .vercel/project.json
# Notez `orgId` et `projectId`
```

### Configurer le projet Vercel (dashboard)

Sur [vercel.com](https://vercel.com) → votre projet → **Settings → General** :

| Paramètre | Valeur |
|-----------|--------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js |
| **Build Command** | (laisser vide, géré par `vercel.json`) |
| **Install Command** | (laisser vide, géré par `vercel.json`) |
| **Node.js Version** | 20.x |

---

## Étape 4 — Ajouter les secrets GitHub (3 min)

1. Générer un token Vercel : [vercel.com/account/tokens](https://vercel.com/account/tokens) → **Create Token**

2. Aller sur votre repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**

3. Ajouter ces 3 secrets :

| Nom du secret | Valeur |
|---------------|--------|
| `VERCEL_TOKEN` | Le token que vous venez de créer |
| `VERCEL_ORG_ID` | La valeur `orgId` de `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | La valeur `projectId` de `.vercel/project.json` |

---

## Étape 5 — Déclencher le premier déploiement automatique (2 min)

```bash
# Faire un petit changement
echo "" >> README.md
git add README.md
git commit -m "chore: trigger first deploy"
git push
```

➡️ Onglet **Actions** → le workflow **Deploy Web (Vercel)** doit se lancer.
➡️ Une fois terminé, votre site est en ligne sur l'URL Vercel (ex: `ecole-saas-web.vercel.app`).

---

## ✅ Checklist finale Vague 0

- [ ] `pnpm dev` fonctionne en local
- [ ] Push initial sur GitHub réussi
- [ ] Workflow CI passe au vert
- [ ] Projet Vercel créé et lié
- [ ] Secrets GitHub configurés (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
- [ ] Workflow Deploy passe au vert
- [ ] URL de production accessible
- [ ] La page affiche le badge vert "Pipeline CI/CD opérationnel"

---

## 🆘 Problèmes fréquents

**❌ `pnpm install` échoue avec "ERR_PNPM_UNSUPPORTED_ENGINE"**
→ Vérifiez que Node 20+ est actif : `node -v`

**❌ Le build Vercel échoue avec "command not found: pnpm"**
→ Dans Vercel → Settings → Environment Variables, ajoutez `ENABLE_EXPERIMENTAL_COREPACK=1`

**❌ Le workflow GitHub échoue sur "pnpm install"**
→ Vérifiez que `pnpm-lock.yaml` est bien commité (il l'est après votre 1er `pnpm install`)

**❌ Vercel build échoue avec "Module not found: @ecole-saas/shared"**
→ Vérifiez le `transpilePackages` dans `apps/web/next.config.mjs`

---

## ➡️ Et après ?

Une fois Vague 0 validée et déployée, on attaque la **Vague 1** :
- Backend NestJS avec auth JWT
- Schema Prisma multi-tenant
- PostgreSQL (Neon)
- Page de login sur le web
- Tests E2E avec Playwright

Dites-moi **"Go Vague 1"** quand vous êtes prêt(e). 🚀
