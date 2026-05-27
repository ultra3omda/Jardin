# V7-A — Design Refactor Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Klasso web app to a Klasio-inspired design system (navy `#0f1419` sidebar + ambre `#fbb13c` accent + Cormorant brand) with dynamic role × tenant-type navigation, 2-column login + 1-click demo accounts (8 personas), sticky landing top menu, and pixel-perfect dashboard matching the user's reference screenshot.

**Architecture:**
- Backend: new `apps/api/src/demo-login/` module exposing `POST /api/auth/demo-login` with persona enum → tenant slug + email lookup → existing `AuthService.issueTokens()`. Rate-limited 60/h/IP. Seed extended with 2 demo tenants + 9 demo users + realistic data.
- Frontend: new design tokens in `globals.css` + `tailwind.config.ts`. Pure-logic libs `lib/nav/menu.ts` + `lib/dashboard/config.ts` resolve persona × tenant.type → menu sections + dashboard widget config. New shared components in `components/app-shell/*` + `components/dashboard/*` + `components/landing/top-nav.tsx`. Auth layout becomes 2-col with demo accounts block.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Tailwind CSS (already configured) · shadcn/ui · TanStack Query · Zustand auth store (existing) · lucide-react icons (already installed) · Cormorant Garamond (already loaded via Google Fonts in landing) · NestJS 10 · Prisma 5 · class-validator · Vitest.

**Wave:** V7-A (ancien V7-Finance bumps to V8). Spec : `docs/superpowers/specs/2026-05-27-v7-design-refactor.md` (657 lignes, 17 sections). V7-B mobile à venir dans un plan séparé.

**Base commit:** `ba39add` (main, après merge V6 PR #37).

---

## File Structure (~28 files)

### API backend (~6 fichiers)
- **Create:** `apps/api/src/demo-login/dto/demo-login.dto.ts`
- **Create:** `apps/api/src/demo-login/demo-login.constants.ts` — persona → tenant/email map
- **Create:** `apps/api/src/demo-login/demo-login.service.ts`
- **Create:** `apps/api/src/demo-login/demo-login.service.spec.ts`
- **Create:** `apps/api/src/demo-login/demo-login.controller.ts`
- **Create:** `apps/api/src/demo-login/demo-login.module.ts`
- **Modify:** `apps/api/src/app.module.ts` — register DemoLoginModule
- **Modify:** `apps/api/prisma/seed.ts` — extended demo data (2 tenants + 9 users + realistic data)

### Web design tokens (~2 fichiers)
- **Modify:** `apps/web/app/globals.css` — V7 tokens (navy/ambre/paper/ink/status)
- **Modify:** `apps/web/tailwind.config.ts` — extend theme.colors.navy/ambre/paper/ink

### Web shared libs (~3 fichiers)
- **Create:** `apps/web/lib/nav/menu.ts` — `getNavForUser(user, tenant): NavSection[]`
- **Create:** `apps/web/lib/nav/menu.test.ts`
- **Create:** `apps/web/lib/dashboard/config.ts` — `getDashboardConfig(role, tenantType)`

### Web components (~10 fichiers)
- **Create:** `apps/web/components/app-shell/sidebar.tsx`
- **Create:** `apps/web/components/app-shell/topbar.tsx`
- **Create:** `apps/web/components/app-shell/user-pill.tsx`
- **Create:** `apps/web/components/app-shell/nav-section.tsx`
- **Create:** `apps/web/components/dashboard/kpi-card.tsx`
- **Create:** `apps/web/components/dashboard/quick-action.tsx`
- **Create:** `apps/web/components/dashboard/notes-panel.tsx`
- **Create:** `apps/web/components/dashboard/announcements-panel.tsx`
- **Create:** `apps/web/components/landing/top-nav.tsx`
- **Create:** `apps/web/components/auth/demo-accounts-block.tsx`

### Web pages refactored (~5 fichiers)
- **Modify:** `apps/web/lib/api/client.ts` — `demoLogin(persona)` function
- **Modify:** `apps/web/app/[locale]/page.tsx` — inject `<TopNav />` above Hero + add section IDs
- **Modify:** `apps/web/app/[locale]/(auth)/layout.tsx` — 2-col layout
- **Modify:** `apps/web/app/[locale]/(auth)/login/page.tsx` — V7 layout + demo block
- **Modify:** `apps/web/app/[locale]/(app)/app-shell-client.tsx` — use new Sidebar/Topbar
- **Modify:** `apps/web/app/[locale]/(app)/dashboard/page.tsx` — persona/type config

### Docs (~2 fichiers)
- **Create:** `docs/adr/0013-v7-design-system.md`
- **Modify:** `docs/roadmap.md` — renumérotation V7 → V13

---

## Domain rules to lock

**Demo personas (immutable enum)**

```typescript
export type DemoPersona =
  | 'admin-primary'
  | 'admin-kindergarten'
  | 'teacher-primary'
  | 'teacher-kindergarten'
  | 'parent-primary'
  | 'parent-kindergarten'
  | 'staff'
  | 'super-admin';
```

**Tenant type adaptation (immutable mapping)**

| KINDERGARTEN | PRIMARY_SCHOOL |
|---|---|
| "Enfants" | "Élèves" |
| "Animateurs" | "Enseignants" |
| "Groupes d'âge" | "Classes" |
| "Journal quotidien" | "Notes" (hidden in KG) |
| "Activités" | "Bulletins" (hidden in KG) |
| "Présences" | "Absences" (same module, different label) |
| (Discipline hidden) | "Discipline" |

**Rate limit demo-login:** `@Throttle({ default: { limit: 60, ttl: 3600000 } })` (60 req/hour per IP).

**Auth flow demo-login:** Identical to regular `/auth/login` minus password check. Issues same `{ user, tenant, accessToken, refreshToken }` shape. Records audit `demo.login` with persona + IP.

---

## Task 1: V7 design tokens (CSS vars + Tailwind extension)

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Add V7 tokens block to globals.css**

Open `apps/web/app/globals.css` and locate the `:root` block (currently has `--background`, `--primary`, `--paper`, etc.). Insert immediately after the `--rose-dust:` line (before the closing `}` of `:root`):

```css
  /* ─── V7 sidebar navy (Klasio-inspired) ──────────────── */
  --navy-900: #0f1419;
  --navy-800: #1a2028;
  --navy-700: #4b5563;
  --navy-600: #6b7280;
  --navy-500: #94a3b8;

  /* ─── V7 accent ambre ────────────────────────────────── */
  --ambre-50:  #fff7e0;
  --ambre-100: #fef3c7;
  --ambre-500: #fbb13c;
  --ambre-600: #e89218;
  --ambre-700: #b45309;

  /* ─── V7 surface ─────────────────────────────────────── */
  --paper-50:  #f4f4ef;
  --paper-100: #fafbfc;
  --surface:   #ffffff;

  /* ─── V7 ink ─────────────────────────────────────────── */
  --ink-900: #0f1419;
  --ink-700: #1a1d24;
  --ink-500: #475569;
  --ink-300: #94a3b8;

  /* ─── V7 status ──────────────────────────────────────── */
  --success-500: #16a34a;
  --success-100: #dcfce7;
  --info-500:    #1d4ed8;
  --info-100:    #dbeafe;
  --danger-500:  #ef4444;
```

- [ ] **Step 2: Extend Tailwind theme**

Open `apps/web/tailwind.config.ts`. In the `theme.extend.colors` object, add (or merge if existing):

```typescript
      navy: {
        500: 'var(--navy-500)',
        600: 'var(--navy-600)',
        700: 'var(--navy-700)',
        800: 'var(--navy-800)',
        900: 'var(--navy-900)',
      },
      ambre: {
        50:  'var(--ambre-50)',
        100: 'var(--ambre-100)',
        500: 'var(--ambre-500)',
        600: 'var(--ambre-600)',
        700: 'var(--ambre-700)',
      },
      paper: {
        50:  'var(--paper-50)',
        100: 'var(--paper-100)',
      },
      surface: 'var(--surface)',
      ink: {
        300: 'var(--ink-300)',
        500: 'var(--ink-500)',
        700: 'var(--ink-700)',
        900: 'var(--ink-900)',
      },
```

- [ ] **Step 3: Verify type-check + build**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web build
```

Both should PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/globals.css apps/web/tailwind.config.ts
git commit -m "feat(v7-a): V7 design tokens (navy/ambre/paper/ink) + Tailwind extend"
```

---

## Task 2: Demo-login backend — DTO + constants + service + tests

**Files:**
- Create: `apps/api/src/demo-login/dto/demo-login.dto.ts`
- Create: `apps/api/src/demo-login/demo-login.constants.ts`
- Create: `apps/api/src/demo-login/demo-login.service.ts`
- Create: `apps/api/src/demo-login/demo-login.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/demo-login/demo-login.service.spec.ts`:

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { DemoLoginService } from './demo-login.service';

function buildPrismaMock() {
  return {
    user: { findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  };
}

function buildAuthMock() {
  return {
    issueTokens: vi.fn(async () => ({
      accessToken: 'access',
      refreshToken: 'refresh',
    })),
  };
}

describe('DemoLoginService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let auth: ReturnType<typeof buildAuthMock>;
  let service: DemoLoginService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    auth = buildAuthMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new DemoLoginService(prisma as any, auth as any);
  });

  it('throws 404 when persona is unknown', async () => {
    // @ts-expect-error testing invalid persona
    await expect(service.demoLogin('not-a-persona', '127.0.0.1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws 403 when DEMO_ACCOUNTS_ENABLED=false', async () => {
    process.env.DEMO_ACCOUNTS_ENABLED = 'false';
    await expect(service.demoLogin('admin-primary', '127.0.0.1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    delete process.env.DEMO_ACCOUNTS_ENABLED;
  });

  it('throws 404 when demo user not found in DB (not seeded)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.demoLogin('admin-primary', '127.0.0.1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns tokens + user + tenant for valid persona', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@demo-ecole.klasso.tn',
      firstName: 'Amadou',
      lastName: 'Koné',
      role: 'SCHOOL_ADMIN',
      locale: 'fr',
      tenant: {
        id: 't1',
        name: 'Démo École Pilote',
        slug: 'demo-ecole',
        type: 'PRIMARY_SCHOOL',
        brand: null,
      },
    });

    const res = await service.demoLogin('admin-primary', '127.0.0.1');
    expect(res.user.id).toBe('u1');
    expect(res.tenant?.slug).toBe('demo-ecole');
    expect(res.accessToken).toBe('access');
    expect(res.refreshToken).toBe('refresh');
    expect(auth.issueTokens).toHaveBeenCalledTimes(1);
  });

  it('handles super-admin persona (null tenant)', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'su1',
      tenantId: null,
      email: 'super@klasso.tn',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      locale: 'fr',
      tenant: null,
    });
    const res = await service.demoLogin('super-admin', '127.0.0.1');
    expect(res.tenant).toBeNull();
    expect(res.user.role).toBe('SUPER_ADMIN');
  });

  it('writes audit log with persona + ip on success', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      tenantId: 't1',
      email: 'admin@demo-ecole.klasso.tn',
      firstName: 'A',
      lastName: 'K',
      role: 'SCHOOL_ADMIN',
      locale: 'fr',
      tenant: { id: 't1', name: 'X', slug: 'demo-ecole', type: 'PRIMARY_SCHOOL', brand: null },
    });
    await service.demoLogin('admin-primary', '1.2.3.4');
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'demo.login',
        ip: '1.2.3.4',
        userId: 'u1',
      }),
    }));
  });
});
```

- [ ] **Step 2: Create the DTO**

Create `apps/api/src/demo-login/dto/demo-login.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export const DEMO_PERSONAS = [
  'admin-primary',
  'admin-kindergarten',
  'teacher-primary',
  'teacher-kindergarten',
  'parent-primary',
  'parent-kindergarten',
  'staff',
  'super-admin',
] as const;

export type DemoPersona = (typeof DEMO_PERSONAS)[number];

export class DemoLoginDto {
  @ApiProperty({ enum: DEMO_PERSONAS, example: 'admin-primary' })
  @IsString()
  @IsIn(DEMO_PERSONAS as unknown as string[])
  persona!: DemoPersona;
}
```

- [ ] **Step 3: Create the constants mapping**

Create `apps/api/src/demo-login/demo-login.constants.ts`:

```typescript
import type { DemoPersona } from './dto/demo-login.dto';

interface DemoPersonaConfig {
  tenantSlug: string | null;
  email: string;
}

export const DEMO_PERSONA_MAP: Record<DemoPersona, DemoPersonaConfig> = {
  'admin-primary':         { tenantSlug: 'demo-ecole',      email: 'admin@demo-ecole.klasso.tn' },
  'admin-kindergarten':    { tenantSlug: 'demo-maternelle', email: 'admin@demo-maternelle.klasso.tn' },
  'teacher-primary':       { tenantSlug: 'demo-ecole',      email: 'prof@demo-ecole.klasso.tn' },
  'teacher-kindergarten':  { tenantSlug: 'demo-maternelle', email: 'anim@demo-maternelle.klasso.tn' },
  'parent-primary':        { tenantSlug: 'demo-ecole',      email: 'parent@demo-ecole.klasso.tn' },
  'parent-kindergarten':   { tenantSlug: 'demo-maternelle', email: 'parent@demo-maternelle.klasso.tn' },
  'staff':                 { tenantSlug: 'demo-ecole',      email: 'staff@demo-ecole.klasso.tn' },
  'super-admin':           { tenantSlug: null,              email: 'super@klasso.tn' },
};
```

- [ ] **Step 4: Create the service**

Create `apps/api/src/demo-login/demo-login.service.ts`:

```typescript
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { DEMO_PERSONA_MAP } from './demo-login.constants';
import type { DemoPersona } from './dto/demo-login.dto';

@Injectable()
export class DemoLoginService {
  private readonly logger = new Logger(DemoLoginService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async demoLogin(persona: DemoPersona, ip: string | null) {
    if (process.env.DEMO_ACCOUNTS_ENABLED === 'false') {
      throw new ForbiddenException({ code: 'DEMO_ACCOUNTS_DISABLED' });
    }

    const config = DEMO_PERSONA_MAP[persona];
    if (!config) {
      throw new NotFoundException({ code: 'UNKNOWN_PERSONA' });
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: config.email.toLowerCase(),
        tenant: config.tenantSlug ? { slug: config.tenantSlug } : null,
        deletedAt: null,
      },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`Demo user not seeded for persona=${persona}`);
      throw new NotFoundException({ code: 'DEMO_USER_NOT_SEEDED' });
    }

    const tokens = await this.auth.issueTokens(user, ip ?? undefined);

    await this.prisma.auditLog.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: user.id,
        action: 'demo.login',
        resource: `persona:${persona}`,
        ip,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locale: user.locale,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            type: user.tenant.type,
            brand: user.tenant.brand,
          }
        : null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
```

- [ ] **Step 5: Run the tests — should PASS**

```bash
pnpm --filter=@ecole-saas/api test src/demo-login/demo-login.service.spec.ts
```

Expected: 6 passing tests.

If local rollup binary blocked by Windows AppControl, skip local test and rely on CI. Type-check is the local proxy:

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/demo-login/dto apps/api/src/demo-login/demo-login.constants.ts apps/api/src/demo-login/demo-login.service.ts apps/api/src/demo-login/demo-login.service.spec.ts
git commit -m "feat(v7-a/api): DemoLoginService + DTO + constants + 6 unit tests"
```

---

## Task 3: Demo-login controller + module + register

**Files:**
- Create: `apps/api/src/demo-login/demo-login.controller.ts`
- Create: `apps/api/src/demo-login/demo-login.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the controller**

Create `apps/api/src/demo-login/demo-login.controller.ts`:

```typescript
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { DemoLoginService } from './demo-login.service';
import { DemoLoginDto } from './dto/demo-login.dto';

/** V7 — Demo login (1-click auto-login for showcased personas). */
@ApiTags('demo-login')
@Controller('auth/demo-login')
export class DemoLoginController {
  constructor(private readonly service: DemoLoginService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Auto-login a demo persona (rate-limited 60/h/IP)' })
  @ApiResponse({ status: 200, description: 'Session payload (user, tenant, tokens)' })
  async demoLogin(@Body() dto: DemoLoginDto, @Ip() ip: string) {
    return this.service.demoLogin(dto.persona, ip);
  }
}
```

**Pre-check:** Verify `Public` decorator exists at `apps/api/src/auth/decorators/public.decorator.ts`. If not, the JwtAuthGuard already inspects `@SetMetadata('isPublic', true)` (used by existing /auth/login). Replace `@Public()` with `@SetMetadata('isPublic', true)` if `Public` is not exported.

- [ ] **Step 2: Create the module**

Create `apps/api/src/demo-login/demo-login.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DemoLoginController } from './demo-login.controller';
import { DemoLoginService } from './demo-login.service';

/** V7 — Demo login (auto-login for demo personas). */
@Module({
  imports: [AuthModule],
  controllers: [DemoLoginController],
  providers: [DemoLoginService],
})
export class DemoLoginModule {}
```

- [ ] **Step 3: Register in app.module.ts**

Open `apps/api/src/app.module.ts`. Add the import (alphabetical, near BulletinsModule):

```typescript
import { DemoLoginModule } from './demo-login/demo-login.module';
```

In the `@Module({ imports: [...] })` array, add `DemoLoginModule, // V7` after `BulletinsModule, // V6`.

- [ ] **Step 4: Verify**

```bash
pnpm --filter=@ecole-saas/api type-check
pnpm --filter=@ecole-saas/api lint
```

Both should PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/demo-login/demo-login.controller.ts apps/api/src/demo-login/demo-login.module.ts apps/api/src/app.module.ts
git commit -m "feat(v7-a/api): DemoLoginController + module + register (POST /auth/demo-login)"
```

---

## Task 4: Extended seed (2 demo tenants + 9 users + realistic data)

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Read current seed structure**

Read `apps/api/prisma/seed.ts`. It currently creates 2 tenants (`demo-maternelle` + `demo-ecole-pilote`) + 3 users (2 admins + 1 super-admin) + V6 seedV6ForTenant helper.

**Renaming:** for V7, rename the tenants and emails to match `DEMO_PERSONA_MAP` exactly. We'll keep `demo-maternelle` slug but change `demo-ecole-pilote` → `demo-ecole`. Admin emails also align.

- [ ] **Step 2: Replace seed.ts content (full rewrite)**

Replace the entire content of `apps/api/prisma/seed.ts` with:

```typescript
/* eslint-disable no-console */
import { randomBytes } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import {
  Locale,
  PrismaClient,
  Sex,
  TenantType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function generateSeedPassword(): string {
  return randomBytes(18).toString('base64url');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function upsertUser(args: {
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  passwordHash: string;
}) {
  const email = normalizeEmail(args.email);
  if (args.tenantId) {
    return prisma.user.upsert({
      where: { email_per_tenant: { tenantId: args.tenantId, email } },
      update: { firstName: args.firstName, lastName: args.lastName, role: args.role },
      create: {
        id: createId(),
        tenantId: args.tenantId,
        email,
        passwordHash: args.passwordHash,
        firstName: args.firstName,
        lastName: args.lastName,
        role: args.role,
        locale: Locale.fr,
      },
    });
  }
  const existing = await prisma.user.findFirst({ where: { tenantId: null, email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: createId(),
      tenantId: null,
      email,
      passwordHash: args.passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      locale: Locale.fr,
    },
  });
}

async function seedV6ForTenant(tenantId: string, schoolYear: string) {
  const subjects = [
    { name: 'Mathématiques', code: 'MATH' },
    { name: 'Français', code: 'FR' },
    { name: 'Sciences', code: 'SCI' },
    { name: 'Histoire-Géographie', code: 'HG' },
    { name: 'Anglais', code: 'EN' },
    { name: 'Éducation Physique', code: 'EPS' },
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { unique_subject_per_tenant: { tenantId, name: s.name } },
      update: {},
      create: { id: createId(), tenantId, name: s.name, code: s.code },
    });
  }

  const [y1, y2] = schoolYear.split('-');
  const periods = [
    { name: 'T1', startDate: new Date(`${y1}-09-01`), endDate: new Date(`${y1}-12-15`) },
    { name: 'T2', startDate: new Date(`${y2}-01-05`), endDate: new Date(`${y2}-03-31`) },
    { name: 'T3', startDate: new Date(`${y2}-04-15`), endDate: new Date(`${y2}-06-30`) },
  ];
  for (const p of periods) {
    await prisma.gradePeriod.upsert({
      where: { unique_period_per_year: { tenantId, schoolYear, name: p.name } },
      update: {},
      create: {
        id: createId(),
        tenantId,
        schoolYear,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        isClosed: false,
      },
    });
  }
}

interface SeededStudent { id: string; firstName: string; lastName: string; classroom: string }

async function seedStudents(tenantId: string, classroom: string, names: Array<[string, string]>): Promise<SeededStudent[]> {
  const seeded: SeededStudent[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName] = names[i];
    const email = `parent.${lastName.toLowerCase()}.${firstName.toLowerCase()}@demo-ecole.klasso.tn`;
    const id = createId();
    await prisma.student.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        firstName,
        lastName,
        dateOfBirth: new Date(2018 - Math.floor(i / 10), (i % 12), 1 + (i % 27)),
        sex: i % 2 === 0 ? Sex.F : Sex.M,
        nationality: 'TN',
        classroom,
        parentEmail: email,
        siblingsCount: i % 3,
        country: 'TN',
        motherTongue: 'ar',
      },
    });
    seeded.push({ id, firstName, lastName, classroom });
  }
  return seeded;
}

async function seedClass(tenantId: string, name: string, level: string, schoolYear: string): Promise<string> {
  const existing = await prisma.class.findFirst({
    where: { tenantId, schoolYear, name },
  });
  if (existing) return existing.id;
  const created = await prisma.class.create({
    data: { id: createId(), tenantId, name, level, schoolYear },
  });
  return created.id;
}

async function main(): Promise<void> {
  const password = generateSeedPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // ── DEMO TENANT 1 — École primaire ─────────────────────────────────────
  const ecole = await prisma.tenant.upsert({
    where: { slug: 'demo-ecole' },
    update: { name: 'Démo École Pilote', type: TenantType.PRIMARY_SCHOOL },
    create: {
      id: createId(),
      name: 'Démo École Pilote',
      slug: 'demo-ecole',
      type: TenantType.PRIMARY_SCHOOL,
      locale: Locale.fr,
      timezone: 'Africa/Tunis',
    },
  });

  // ── DEMO TENANT 2 — Jardin d'enfants ───────────────────────────────────
  const maternelle = await prisma.tenant.upsert({
    where: { slug: 'demo-maternelle' },
    update: { name: 'Démo Jardin Les Pétales', type: TenantType.KINDERGARTEN },
    create: {
      id: createId(),
      name: 'Démo Jardin Les Pétales',
      slug: 'demo-maternelle',
      type: TenantType.KINDERGARTEN,
      locale: Locale.fr,
      timezone: 'Africa/Tunis',
    },
  });

  // ── 4 personas per tenant + super-admin ─────────────────────────────────
  await upsertUser({ tenantId: ecole.id, email: 'admin@demo-ecole.klasso.tn',  firstName: 'Amadou',  lastName: 'Koné',     role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof@demo-ecole.klasso.tn',   firstName: 'Sami',    lastName: 'Hadj',     role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'parent@demo-ecole.klasso.tn', firstName: 'Salma',   lastName: 'Ben Ali',  role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'staff@demo-ecole.klasso.tn',  firstName: 'Omar',    lastName: 'Mansour',  role: UserRole.STAFF,        passwordHash });

  await upsertUser({ tenantId: maternelle.id, email: 'admin@demo-maternelle.klasso.tn',  firstName: 'Yasmine', lastName: 'Trabelsi', role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'anim@demo-maternelle.klasso.tn',   firstName: 'Leila',   lastName: 'Marzouki', role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'parent@demo-maternelle.klasso.tn', firstName: 'Fatma',   lastName: 'Zouari',   role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'staff@demo-maternelle.klasso.tn',  firstName: 'Nour',    lastName: 'Hamdi',    role: UserRole.STAFF,        passwordHash });

  await upsertUser({ tenantId: null, email: 'super@klasso.tn', firstName: 'Super', lastName: 'Admin', role: UserRole.SUPER_ADMIN, passwordHash });

  // ── V6 academic seed (subjects + grade periods) ─────────────────────────
  await seedV6ForTenant(ecole.id, '2025-2026');
  await seedV6ForTenant(maternelle.id, '2025-2026');

  // ── Classes — only PRIMARY_SCHOOL (V4) ──────────────────────────────────
  await seedClass(ecole.id, 'CP-A',  'CP',  '2025-2026');
  await seedClass(ecole.id, 'CE1-B', 'CE1', '2025-2026');
  await seedClass(ecole.id, 'CE2-A', 'CE2', '2025-2026');

  // ── Students — realistic, ~50 split across 3 classes ────────────────────
  await seedStudents(ecole.id, 'CP-A', [
    ['Lina', 'Ben Ali'], ['Karim', 'Ben Ali'], ['Yacine', 'Mansour'], ['Maya', 'Trabelsi'],
    ['Adam', 'Hadj'], ['Sara', 'Belhaj'], ['Anis', 'Riahi'], ['Nour', 'Khaldi'],
    ['Inès', 'Bouaziz'], ['Rayan', 'Mejri'], ['Aya', 'Hammami'], ['Wassim', 'Lassoued'],
    ['Yasmine', 'Saidi'], ['Mehdi', 'Chaabane'], ['Sirine', 'Karoui'], ['Hamza', 'Jbeli'],
  ]);
  await seedStudents(ecole.id, 'CE1-B', [
    ['Ibrahim', 'Ba'], ['Aïcha', 'Sow'], ['Mohamed', 'Diop'], ['Aminata', 'Cissé'],
    ['Ousmane', 'Diallo'], ['Fatou', 'Niang'], ['Bakary', 'Touré'], ['Awa', 'Ndiaye'],
    ['Cheikh', 'Fall'], ['Mariama', 'Sy'], ['Souleymane', 'Sarr'], ['Khadidja', 'Gueye'],
    ['Modibo', 'Konaté'], ['Bintou', 'Camara'], ['Lamine', 'Diakité'], ['Salimata', 'Doumbia'],
  ]);
  await seedStudents(ecole.id, 'CE2-A', [
    ['Tarek', 'Trabelsi'], ['Lilia', 'Bouaziz'], ['Skander', 'Ben Hassine'], ['Mariem', 'Mejri'],
    ['Aziz', 'Lassoued'], ['Nadia', 'Hammami'], ['Bilel', 'Karoui'], ['Donia', 'Jbeli'],
    ['Hatem', 'Saidi'], ['Ines', 'Khaldi'], ['Walid', 'Riahi'], ['Habiba', 'Chaabane'],
  ]);

  console.log('');
  console.log('✅ Demo data seeded successfully (V7).');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  Tenant: ${ecole.slug}      (${ecole.type})`);
  console.log(`    admin   : admin@demo-ecole.klasso.tn`);
  console.log(`    teacher : prof@demo-ecole.klasso.tn`);
  console.log(`    parent  : parent@demo-ecole.klasso.tn`);
  console.log(`    staff   : staff@demo-ecole.klasso.tn`);
  console.log(`  Tenant: ${maternelle.slug} (${maternelle.type})`);
  console.log(`    admin   : admin@demo-maternelle.klasso.tn`);
  console.log(`    teacher : anim@demo-maternelle.klasso.tn`);
  console.log(`    parent  : parent@demo-maternelle.klasso.tn`);
  console.log(`    staff   : staff@demo-maternelle.klasso.tn`);
  console.log(`  Super-admin: super@klasso.tn`);
  console.log('');
  console.log(`  Password (all accounts): ${password}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log('  Demo-login endpoint: POST /api/auth/demo-login {"persona":"..."}');
  console.log('');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Verify type-check**

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(v7-a/api): extended seed with 9 demo users + 2 tenants + realistic students"
```

---

## Task 5: Lucide icon map + nav matrix lib + tests

**Files:**
- Create: `apps/web/lib/nav/icons.ts`
- Create: `apps/web/lib/nav/menu.ts`
- Create: `apps/web/lib/nav/menu.test.ts`

- [ ] **Step 1: Create icons map**

Create `apps/web/lib/nav/icons.ts`:

```typescript
import {
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Megaphone,
  Building2,
  Users,
  UserPlus,
  Camera,
  Sparkles,
  Stethoscope,
  Bus,
  Utensils,
  ShieldAlert,
  Wallet,
  Settings,
  LogOut,
  Bell,
  Search,
  School,
  Shield,
  BookOpen,
  CalendarCheck,
  Scale,
  HeartHandshake,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  establishment: Building2,
  schoolYear: Calendar,
  classes: School,
  students: Users,
  enrollments: UserPlus,
  teachers: GraduationCap,
  parents: HeartHandshake,
  notes: ClipboardList,
  bulletins: FileText,
  evaluations: BookOpen,
  journal: Camera,
  activities: Sparkles,
  absences: CalendarCheck,
  discipline: Scale,
  schedule: Calendar,
  canteen: Utensils,
  transport: Bus,
  health: Stethoscope,
  security: ShieldAlert,
  messages: MessagesSquare,
  announcements: Megaphone,
  payments: CreditCard,
  hrPayroll: Wallet,
  tenants: School,
  audit: Shield,
  branding: Settings,
  logout: LogOut,
  bell: Bell,
  search: Search,
};
```

- [ ] **Step 2: Write nav menu tests**

Create `apps/web/lib/nav/menu.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getNavForUser } from './menu';
import type { AuthenticatedUser, Tenant } from '@/lib/auth/types';

const baseUser = (overrides: Partial<AuthenticatedUser>): AuthenticatedUser => ({
  id: 'u1', email: 'x@y.tn', firstName: 'A', lastName: 'B', role: 'SCHOOL_ADMIN', locale: 'fr',
  ...overrides,
});

const tenant = (type: 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED'): Tenant => ({
  id: 't1', name: 'T', slug: 's', type, brand: null,
});

describe('getNavForUser', () => {
  it('returns platform menu when role is SUPER_ADMIN (ignores tenant)', () => {
    const sections = getNavForUser(baseUser({ role: 'SUPER_ADMIN' }), null);
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('tenants');
    expect(ids).toContain('audit');
    expect(ids).not.toContain('students');
    expect(ids).not.toContain('notes');
  });

  it('PRIMARY_SCHOOL admin sees Notes + Bulletins + Discipline', () => {
    const sections = getNavForUser(baseUser({ role: 'SCHOOL_ADMIN' }), tenant('PRIMARY_SCHOOL'));
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('notes');
    expect(ids).toContain('bulletins');
    expect(ids).toContain('discipline');
    expect(ids).toContain('students');
  });

  it('KINDERGARTEN admin sees journal/activities and NOT notes/bulletins/discipline', () => {
    const sections = getNavForUser(baseUser({ role: 'SCHOOL_ADMIN' }), tenant('KINDERGARTEN'));
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain('journal');
    expect(ids).toContain('activities');
    expect(ids).not.toContain('notes');
    expect(ids).not.toContain('bulletins');
    expect(ids).not.toContain('discipline');
  });

  it('KINDERGARTEN labels: Enfants instead of Élèves, Animateurs instead of Enseignants', () => {
    const sections = getNavForUser(baseUser({ role: 'SCHOOL_ADMIN' }), tenant('KINDERGARTEN'));
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'students')?.label).toBe('Enfants');
    expect(items.find((i) => i.id === 'teachers')?.label).toBe('Animateurs');
    expect(items.find((i) => i.id === 'classes')?.label).toBe("Groupes d'âge");
  });

  it('TEACHER on PRIMARY sees own classes section, no Administration/RH', () => {
    const sections = getNavForUser(baseUser({ role: 'TEACHER' }), tenant('PRIMARY_SCHOOL'));
    const sectionIds = sections.map((s) => s.id);
    expect(sectionIds).not.toContain('administration');
    expect(sectionIds).toContain('pedagogie');
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'notes')).toBeDefined();
    expect(items.find((i) => i.id === 'hrPayroll')).toBeUndefined();
  });

  it('PARENT on PRIMARY sees mesEnfants + finance.payments', () => {
    const sections = getNavForUser(baseUser({ role: 'PARENT' }), tenant('PRIMARY_SCHOOL'));
    const sectionIds = sections.map((s) => s.id);
    expect(sectionIds).toContain('mesEnfants');
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'payments')).toBeDefined();
    expect(items.find((i) => i.id === 'discipline')).toBeUndefined();
  });

  it('STAFF sees Vie École + read-only Élèves', () => {
    const sections = getNavForUser(baseUser({ role: 'STAFF' }), tenant('PRIMARY_SCHOOL'));
    const items = sections.flatMap((s) => s.items);
    expect(items.find((i) => i.id === 'canteen')).toBeDefined();
    expect(items.find((i) => i.id === 'transport')).toBeDefined();
    expect(items.find((i) => i.id === 'notes')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Create the nav matrix**

Create `apps/web/lib/nav/menu.ts`:

```typescript
import type { LucideIcon } from 'lucide-react';

import type { AuthenticatedUser, Tenant } from '@/lib/auth/types';
import { ICONS } from './icons';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';

interface BuildContext {
  user: AuthenticatedUser;
  tenant: Tenant | null;
  type: TenantType | null;
}

/**
 * V7 — Resolve the sidebar navigation for a given (user, tenant) pair.
 * - SUPER_ADMIN → platform console (cross-tenant)
 * - SCHOOL_ADMIN / TEACHER / PARENT / STAFF → adapted to tenant.type
 */
export function getNavForUser(user: AuthenticatedUser, tenant: Tenant | null): NavSection[] {
  if (user.role === 'SUPER_ADMIN') return platformNav();
  if (!tenant) return [];
  const type = tenant.type as TenantType;
  const ctx: BuildContext = { user, tenant, type };
  switch (user.role) {
    case 'SCHOOL_ADMIN': return schoolAdminNav(ctx);
    case 'TEACHER':      return teacherNav(ctx);
    case 'PARENT':       return parentNav(ctx);
    case 'STAFF':        return staffNav(ctx);
    default:             return [];
  }
}

function schoolAdminNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  const academicItems: NavItem[] = isKG
    ? [
        { id: 'journal',     label: 'Journal quotidien', href: '/journal',     icon: ICONS.journal },
        { id: 'activities',  label: 'Activités',         href: '/activities',  icon: ICONS.activities },
        { id: 'absences',    label: 'Présences',         href: '/absences',    icon: ICONS.absences },
        { id: 'schedule',    label: 'Planning',          href: '/schedule',    icon: ICONS.schedule },
      ]
    : [
        { id: 'notes',       label: 'Notes',           href: '/notes',       icon: ICONS.notes },
        { id: 'bulletins',   label: 'Bulletins',       href: '/bulletins',   icon: ICONS.bulletins },
        { id: 'evaluations', label: 'Évaluations',     href: '/evaluations', icon: ICONS.evaluations },
        { id: 'absences',    label: 'Absences',        href: '/absences',    icon: ICONS.absences },
        { id: 'discipline',  label: 'Discipline',      href: '/discipline',  icon: ICONS.discipline },
        { id: 'schedule',    label: 'Emploi du temps', href: '/schedule',    icon: ICONS.schedule },
      ];

  return [
    {
      id: 'accueil',
      label: 'Accueil',
      items: [{ id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ICONS.dashboard }],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        { id: 'establishment', label: 'Établissement',                    href: '/settings/establishment', icon: ICONS.establishment },
        { id: 'schoolYear',    label: 'Année scolaire',                   href: '/grade-periods',          icon: ICONS.schoolYear },
        { id: 'classes',       label: isKG ? "Groupes d'âge" : 'Classes', href: '/classes',                icon: ICONS.classes },
      ],
    },
    {
      id: 'scolarite',
      label: 'Scolarité',
      items: [
        { id: 'students',    label: isKG ? 'Enfants' : 'Élèves',            href: '/students',     icon: ICONS.students },
        { id: 'enrollments', label: 'Inscriptions',                         href: '/enrollments',  icon: ICONS.enrollments },
        { id: 'teachers',    label: isKG ? 'Animateurs' : 'Enseignants',    href: '/teachers',     icon: ICONS.teachers },
        { id: 'parents',     label: 'Parents',                              href: '/parents',      icon: ICONS.parents },
      ],
    },
    { id: 'pedagogie', label: 'Pédagogie', items: academicItems },
    {
      id: 'vieEcole',
      label: 'Vie école',
      items: [
        { id: 'canteen',   label: 'Cantine',   href: '/canteen',   icon: ICONS.canteen },
        { id: 'transport', label: 'Transport', href: '/transport', icon: ICONS.transport },
        { id: 'health',    label: 'Santé',     href: '/health',    icon: ICONS.health },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      items: [
        { id: 'messages',      label: 'Messages',  href: '/messages',      icon: ICONS.messages },
        { id: 'announcements', label: 'Annonces',  href: '/announcements', icon: ICONS.announcements },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { id: 'payments',  label: 'Paiements',  href: '/payments',   icon: ICONS.payments },
        { id: 'hrPayroll', label: 'RH / Paie',  href: '/hr',         icon: ICONS.hrPayroll },
      ],
    },
    {
      id: 'compte',
      label: 'Compte',
      items: [
        { id: 'profile',  label: 'Profil',    href: '/profile',          icon: ICONS.branding },
        { id: 'branding', label: 'Apparence', href: '/settings/branding', icon: ICONS.branding },
      ],
    },
  ];
}

function teacherNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  if (isKG) {
    return [
      { id: 'accueil', label: 'Accueil', items: [{ id: 'dashboard', label: 'Ma journée', href: '/dashboard', icon: ICONS.dashboard }] },
      { id: 'pedagogie', label: 'Vie quotidienne', items: [
        { id: 'journal',    label: 'Journal du jour', href: '/journal',    icon: ICONS.journal },
        { id: 'activities', label: 'Activités',       href: '/activities', icon: ICONS.activities },
        { id: 'absences',   label: 'Présences',       href: '/absences',   icon: ICONS.absences },
        { id: 'schedule',   label: 'Mon planning',    href: '/schedule',   icon: ICONS.schedule },
      ]},
      { id: 'communication', label: 'Communication', items: [
        { id: 'messages',      label: 'Messages parents', href: '/messages',      icon: ICONS.messages },
        { id: 'announcements', label: 'Annonces',         href: '/announcements', icon: ICONS.announcements },
      ]},
      { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
    ];
  }

  return [
    { id: 'accueil', label: 'Accueil', items: [{ id: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ICONS.dashboard }] },
    { id: 'pedagogie', label: 'Pédagogie', items: [
      { id: 'notes',       label: 'Saisir notes',     href: '/notes',       icon: ICONS.notes },
      { id: 'evaluations', label: 'Évaluations',      href: '/evaluations', icon: ICONS.evaluations },
      { id: 'bulletins',   label: 'Bulletins',        href: '/bulletins',   icon: ICONS.bulletins },
      { id: 'absences',    label: 'Absences',         href: '/absences',    icon: ICONS.absences },
      { id: 'discipline',  label: 'Discipline',       href: '/discipline',  icon: ICONS.discipline },
      { id: 'schedule',    label: 'Mon EDT',          href: '/schedule',    icon: ICONS.schedule },
    ]},
    { id: 'communication', label: 'Communication', items: [
      { id: 'messages',      label: 'Messages', href: '/messages',      icon: ICONS.messages },
      { id: 'announcements', label: 'Annonces', href: '/announcements', icon: ICONS.announcements },
    ]},
    { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
  ];
}

function parentNav({ type }: BuildContext): NavSection[] {
  const isKG = type === 'KINDERGARTEN';

  return [
    { id: 'mesEnfants', label: 'Mes enfants', items: [
      { id: 'dashboard', label: isKG ? 'Mon enfant' : 'Mes enfants', href: '/dashboard', icon: ICONS.dashboard },
    ]},
    { id: 'pedagogie', label: isKG ? 'Quotidien' : 'Scolarité', items: isKG ? [
      { id: 'journal',    label: 'Journal du jour', href: '/journal',    icon: ICONS.journal },
      { id: 'activities', label: 'Activités',       href: '/activities', icon: ICONS.activities },
      { id: 'absences',   label: 'Présences',       href: '/absences',   icon: ICONS.absences },
      { id: 'canteen',    label: 'Cantine',         href: '/canteen',    icon: ICONS.canteen },
    ] : [
      { id: 'bulletins', label: 'Notes & Bulletins', href: '/bulletins', icon: ICONS.bulletins },
      { id: 'absences',  label: 'Absences',          href: '/absences',  icon: ICONS.absences },
      { id: 'schedule',  label: 'EDT',               href: '/schedule',  icon: ICONS.schedule },
    ]},
    { id: 'communication', label: 'Communication', items: [
      { id: 'messages',      label: 'Messages', href: '/messages',      icon: ICONS.messages },
      { id: 'announcements', label: 'Annonces', href: '/announcements', icon: ICONS.announcements },
    ]},
    { id: 'finance', label: 'Finance', items: [
      { id: 'payments', label: 'Mes factures', href: '/payments', icon: ICONS.payments },
    ]},
    { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
  ];
}

function staffNav(_: BuildContext): NavSection[] {
  return [
    { id: 'accueil', label: 'Accueil', items: [{ id: 'dashboard', label: 'Tableau opérations', href: '/dashboard', icon: ICONS.dashboard }] },
    { id: 'scolarite', label: 'Élèves', items: [
      { id: 'students', label: 'Annuaire', href: '/students', icon: ICONS.students },
    ]},
    { id: 'vieEcole', label: 'Vie école', items: [
      { id: 'canteen',   label: 'Cantine',          href: '/canteen',   icon: ICONS.canteen },
      { id: 'transport', label: 'Transport',        href: '/transport', icon: ICONS.transport },
      { id: 'health',    label: 'Santé',            href: '/health',    icon: ICONS.health },
      { id: 'security',  label: 'Sécurité',         href: '/security',  icon: ICONS.security },
    ]},
    { id: 'pedagogie', label: 'Pédagogie', items: [
      { id: 'bulletins', label: 'Bulletins (lecture)', href: '/bulletins', icon: ICONS.bulletins },
    ]},
    { id: 'communication', label: 'Communication', items: [
      { id: 'messages',      label: 'Messages', href: '/messages',      icon: ICONS.messages },
      { id: 'announcements', label: 'Annonces', href: '/announcements', icon: ICONS.announcements },
    ]},
    { id: 'compte', label: 'Compte', items: [{ id: 'profile', label: 'Profil', href: '/profile', icon: ICONS.branding }] },
  ];
}

function platformNav(): NavSection[] {
  return [
    { id: 'plateforme', label: 'Plateforme', items: [
      { id: 'dashboard',     label: 'Vue plateforme', href: '/admin',          icon: ICONS.dashboard },
      { id: 'tenants',       label: 'Tenants',        href: '/admin/tenants',  icon: ICONS.tenants },
      { id: 'demoRequests',  label: 'Demandes démo',  href: '/admin/demo',     icon: ICONS.bell },
      { id: 'inviteTokens',  label: 'Invites tokens', href: '/admin/invites',  icon: ICONS.enrollments },
    ]},
    { id: 'systeme', label: 'Système', items: [
      { id: 'audit',     label: 'Audit logs', href: '/admin/audit',     icon: ICONS.audit },
      { id: 'analytics', label: 'Analytics',  href: '/admin/analytics', icon: ICONS.audit },
    ]},
    { id: 'compte', label: 'Compte', items: [
      { id: 'branding', label: 'Apparence globale', href: '/admin/branding', icon: ICONS.branding },
    ]},
  ];
}
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter=@ecole-saas/web test lib/nav/menu.test.ts
```

Expected: 7 passing tests.

If local vitest blocked (Windows AppControl), run type-check + lint:

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
```

Both should PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/nav/
git commit -m "feat(v7-a/web): nav matrix lib (5 roles × 3 tenant types) + 7 tests"
```

---

## Task 6: Dashboard widget config lib

**Files:**
- Create: `apps/web/lib/dashboard/config.ts`

- [ ] **Step 1: Create the config lib**

Create `apps/web/lib/dashboard/config.ts`:

```typescript
import type { LucideIcon } from 'lucide-react';
import {
  Camera, ClipboardList, CreditCard, GraduationCap, Megaphone, PlusCircle,
  Sparkles, Stethoscope, Users, Utensils, Bus, ShieldAlert, School,
  Mail, FileText, Calendar, BookOpen,
} from 'lucide-react';

import type { UserRole } from '@/lib/auth/types';

export type KpiVariant = 'blue' | 'green' | 'orange' | 'amber' | 'pink' | 'purple';
type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED' | null;

export interface KpiConfig {
  label: string;
  variant: KpiVariant;
  icon: LucideIcon;
  selectorKey: string;
  sub?: string;
}

export interface ActionConfig {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface DashboardConfig {
  heading: string;
  subtitleKey: 'today' | 'classesCount' | 'childrenCount' | 'tenantsCount';
  kpis: KpiConfig[];
  actions: ActionConfig[];
  panels: Array<'absencesToday' | 'upcomingDeadlines' | 'latestNotes' | 'announcements' | 'journalToday' | 'incidents' | 'demoRequests'>;
}

export function getDashboardConfig(role: UserRole, tenantType: TenantType): DashboardConfig {
  if (role === 'SUPER_ADMIN') return SUPER_ADMIN_CONFIG;

  const isKG = tenantType === 'KINDERGARTEN';

  switch (role) {
    case 'SCHOOL_ADMIN': return isKG ? SCHOOL_ADMIN_KG : SCHOOL_ADMIN_PRIMARY;
    case 'TEACHER':      return isKG ? TEACHER_KG      : TEACHER_PRIMARY;
    case 'PARENT':       return isKG ? PARENT_KG       : PARENT_PRIMARY;
    case 'STAFF':        return STAFF_CONFIG;
    default:             return TEACHER_PRIMARY;
  }
}

const SCHOOL_ADMIN_PRIMARY: DashboardConfig = {
  heading: 'Tableau de Bord',
  subtitleKey: 'today',
  kpis: [
    { label: 'Total Élèves',        variant: 'blue',   icon: Users,        selectorKey: 'studentsCount' },
    { label: 'Taux de Présence',    variant: 'green',  icon: ClipboardList, selectorKey: 'attendanceRate', sub: '%' },
    { label: 'Paiements en Retard', variant: 'orange', icon: CreditCard,   selectorKey: 'overduePayments', sub: 'paiements en attente' },
    { label: 'Moyenne Générale',    variant: 'amber',  icon: GraduationCap, selectorKey: 'globalAverage',  sub: 'Sur {classesCount} classes' },
  ],
  actions: [
    { label: 'Saisir les absences', href: '/absences/new',     icon: ClipboardList },
    { label: 'Voir les paiements',  href: '/payments',         icon: CreditCard },
    { label: 'Ajouter un élève',    href: '/students/new',     icon: PlusCircle },
    { label: 'Créer une annonce',   href: '/announcements/new', icon: Megaphone },
  ],
  panels: ['absencesToday', 'upcomingDeadlines', 'latestNotes', 'announcements'],
};

const SCHOOL_ADMIN_KG: DashboardConfig = {
  heading: 'Tableau de Bord',
  subtitleKey: 'today',
  kpis: [
    { label: 'Total Enfants',  variant: 'pink',  icon: Users,    selectorKey: 'childrenCount' },
    { label: 'Présents',       variant: 'green', icon: ClipboardList, selectorKey: 'presentToday' },
    { label: 'Photos du jour', variant: 'amber', icon: Camera,   selectorKey: 'photosToday' },
  ],
  actions: [
    { label: 'Photo du jour', href: '/journal/new',     icon: Camera },
    { label: 'Activité',      href: '/activities/new',  icon: Sparkles },
    { label: 'Pointage',      href: '/absences/new',    icon: ClipboardList },
    { label: 'Annonce',       href: '/announcements/new', icon: Megaphone },
  ],
  panels: ['journalToday', 'announcements'],
};

const TEACHER_PRIMARY: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'classesCount',
  kpis: [
    { label: 'Mes élèves',          variant: 'blue',   icon: Users,    selectorKey: 'myStudentsCount' },
    { label: 'Évals à corriger',    variant: 'orange', icon: BookOpen, selectorKey: 'evalsToGrade' },
    { label: 'Cours aujourd\'hui',  variant: 'green',  icon: Calendar, selectorKey: 'todayLessons' },
  ],
  actions: [
    { label: 'Nouvelle évaluation', href: '/evaluations/new',   icon: PlusCircle },
    { label: 'Pointer',             href: '/absences/new',      icon: ClipboardList },
    { label: 'Message parent',      href: '/messages',          icon: Mail },
    { label: 'Bulletins',           href: '/bulletins',         icon: FileText },
  ],
  panels: ['latestNotes', 'announcements'],
};

const TEACHER_KG: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'classesCount',
  kpis: [
    { label: 'Mes enfants',   variant: 'pink',  icon: Users,  selectorKey: 'myStudentsCount' },
    { label: 'Photos du jour', variant: 'amber', icon: Camera, selectorKey: 'photosToday' },
    { label: 'Présents',       variant: 'green', icon: ClipboardList, selectorKey: 'presentToday' },
  ],
  actions: [
    { label: 'Photo',     href: '/journal/new',    icon: Camera },
    { label: 'Activité',  href: '/activities/new', icon: Sparkles },
    { label: 'Pointage',  href: '/absences/new',   icon: ClipboardList },
    { label: 'Message parent', href: '/messages',  icon: Mail },
  ],
  panels: ['journalToday', 'announcements'],
};

const PARENT_PRIMARY: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'childrenCount',
  kpis: [
    { label: 'Mes enfants',  variant: 'pink',   icon: Users,       selectorKey: 'childrenCount' },
    { label: 'Nouv. notes',  variant: 'amber',  icon: BookOpen,    selectorKey: 'newGrades' },
    { label: 'Solde à payer', variant: 'orange', icon: CreditCard, selectorKey: 'amountDue', sub: 'TND' },
  ],
  actions: [
    { label: 'Bulletins',   href: '/bulletins',  icon: FileText },
    { label: 'Payer',       href: '/payments',   icon: CreditCard },
    { label: 'Messages',    href: '/messages',   icon: Mail },
    { label: 'EDT',         href: '/schedule',   icon: Calendar },
  ],
  panels: ['latestNotes', 'announcements'],
};

const PARENT_KG: DashboardConfig = {
  heading: '{childFirstName} aujourd\'hui',
  subtitleKey: 'today',
  kpis: [
    { label: 'Photos du jour', variant: 'pink',  icon: Camera,   selectorKey: 'photosToday' },
    { label: 'Activités',      variant: 'green', icon: Sparkles, selectorKey: 'activitiesToday' },
    { label: 'Présence',       variant: 'amber', icon: ClipboardList, selectorKey: 'presenceToday' },
  ],
  actions: [
    { label: 'Voir photos',         href: '/journal',  icon: Camera },
    { label: 'Journal',             href: '/journal',  icon: BookOpen },
    { label: 'Message animatrice',  href: '/messages', icon: Mail },
    { label: 'Payer',               href: '/payments', icon: CreditCard },
  ],
  panels: ['journalToday', 'announcements'],
};

const STAFF_CONFIG: DashboardConfig = {
  heading: 'Bonjour, {firstName}.',
  subtitleKey: 'today',
  kpis: [
    { label: 'Cantine auj.', variant: 'blue',   icon: Utensils,    selectorKey: 'canteenToday' },
    { label: 'Bus',          variant: 'orange', icon: Bus,         selectorKey: 'busesActive' },
    { label: 'Infirmerie',   variant: 'green',  icon: Stethoscope, selectorKey: 'infirmaryToday' },
  ],
  actions: [
    { label: 'Repas du jour', href: '/canteen',   icon: Utensils },
    { label: 'Trajets',       href: '/transport', icon: Bus },
    { label: 'Soin',          href: '/health',    icon: Stethoscope },
    { label: 'Incident',      href: '/security',  icon: ShieldAlert },
  ],
  panels: ['incidents', 'announcements'],
};

const SUPER_ADMIN_CONFIG: DashboardConfig = {
  heading: 'Plateforme Klasso',
  subtitleKey: 'tenantsCount',
  kpis: [
    { label: 'Écoles',         variant: 'purple', icon: School,   selectorKey: 'tenantsCount' },
    { label: 'Utilisateurs',   variant: 'blue',   icon: Users,    selectorKey: 'usersCount' },
    { label: 'Démos',          variant: 'orange', icon: Megaphone, selectorKey: 'pendingDemos' },
  ],
  actions: [
    { label: 'Nouvelle école', href: '/admin/tenants/new', icon: PlusCircle },
    { label: 'Invite',         href: '/admin/invites/new', icon: Mail },
    { label: 'Analytics',      href: '/admin/analytics',   icon: BookOpen },
    { label: 'Incidents',      href: '/admin/audit',       icon: ShieldAlert },
  ],
  panels: ['demoRequests', 'incidents'],
};
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
```

Both PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/dashboard/config.ts
git commit -m "feat(v7-a/web): dashboard widget config (8 persona × type variants)"
```

---

## Task 7: KpiCard + QuickAction + NotesPanel + AnnouncementsPanel components

**Files:**
- Create: `apps/web/components/dashboard/kpi-card.tsx`
- Create: `apps/web/components/dashboard/quick-action.tsx`
- Create: `apps/web/components/dashboard/notes-panel.tsx`
- Create: `apps/web/components/dashboard/announcements-panel.tsx`

- [ ] **Step 1: Create KpiCard**

Create `apps/web/components/dashboard/kpi-card.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { KpiVariant } from '@/lib/dashboard/config';

const ICON_BG: Record<KpiVariant, string> = {
  blue:   'bg-gradient-to-br from-blue-500 to-blue-700',
  green:  'bg-gradient-to-br from-emerald-500 to-emerald-700',
  orange: 'bg-gradient-to-br from-ambre-500 to-ambre-600',
  amber:  'bg-gradient-to-br from-amber-400 to-amber-600',
  pink:   'bg-gradient-to-br from-pink-500 to-pink-700',
  purple: 'bg-gradient-to-br from-purple-500 to-purple-700',
};

interface Props {
  label: string;
  value: ReactNode;
  variant: KpiVariant;
  icon: LucideIcon;
  sub?: string;
}

export function KpiCard({ label, value, variant, icon: Icon, sub }: Props) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500">{label}</div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ICON_BG[variant]}`}>
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
      </div>
      <div className="text-3xl font-extrabold leading-none text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create QuickAction**

Create `apps/web/components/dashboard/quick-action.tsx`:

```tsx
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function QuickAction({ label, href, icon: Icon }: Props) {
  return (
    <Link
      href={href as never}
      className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm font-medium text-ink-900 shadow-sm transition hover:shadow-md"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {label}
    </Link>
  );
}
```

- [ ] **Step 3: Create NotesPanel**

Create `apps/web/components/dashboard/notes-panel.tsx`:

```tsx
import Link from 'next/link';

export interface NotePreview {
  id: string;
  studentName: string;
  subjectName: string;
  scaledScore: number;
  date: string;
}

interface Props {
  notes: NotePreview[];
}

export function NotesPanel({ notes }: Props) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Dernières Notes Saisies</h2>
        <Link href={'/notes' as never} className="text-xs font-semibold text-ambre-600 hover:text-ambre-700">
          Voir tout
        </Link>
      </div>
      {notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-300">Aucune note récente.</p>
      ) : (
        <>
          <div className="grid grid-cols-[1fr_1.5fr_0.6fr_0.7fr] gap-2 border-b border-slate-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            <div>Élève</div><div>Matière</div><div>Note</div><div>Date</div>
          </div>
          {notes.map((n) => (
            <div key={n.id} className="grid grid-cols-[1fr_1.5fr_0.6fr_0.7fr] gap-2 border-b border-slate-50 py-3 text-sm text-ink-900">
              <div>{n.studentName}</div>
              <div className="text-ink-500">{n.subjectName}</div>
              <div>
                <span className="inline-flex rounded-full bg-ambre-100 px-2.5 py-0.5 text-xs font-semibold text-ambre-700">
                  {n.scaledScore.toFixed(2)}/20
                </span>
              </div>
              <div className="text-xs text-ink-500">{new Date(n.date).toLocaleDateString('fr-FR')}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create AnnouncementsPanel**

Create `apps/web/components/dashboard/announcements-panel.tsx`:

```tsx
import Link from 'next/link';

export interface Announcement {
  id: string;
  title: string;
  date: string;
}

interface Props {
  announcements: Announcement[];
}

export function AnnouncementsPanel({ announcements }: Props) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Annonces</h2>
        <Link href={'/announcements' as never} className="text-xs font-semibold text-ambre-600 hover:text-ambre-700">
          Gérer
        </Link>
      </div>
      {announcements.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-300">Aucune annonce</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-center justify-between border-b border-slate-50 py-2">
              <span className="text-ink-900">{a.title}</span>
              <span className="text-xs text-ink-300">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
git add apps/web/components/dashboard/
git commit -m "feat(v7-a/web): dashboard widgets — KpiCard + QuickAction + NotesPanel + AnnouncementsPanel"
```

---

## Task 8: Sidebar + Topbar + UserPill + NavSection components

**Files:**
- Create: `apps/web/components/app-shell/nav-section.tsx`
- Create: `apps/web/components/app-shell/sidebar.tsx`
- Create: `apps/web/components/app-shell/user-pill.tsx`
- Create: `apps/web/components/app-shell/topbar.tsx`

- [ ] **Step 1: Create NavSection**

Create `apps/web/components/app-shell/nav-section.tsx`:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/routing';

import type { NavSection as NavSectionType } from '@/lib/nav/menu';

export function NavSection({ section }: { section: NavSectionType }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-700">
        {section.label}
      </div>
      {section.items.map((item) => {
        const active = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href as never}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition border-l-2 ${
              active
                ? 'bg-navy-800 border-ambre-500 text-white font-medium'
                : 'border-transparent text-[#c8cdd6] hover:bg-white/5'
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0 opacity-85" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create Sidebar**

Create `apps/web/components/app-shell/sidebar.tsx`:

```tsx
'use client';

import { BookOpenText, LogOut } from 'lucide-react';
import { Link } from '@/i18n/routing';

import { getNavForUser } from '@/lib/nav/menu';
import { useAuthStore } from '@/lib/auth/use-auth-store';

import { NavSection } from './nav-section';
import { UserPill } from './user-pill';

interface Props {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: Props) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  if (!user) return null;

  const sections = getNavForUser(user, tenant);

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-navy-900 text-[#c8cdd6]">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ambre-500 to-ambre-600 text-white shadow-md">
          <BookOpenText className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-serif text-[17px] font-bold text-white">Klasso</span>
          {tenant && <span className="text-[11px] text-navy-600 truncate">{tenant.name}</span>}
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <NavSection key={section.id} section={section} />
        ))}
      </nav>

      <div className="border-t border-white/5 mx-3 my-2 px-2 py-3">
        <UserPill variant="sidebar" />
        <button
          type="button"
          onClick={onLogout}
          className="mt-2 flex w-full items-center gap-2.5 px-2 py-1.5 text-xs text-[#c8cdd6] hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create UserPill**

Create `apps/web/components/app-shell/user-pill.tsx`:

```tsx
'use client';

import { useAuthStore } from '@/lib/auth/use-auth-store';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN:  'Super-admin',
  SCHOOL_ADMIN: 'Admin',
  TEACHER:      'Enseignant',
  PARENT:       'Parent',
  STAFF:        'Personnel',
};

interface Props {
  variant: 'sidebar' | 'topbar';
}

export function UserPill({ variant }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const roleLabel = ROLE_LABEL[user.role] ?? user.role;

  if (variant === 'sidebar') {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ambre-500 to-ambre-600 text-xs font-bold text-white">
          {initials}
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold text-white">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-[11px] text-navy-600">{roleLabel}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-full bg-surface px-3 py-1.5 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ambre-500 to-ambre-600 text-xs font-bold text-white">
        {initials}
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-semibold text-ink-900">
          {user.firstName} {user.lastName}
        </span>
        <span className="block text-[11px] text-ink-500">{roleLabel}</span>
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create Topbar**

Create `apps/web/components/app-shell/topbar.tsx`:

```tsx
'use client';

import { Bell, Search } from 'lucide-react';

import { UserPill } from './user-pill';

interface Props {
  unreadCount?: number;
}

export function Topbar({ unreadCount = 0 }: Props) {
  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-paper-50">
      <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface px-4 py-2.5 text-[13px] text-ink-300 shadow-sm">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span>Rechercher une page…</span>
      </div>

      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lus)` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-700 shadow-sm hover:shadow-md"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <UserPill variant="topbar" />
    </header>
  );
}
```

- [ ] **Step 5: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
git add apps/web/components/app-shell/
git commit -m "feat(v7-a/web): app shell components — Sidebar + Topbar + UserPill + NavSection"
```

---

## Task 9: Demo accounts block + demoLogin() client

**Files:**
- Modify: `apps/web/lib/api/client.ts`
- Create: `apps/web/components/auth/demo-accounts-block.tsx`

- [ ] **Step 1: Add demoLogin to client.ts**

Append to `apps/web/lib/api/client.ts`:

```typescript
export type DemoPersona =
  | 'admin-primary'
  | 'admin-kindergarten'
  | 'teacher-primary'
  | 'teacher-kindergarten'
  | 'parent-primary'
  | 'parent-kindergarten'
  | 'staff'
  | 'super-admin';

/**
 * V7 — Auto-login a demo persona. Rate-limited 60/h/IP server-side.
 * Returns the same Session shape as login().
 */
export async function demoLogin(persona: DemoPersona): Promise<Session> {
  const res = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new ApiError(res.status, body.code ?? 'DEMO_LOGIN_FAILED', body.message ?? 'Demo login failed');
  }
  return (await res.json()) as Session;
}
```

- [ ] **Step 2: Create DemoAccountsBlock**

Create `apps/web/components/auth/demo-accounts-block.tsx`:

```tsx
'use client';

import { GraduationCap, Loader2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';

import { demoLogin, type DemoPersona } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface PersonaButton {
  persona: DemoPersona;
  label: string;
  email: string;
  icon: typeof Users;
}

const PERSONAS_PRIMARY: PersonaButton[] = [
  { persona: 'admin-primary',   label: 'Direction',  email: 'admin@demo-ecole.klasso.tn',  icon: ShieldCheck },
  { persona: 'teacher-primary', label: 'Enseignant', email: 'prof@demo-ecole.klasso.tn',   icon: GraduationCap },
  { persona: 'parent-primary',  label: 'Parent',     email: 'parent@demo-ecole.klasso.tn', icon: Users },
  { persona: 'teacher-kindergarten', label: 'Animateur', email: 'anim@demo-maternelle.klasso.tn', icon: Sparkles },
];

const PERSONAS_MORE: PersonaButton[] = [
  { persona: 'admin-kindergarten',  label: 'Dir. Maternelle',   email: 'admin@demo-maternelle.klasso.tn',  icon: ShieldCheck },
  { persona: 'parent-kindergarten', label: 'Parent maternelle', email: 'parent@demo-maternelle.klasso.tn', icon: Users },
  { persona: 'staff',               label: 'Personnel',         email: 'staff@demo-ecole.klasso.tn',       icon: Users },
  { persona: 'super-admin',         label: 'Super-admin',       email: 'super@klasso.tn',                  icon: ShieldCheck },
];

export function DemoAccountsBlock() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [loadingPersona, setLoadingPersona] = useState<DemoPersona | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(persona: DemoPersona) {
    if (loadingPersona) return;
    setLoadingPersona(persona);
    setError(null);
    try {
      const session = await demoLogin(persona);
      setSession(session);
      router.push('/dashboard' as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur démo. Réessaye.');
      setLoadingPersona(null);
    }
  }

  function renderButton(p: PersonaButton) {
    const Icon = p.icon;
    const loading = loadingPersona === p.persona;
    return (
      <button
        key={p.persona}
        type="button"
        disabled={!!loadingPersona}
        onClick={() => handleClick(p.persona)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-surface p-2.5 text-left text-xs transition hover:border-ambre-500 hover:bg-ambre-50 disabled:opacity-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ambre-50 text-ambre-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink-900">{p.label}</span>
          <span className="block truncate text-[10px] text-ink-300">{p.email}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-paper-100 p-4">
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        Comptes de démonstration
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PERSONAS_PRIMARY.map(renderButton)}
      </div>

      {showMore && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PERSONAS_MORE.map(renderButton)}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="mt-3 w-full text-center text-[11px] font-semibold text-ambre-600 hover:text-ambre-700"
      >
        {showMore ? '— Moins de démos' : '+ Plus de démos (4 autres personas)'}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
git add apps/web/lib/api/client.ts apps/web/components/auth/demo-accounts-block.tsx
git commit -m "feat(v7-a/web): demoLogin() client + DemoAccountsBlock (8 personas)"
```

---

## Task 10: Auth layout refactor (2-col) + Login page V7

**Files:**
- Modify: `apps/web/app/[locale]/(auth)/layout.tsx`
- Modify: `apps/web/app/[locale]/(auth)/login/page.tsx`

- [ ] **Step 1: Refactor auth layout to 2-col**

Read existing `apps/web/app/[locale]/(auth)/layout.tsx` to preserve existing logic (i18n etc.). Then replace its body with:

```tsx
import { setRequestLocale } from 'next-intl/server';

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export default function AuthLayout({ children, params: { locale } }: Props) {
  setRequestLocale(locale);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-paper-50">
      <aside className="hidden md:flex flex-col justify-between bg-gradient-to-br from-navy-900 via-[#143966] to-navy-700 p-10 text-white">
        <div>
          <div className="font-serif text-2xl font-bold">📘 Klasso</div>
          <div className="mt-1 text-xs uppercase tracking-[0.08em] text-white/60">
            L'école à l'ère numérique
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <h1 className="font-serif text-[32px] leading-[1.15] font-medium">
            La plateforme qui <em className="not-italic underline decoration-ambre-500 decoration-4 underline-offset-4">simplifie</em> la gestion de votre établissement.
          </h1>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Notes et bulletins en quelques clics</li>
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Communication 1:1 avec les parents</li>
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Paiements intégrés Stripe + local</li>
            <li className="flex gap-2"><span className="text-ambre-500">→</span> Adapté aux établissements africains</li>
          </ul>
        </div>

        <div className="text-xs text-white/40">© 2026 Klasso · Conçu pour les écoles africaines</div>
      </aside>

      <main className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Refactor login page V7**

Replace the entire content of `apps/web/app/[locale]/(auth)/login/page.tsx` with:

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';

import { DemoAccountsBlock } from '@/components/auth/demo-accounts-block';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, login } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth.schemas';

interface LoginError {
  message: string;
  availableTenantSlugs?: string[];
}

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<LoginError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', tenantSlug: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const session = await login(values);
      setSession(session);
      const next = params.get('next');
      const target = (next && next.startsWith('/') ? next : '/dashboard') as Route;
      router.push(target);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'TENANT_SLUG_REQUIRED') {
          const details = err.details as { availableTenantSlugs?: string[] } | undefined;
          setError({
            message: 'Plusieurs comptes correspondent à cet email. Précise ton établissement.',
            availableTenantSlugs: details?.availableTenantSlugs ?? [],
          });
          return;
        }
        if (err.status === 401) {
          setError({ message: 'Email ou mot de passe incorrect.' });
          return;
        }
        setError({ message: err.message });
        return;
      }
      setError({ message: 'Erreur réseau. Réessaye dans un instant.' });
    }
  }

  const showTenantField = (error?.availableTenantSlugs?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="font-serif text-2xl font-semibold text-ink-900">Bienvenue</h1>
        <p className="mt-1 text-sm text-ink-500">Connectez-vous à votre espace</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Connexion impossible</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.availableTenantSlugs && error.availableTenantSlugs.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {error.availableTenantSlugs.map((s) => (
                  <li key={s}><code>{s}</code></li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@etablissement.tn"
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
              aria-label={showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>

        {showTenantField && (
          <div className="space-y-1.5">
            <Label htmlFor="tenantSlug">Slug de l'établissement</Label>
            <Input id="tenantSlug" placeholder="ex: demo-ecole" {...form.register('tenantSlug')} />
          </div>
        )}

        <div className="flex items-center justify-end text-sm">
          <Link href="/forgot-password" className="text-ink-500 hover:text-ambre-600">
            Mot de passe oublié ?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-ambre-500 hover:bg-ambre-600 text-white py-6 rounded-lg font-semibold"
        >
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Se Connecter
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>

        <p className="text-center text-sm text-ink-500">
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-semibold text-ambre-600 hover:text-ambre-700">
            Inscrire votre école
          </Link>
        </p>
      </form>

      <DemoAccountsBlock />
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-ambre-500" aria-label="Chargement" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
```

- [ ] **Step 3: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
git add 'apps/web/app/[locale]/(auth)'
git commit -m "feat(v7-a/web): login V7 2-col layout + DemoAccountsBlock embedded"
```

---

## Task 11: AppShellClient refactor (use new Sidebar/Topbar)

**Files:**
- Modify: `apps/web/app/[locale]/(app)/app-shell-client.tsx`

- [ ] **Step 1: Replace AppShellClient body**

Replace the entire `apps/web/app/[locale]/(app)/app-shell-client.tsx` with:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { logout, refresh } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * V7 — AppShell with navy sidebar + paper main area. Sidebar nav derived from
 * `getNavForUser(user, tenant)` so the menu adapts per role × tenant.type.
 * Backwards compatible with V1.6 brand white-label runtime (CSS var injection).
 */
export function AppShellClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clear = useAuthStore((s) => s.clear);
  const refreshedRef = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (accessToken || refreshedRef.current) return;
    refreshedRef.current = true;
    refresh()
      .then((session) => setSession(session))
      .catch(() => {
        clear();
        router.replace('/login' as Route);
      });
  }, [isHydrated, accessToken, setSession, clear, router]);

  const brand: TenantBrand = useMemo(() => {
    const stored = (tenant?.brand ?? {}) as Partial<TenantBrand>;
    return { ...DEFAULT_BRAND, ...stored };
  }, [tenant?.brand]);

  useEffect(() => {
    if (!user) return;
    let styleEl = document.getElementById('tenant-brand-vars-client');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tenant-brand-vars-client';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildBrandStyleTag(brand);

    if (brand.faviconUrl) {
      let iconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!iconEl) {
        iconEl = document.createElement('link');
        iconEl.rel = 'icon';
        document.head.appendChild(iconEl);
      }
      iconEl.href = brand.faviconUrl;
    }
  }, [brand, user]);

  if (!isHydrated || !accessToken || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-8 w-8 animate-spin text-ambre-500" aria-label="Chargement" />
      </div>
    );
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    router.replace('/login' as Route);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-paper-50">
        <Sidebar onLogout={handleLogout} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 pb-6">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
pnpm --filter=@ecole-saas/web build
git add 'apps/web/app/[locale]/(app)/app-shell-client.tsx'
git commit -m "feat(v7-a/web): AppShellClient uses new Sidebar+Topbar (dynamic nav)"
```

---

## Task 12: Dashboard page refactor (persona/type config)

**Files:**
- Modify: `apps/web/app/[locale]/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace dashboard page**

Replace the entire content of `apps/web/app/[locale]/(app)/dashboard/page.tsx` with:

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import { useMemo } from 'react';

import { AnnouncementsPanel } from '@/components/dashboard/announcements-panel';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { NotesPanel } from '@/components/dashboard/notes-panel';
import { QuickAction } from '@/components/dashboard/quick-action';
import { getDashboardConfig } from '@/lib/dashboard/config';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export const dynamic = 'force-dynamic';

// Placeholder data — wired to real APIs in subsequent waves (V8+).
const PLACEHOLDER_DATA = {
  studentsCount: 45,
  attendanceRate: 92,
  overduePayments: 0,
  globalAverage: 14.2,
  classesCount: 17,
  childrenCount: 68,
  presentToday: 62,
  photosToday: 24,
  myStudentsCount: 54,
  evalsToGrade: 8,
  todayLessons: 5,
  newGrades: 5,
  amountDue: 180,
  activitiesToday: 2,
  presenceToday: '✓',
  canteenToday: 284,
  busesActive: 3,
  infirmaryToday: 0,
  tenantsCount: 17,
  usersCount: 1200,
  pendingDemos: 3,
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const config = useMemo(() => {
    if (!user) return null;
    return getDashboardConfig(user.role, tenant?.type ?? null);
  }, [user, tenant?.type]);

  if (!user || !config) return null;

  const heading = interpolate(config.heading, {
    firstName: user.firstName ?? '',
    childFirstName: 'Yasmine',
    tenantName: tenant?.name ?? '',
  });

  const subtitle = config.subtitleKey === 'today'
    ? `Vue d'ensemble · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    : config.subtitleKey === 'classesCount'
      ? `${PLACEHOLDER_DATA.classesCount} classes · ${PLACEHOLDER_DATA.myStudentsCount} élèves`
      : config.subtitleKey === 'childrenCount'
        ? `${PLACEHOLDER_DATA.childrenCount} enfants à ${tenant?.name ?? "l'établissement"}`
        : `${PLACEHOLDER_DATA.tenantsCount} écoles · ${PLACEHOLDER_DATA.pendingDemos} demandes en attente`;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink-900">{heading}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2 text-sm text-ink-900 shadow-sm hover:shadow-md"
        >
          <Sparkles className="h-4 w-4 text-ambre-500" aria-hidden="true" />
          Statistiques
        </button>
      </header>

      <section className="grid gap-4" style={{ gridTemplateColumns: `repeat(${config.kpis.length}, minmax(0, 1fr))` }}>
        {config.kpis.map((kpi, i) => {
          const raw = PLACEHOLDER_DATA[kpi.selectorKey as keyof typeof PLACEHOLDER_DATA];
          const value = raw === undefined ? '—' : String(raw);
          const sub = kpi.sub ? interpolate(kpi.sub, { classesCount: String(PLACEHOLDER_DATA.classesCount) }) : undefined;
          return <KpiCard key={i} label={kpi.label} value={value} variant={kpi.variant} icon={kpi.icon} sub={sub} />;
        })}
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {config.actions.map((a, i) => (
          <QuickAction key={i} label={a.label} href={a.href} icon={a.icon} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          {config.panels.includes('latestNotes') && (
            <NotesPanel
              notes={[
                { id: 'n1', studentName: 'Ibrahima Ba', subjectName: 'Sciences de la Vie et de la Terre', scaledScore: 10.91, date: '2026-02-06' },
                { id: 'n2', studentName: 'Ibrahima Ba', subjectName: 'Sciences de la Vie et de la Terre', scaledScore: 11.77, date: '2026-03-13' },
                { id: 'n3', studentName: 'Ibrahima Ba', subjectName: 'Sciences de la Vie et de la Terre', scaledScore: 11.82, date: '2026-01-04' },
              ]}
            />
          )}
          {config.panels.includes('journalToday') && (
            <div className="rounded-2xl bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-bold text-ink-900">Journal du jour</h2>
              <p className="mt-2 text-sm text-ink-500">— V7-B implémentation détaillée à venir —</p>
            </div>
          )}
        </div>
        {config.panels.includes('announcements') && (
          <AnnouncementsPanel announcements={[]} />
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
pnpm --filter=@ecole-saas/web build
git add 'apps/web/app/[locale]/(app)/dashboard/page.tsx'
git commit -m "feat(v7-a/web): dashboard adapts per persona × type (8 variants via getDashboardConfig)"
```

---

## Task 13: Landing top menu (TopNav)

**Files:**
- Create: `apps/web/components/landing/top-nav.tsx`
- Modify: `apps/web/app/[locale]/page.tsx` — inject TopNav above Hero + add section IDs to existing landing components.

- [ ] **Step 1: Create TopNav**

Create `apps/web/components/landing/top-nav.tsx`:

```tsx
'use client';

import { BookOpenText, Menu, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useEffect, useState } from 'react';

import { LanguageSwitcher } from '@/components/landing/language-switcher';

const ANCHOR_LINKS = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#segments', label: 'Pour qui ?' },
  { href: '#pricing',  label: 'Tarifs' },
  { href: '#faq',      label: 'FAQ' },
];

export function TopNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition ${
        scrolled
          ? 'bg-navy-900/95 backdrop-blur-md text-white border-b border-white/5'
          : 'bg-transparent text-ink-900'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-ambre-500 to-ambre-600 text-white">
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-serif text-xl font-bold">Klasso</span>
        </Link>

        <nav className="ml-auto hidden md:flex items-center gap-6 text-sm">
          {ANCHOR_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="opacity-90 hover:opacity-100">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto md:ml-0 flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="hidden md:inline text-sm opacity-90 hover:opacity-100">
            Connexion
          </Link>
          <a
            href="#demo-form"
            className="rounded-full bg-ambre-500 px-4 py-1.5 text-sm font-semibold text-white shadow-md hover:bg-ambre-600"
          >
            Démo gratuite →
          </a>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-navy-900 text-white px-4 pb-4 space-y-3">
          {ANCHOR_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-2">
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2">
            Connexion
          </Link>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Inject TopNav into landing page**

Open `apps/web/app/[locale]/page.tsx`. Add import:

```typescript
import { TopNav } from '@/components/landing/top-nav';
```

In the JSX, place `<TopNav />` as the **first child** of `<main>`, before `<Hero />`:

```tsx
return (
  <main className="min-h-screen bg-paper text-ink">
    <TopNav />
    <Hero />
    {/* ... */}
  </main>
);
```

- [ ] **Step 3: Add section IDs to existing landing components**

For each anchor link to resolve, the target section must have a matching `id`. Edit each of the following files and add the `id` attribute to its top-level `<section>` (or wrap in one if missing):

- `apps/web/components/landing/modules-grid.tsx` → `id="features"` on outermost `<section>`
- `apps/web/components/landing/school-segments.tsx` → `id="segments"`
- `apps/web/components/landing/pricing.tsx` → `id="pricing"`
- `apps/web/components/landing/faq.tsx` → `id="faq"`
- `apps/web/components/landing/demo-form.tsx` → `id="demo-form"`

Example for `modules-grid.tsx` (root pattern `<section className="...">`):

```tsx
<section id="features" className="...">
```

Identical pattern for the 4 other files — just add the `id`.

- [ ] **Step 4: Verify + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
pnpm --filter=@ecole-saas/web build
git add apps/web/components/landing/top-nav.tsx 'apps/web/app/[locale]/page.tsx' apps/web/components/landing/
git commit -m "feat(v7-a/web): landing TopNav (sticky navy + 4 anchors + FR/AR + CTA orange) + section IDs"
```

---

## Task 14: ADR 0013 + roadmap renumbering

**Files:**
- Create: `docs/adr/0013-v7-design-system.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Create ADR 0013**

Create `docs/adr/0013-v7-design-system.md`:

```markdown
# 0013 — V7 Design System (Klasio-inspired + Dynamic Nav + Demo Mode)

**Date:** 2026-05-27
**Status:** Accepted
**Deciders:** User

## Context

V6 livré le 2026-05-27. Le frontend a deux problèmes :
1. Incohérence visuelle entre landing éditorial Tunisian + login/dashboard shadcn Indigo défaut.
2. Navigation non-adaptative : pas de menu dynamique par rôle × type d'établissement.

L'utilisateur a fourni 2 captures Klasio comme cible visuelle pixel-perfect.

## Decision

### Design tokens

- Sidebar navy `#0f1419` quasi-noir + active state `#1a2028` + border-left ambre `#fbb13c`.
- Surface paper `#f4f4ef` (replace Tunisian sand dans l'app, sand reste sur landing pour V7-A).
- Accent ambre `#fbb13c → #e89218` pour CTA et notes pills.
- KPI gradient icons : blue / green / orange / amber / pink / purple selon contexte.
- Typo : Cormorant Garamond pour brand/hero, system-ui pour body.

### Navigation dynamique

`getNavForUser(user, tenant): NavSection[]` dans `apps/web/lib/nav/menu.ts` résout le menu sidebar selon la matrice 5 rôles × 3 tenant types. Renommages KINDERGARTEN : Élèves→Enfants, Enseignants→Animateurs, Classes→Groupes d'âge, Notes/Bulletins/Discipline masqués remplacés par Journal/Activités.

### Dashboard widgets

`getDashboardConfig(role, tenantType): DashboardConfig` résout 8 variantes de dashboard (KPIs + quick actions + panels) adaptées au persona × type.

### Demo accounts

`POST /api/auth/demo-login` body `{ persona: DemoPersona }` retourne `{ user, tenant, accessToken, refreshToken }`. Rate-limited 60/h/IP via `@nestjs/throttler`. 8 personas seedés : admin/teacher/parent/staff × (primary/kindergarten) + super-admin. Pas de password check — pour démos commerciales publiques uniquement.

### Wave numbering

V7 (ce travail) prend la place de l'ancien V7-Finance qui bumps à V8. Toutes les vagues subséquentes glissent de +1 dans la roadmap.

## Consequences

**Positive:**
- Cohérence visuelle 100% landing→login→app shell.
- 8 démos commerciales publiques en 1 clic = forte conversion sur le landing.
- Menu/dashboard scalent avec les vagues futures (V8 Finance, V9 Vie École, etc.) sans refonte structurelle.

**Negative:**
- Refonte large (~28 fichiers V7-A web). Risque régression CI E2E.
- Demo accounts en prod = surface d'abuse (mitigation rate-limit + données non-PII).
- Mobile V7-B reporté en plan séparé (cohérence visuelle web-only en attendant).

## V7-A explicit out-of-scope (V7-B)

- Mobile design system (3 apps Expo) — `packages/ui-mobile` à créer
- RTL / AR direction support
- Demo data reset cron hourly
- Animation polish + Framer Motion
- A11y audit WCAG 2.1 AA (V12 Hardening)

## References

- Spec : `docs/superpowers/specs/2026-05-27-v7-design-refactor.md`
- Plan : `docs/superpowers/plans/2026-05-27-v7-design-refactor.md`
- API : `apps/api/src/demo-login/`
- Tokens : `apps/web/app/globals.css` (V7 vars) + `apps/web/tailwind.config.ts`
- Nav matrix : `apps/web/lib/nav/menu.ts` + tests
- Dashboard config : `apps/web/lib/dashboard/config.ts`
- Components : `apps/web/components/app-shell/*`, `apps/web/components/dashboard/*`, `apps/web/components/auth/demo-accounts-block.tsx`, `apps/web/components/landing/top-nav.tsx`
```

- [ ] **Step 2: Update roadmap with renumbering**

Open `docs/roadmap.md`. Locate the row `| **7** | Finance ...` (currently around line 49). Insert a new row above it for V7 design:

```markdown
| **V7** | **Design Refactor (Klasio-inspired + Dynamic Nav + Demo Mode)** — Tokens navy/ambre + sidebar dynamique 5 rôles × 3 types + login 2-col + demo accounts 8 personas + landing top menu sticky + ADR 0013. V7-A web livré, V7-B mobile à venir. | ~4.5j (web) + ~2j (mobile) | V6-A | ✅ V7-A livré 2026-05-27 |
```

Then **rename** subsequent rows: `| **7** | Finance ...` → `| **8** | Finance ...`, `| **8** | Stock/Cantine ...` → `| **9** |`, etc. up through `V12 Mobile build` → `V13 Mobile build`.

Grep for other V7-V12 mentions:

```bash
grep -n "V7\|V8\|V9\|V10\|V11\|V12" docs/roadmap.md
```

Update text references that point to the OLD numbering (Finance was V7, becomes V8 ; Stock was V8, becomes V9 ; etc.).

- [ ] **Step 3: Commit docs**

```bash
git add docs/adr/0013-v7-design-system.md docs/roadmap.md
git commit -m "docs(v7-a): ADR 0013 + roadmap renumber (old V7-Finance bumps to V8)"
```

---

## Task 15: Final verification + PR + auto-merge

**Files:** none modified — verification + PR only.

- [ ] **Step 1: Full API verify**

```bash
pnpm --filter=@ecole-saas/api type-check
pnpm --filter=@ecole-saas/api lint
pnpm --filter=@ecole-saas/api build
```

All three PASS. If Windows AppControl blocks vitest, trust CI.

- [ ] **Step 2: Full web verify**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web build
```

Both PASS. ESLint via `next lint` may be blocked locally by swc native binary — trust CI.

- [ ] **Step 3: Smoke test (if possible)**

```bash
pnpm dev
```

Manually verify in browser:
- `/` shows TopNav sticky + 4 anchors scroll to sections
- `/login` shows 2-col + 4 demo buttons
- Click demo "Direction" → redirects `/dashboard` with admin@demo-ecole sidebar (Notes, Bulletins, etc. visible)
- Click logout, click "+ Plus de démos", click "Dir. Maternelle" → redirects `/dashboard` with admin@demo-maternelle sidebar (Journal quotidien, Activités, NO Notes/Bulletins)

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin claude/v7-design 2>&1 | tail -5

gh pr create --repo ultra3omda/Jardin \
  --title "feat(v7-a): Design Refactor Web (Klasio-inspired + Dynamic Nav + Demo Mode)" \
  --body "$(cat <<'EOF'
## Summary

V7-A — Refonte design complète du web. Pixel-perfect au Klasio screenshot fourni par l'utilisateur, branding Klasso conservé, menu+dashboard dynamiques per rôle × tenant type, demo accounts auto-login 1 clic pour démos commerciales publiques.

### Highlights

- **Design tokens V7** : navy `#0f1419` sidebar + ambre `#fbb13c → #e89218` accent + paper `#f4f4ef` + Cormorant Garamond brand
- **Navigation dynamique** : `getNavForUser()` adapte le menu à 5 rôles × 3 tenant types (renommages KG : Enfants/Animateurs/Groupes d'âge, Notes/Bulletins/Discipline masqués)
- **Dashboard adaptatif** : 8 variantes via `getDashboardConfig()` (KPI cards + quick actions + panels par persona × type)
- **Login 2-col** : navy gradient à gauche (hook + features) + form droite + **DemoAccountsBlock** (8 personas 1-clic)
- **Landing top menu** : sticky transparent → navy au scroll + 4 anchors + FR/AR + CTA orange
- **Demo accounts API** : `POST /api/auth/demo-login` rate-limited 60/h/IP + 6 unit tests + seed 9 users + 2 tenants démo
- **Renumérotation roadmap** : ancien V7-Finance → V8, etc.
- **ADR 0013** + spec + plan archivés

### Wave numbering

V7-A web = ce PR. V7-B mobile (tokens packages/ui-mobile + 3 apps Expo) sera un PR séparé.

## Test plan

- [ ] CI verte sur API tests (~6 new demo-login tests + 7 nav menu tests)
- [ ] \`pnpm lint && pnpm type-check && pnpm build\` vert
- [ ] Manuel : / montre TopNav sticky avec 4 anchors fonctionnels
- [ ] Manuel : /login montre 2-col + 4 boutons demo cliquables
- [ ] Manuel : Click "Direction" demo → redirect /dashboard avec sidebar PRIMARY_SCHOOL (Notes, Bulletins, etc.)
- [ ] Manuel : Click "Dir. Maternelle" demo → redirect /dashboard avec sidebar KINDERGARTEN (Journal quotidien, Activités, PAS de Notes/Bulletins)
- [ ] Manuel : Switch entre 8 demo accounts → 8 sidebars différents, 8 dashboards différents
- [ ] Vercel preview deploy fonctionne
- [ ] CI verte → auto-merge per CLAUDE.md §9

## Locked decisions

D1-D9 du spec (branding, scope, direction visuelle, palette V4 Pétrole+Ambre, demo accounts, top menu, app shell, nav matrix, wave renumbering).

## Out of scope V7-A (deferred V7-B)

- Mobile (3 apps Expo, packages/ui-mobile)
- RTL / AR direction
- Demo data reset cron hourly
- Animation polish Framer Motion
- A11y WCAG 2.1 AA audit (V12 Hardening)
EOF
)" 2>&1 | tail -5
```

- [ ] **Step 5: Wait for CI + auto-merge per CLAUDE.md §9**

```bash
PR=$(gh pr list --repo ultra3omda/Jardin --head claude/v7-design --json number --jq '.[0].number')
gh pr checks "$PR" --repo ultra3omda/Jardin --watch
gh pr merge "$PR" --repo ultra3omda/Jardin --merge
```

V7-A livré.

---

## Self-review checklist

- [x] **Spec coverage:** Tous les D1-D9 + sections 3-15 du spec sont couverts par les tasks 1-15. RTL/A11y/Mobile explicitement hors-scope V7-A (V7-B).
- [x] **Placeholder scan:** Pas de "TBD"/"TODO"/"implement later". Tous les blocs code sont concrets. Données de seed et données mockées dashboard sont synthétiques nommées.
- [x] **Type consistency:** `DemoPersona` consistant entre `dto.ts`, `constants.ts`, `client.ts`, `demo-accounts-block.tsx`. `NavItem/NavSection` consistant entre `menu.ts`, tests, `nav-section.tsx`, `sidebar.tsx`. `DashboardConfig.KpiConfig.selectorKey` cohérent avec les clés de `PLACEHOLDER_DATA` dans `dashboard/page.tsx`.
- [x] **TDD ordering:** Tasks 2 (demo-login) et 5 (nav menu) écrivent les tests avant l'impl. Composants UI (tasks 7, 8) pas de unit test (testés via E2E + visuel manuel) — pattern existant codebase.
- [x] **Renumbering:** Task 14 met à jour roadmap pour bumper V7-Finance→V8 etc.
- [x] **Auto-merge:** Task 15 attend CI green puis merge per CLAUDE.md §9.
