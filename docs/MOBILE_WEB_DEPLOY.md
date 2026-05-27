# Mobile Expo Web — Vercel deploy setup (one-time)

V7-B ships `apps/mobile` with `build:web` outputting a static Expo Web SPA.
This document is the one-time setup to host it on Vercel under its own project.

## Steps (Vercel dashboard)

1. Go to https://vercel.com/new
2. Import the `ultra3omda/Jardin` repository
3. **Project name**: `klasso-mobile`
4. **Root directory**: `apps/mobile`
5. **Framework preset**: Other
6. **Build command**: leave default (vercel.json overrides)
7. **Output directory**: leave default (vercel.json overrides)
8. Click Deploy.

## After first deploy

- Default URL: `https://klasso-mobile.vercel.app`
- Optional custom domain: add `mobile.klasso.tn` in project Settings → Domains
- Set `EXPO_PUBLIC_API_URL=https://klasso.tn` in project Settings → Environment Variables (so the mobile-web build hits the prod API)
- Set `EXPO_PUBLIC_PERSONA=parent` (or `admin`, or `teacher`) — controls which tab set the mobile shows; for the public demo, leave as `parent`

## Vercel CLI alternative (skip dashboard)

If you have the Vercel CLI installed and authenticated:

```bash
cd apps/mobile
vercel link --yes --project klasso-mobile
vercel env add EXPO_PUBLIC_API_URL production
# (enter: https://klasso.tn)
vercel --prod
```

## Verifying

After deploy, visit `https://klasso-mobile.vercel.app/login` — you should see:
- Hero navy + tagline
- Email + password form
- 4 demo persona buttons (Direction école, Enseignant, Parent école, Parent maternelle)

Click a demo persona → should redirect to `/(app)/dashboard` after V7-C backend self-healing fix is also deployed (commit `fix(v7-c/api): self-healing demo-login auto-seeds on first call`).

## Why a separate Vercel project?

The web back-office (`apps/web`, Next.js 14) and the mobile Expo Web SPA have:
- Different build outputs (Next.js server + static vs pure static SPA)
- Different runtime needs (SSR/ISR vs no-server)
- Different routing strategies (Next.js App Router vs Expo Router client-side)
- Different domains (`klasso.tn` vs `mobile.klasso.tn`)

So they are deployed as 2 Vercel projects from the same monorepo, each with its own `vercel.json` and Root Directory.
