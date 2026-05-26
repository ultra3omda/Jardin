# Landing klasso.tn bilingue FR/AR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une landing publique bilingue FR/AR sur `klasso.tn/` avec form "Demander une démo", endpoint API Resend-backed, et migration complète du routing web sous `app/[locale]/` pour activer next-intl avec sous-chemins `/fr` et `/ar`.

**Architecture:** Migration de tout le segment `app/(app)`, `app/(auth)` et page racine sous `app/[locale]/` (next-intl App Router pattern). Création d'un module `DemoRequestsModule` NestJS pour le form public (POST `/api/public/demo-request`) avec validation Cloudflare Turnstile invisible + Throttler 5/h/IP + envoi Resend bilingue. Sept sections server-first composent la landing avec design tokens existants. Aucun changement de schéma Prisma (V0 email-only pipeline).

**Tech Stack:** Next.js 14 App Router · next-intl 4.12 · react-hook-form 7.53 + @hookform/resolvers 3.9 + zod 3.23 · NestJS 10 + class-validator · Cloudflare Turnstile (NEW front + secret) · Resend (existant V1.5) · React Email (existant pattern V1.5) · Tailwind RTL variants.

**Spec source:** `docs/superpowers/specs/2026-05-25-landing-klasso-design.md` (commit `148e5da` sur `feat/landing-bilingue`)

---

## File Structure (locked decisions)

### Nouveaux fichiers — 22 files

```
apps/web/
├── i18n.ts                                                          # NEW — next-intl config
├── messages/
│   └── ar.json                                                      # NEW — traductions arabes
├── app/[locale]/
│   ├── layout.tsx                                                   # NEW (root layout post-migration)
│   └── page.tsx                                                     # NEW (landing — compose 7 sections)
├── components/landing/
│   ├── hero.tsx                                                     # NEW server
│   ├── benefits.tsx                                                 # NEW server
│   ├── modules-grid.tsx                                             # NEW server
│   ├── trust.tsx                                                    # NEW server
│   ├── pricing.tsx                                                  # NEW server
│   ├── demo-form.tsx                                                # NEW client (RHF + Turnstile)
│   ├── footer.tsx                                                   # NEW server
│   └── language-switcher.tsx                                        # NEW client
├── lib/validation/
│   └── demo-request.schemas.ts                                      # NEW (Zod schema front)
└── app/api/public/demo-request/
    └── route.ts                                                     # NEW (passthrough proxy → NestJS)

apps/api/src/demo-requests/
├── demo-requests.module.ts                                          # NEW
├── demo-requests.controller.ts                                      # NEW
├── demo-requests.service.ts                                         # NEW
├── demo-requests.service.spec.ts                                    # NEW
└── dto/demo-request.dto.ts                                          # NEW

apps/api/src/common/email/templates/
└── demo-request.tsx                                                 # NEW

apps/api/test/
└── demo-requests.e2e-spec.ts                                        # NEW

docs/adr/
└── 0007-public-landing-bilingue.md                                  # NEW (P4)
```

### Fichiers déplacés (35 files — P1 routing migration)

Tous les fichiers actuels sous `app/(app)/`, `app/(auth)/`, et les fichiers racine `app/layout.tsx` + `app/page.tsx` doivent être déplacés sous `app/[locale]/`. **Liste exhaustive ci-dessous** (source → cible).

#### Group (app) — 23 files

| Source | Cible |
|---|---|
| `apps/web/app/(app)/app-shell-client.tsx` | `apps/web/app/[locale]/(app)/app-shell-client.tsx` |
| `apps/web/app/(app)/layout.tsx` | `apps/web/app/[locale]/(app)/layout.tsx` |
| `apps/web/app/(app)/dashboard/page.tsx` | `apps/web/app/[locale]/(app)/dashboard/page.tsx` |
| `apps/web/app/(app)/profile/page.tsx` | `apps/web/app/[locale]/(app)/profile/page.tsx` |
| `apps/web/app/(app)/admin/layout.tsx` | `apps/web/app/[locale]/(app)/admin/layout.tsx` |
| `apps/web/app/(app)/admin/tenants/page.tsx` | `apps/web/app/[locale]/(app)/admin/tenants/page.tsx` |
| `apps/web/app/(app)/admin/tenants/tenants-list.tsx` | `apps/web/app/[locale]/(app)/admin/tenants/tenants-list.tsx` |
| `apps/web/app/(app)/admin/tenants/new/page.tsx` | `apps/web/app/[locale]/(app)/admin/tenants/new/page.tsx` |
| `apps/web/app/(app)/admin/tenants/new/create-tenant-form.tsx` | `apps/web/app/[locale]/(app)/admin/tenants/new/create-tenant-form.tsx` |
| `apps/web/app/(app)/admin/tenants/[id]/page.tsx` | `apps/web/app/[locale]/(app)/admin/tenants/[id]/page.tsx` |
| `apps/web/app/(app)/admin/tenants/[id]/tenant-detail.tsx` | `apps/web/app/[locale]/(app)/admin/tenants/[id]/tenant-detail.tsx` |
| `apps/web/app/(app)/settings/branding/page.tsx` | `apps/web/app/[locale]/(app)/settings/branding/page.tsx` |
| `apps/web/app/(app)/settings/branding/branding-form.tsx` | `apps/web/app/[locale]/(app)/settings/branding/branding-form.tsx` |
| `apps/web/app/(app)/settings/branding/logo-uploader.tsx` | `apps/web/app/[locale]/(app)/settings/branding/logo-uploader.tsx` |
| `apps/web/app/(app)/students/page.tsx` | `apps/web/app/[locale]/(app)/students/page.tsx` |
| `apps/web/app/(app)/students/students-list.tsx` | `apps/web/app/[locale]/(app)/students/students-list.tsx` |
| `apps/web/app/(app)/students/new/page.tsx` | `apps/web/app/[locale]/(app)/students/new/page.tsx` |
| `apps/web/app/(app)/students/new/create-student-form.tsx` | `apps/web/app/[locale]/(app)/students/new/create-student-form.tsx` |
| `apps/web/app/(app)/students/[id]/page.tsx` | `apps/web/app/[locale]/(app)/students/[id]/page.tsx` |
| `apps/web/app/(app)/students/[id]/student-detail.tsx` | `apps/web/app/[locale]/(app)/students/[id]/student-detail.tsx` |
| `apps/web/app/(app)/students/bulk-import/page.tsx` | `apps/web/app/[locale]/(app)/students/bulk-import/page.tsx` |
| `apps/web/app/(app)/students/bulk-import/bulk-import-form.tsx` | `apps/web/app/[locale]/(app)/students/bulk-import/bulk-import-form.tsx` |
| `apps/web/app/(app)/students/components/photo-upload.tsx` | `apps/web/app/[locale]/(app)/students/components/photo-upload.tsx` |

#### Group (auth) — 13 files

| Source | Cible |
|---|---|
| `apps/web/app/(auth)/layout.tsx` | `apps/web/app/[locale]/(auth)/layout.tsx` |
| `apps/web/app/(auth)/login/page.tsx` | `apps/web/app/[locale]/(auth)/login/page.tsx` |
| `apps/web/app/(auth)/register/page.tsx` | `apps/web/app/[locale]/(auth)/register/page.tsx` |
| `apps/web/app/(auth)/forgot-password/page.tsx` | `apps/web/app/[locale]/(auth)/forgot-password/page.tsx` |
| `apps/web/app/(auth)/reset-password/page.tsx` | `apps/web/app/[locale]/(auth)/reset-password/page.tsx` |
| `apps/web/app/(auth)/verify-email/page.tsx` | `apps/web/app/[locale]/(auth)/verify-email/page.tsx` |
| `apps/web/app/(auth)/t/[slug]/layout.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/layout.tsx` |
| `apps/web/app/(auth)/t/[slug]/login/page.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/login/page.tsx` |
| `apps/web/app/(auth)/t/[slug]/register/page.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/register/page.tsx` |
| `apps/web/app/(auth)/t/[slug]/forgot-password/page.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/forgot-password/page.tsx` |
| `apps/web/app/(auth)/t/[slug]/reset-password/page.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/reset-password/page.tsx` |
| `apps/web/app/(auth)/t/[slug]/verify-email/page.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/verify-email/page.tsx` |
| `apps/web/app/(auth)/t/[slug]/not-found.tsx` | `apps/web/app/[locale]/(auth)/t/[slug]/not-found.tsx` |

#### Root layout + page

| Source | Action |
|---|---|
| `apps/web/app/layout.tsx` | **Convert** to minimal pass-through (just `{children}`, no `<html>`) — required for next-intl App Router with sub-paths. New `<html>` lives in `app/[locale]/layout.tsx`. |
| `apps/web/app/page.tsx` | **Move** to `apps/web/app/[locale]/page.tsx` AND **REWRITE** as landing (composes 7 sections). Old root is currently a `/login` redirect — will be replaced. |
| `apps/web/app/globals.css` | **Keep at root** — no change. |
| `apps/web/app/api/**` | **Keep at root** — API routes NOT under locale. |

### Fichiers modifiés (non-déplacés)

| File | Modifications |
|---|---|
| `apps/web/next.config.mjs` | Wrap with `withNextIntl()` plugin |
| `apps/web/middleware.ts` | Wrap existing logic with next-intl middleware + locale-aware path prefixes |
| `apps/web/messages/fr.json` | Étendu avec strings landing |
| `apps/web/package.json` | Add `@marsidev/react-turnstile` dep |
| `apps/api/src/app.module.ts` | Import `DemoRequestsModule` |
| `apps/api/src/common/config/configuration.ts` | Add env keys `turnstile.secretKey`, `demoRequest.toEmail` |
| `apps/api/src/common/config/env.validation.ts` | Add validation for new env vars |
| `apps/api/package.json` | No new deps (Resend + React Email déjà présents) |
| `docs/roadmap.md` | Entry "Landing publique" + D25 lock |

---

## Variables d'environnement nouvelles

### Web (Vercel — project `ecole-saas`)

| Var | Where | Production value |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel env (Production + Preview) | Cloudflare Turnstile site key publique |

### API (Railway)

| Var | Where | Production value |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Railway env | Cloudflare Turnstile secret key (server-side verify) |
| `DEMO_REQUEST_TO_EMAIL` | Railway env | `ultra3omda@gmail.com` (V0) → `demo@klasso.tn` (post Google Workspace setup) |

**Note action user en parallèle dev** : créer un widget Turnstile sur [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com) (gratuit), mode "Invisible", domain `klasso.tn` + `*.vercel.app` pour previews. Récupérer site key + secret key.

---

# Phase P1 — i18n foundation + routing migration (~0.5j)

## Task 1: Setup next-intl config + minimal ar.json placeholder

**Files:**
- Create: `apps/web/i18n.ts`
- Create: `apps/web/messages/ar.json`
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: Verify next-intl version installed**

Run: `grep '"next-intl"' apps/web/package.json`
Expected: `"next-intl": "^4.12.0",`

- [ ] **Step 2: Create `apps/web/i18n.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['fr', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();
  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create minimal `apps/web/messages/ar.json` placeholder**

```json
{
  "common": {
    "appName": "كلاسو"
  }
}
```

- [ ] **Step 4: Read existing `apps/web/next.config.mjs`**

Run: `cat apps/web/next.config.mjs`

- [ ] **Step 5: Modify `apps/web/next.config.mjs` to wrap with next-intl plugin**

Add at TOP of file:
```javascript
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./i18n.ts');
```

Then wrap the existing export at the BOTTOM:
```javascript
export default withNextIntl(nextConfig);
```

(Replacing the existing `export default nextConfig;`)

- [ ] **Step 6: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: zero error.

- [ ] **Step 7: Commit**

```bash
git add apps/web/i18n.ts apps/web/messages/ar.json apps/web/next.config.mjs
git commit -m "feat(web/i18n): setup next-intl config with fr/ar locales (P1.1)"
```

---

## Task 2: Migrate root layout + create [locale] layout with next-intl provider

**Files:**
- Modify: `apps/web/app/layout.tsx` (strip down to passthrough)
- Create: `apps/web/app/[locale]/layout.tsx`

- [ ] **Step 1: Read current `apps/web/app/layout.tsx`** and copy its content for reference

Run: `cat apps/web/app/layout.tsx`
Note: you will MOVE the `<html>`, `<body>`, fonts, providers into `[locale]/layout.tsx`.

- [ ] **Step 2: Create directory**

Run: `mkdir -p "apps/web/app/[locale]"`

- [ ] **Step 3: Create `apps/web/app/[locale]/layout.tsx`** (template — adapt to preserve existing imports)

```tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { locales, type Locale } from '@/i18n';

// IMPORTANT : copier ici les imports existants de app/layout.tsx
// (fonts Inter/Geist, globals.css, autres providers...)

export const metadata: Metadata = {
  title: 'Klasso — L\'école à l\'ère numérique',
  description: 'Plateforme SaaS de gestion d\'écoles tunisiennes',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* Copier ici les providers existants (QueryClient, Theme, Toaster...) */}
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**IMPORTANT** : préserver tous les imports/providers existants. MOVE + WRAP, pas REWRITE.

- [ ] **Step 4: Convert `apps/web/app/layout.tsx` to minimal passthrough**

Replace ENTIRE content with:
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: temporary errors possible — fixed by Tasks 3-7.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/layout.tsx "apps/web/app/[locale]/layout.tsx"
git commit -m "feat(web/i18n): move root layout under [locale] with NextIntlProvider (P1.2)"
```

---

## Task 3: Move root page.tsx to [locale]/page.tsx (placeholder landing)

**Files:**
- Move: `apps/web/app/page.tsx` → `apps/web/app/[locale]/page.tsx`

- [ ] **Step 1: Create `apps/web/app/[locale]/page.tsx` placeholder**

```tsx
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Klasso — L\'école à l\'ère numérique',
};

export default function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Klasso</h1>
        <p className="text-lg text-muted-foreground">L&apos;école à l&apos;ère numérique</p>
        <a href="/login" className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium">
          Se connecter
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Delete old `apps/web/app/page.tsx`**

Run: `rm apps/web/app/page.tsx`

- [ ] **Step 3: Type-check (errors expected — fixed by Task 6+7)**

Run: `pnpm --filter=@ecole-saas/web type-check`

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx "apps/web/app/[locale]/page.tsx"
git commit -m "feat(web/i18n): move root page.tsx under [locale] with placeholder (P1.3)"
```

---

## Task 4: Move (app) group under [locale]/(app)

**Files:** 23 files moved.

- [ ] **Step 1: Create target directory tree**

```bash
mkdir -p "apps/web/app/[locale]/(app)/admin/tenants/[id]"
mkdir -p "apps/web/app/[locale]/(app)/admin/tenants/new"
mkdir -p "apps/web/app/[locale]/(app)/dashboard"
mkdir -p "apps/web/app/[locale]/(app)/profile"
mkdir -p "apps/web/app/[locale]/(app)/settings/branding"
mkdir -p "apps/web/app/[locale]/(app)/students/[id]"
mkdir -p "apps/web/app/[locale]/(app)/students/bulk-import"
mkdir -p "apps/web/app/[locale]/(app)/students/components"
mkdir -p "apps/web/app/[locale]/(app)/students/new"
```

- [ ] **Step 2: Move all 23 files via git mv**

```bash
git mv "apps/web/app/(app)/app-shell-client.tsx" "apps/web/app/[locale]/(app)/app-shell-client.tsx"
git mv "apps/web/app/(app)/layout.tsx" "apps/web/app/[locale]/(app)/layout.tsx"
git mv "apps/web/app/(app)/dashboard/page.tsx" "apps/web/app/[locale]/(app)/dashboard/page.tsx"
git mv "apps/web/app/(app)/profile/page.tsx" "apps/web/app/[locale]/(app)/profile/page.tsx"
git mv "apps/web/app/(app)/admin/layout.tsx" "apps/web/app/[locale]/(app)/admin/layout.tsx"
git mv "apps/web/app/(app)/admin/tenants/page.tsx" "apps/web/app/[locale]/(app)/admin/tenants/page.tsx"
git mv "apps/web/app/(app)/admin/tenants/tenants-list.tsx" "apps/web/app/[locale]/(app)/admin/tenants/tenants-list.tsx"
git mv "apps/web/app/(app)/admin/tenants/new/page.tsx" "apps/web/app/[locale]/(app)/admin/tenants/new/page.tsx"
git mv "apps/web/app/(app)/admin/tenants/new/create-tenant-form.tsx" "apps/web/app/[locale]/(app)/admin/tenants/new/create-tenant-form.tsx"
git mv "apps/web/app/(app)/admin/tenants/[id]/page.tsx" "apps/web/app/[locale]/(app)/admin/tenants/[id]/page.tsx"
git mv "apps/web/app/(app)/admin/tenants/[id]/tenant-detail.tsx" "apps/web/app/[locale]/(app)/admin/tenants/[id]/tenant-detail.tsx"
git mv "apps/web/app/(app)/settings/branding/page.tsx" "apps/web/app/[locale]/(app)/settings/branding/page.tsx"
git mv "apps/web/app/(app)/settings/branding/branding-form.tsx" "apps/web/app/[locale]/(app)/settings/branding/branding-form.tsx"
git mv "apps/web/app/(app)/settings/branding/logo-uploader.tsx" "apps/web/app/[locale]/(app)/settings/branding/logo-uploader.tsx"
git mv "apps/web/app/(app)/students/page.tsx" "apps/web/app/[locale]/(app)/students/page.tsx"
git mv "apps/web/app/(app)/students/students-list.tsx" "apps/web/app/[locale]/(app)/students/students-list.tsx"
git mv "apps/web/app/(app)/students/new/page.tsx" "apps/web/app/[locale]/(app)/students/new/page.tsx"
git mv "apps/web/app/(app)/students/new/create-student-form.tsx" "apps/web/app/[locale]/(app)/students/new/create-student-form.tsx"
git mv "apps/web/app/(app)/students/[id]/page.tsx" "apps/web/app/[locale]/(app)/students/[id]/page.tsx"
git mv "apps/web/app/(app)/students/[id]/student-detail.tsx" "apps/web/app/[locale]/(app)/students/[id]/student-detail.tsx"
git mv "apps/web/app/(app)/students/bulk-import/page.tsx" "apps/web/app/[locale]/(app)/students/bulk-import/page.tsx"
git mv "apps/web/app/(app)/students/bulk-import/bulk-import-form.tsx" "apps/web/app/[locale]/(app)/students/bulk-import/bulk-import-form.tsx"
git mv "apps/web/app/(app)/students/components/photo-upload.tsx" "apps/web/app/[locale]/(app)/students/components/photo-upload.tsx"
```

- [ ] **Step 3: Delete old empty (app) directory**

Run: `rm -rf "apps/web/app/(app)"`

- [ ] **Step 4: Commit**

```bash
git add -A "apps/web/app/(app)/" "apps/web/app/[locale]/(app)/"
git commit -m "feat(web/i18n): move (app) group under [locale]/(app) — 23 files (P1.4)"
```

---

## Task 5: Move (auth) group under [locale]/(auth)

**Files:** 13 files moved.

- [ ] **Step 1: Create target directory tree**

```bash
mkdir -p "apps/web/app/[locale]/(auth)/login"
mkdir -p "apps/web/app/[locale]/(auth)/register"
mkdir -p "apps/web/app/[locale]/(auth)/forgot-password"
mkdir -p "apps/web/app/[locale]/(auth)/reset-password"
mkdir -p "apps/web/app/[locale]/(auth)/verify-email"
mkdir -p "apps/web/app/[locale]/(auth)/t/[slug]/login"
mkdir -p "apps/web/app/[locale]/(auth)/t/[slug]/register"
mkdir -p "apps/web/app/[locale]/(auth)/t/[slug]/forgot-password"
mkdir -p "apps/web/app/[locale]/(auth)/t/[slug]/reset-password"
mkdir -p "apps/web/app/[locale]/(auth)/t/[slug]/verify-email"
```

- [ ] **Step 2: Move all 13 files**

```bash
git mv "apps/web/app/(auth)/layout.tsx" "apps/web/app/[locale]/(auth)/layout.tsx"
git mv "apps/web/app/(auth)/login/page.tsx" "apps/web/app/[locale]/(auth)/login/page.tsx"
git mv "apps/web/app/(auth)/register/page.tsx" "apps/web/app/[locale]/(auth)/register/page.tsx"
git mv "apps/web/app/(auth)/forgot-password/page.tsx" "apps/web/app/[locale]/(auth)/forgot-password/page.tsx"
git mv "apps/web/app/(auth)/reset-password/page.tsx" "apps/web/app/[locale]/(auth)/reset-password/page.tsx"
git mv "apps/web/app/(auth)/verify-email/page.tsx" "apps/web/app/[locale]/(auth)/verify-email/page.tsx"
git mv "apps/web/app/(auth)/t/[slug]/layout.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/layout.tsx"
git mv "apps/web/app/(auth)/t/[slug]/login/page.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/login/page.tsx"
git mv "apps/web/app/(auth)/t/[slug]/register/page.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/register/page.tsx"
git mv "apps/web/app/(auth)/t/[slug]/forgot-password/page.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/forgot-password/page.tsx"
git mv "apps/web/app/(auth)/t/[slug]/reset-password/page.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/reset-password/page.tsx"
git mv "apps/web/app/(auth)/t/[slug]/verify-email/page.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/verify-email/page.tsx"
git mv "apps/web/app/(auth)/t/[slug]/not-found.tsx" "apps/web/app/[locale]/(auth)/t/[slug]/not-found.tsx"
```

- [ ] **Step 3: Delete old empty directory**

Run: `rm -rf "apps/web/app/(auth)"`

- [ ] **Step 4: Commit**

```bash
git add -A "apps/web/app/(auth)/" "apps/web/app/[locale]/(auth)/"
git commit -m "feat(web/i18n): move (auth) group under [locale]/(auth) — 13 files (P1.5)"
```

---

## Task 6: Update middleware.ts for next-intl coexistence

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Replace `apps/web/middleware.ts` with locale-aware version**

```typescript
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { defaultLocale, locales } from '@/i18n';
import { REFRESH_COOKIE_NAME } from '@/lib/auth/cookies';
import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';

const PROTECTED_PREFIXES = ['/dashboard'];
const AUTH_PREFIXES = ['/login', '/register'];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn';
const SUBDOMAIN_RESOLVER_ENABLED = process.env.ENABLE_SUBDOMAIN_RESOLVER === 'true';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

function stripLocale(path: string): string {
  for (const locale of locales) {
    if (path === `/${locale}`) return '/';
    if (path.startsWith(`/${locale}/`)) return path.slice(locale.length + 1);
  }
  return path;
}

export function middleware(request: NextRequest): NextResponse {
  const host = request.headers.get('host') ?? '';
  const path = request.nextUrl.pathname;

  // Subdomain resolver (dormant by default)
  if (SUBDOMAIN_RESOLVER_ENABLED) {
    const slug = extractTenantSlugFromHost(host, BASE_DOMAIN);
    if (slug) {
      const stripped = stripLocale(path);
      if (!stripped.startsWith(`/t/${slug}`)) {
        const url = request.nextUrl.clone();
        const localeMatch = path.match(/^\/(fr|ar)(\/|$)/);
        const locale = localeMatch ? localeMatch[1] : '';
        url.pathname = locale ? `/${locale}/t/${slug}${stripped}` : `/t/${slug}${stripped}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  // Auth redirects (locale-aware)
  const hasRefreshCookie = !!request.cookies.get(REFRESH_COOKIE_NAME);
  const stripped = stripLocale(path);
  const localeMatch = path.match(/^\/(fr|ar)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : defaultLocale;

  if (
    PROTECTED_PREFIXES.some((p) => stripped === p || stripped.startsWith(`${p}/`)) &&
    !hasRefreshCookie
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (AUTH_PREFIXES.some((p) => stripped === p) && hasRefreshCookie) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Delegate to next-intl
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: middleware compiles. Pages still have broken Links — Task 7 fixes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web/i18n): middleware locale-aware + next-intl coexistence (P1.6)"
```

---

## Task 7: Update all Link imports to next-intl/link

**Files:** All `.tsx` files under `apps/web/app/[locale]/` and `apps/web/components/` containing `next/link` imports.

- [ ] **Step 1: Find all next/link imports**

Run: `grep -rn "from 'next/link'" apps/web/app apps/web/components 2>/dev/null | head -50`

- [ ] **Step 2: Replace via sed (or PowerShell on Windows)**

**Bash/WSL:**
```bash
find "apps/web/app/[locale]" -name "*.tsx" -exec sed -i "s|from 'next/link'|from 'next-intl/link'|g" {} \;
find "apps/web/components" -name "*.tsx" -exec sed -i "s|from 'next/link'|from 'next-intl/link'|g" {} \; 2>/dev/null || true
```

**PowerShell:**
```powershell
Get-ChildItem -Recurse -Filter "*.tsx" "apps/web/app/[locale]/" |
  ForEach-Object {
    (Get-Content $_.FullName) -replace "from 'next/link'", "from 'next-intl/link'" |
      Set-Content $_.FullName
  }
```

- [ ] **Step 3: Update useRouter/usePathname imports where used for navigation**

Run: `grep -rn "from 'next/navigation'" "apps/web/app/[locale]" | grep -i "useRouter\|usePathname"`

For each file that imports `useRouter` from `next/navigation` AND uses `router.push('/path')` (navigation), replace with:
```typescript
import { useRouter } from 'next-intl/client';
```

(Leave server-side `redirect()` imports from `next/navigation` as-is.)

- [ ] **Step 4: Verify no remaining `next/link` imports**

Run: `grep -rn "from 'next/link'" apps/web/app apps/web/components 2>/dev/null`
Expected: zero matches.

- [ ] **Step 5: Type-check + build**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web build
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/[locale]/" apps/web/components/
git commit -m "refactor(web/i18n): switch all Link imports to next-intl/link (P1.7)"
```

---

## Task 8: Smoke test login + P1 wrap commit

**Files:** None — verification only.

- [ ] **Step 1: Start dev server**

Run: `pnpm --filter=@ecole-saas/web dev`
Expected: starts on `http://localhost:3000`.

- [ ] **Step 2: Manual smoke test (browser)**

Visit these URLs sequentially and verify each works:

1. `http://localhost:3000/` → redirects to `/fr`
2. `http://localhost:3000/fr` → placeholder landing FR
3. `http://localhost:3000/ar` → placeholder landing AR with `<html dir="rtl">` (inspect DevTools)
4. `http://localhost:3000/fr/login` → login page in FR
5. `http://localhost:3000/ar/login` → login page (same content, `dir="rtl"`)
6. Login with seed credentials → redirects to `/fr/dashboard`
7. Navigate to `/fr/students` → students list loads
8. Logout → redirects to `/fr/login`

Fix any broken pages before commit.

- [ ] **Step 3: Run lint**

Run: `pnpm --filter=@ecole-saas/web lint`
Expected: zero warnings.

- [ ] **Step 4: Final commit + push P1**

```bash
git commit --allow-empty -m "feat(web/i18n): P1 complete — i18n + routing migration smoke tested"
git push -u origin feat/landing-bilingue
```

---

# Phase P2 — Landing sections statiques (~0.5j)

## Task 9: Populate fr.json + ar.json with landing strings

**Files:**
- Modify: `apps/web/messages/fr.json`
- Modify: `apps/web/messages/ar.json`

- [ ] **Step 1: Replace `apps/web/messages/fr.json` (full content)**

```json
{
  "common": {
    "appName": "Klasso",
    "tagline": "L'école à l'ère numérique"
  },
  "landing": {
    "hero": {
      "title": "L'école à l'ère numérique",
      "subtitle": "— sans complexité",
      "description": "La plateforme SaaS qui gère élèves, parents, enseignants et finances de votre établissement, en un seul endroit.",
      "ctaPrimary": "Demander une démo gratuite",
      "ctaSecondary": "Se connecter"
    },
    "benefits": {
      "title": "Pensé pour les écoles tunisiennes",
      "items": {
        "students": {
          "title": "Gestion élèves complète",
          "description": "Fiches détaillées, photos, classes, suivi scolaire et antécédents — tout dans un seul tableau de bord."
        },
        "communication": {
          "title": "Communication parents transparente",
          "description": "Les parents voient en temps réel les informations de leurs enfants. Fini les bouts de papier perdus."
        },
        "pedagogy": {
          "title": "Suivi pédagogique simplifié",
          "description": "Évaluations, bulletins, rapports trimestriels — générés automatiquement, exportables en PDF."
        }
      }
    },
    "modules": {
      "title": "Modules disponibles et roadmap",
      "subtitle": "Klasso s'étend chaque trimestre. Voici ce que vous obtenez aujourd'hui et ce qui arrive bientôt.",
      "items": {
        "students": { "name": "Élèves", "status": "Disponible" },
        "parents": { "name": "Parents", "status": "Été 2026" },
        "teachers": { "name": "Enseignants", "status": "Été 2026" },
        "billing": { "name": "Facturation", "status": "Automne 2026" },
        "cantine": { "name": "Cantine & Transport", "status": "2027" },
        "health": { "name": "Santé & Bien-être", "status": "2027" }
      }
    },
    "trust": {
      "title": "Une plateforme de confiance",
      "items": {
        "rgpd": {
          "title": "RGPD-ready",
          "description": "Isolation multi-tenant testée, audit logs, export et suppression des données utilisateurs."
        },
        "hosting": {
          "title": "Hébergement sécurisé",
          "description": "Serveurs européens (Neon, Vercel) + CDN local. Sauvegardes quotidiennes."
        },
        "support": {
          "title": "Support bilingue",
          "description": "Équipe FR/AR, réponse sous 24 heures ouvrées."
        },
        "updates": {
          "title": "Mises à jour continues",
          "description": "Nouvelles fonctionnalités mensuelles, sans intervention de votre part."
        }
      }
    },
    "pricing": {
      "title": "Tarifs simples, par élève",
      "subtitle": "Tarifs HT en TND. Engagement annuel. Période d'essai 30 jours sans carte bancaire.",
      "popular": "Le plus populaire",
      "tiers": {
        "starter": {
          "name": "Starter",
          "price": "5",
          "unit": "TND / élève / mois",
          "limit": "Jusqu'à 50 élèves",
          "features": ["CRUD élèves complet", "Communication basique", "Support par email"]
        },
        "standard": {
          "name": "Standard",
          "price": "4",
          "unit": "TND / élève / mois",
          "limit": "Jusqu'à 200 élèves",
          "features": ["Tout Starter", "Import CSV en masse", "Photos d'élèves", "Multi-rôles (enseignants, staff, parents)", "Support prioritaire"]
        },
        "pro": {
          "name": "Pro",
          "price": "3",
          "unit": "TND / élève / mois",
          "limit": "Élèves illimités",
          "features": ["Tout Standard", "Onboarding personnalisé", "SLA 99.9%", "Accès API"]
        }
      },
      "cta": "Demander une démo"
    },
    "demoForm": {
      "title": "Demander une démo",
      "subtitle": "Un membre de notre équipe vous contactera sous 24 heures ouvrées.",
      "fields": {
        "firstName": "Prénom",
        "lastName": "Nom",
        "email": "Email professionnel",
        "phone": "Téléphone (optionnel)",
        "schoolName": "Nom de l'établissement",
        "studentsCount": "Nombre approximatif d'élèves",
        "message": "Message (optionnel)"
      },
      "studentsCountOptions": {
        "lt50": "Moins de 50",
        "50to200": "Entre 50 et 200",
        "200to500": "Entre 200 et 500",
        "gt500": "Plus de 500"
      },
      "submit": "Envoyer la demande",
      "submitting": "Envoi en cours…",
      "success": {
        "title": "Demande reçue ✓",
        "description": "Nous vous répondrons sous 24 heures ouvrées."
      },
      "errors": {
        "validation": "Veuillez vérifier les champs en rouge.",
        "turnstile": "Vérification anti-spam échouée. Veuillez réessayer.",
        "rateLimit": "Trop de demandes. Réessayez dans une heure.",
        "network": "Erreur réseau. Vérifiez votre connexion.",
        "generic": "Une erreur est survenue. Réessayez."
      }
    },
    "footer": {
      "tagline": "L'école à l'ère numérique",
      "links": {
        "product": "Produit",
        "pricing": "Tarifs",
        "modules": "Modules",
        "faq": "FAQ",
        "contact": "Contact",
        "legal": "Légal",
        "terms": "Mentions légales",
        "privacy": "Politique RGPD"
      },
      "language": "Langue",
      "copyright": "© 2026 Klasso — Tous droits réservés"
    }
  }
}
```

- [ ] **Step 2: Replace `apps/web/messages/ar.json` (full content)**

```json
{
  "common": {
    "appName": "كلاسو",
    "tagline": "المدرسة في عصر رقمي"
  },
  "landing": {
    "hero": {
      "title": "المدرسة في عصر رقمي",
      "subtitle": "— ببساطة",
      "description": "منصة SaaS لإدارة الطلاب وأولياء الأمور والمعلمين والمالية في مكان واحد.",
      "ctaPrimary": "اطلب عرضًا توضيحيًا مجانيًا",
      "ctaSecondary": "تسجيل الدخول"
    },
    "benefits": {
      "title": "مصممة للمدارس التونسية",
      "items": {
        "students": {
          "title": "إدارة شاملة للطلاب",
          "description": "بطاقات مفصلة وصور وفصول دراسية ومتابعة دراسية وسوابق — كل ذلك في لوحة تحكم واحدة."
        },
        "communication": {
          "title": "تواصل شفاف مع الأولياء",
          "description": "يطلع الأولياء على معلومات أبنائهم في الوقت الفعلي. لا مزيد من الأوراق الضائعة."
        },
        "pedagogy": {
          "title": "متابعة تربوية مبسطة",
          "description": "تقييمات وكشوف نقاط وتقارير ثلاثية — تُنشأ تلقائيًا وقابلة للتصدير بصيغة PDF."
        }
      }
    },
    "modules": {
      "title": "الوحدات المتاحة وخارطة الطريق",
      "subtitle": "تتوسع كلاسو كل فصل. إليكم ما تحصلون عليه اليوم وما سيأتي قريبًا.",
      "items": {
        "students": { "name": "الطلاب", "status": "متاح" },
        "parents": { "name": "أولياء الأمور", "status": "صيف 2026" },
        "teachers": { "name": "المعلمون", "status": "صيف 2026" },
        "billing": { "name": "الفوترة", "status": "خريف 2026" },
        "cantine": { "name": "المطعم والنقل", "status": "2027" },
        "health": { "name": "الصحة والرفاه", "status": "2027" }
      }
    },
    "trust": {
      "title": "منصة موثوقة",
      "items": {
        "rgpd": {
          "title": "متوافقة مع RGPD",
          "description": "عزل متعدد المستأجرين مُختبر، سجلات تدقيق، تصدير وحذف بيانات المستخدمين."
        },
        "hosting": {
          "title": "استضافة آمنة",
          "description": "خوادم أوروبية (Neon, Vercel) + شبكة CDN محلية. نسخ احتياطية يومية."
        },
        "support": {
          "title": "دعم ثنائي اللغة",
          "description": "فريق فرنسي/عربي، استجابة خلال 24 ساعة عمل."
        },
        "updates": {
          "title": "تحديثات مستمرة",
          "description": "ميزات جديدة شهريًا، دون تدخل من جانبكم."
        }
      }
    },
    "pricing": {
      "title": "أسعار بسيطة، لكل طالب",
      "subtitle": "الأسعار بالدينار التونسي قبل الضريبة. التزام سنوي. فترة تجريبية 30 يومًا دون بطاقة بنكية.",
      "popular": "الأكثر شيوعًا",
      "tiers": {
        "starter": {
          "name": "ستارتر",
          "price": "5",
          "unit": "د.ت / طالب / شهر",
          "limit": "حتى 50 طالبًا",
          "features": ["إدارة كاملة للطلاب", "تواصل أساسي", "دعم عبر البريد الإلكتروني"]
        },
        "standard": {
          "name": "ستاندرد",
          "price": "4",
          "unit": "د.ت / طالب / شهر",
          "limit": "حتى 200 طالب",
          "features": ["كل مميزات ستارتر", "استيراد CSV جماعي", "صور الطلاب", "أدوار متعددة (معلمون، موظفون، أولياء أمور)", "دعم أولوية"]
        },
        "pro": {
          "name": "برو",
          "price": "3",
          "unit": "د.ت / طالب / شهر",
          "limit": "عدد طلاب غير محدود",
          "features": ["كل مميزات ستاندرد", "إعداد مخصص", "اتفاقية مستوى خدمة 99.9%", "الوصول إلى API"]
        }
      },
      "cta": "اطلب عرضًا توضيحيًا"
    },
    "demoForm": {
      "title": "اطلب عرضًا توضيحيًا",
      "subtitle": "سيتواصل معكم أحد أعضاء فريقنا خلال 24 ساعة عمل.",
      "fields": {
        "firstName": "الاسم",
        "lastName": "اللقب",
        "email": "البريد الإلكتروني المهني",
        "phone": "الهاتف (اختياري)",
        "schoolName": "اسم المؤسسة",
        "studentsCount": "العدد التقريبي للطلاب",
        "message": "رسالة (اختياري)"
      },
      "studentsCountOptions": {
        "lt50": "أقل من 50",
        "50to200": "بين 50 و 200",
        "200to500": "بين 200 و 500",
        "gt500": "أكثر من 500"
      },
      "submit": "إرسال الطلب",
      "submitting": "جارٍ الإرسال…",
      "success": {
        "title": "تم استلام الطلب ✓",
        "description": "سنرد عليكم خلال 24 ساعة عمل."
      },
      "errors": {
        "validation": "يرجى التحقق من الحقول الحمراء.",
        "turnstile": "فشل التحقق من الحماية ضد الرسائل المزعجة. حاول مرة أخرى.",
        "rateLimit": "طلبات كثيرة جدًا. حاول بعد ساعة.",
        "network": "خطأ في الشبكة. تحقق من اتصالك.",
        "generic": "حدث خطأ. حاول مرة أخرى."
      }
    },
    "footer": {
      "tagline": "المدرسة في عصر رقمي",
      "links": {
        "product": "المنتج",
        "pricing": "الأسعار",
        "modules": "الوحدات",
        "faq": "الأسئلة الشائعة",
        "contact": "اتصل بنا",
        "legal": "قانوني",
        "terms": "الإشعارات القانونية",
        "privacy": "سياسة RGPD"
      },
      "language": "اللغة",
      "copyright": "© 2026 كلاسو — جميع الحقوق محفوظة"
    }
  }
}
```

- [ ] **Step 3: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('apps/web/messages/fr.json'))" && echo "fr OK"
node -e "JSON.parse(require('fs').readFileSync('apps/web/messages/ar.json'))" && echo "ar OK"
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/messages/fr.json apps/web/messages/ar.json
git commit -m "feat(web/landing): full FR + AR translations (P2.1)"
```

---

## Task 10: Hero component

**Files:**
- Create: `apps/web/components/landing/hero.tsx`

- [ ] **Step 1: Create directory + file**

```bash
mkdir -p apps/web/components/landing
```

Create `apps/web/components/landing/hero.tsx`:

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next-intl/link';
import type { Route } from 'next';

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-20 sm:py-28 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t('title')}
            <span className="block text-primary mt-2">{t('subtitle')}</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">{t('description')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={'#demo-form' as Route} className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {t('ctaPrimary')}
            </Link>
            <Link href={'/login' as Route} className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium hover:bg-accent hover:text-accent-foreground transition">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/components/landing/hero.tsx
git commit -m "feat(web/landing): Hero section (P2.2)"
```

---

## Task 11: Benefits component

**Files:**
- Create: `apps/web/components/landing/benefits.tsx`

- [ ] **Step 1: Create file**

```tsx
import { useTranslations } from 'next-intl';
import { Users, MessageCircle, BookOpen } from 'lucide-react';

const ITEMS = [
  { key: 'students', icon: Users },
  { key: 'communication', icon: MessageCircle },
  { key: 'pedagogy', icon: BookOpen },
] as const;

export function Benefits() {
  const t = useTranslations('landing.benefits');
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">{t('title')}</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div key={key} className="rounded-2xl border bg-card p-8 shadow-sm transition hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-6 text-xl font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/components/landing/benefits.tsx
git commit -m "feat(web/landing): Benefits — 3 cards (P2.3)"
```

---

## Task 12: ModulesGrid component

**Files:**
- Create: `apps/web/components/landing/modules-grid.tsx`

- [ ] **Step 1: Create file**

```tsx
import { useTranslations } from 'next-intl';
import { Check, Clock, Calendar } from 'lucide-react';

const MODULES = [
  { key: 'students', icon: Check, color: 'emerald' },
  { key: 'parents', icon: Clock, color: 'amber' },
  { key: 'teachers', icon: Clock, color: 'amber' },
  { key: 'billing', icon: Clock, color: 'amber' },
  { key: 'cantine', icon: Calendar, color: 'gray' },
  { key: 'health', icon: Calendar, color: 'gray' },
] as const;

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function ModulesGrid() {
  const t = useTranslations('landing.modules');
  return (
    <section className="bg-muted/30 py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ key, icon: Icon, color }) => (
            <div key={key} className="rounded-xl border bg-card p-6 flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${colorClasses[color]}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{t(`items.${key}.name`)}</h3>
                <p className={`mt-1 text-sm ${color === 'emerald' ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                  {t(`items.${key}.status`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/components/landing/modules-grid.tsx
git commit -m "feat(web/landing): ModulesGrid — 6 modules (P2.4)"
```

---

## Task 13: Trust component

**Files:**
- Create: `apps/web/components/landing/trust.tsx`

- [ ] **Step 1: Create file**

```tsx
import { useTranslations } from 'next-intl';
import { Shield, Server, MessageSquare, Sparkles } from 'lucide-react';

const ITEMS = [
  { key: 'rgpd', icon: Shield },
  { key: 'hosting', icon: Server },
  { key: 'support', icon: MessageSquare },
  { key: 'updates', icon: Sparkles },
] as const;

export function Trust() {
  const t = useTranslations('landing.trust');
  return (
    <section className="py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">{t('title')}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, icon: Icon }) => (
            <div key={key} className="text-center sm:text-start">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`items.${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/components/landing/trust.tsx
git commit -m "feat(web/landing): Trust — 4 trust signals (P2.5)"
```

---

## Task 14: Pricing component

**Files:**
- Create: `apps/web/components/landing/pricing.tsx`

- [ ] **Step 1: Create file**

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next-intl/link';
import type { Route } from 'next';
import { Check } from 'lucide-react';

const TIERS = [
  { key: 'starter', featured: false, featuresCount: 3 },
  { key: 'standard', featured: true, featuresCount: 5 },
  { key: 'pro', featured: false, featuresCount: 4 },
] as const;

export function Pricing() {
  const t = useTranslations('landing.pricing');
  return (
    <section id="pricing" className="bg-muted/30 py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-8 lg:items-stretch">
          {TIERS.map(({ key, featured, featuresCount }) => (
            <div key={key} className={`rounded-2xl border bg-card p-8 ${featured ? 'border-primary shadow-xl lg:scale-105' : 'shadow-sm'}`}>
              {featured && (
                <p className="inline-block rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{t('popular')}</p>
              )}
              <h3 className={`${featured ? 'mt-4' : ''} text-2xl font-semibold`}>{t(`tiers.${key}.name`)}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">{t(`tiers.${key}.price`)}</span>
                <span className="text-sm text-muted-foreground">{t(`tiers.${key}.unit`)}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">{t(`tiers.${key}.limit`)}</p>
              <ul className="mt-6 space-y-3">
                {Array.from({ length: featuresCount }, (_, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <span>{t(`tiers.${key}.features.${i}`)}</span>
                  </li>
                ))}
              </ul>
              <Link href={'#demo-form' as Route} className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-md px-6 text-sm font-medium transition ${featured ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border bg-background hover:bg-accent'}`}>
                {t('cta')}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/components/landing/pricing.tsx
git commit -m "feat(web/landing): Pricing — 3 tiers Standard featured (P2.6)"
```

---

## Task 15: LanguageSwitcher + Footer

**Files:**
- Create: `apps/web/components/landing/language-switcher.tsx`
- Create: `apps/web/components/landing/footer.tsx`

- [ ] **Step 1: Create `language-switcher.tsx`**

```tsx
'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next-intl/client';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleSwitch = (newLocale: 'fr' | 'ar') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-background p-1">
      <Globe className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden />
      <button type="button" onClick={() => handleSwitch('fr')} aria-current={locale === 'fr' ? 'true' : undefined} className={`rounded px-3 py-1 text-sm font-medium transition ${locale === 'fr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        FR
      </button>
      <button type="button" onClick={() => handleSwitch('ar')} aria-current={locale === 'ar' ? 'true' : undefined} className={`rounded px-3 py-1 text-sm font-medium transition ${locale === 'ar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        العربية
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `footer.tsx`**

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next-intl/link';
import type { Route } from 'next';
import { LanguageSwitcher } from './language-switcher';

export function Footer() {
  const t = useTranslations('landing.footer');
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="text-lg font-bold">Klasso</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('tagline')}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">{t('links.product')}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href={'#pricing' as Route} className="hover:text-foreground">{t('links.pricing')}</Link></li>
              <li><Link href={'#modules' as Route} className="hover:text-foreground">{t('links.modules')}</Link></li>
              <li><Link href={'/login' as Route} className="hover:text-foreground">{t('links.contact')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">{t('links.legal')}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href={'/mentions-legales' as Route} className="hover:text-foreground">{t('links.terms')}</Link></li>
              <li><Link href={'/privacy' as Route} className="hover:text-foreground">{t('links.privacy')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">{t('language')}</p>
            <div className="mt-3"><LanguageSwitcher /></div>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">{t('copyright')}</div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/components/landing/language-switcher.tsx apps/web/components/landing/footer.tsx
git commit -m "feat(web/landing): LanguageSwitcher + Footer (P2.7)"
```

---

## Task 16: Compose landing in app/[locale]/page.tsx

**Files:**
- Modify: `apps/web/app/[locale]/page.tsx`

- [ ] **Step 1: Replace placeholder content**

```tsx
import type { Metadata } from 'next';

import { Hero } from '@/components/landing/hero';
import { Benefits } from '@/components/landing/benefits';
import { ModulesGrid } from '@/components/landing/modules-grid';
import { Trust } from '@/components/landing/trust';
import { Pricing } from '@/components/landing/pricing';
import { Footer } from '@/components/landing/footer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Klasso — L\'école à l\'ère numérique',
  description: 'Plateforme SaaS de gestion d\'écoles tunisiennes — élèves, parents, enseignants et finances en un seul endroit.',
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <section id="benefits"><Benefits /></section>
      <section id="modules"><ModulesGrid /></section>
      <Trust />
      <Pricing />
      {/* DemoForm sera inséré ici en P3 (Task 24) */}
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Build + manual smoke test**

```bash
pnpm --filter=@ecole-saas/web build
pnpm --filter=@ecole-saas/web dev
```

Open `http://localhost:3000/fr` and `http://localhost:3000/ar`. Verify:
- Hero, Benefits (3), ModulesGrid (6), Trust (4), Pricing (3) all render
- Footer with LanguageSwitcher functional
- AR version has `dir="rtl"` on `<html>`

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/page.tsx"
git commit -m "feat(web/landing): compose landing with 6 sections + Footer (P2.8)"
```

---

# Phase P3 — Form démo + endpoint API (~0.4j)

## Task 17: Add @marsidev/react-turnstile dependency

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install**

```bash
pnpm --filter=@ecole-saas/web add @marsidev/react-turnstile
```

- [ ] **Step 2: Verify**

```bash
grep '"@marsidev/react-turnstile"' apps/web/package.json
```
Expected: `"@marsidev/react-turnstile": "^1.x.x",`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add @marsidev/react-turnstile dep (P3.1)"
```

---

## Task 18: DemoRequest DTO + Zod schema

**Files:**
- Create: `apps/api/src/demo-requests/dto/demo-request.dto.ts`
- Create: `apps/web/lib/validation/demo-request.schemas.ts`

- [ ] **Step 1: Create API DTO**

```bash
mkdir -p apps/api/src/demo-requests/dto
```

```typescript
// apps/api/src/demo-requests/dto/demo-request.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DemoRequestDto {
  @ApiProperty({ example: 'Karim', maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Ben Salem', maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'directeur@ecole-exemple.tn', maxLength: 254 })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: '+216 12 345 678' })
  @IsOptional() @IsString() @Matches(/^\+?[\d\s-]{8,20}$/, { message: 'Format téléphone invalide' })
  phone?: string;

  @ApiProperty({ example: 'École Primaire Ibn Khaldoun', maxLength: 200 })
  @IsString() @MinLength(2) @MaxLength(200)
  schoolName!: string;

  @ApiProperty({ enum: ['<50', '50-200', '200-500', '500+'], example: '50-200' })
  @IsIn(['<50', '50-200', '200-500', '500+'])
  studentsCount!: '<50' | '50-200' | '200-500' | '500+';

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;

  @ApiProperty({ enum: ['fr', 'ar'], default: 'fr' })
  @IsIn(['fr', 'ar'])
  locale!: 'fr' | 'ar';

  @ApiProperty({ description: 'Cloudflare Turnstile token' })
  @IsString() @MinLength(10)
  turnstileToken!: string;
}
```

- [ ] **Step 2: Create Zod schema for front**

```typescript
// apps/web/lib/validation/demo-request.schemas.ts
import { z } from 'zod';

export const demoRequestSchema = z.object({
  firstName: z.string().min(1, 'Requis').max(100),
  lastName: z.string().min(1, 'Requis').max(100),
  email: z.string().email('Email invalide').max(254),
  phone: z.string().regex(/^\+?[\d\s-]{8,20}$/, 'Format invalide').optional().or(z.literal('')),
  schoolName: z.string().min(2, 'Requis').max(200),
  studentsCount: z.enum(['<50', '50-200', '200-500', '500+']),
  message: z.string().max(2000).optional().or(z.literal('')),
  locale: z.enum(['fr', 'ar']),
  turnstileToken: z.string().min(10, 'Vérification anti-spam requise'),
});

export type DemoRequestFormValues = z.infer<typeof demoRequestSchema>;
```

- [ ] **Step 3: Type-check both**

```bash
pnpm --filter=@ecole-saas/api type-check
pnpm --filter=@ecole-saas/web type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/demo-requests/dto/demo-request.dto.ts apps/web/lib/validation/demo-request.schemas.ts
git commit -m "feat(api+web/demo): DemoRequestDto + Zod mirror schema (P3.2)"
```

---

## Task 19: DemoRequestService (TDD)

**Files:**
- Create: `apps/api/src/demo-requests/demo-requests.service.spec.ts`
- Create: `apps/api/src/demo-requests/demo-requests.service.ts`

- [ ] **Step 1: Write failing tests first — `demo-requests.service.spec.ts`**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { DemoRequestsService } from './demo-requests.service';

describe('DemoRequestsService.submit', () => {
  let service: DemoRequestsService;
  let resend: any;
  let prisma: any;
  let config: any;

  beforeEach(async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    resend = { send: vi.fn().mockResolvedValue({ success: true, id: 'r1' }) };
    prisma = { auditLog: { create: vi.fn().mockResolvedValue({}) } };
    config = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'turnstile.secretKey') return 'TEST_SECRET';
        if (key === 'demoRequest.toEmail') return 'team@klasso.tn';
        return undefined;
      }),
    };

    const mod = await Test.createTestingModule({
      providers: [
        DemoRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResendService, useValue: resend },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(DemoRequestsService);
  });

  it('sends email + writes audit log on valid Turnstile', async () => {
    const res = await service.submit(
      { firstName: 'K', lastName: 'B', email: 'k@e.tn', schoolName: 'É', studentsCount: '50-200', locale: 'fr', turnstileToken: 'cf-ok' } as any,
      { ip: '1.2.3.4', userAgent: 'test' },
    );
    expect(res.success).toBe(true);
    expect(res.requestId).toMatch(/^dr_/);
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('throws BadRequest TURNSTILE_FAILED on invalid token', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, 'error-codes': ['bad'] }) });
    await expect(service.submit({ firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É', studentsCount: '<50', locale: 'fr', turnstileToken: 'bad' } as any, {})).rejects.toThrow(BadRequestException);
    expect(resend.send).not.toHaveBeenCalled();
  });

  it('sends Arabic-localized email when locale=ar', async () => {
    await service.submit({ firstName: 'م', lastName: 'ب', email: 'm@e.tn', schoolName: 'مدرسة', studentsCount: '<50', locale: 'ar', turnstileToken: 'ok' } as any, {});
    expect(resend.send).toHaveBeenCalledTimes(1);
    const call = resend.send.mock.calls[0][0];
    expect(call.subject).toContain('كلاسو');
  });

  it('handles Resend failure gracefully (returns success)', async () => {
    resend.send.mockResolvedValueOnce({ success: false, error: 'rate-limited' });
    const res = await service.submit({ firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É', studentsCount: '<50', locale: 'fr', turnstileToken: 'ok' } as any, {});
    expect(res.success).toBe(true);
  });

  it('builds proper Cloudflare siteverify URL', async () => {
    await service.submit({ firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É', studentsCount: '<50', locale: 'fr', turnstileToken: 'cf-test' } as any, { ip: '5.6.7.8' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = (global.fetch as any).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('secret')).toBe('TEST_SECRET');
    expect(body.get('response')).toBe('cf-test');
    expect(body.get('remoteip')).toBe('5.6.7.8');
  });
});
```

- [ ] **Step 2: Run tests — confirm FAIL**

Run: `pnpm --filter=@ecole-saas/api test -- demo-requests.service.spec`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `demo-requests.service.ts`**

```typescript
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';

import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { DemoRequestEmail, demoRequestSubject } from '../common/email/templates/demo-request';
import type { DemoRequestDto } from './dto/demo-request.dto';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: DemoRequestDto, meta: RequestMeta = {}): Promise<{ success: true; requestId: string }> {
    await this.verifyTurnstile(dto.turnstileToken, meta.ip);

    const requestId = `dr_${createId()}`;
    const toEmail = this.config.get<string>('demoRequest.toEmail') ?? '';
    if (!toEmail) {
      this.logger.warn('DEMO_REQUEST_TO_EMAIL not configured — skipping email');
    } else {
      const subject = demoRequestSubject(dto.locale, dto.schoolName);
      const result = await this.resend.send({
        to: toEmail,
        subject,
        react: DemoRequestEmail({ ...dto, requestId }),
      });
      if (!result.success) {
        this.logger.error(`Resend failed for ${requestId}: ${String(result.error)}`);
      }
    }

    await this.prisma.auditLog
      .create({
        data: {
          id: createId(),
          action: 'demo.requested',
          resource: 'public',
          tenantId: null,
          userId: null,
          metadata: {
            requestId, email: dto.email, schoolName: dto.schoolName,
            studentsCount: dto.studentsCount, locale: dto.locale,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    this.logger.log(`Demo request: ${requestId} from ${dto.email}`);
    return { success: true, requestId };
  }

  private async verifyTurnstile(token: string, ip?: string): Promise<void> {
    const secret = this.config.get<string>('turnstile.secretKey');
    if (!secret) {
      this.logger.warn('TURNSTILE_SECRET_KEY not set — bypassing verify (DEV ONLY)');
      return;
    }
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    if (!res.ok) throw new BadRequestException({ code: 'TURNSTILE_FAILED', message: 'Vérification anti-spam échouée.' });
    const data = (await res.json()) as SiteVerifyResponse;
    if (!data.success) {
      this.logger.warn(`Turnstile rejected: ${(data['error-codes'] ?? []).join(',')}`);
      throw new BadRequestException({ code: 'TURNSTILE_FAILED', message: 'Vérification anti-spam échouée.' });
    }
  }
}
```

- [ ] **Step 4: Tests still FAIL on missing email template — that's expected**

Run: `pnpm --filter=@ecole-saas/api test -- demo-requests.service.spec`
Expected: FAIL on missing `demo-request` template module — Task 20 creates it.

- [ ] **Step 5: Commit (TDD red — green after Task 20)**

```bash
git add apps/api/src/demo-requests/demo-requests.service.ts apps/api/src/demo-requests/demo-requests.service.spec.ts
git commit -m "feat(api/demo): DemoRequestsService + 5 unit tests (TDD red) (P3.3)"
```

---

## Task 20: DemoRequest email template (React Email)

**Files:**
- Create: `apps/api/src/common/email/templates/demo-request.tsx`

- [ ] **Step 1: Create file**

```tsx
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components';
import * as React from 'react';

import type { DemoRequestDto } from '../../../demo-requests/dto/demo-request.dto';

interface Props extends DemoRequestDto {
  requestId: string;
}

export function DemoRequestEmail(props: Props): JSX.Element {
  const isAr = props.locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const labels = isAr
    ? { intro: 'طلب عرض توضيحي جديد على كلاسو', name: 'الاسم', email: 'البريد الإلكتروني', phone: 'الهاتف', school: 'المؤسسة', students: 'عدد الطلاب', message: 'رسالة', id: 'معرف الطلب' }
    : { intro: 'Nouvelle demande de démo sur Klasso', name: 'Nom', email: 'Email', phone: 'Téléphone', school: 'École', students: "Nombre d'élèves", message: 'Message', id: 'ID de demande' };

  return (
    <Html lang={props.locale} dir={dir}>
      <Head />
      <Preview>{labels.intro} — {props.schoolName}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc', padding: '32px 16px' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
          <Heading as="h1" style={{ color: '#0F172A', fontSize: '24px', margin: '0 0 16px' }}>{labels.intro}</Heading>
          <Text style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>{labels.id}: <code>{props.requestId}</code></Text>
          <Section style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <Field label={labels.name} value={`${props.firstName} ${props.lastName}`} />
            <Field label={labels.email} value={props.email} />
            {props.phone && <Field label={labels.phone} value={props.phone} />}
            <Field label={labels.school} value={props.schoolName} />
            <Field label={labels.students} value={props.studentsCount} />
            {props.message && <Field label={labels.message} value={props.message} multiline />}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <Text style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Text>
      <Text style={{ color: '#0F172A', fontSize: '14px', margin: 0, whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>{value}</Text>
    </div>
  );
}

export function demoRequestSubject(locale: 'fr' | 'ar', schoolName: string): string {
  return locale === 'ar'
    ? `[كلاسو] طلب عرض توضيحي جديد — ${schoolName}`
    : `[Klasso] Nouvelle demande de démo — ${schoolName}`;
}
```

- [ ] **Step 2: Run tests — should PASS**

Run: `pnpm --filter=@ecole-saas/api test -- demo-requests.service.spec`
Expected: 5/5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/email/templates/demo-request.tsx
git commit -m "feat(api/demo): DemoRequest email template FR/AR (TDD green 5/5) (P3.4)"
```

---

## Task 21: Controller + Module + Env config

**Files:**
- Create: `apps/api/src/demo-requests/demo-requests.controller.ts`
- Create: `apps/api/src/demo-requests/demo-requests.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/common/config/configuration.ts`
- Modify: `apps/api/src/common/config/env.validation.ts`

- [ ] **Step 1: Controller**

```typescript
// apps/api/src/demo-requests/demo-requests.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { Public } from '../auth/decorators/public.decorator';
import { DemoRequestDto } from './dto/demo-request.dto';
import { DemoRequestsService } from './demo-requests.service';

@ApiTags('public')
@Controller('public/demo-request')
@Public()
export class DemoRequestsController {
  constructor(private readonly service: DemoRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Submit a demo request (public landing form)' })
  @ApiResponse({ status: 200, description: '{ success, requestId }' })
  async submit(
    @Body() dto: DemoRequestDto,
    @Req() req: Request,
  ): Promise<{ success: true; requestId: string }> {
    return this.service.submit(dto, getRequestMeta(req));
  }
}
```

- [ ] **Step 2: Module**

```typescript
// apps/api/src/demo-requests/demo-requests.module.ts
import { Module } from '@nestjs/common';

import { EmailModule } from '../common/email/email.module';
import { DemoRequestsController } from './demo-requests.controller';
import { DemoRequestsService } from './demo-requests.service';

@Module({
  imports: [EmailModule],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
```

- [ ] **Step 3: Register in AppModule**

In `apps/api/src/app.module.ts`:
- Add `import { DemoRequestsModule } from './demo-requests/demo-requests.module';`
- Add `DemoRequestsModule` to `imports: [...]` array (alphabetical, after `AdminModule`)

- [ ] **Step 4: Add env keys in `configuration.ts`**

At end of config object:
```typescript
turnstile: {
  secretKey: process.env.TURNSTILE_SECRET_KEY,
},
demoRequest: {
  toEmail: process.env.DEMO_REQUEST_TO_EMAIL,
},
```

- [ ] **Step 5: Add validation in `env.validation.ts`**

Inside the validation class:
```typescript
@IsOptional() @IsString()
TURNSTILE_SECRET_KEY?: string;

@IsOptional() @IsEmail()
DEMO_REQUEST_TO_EMAIL?: string;
```

- [ ] **Step 6: Type-check + tests**

```bash
pnpm --filter=@ecole-saas/api type-check
pnpm --filter=@ecole-saas/api test -- demo-requests.service.spec
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/demo-requests/demo-requests.controller.ts apps/api/src/demo-requests/demo-requests.module.ts apps/api/src/app.module.ts apps/api/src/common/config/configuration.ts apps/api/src/common/config/env.validation.ts
git commit -m "feat(api/demo): Controller + Module + AppModule wiring + env (P3.5)"
```

---

## Task 22: e2e test for demo-request endpoint

**Files:**
- Create: `apps/api/test/demo-requests.e2e-spec.ts`

- [ ] **Step 1: Create file**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { ResendService } from '../src/common/email/resend.service';

describe('POST /public/demo-request (e2e)', () => {
  let app: INestApplication;
  let resendMock: any;

  beforeAll(async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as any);
    resendMock = { send: vi.fn().mockResolvedValue({ success: true, id: 'r1' }) };

    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendService).useValue(resendMock).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
  });

  beforeEach(() => {
    resendMock.send.mockClear();
    (global.fetch as any).mockClear();
  });

  afterAll(async () => { await app.close(); });

  it('submits valid demo request and returns success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/public/demo-request')
      .send({
        firstName: 'Karim', lastName: 'Test', email: 'karim@e2e-test.tn',
        schoolName: 'École E2E', studentsCount: '50-200', locale: 'fr',
        turnstileToken: 'cf-valid-test-token',
      }).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requestId).toMatch(/^dr_/);
    expect(resendMock.send).toHaveBeenCalledTimes(1);
  });

  it('rejects with 400 when Turnstile invalid', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, 'error-codes': ['bad'] }) });
    const res = await request(app.getHttpServer())
      .post('/api/public/demo-request')
      .send({
        firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É',
        studentsCount: '<50', locale: 'fr', turnstileToken: 'bad',
      }).expect(400);
    expect(res.body.code).toBe('TURNSTILE_FAILED');
    expect(resendMock.send).not.toHaveBeenCalled();
  });

  it('rejects malformed body with 400', async () => {
    await request(app.getHttpServer())
      .post('/api/public/demo-request')
      .send({ firstName: 'X', turnstileToken: 'ok' }).expect(400);
  });
});
```

- [ ] **Step 2: Run e2e**

Run: `pnpm --filter=@ecole-saas/api test -- demo-requests.e2e-spec`
Expected: 3/3 PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/demo-requests.e2e-spec.ts
git commit -m "test(api/demo): e2e 3 cases (valid/turnstile-fail/malformed) (P3.6)"
```

---

## Task 23: Next.js proxy route /api/public/demo-request

**Files:**
- Create: `apps/web/app/api/public/demo-request/route.ts`

- [ ] **Step 1: Create directory + file**

```bash
mkdir -p apps/web/app/api/public/demo-request
```

```typescript
// apps/web/app/api/public/demo-request/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

if (!/^https?:\/\//.test(API_URL)) {
  throw new Error(`NEXT_PUBLIC_API_URL must be absolute http(s). Got: "${API_URL}"`);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const upstream = await fetch(`${API_URL}/api/public/demo-request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '',
    },
    body,
  });
  const text = await upstream.text();
  return new NextResponse(text || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
```

- [ ] **Step 2: Commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add apps/web/app/api/public/demo-request/route.ts
git commit -m "feat(web/demo): Next.js proxy /api/public/demo-request (P3.7)"
```

---

## Task 24: DemoForm client + insert in landing

**Files:**
- Create: `apps/web/components/landing/demo-form.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`

- [ ] **Step 1: Create DemoForm**

```tsx
// apps/web/components/landing/demo-form.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Turnstile } from '@marsidev/react-turnstile';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { demoRequestSchema, type DemoRequestFormValues } from '@/lib/validation/demo-request.schemas';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export function DemoForm() {
  const t = useTranslations('landing.demoForm');
  const locale = useLocale() as 'fr' | 'ar';
  const turnstileRef = useRef<{ reset: () => void } | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorKey, setErrorKey] = useState<'validation' | 'turnstile' | 'rateLimit' | 'network' | 'generic'>('generic');

  const form = useForm<DemoRequestFormValues>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: { locale, turnstileToken: '', studentsCount: '50-200' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitState('submitting');
    try {
      const res = await fetch('/api/public/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.status === 429) { setErrorKey('rateLimit'); setSubmitState('error'); return; }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorKey(body.code === 'TURNSTILE_FAILED' ? 'turnstile' : 'generic');
        setSubmitState('error');
        turnstileRef.current?.reset();
        return;
      }
      setSubmitState('success');
      form.reset({ locale, turnstileToken: '', studentsCount: '50-200' });
    } catch {
      setErrorKey('network');
      setSubmitState('error');
      turnstileRef.current?.reset();
    }
  });

  if (submitState === 'success') {
    return (
      <section id="demo-form" className="bg-emerald-50 py-20 sm:py-24">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold text-emerald-900">{t('success.title')}</h2>
          <p className="mt-4 text-lg text-emerald-800">{t('success.description')}</p>
        </div>
      </section>
    );
  }

  const fieldError = (name: keyof DemoRequestFormValues) => form.formState.errors[name]?.message?.toString();

  return (
    <section id="demo-form" className="py-20 sm:py-24">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-muted-foreground">{t('subtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="text-sm font-medium">{t('fields.firstName')} *</label>
              <input id="firstName" {...form.register('firstName')} className="mt-1 h-11 w-full rounded-md border px-3" autoComplete="given-name" />
              {fieldError('firstName') && <p className="mt-1 text-xs text-rose-600" role="alert">{fieldError('firstName')}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="text-sm font-medium">{t('fields.lastName')} *</label>
              <input id="lastName" {...form.register('lastName')} className="mt-1 h-11 w-full rounded-md border px-3" autoComplete="family-name" />
              {fieldError('lastName') && <p className="mt-1 text-xs text-rose-600" role="alert">{fieldError('lastName')}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="text-sm font-medium">{t('fields.email')} *</label>
            <input id="email" type="email" {...form.register('email')} className="mt-1 h-11 w-full rounded-md border px-3" autoComplete="email" />
            {fieldError('email') && <p className="mt-1 text-xs text-rose-600" role="alert">{fieldError('email')}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium">{t('fields.phone')}</label>
            <input id="phone" {...form.register('phone')} className="mt-1 h-11 w-full rounded-md border px-3" autoComplete="tel" />
            {fieldError('phone') && <p className="mt-1 text-xs text-rose-600" role="alert">{fieldError('phone')}</p>}
          </div>

          <div>
            <label htmlFor="schoolName" className="text-sm font-medium">{t('fields.schoolName')} *</label>
            <input id="schoolName" {...form.register('schoolName')} className="mt-1 h-11 w-full rounded-md border px-3" autoComplete="organization" />
            {fieldError('schoolName') && <p className="mt-1 text-xs text-rose-600" role="alert">{fieldError('schoolName')}</p>}
          </div>

          <div>
            <label htmlFor="studentsCount" className="text-sm font-medium">{t('fields.studentsCount')} *</label>
            <select id="studentsCount" {...form.register('studentsCount')} className="mt-1 h-11 w-full rounded-md border px-3 bg-background">
              <option value="<50">{t('studentsCountOptions.lt50')}</option>
              <option value="50-200">{t('studentsCountOptions.50to200')}</option>
              <option value="200-500">{t('studentsCountOptions.200to500')}</option>
              <option value="500+">{t('studentsCountOptions.gt500')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="text-sm font-medium">{t('fields.message')}</label>
            <textarea id="message" rows={4} {...form.register('message')} className="mt-1 w-full rounded-md border px-3 py-2" />
          </div>

          {TURNSTILE_SITE_KEY && (
            <div>
              <Turnstile
                ref={turnstileRef as any}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ size: 'invisible' }}
                onSuccess={(token) => form.setValue('turnstileToken', token, { shouldValidate: true })}
                onError={() => form.setValue('turnstileToken', '', { shouldValidate: true })}
                onExpire={() => form.setValue('turnstileToken', '', { shouldValidate: true })}
              />
              {fieldError('turnstileToken') && <p className="text-xs text-rose-600" role="alert">{t('errors.turnstile')}</p>}
            </div>
          )}

          {submitState === 'error' && <p className="text-sm text-rose-600" role="alert">{t(`errors.${errorKey}`)}</p>}

          <button type="submit" disabled={submitState === 'submitting'} className="h-12 w-full rounded-md bg-primary text-base font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
            {submitState === 'submitting' ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Insert DemoForm in `app/[locale]/page.tsx`**

Add import:
```tsx
import { DemoForm } from '@/components/landing/demo-form';
```

Replace `{/* DemoForm sera inséré ici en P3 (Task 24) */}` with:
```tsx
<DemoForm />
```

- [ ] **Step 3: Type-check + build + smoke test**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web build
pnpm --filter=@ecole-saas/web dev
```

Visit `http://localhost:3000/fr#demo-form` → form renders, fields filled, submit (Turnstile bypass in dev OK).

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/demo-form.tsx "apps/web/app/[locale]/page.tsx"
git commit -m "feat(web/landing): DemoForm client with Turnstile + insert in landing (P3.8)"
```

---

# Phase P4 — Polish + audit + ADR + PR (~0.3j)

## Task 25: Hero image optimization

**Files:**
- Add: `apps/web/public/landing/hero-bg.webp`
- Modify: `apps/web/components/landing/hero.tsx`

- [ ] **Step 1: Source a CC0 image**

Find a free school/classroom image (Unsplash, Pexels, Storyset). Optimize to ≤ 150KB WebP at 1920×1080. Save at `apps/web/public/landing/hero-bg.webp`.

- [ ] **Step 2: Modify Hero to use next/image**

In `apps/web/components/landing/hero.tsx`, add at top:
```tsx
import Image from 'next/image';
```

Inside the `<section>`, before `<div className="container ...">`:
```tsx
<Image
  src="/landing/hero-bg.webp"
  alt=""
  fill
  priority
  sizes="100vw"
  className="object-cover -z-10 opacity-20"
/>
```

- [ ] **Step 3: Run Lighthouse mobile audit**

```bash
pnpm --filter=@ecole-saas/web build
pnpm --filter=@ecole-saas/web start
```

Open `http://localhost:3000/fr` in incognito Chrome → DevTools → Lighthouse → Mobile audit.

Target : Performance ≥ 90, LCP < 2.5s.

If LCP > 2.5s:
- Lower image quality
- Add `placeholder="blur"` with base64 dataURL
- Check WebP/AVIF format

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/landing/hero-bg.webp apps/web/components/landing/hero.tsx
git commit -m "perf(web/landing): optimize hero with next/image — LCP < 2.5s (P4.1)"
```

---

## Task 26: A11y manual test + Lighthouse fixes

**Files:** None (or fix files as needed).

- [ ] **Step 1: Lighthouse mobile audit on `/fr` AND `/ar`**

Target ≥ 90 sur Performance, Accessibility, Best Practices, SEO.

- [ ] **Step 2: Screen reader test**

NVDA (Windows) or VoiceOver (Mac). Navigate:
- Hero: announces h1 + subtitle + 2 CTAs
- Skip to demo-form via CTA
- Form labels announced
- Switch to AR — same flow in Arabic with RTL
- LanguageSwitcher announces FR / العربية + aria-current

- [ ] **Step 3: Keyboard focus visible**

Tab through every interactive element. Verify focus ring visible (Tailwind `focus-visible:` classes).

- [ ] **Step 4: Commit fixes if any (else skip)**

```bash
git add apps/web/
git commit -m "fix(web/landing): a11y + Lighthouse audit findings (P4.2)"
```

(If no fixes needed, skip this step — proceed to Task 27.)

---

## Task 27: ADR 0007 + roadmap update

**Files:**
- Create: `docs/adr/0007-public-landing-bilingue.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Create ADR**

```markdown
# ADR 0007 — Landing page publique bilingue FR/AR (V0 commercial)

**Date** : 2026-05-26
**Statut** : Accepté
**Auteurs** : équipe Klasso

## Contexte

V2 (Module Élèves) a livré le premier produit métier. Le domaine `klasso.tn` est configuré sur Vercel. Mais `/` redirige vers `/login` — aucune surface publique pour présenter le produit.

Pour lancer commercialement (démos écoles tunisiennes, démarchage MENA), il faut une landing publique bilingue qui présente la valeur en 30 secondes et capture les demandes de démo.

## Décisions

### D1 — Routing i18n sub-paths `/fr` et `/ar`

Sub-paths choisis vs cookie-based : SEO bilingue indispensable pour marché AR. Conséquence : migration de tout `app/(app)/` et `app/(auth)/` sous `app/[locale]/`. ~0.5j d'effort.

### D2 — Style éditorial institutionnel

Cible : directeurs/directrices d'écoles primaires/maternelles TN. Ton sobre, hiérarchique, citations, photos école. Évite l'esthétique "startup tech".

### D3 — Pricing par élève/mois

Starter 5 TND / Standard 4 TND / Pro 3 TND. Transparent, scalable, Standard featured pour ancrage prix. Forfait fixe rejeté (moins lisible petites structures).

### D4 — Cloudflare Turnstile invisible

Robuste vs bots avancés, gratuit illimité, zero friction. Honeypot rejeté (insuffisant). hCaptcha rejeté (friction visible).

## Alternatives rejetées

- **Migration partielle (landing seule sous [locale])** : incohérent SEO.
- **Switcher Vercel DNS pour wildcard** : casse mail OVH actif. Reporté V11.
- **Page FAQ remplie V0** : placeholder suffit, FAQ V1 après retours.
- **Témoignages clients V0** : zéro client en prod, ne pas inventer.

## Conséquences

### Positives
- Surface commerciale dispo dès J+2
- SEO FR + AR bilingue
- Form démo → super-admin pipeline manuel (suffit 10-20 prospects/sem)
- Infra i18n posée pour V3+ bilingue

### Négatives / migration future
- Mail super-admin sur `ultra3omda@gmail.com` → migrer `demo@klasso.tn` post Google Workspace
- Wildcard `*.klasso.tn` reporté V11
- Risque migration routing — mitigation : smoke test après chaque sous-étape

### Effort
- Estimate : ~1.5j → Réel : ~1.7j

## Références

- Spec : `docs/superpowers/specs/2026-05-25-landing-klasso-design.md`
- Plan : `docs/superpowers/plans/2026-05-25-landing-klasso.md`
- next-intl docs : https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
- Cloudflare Turnstile : https://developers.cloudflare.com/turnstile/get-started/
- Lock : D25 dans `docs/roadmap.md`
```

- [ ] **Step 2: Update `docs/roadmap.md`**

Above the existing waves table, add a row:
```markdown
| **Landing publique** | klasso.tn/ bilingue FR/AR avec 7 sections + form démo Resend-backed + Turnstile + migration routing sous [locale]. Première surface commerciale publique. | ~1.7j | V2 + klasso.tn DNS | ✅ Livré 2026-05-26 |
```

In "Décisions transverses lockées" section, append after D24:
```markdown
| D25 | **Landing publique bilingue FR/AR + V0 commercial activation** | **Décision utilisateur 2026-05-25** : (1) Style institutionnel bilingue FR/AR. (2) Routing /fr et /ar sub-paths (SEO). (3) Pricing par élève/mois 5/4/3 TND. (4) Cloudflare Turnstile invisible. (5) Tagline "L'école à l'ère numérique". <br/>Ordre vagues : Landing → Mobile stores → V3 Parents. <br/>Email demo : `process.env.DEMO_REQUEST_TO_EMAIL`, initial `ultra3omda@gmail.com`, futur `demo@klasso.tn`. <br/>Wildcard `*.klasso.tn` reporté V11. Path-based `/t/<slug>/` reste l'URL tenant V0. Voir ADR 0007. | Surface commerciale dispo + infra i18n posée. Coût ~1.7j. |
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0007-public-landing-bilingue.md docs/roadmap.md
git commit -m "docs: ADR 0007 + roadmap Landing entry + D25 lock (P4.3)"
```

---

## Task 28: Open PR draft + watch CI + auto-merge

**Files:** None — release process.

- [ ] **Step 1: Push**

```bash
git push origin feat/landing-bilingue
```

- [ ] **Step 2: Open PR draft**

```bash
gh pr create --draft --base main --head feat/landing-bilingue --title "feat(landing): klasso.tn bilingual FR/AR landing + demo request endpoint" --body "$(cat <<'EOF'
## Summary

V0 commercial launch — landing publique bilingue sur \`klasso.tn/\` avec 7 sections + form démo Resend-backed + Turnstile invisible. Migration complète routing sous \`app/[locale]/\` (next-intl /fr /ar). ADR 0007 + D25 lock.

## Phases livrées

- [x] P1 — i18n + routing migration (~0.5j) — 36 fichiers déplacés
- [x] P2 — 7 sections + FR/AR translations (~0.5j)
- [x] P3 — Form + endpoint + 8 tests (5 unit + 3 e2e) (~0.4j)
- [x] P4 — Hero image + Lighthouse + a11y + ADR + roadmap (~0.3j)

## Test plan

- [ ] CI lint + type-check + build verts
- [ ] CI tests verts
- [ ] Vercel preview deploy → /fr loads → switch /ar → form submit → email reçu
- [ ] Lighthouse mobile ≥ 90 sur 4 métriques
- [ ] Smoke test : login → dashboard → /students continue de fonctionner

## Env vars à set

Vercel \`ecole-saas\` :
- \`NEXT_PUBLIC_TURNSTILE_SITE_KEY\`

Railway API :
- \`TURNSTILE_SECRET_KEY\`
- \`DEMO_REQUEST_TO_EMAIL\` (initial \`ultra3omda@gmail.com\` → futur \`demo@klasso.tn\`)

## Hors-scope (cf. ADR 0007)

- Témoignages clients (V2.1+)
- Vidéo démo (V2.1+)
- FAQ remplie (V1)
- Dark mode (V2.1+)
- Analytics PostHog (V11)
- Wildcard \`*.klasso.tn\` (V11)

## References

- Spec : \`docs/superpowers/specs/2026-05-25-landing-klasso-design.md\`
- Plan : \`docs/superpowers/plans/2026-05-25-landing-klasso.md\`
- ADR : \`docs/adr/0007-public-landing-bilingue.md\`
EOF
)"
```

- [ ] **Step 3: Wait for CI**

```bash
gh pr checks
```

If failures, debug via `gh run view <id> --log-failed`.

- [ ] **Step 4: Mark PR ready**

```bash
gh pr ready
```

- [ ] **Step 5: Auto-merge per CLAUDE.md règle 9**

```bash
gh api -X PUT repos/ultra3omda/Jardin/pulls/<PR_NUMBER>/merge -f merge_method=merge
```

(Local `gh pr merge` may fail due to worktree conflicts — use API call as fallback, pattern from V2 PR #28.)

- [ ] **Step 6: Post-merge verification**

- Vercel auto-deploys → wait ~2 min
- Visit `https://klasso.tn` → landing FR loads
- Switch AR → RTL OK
- Submit form with test email → email reçu sur `DEMO_REQUEST_TO_EMAIL`

If all OK → **V0 commercial launch validated**.

---

# Récap effort total

| Phase | Tasks | Effort |
|---|---|---|
| P1 — i18n + routing | 1-8 | 0.5j |
| P2 — Sections statiques | 9-16 | 0.5j |
| P3 — Form + endpoint | 17-24 | 0.4j |
| P4 — Polish + ADR + PR | 25-28 | 0.3j |
| **Total** | **28 tasks** | **~1.7j** |

# Variables d'env requises avant P3

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel `ecole-saas` env |
| `TURNSTILE_SECRET_KEY` | Railway API env |
| `DEMO_REQUEST_TO_EMAIL` | Railway API env |

**Action user avant P3** : créer widget Turnstile sur [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com), mode "Invisible", domains `klasso.tn` + `*.vercel.app`. Copier site key + secret key.
