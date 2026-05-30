# T2d — Admin SaaS (super-admin cross-tenant) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four hardcoded SUPER_ADMIN console pages (audit, demo requests, platform dashboard, analytics) with real persisted data served by new `@Roles(SUPER_ADMIN)` cross-tenant read/aggregation endpoints, plus an honest branding info page — no schema migration, no invented numbers.

**Architecture:** New NestJS endpoints under `admin/*` reuse the already-built SUPER_ADMIN cross-tenant mechanism (`TenantContextInterceptor` sets `skipTenantFilter` when `role===SUPER_ADMIN`; `RolesGuard` global APP_GUARD returns 403 for non-super before the service runs). Audit data is read straight from the existing `AuditLog` model; demo requests are derived from `AuditLog action='demo.requested'` with status persisted as new `action='demo.status_changed'` rows (no new table); overview/analytics are in-memory JS aggregations over `tenant`/`user`/`student` counts and selects. The web pages drop their hardcoded arrays and switch to the frozen T2a pattern (`useResource` + `ResourceListPage` + `CrudModal`/`useMutation`). MRR/plans/subscriptions stay explicitly "à venir" — never a fabricated figure.

**Tech Stack:** NestJS 10 + Prisma (api) · Vitest + supertest (api tests, CI) · Next.js 14 App Router + TanStack Query v5 + Zod + zustand + next-intl (web) · Playwright (web E2E, CI).

---

## Constraints (read before starting)

- **Isolation invariant:** tenant/role scope derives ONLY from the JWT. NEVER from Host/Origin/subdomain. T2d adds aggregated cross-tenant READS gated by `@Roles(UserRole.SUPER_ADMIN)`; the global `RolesGuard` blocks non-super callers with 403 before any service method executes.
- **No migration:** T2d MVP touches NO Prisma schema. If any task seems to need a column, STOP and escalate — do not add one.
- **Windows native-binding block (ERR_DLOPEN_FAILED):** `vitest`, `next build`, `next lint`, `prisma` crash locally. **Local gate is ONLY** `pnpm --filter=@ecole-saas/web type-check` and `pnpm --filter=@ecole-saas/api type-check`. The "run test, watch it fail/pass" steps for Vitest specs execute in **CI** (authoritative) — locally you only type-check. Build / Vitest / Playwright all run in CI.
- **No invented money:** MRR, ARR, churn, ARPU, plan distribution, subscription revenue are all 🛑 deferred. The UI shows an explicit "à venir" placeholder, NEVER a number.
- **Standards:** files <300 lines (800 max), functions <50 lines, no `any`/`@ts-ignore`, coverage ≥70% on business logic, no PII/passwords in logs, UI in FR / code in EN, WCAG 2.1 AA on web, Conventional Commits, attribution disabled (no `Co-Authored-By` trailer).
- **Auto-merge:** one PR at the end; CI green → `gh pr merge <N> --merge` immediately (merge commit, not squash).

---

## File Structure

**Backend — CREATE:**
- `apps/api/src/admin/audit.service.ts` — reads `AuditLog` with filters + pagination; writes an `admin.audit.viewed` row.
- `apps/api/src/admin/audit.service.spec.ts` — Vitest unit spec (mock PrismaService).
- `apps/api/src/admin/audit.controller.ts` — `@Roles(SUPER_ADMIN) @Controller('admin/audit')`, `GET /`.
- `apps/api/src/admin/dto/audit.dto.ts` — `AuditQueryDto`, `AuditEntryDto`, `AuditListDto`.
- `apps/api/src/demo-requests/demo-status.util.ts` — `DEMO_STATUSES`, `DemoStatus`, `isPendingDemo`, `isDemoStatus`, `deriveDemoRequests` (pure).
- `apps/api/src/demo-requests/demo-status.util.spec.ts` — Vitest unit spec for the pure util.
- `apps/api/src/demo-requests/admin-demo-requests.controller.ts` — `@Roles(SUPER_ADMIN) @Controller('admin/demo-requests')`, `GET /` + `PATCH /:requestId/status`.
- `apps/api/src/demo-requests/dto/demo-admin.dto.ts` — `DemoRequestAdminDto`, `UpdateDemoStatusDto`.
- `apps/api/src/demo-requests/demo-requests.admin.service.spec.ts` — Vitest spec for `listForAdmin`/`updateStatus`.
- `apps/api/src/admin/platform-analytics.service.ts` — overview counts + analytics aggregation.
- `apps/api/src/admin/platform-analytics.service.spec.ts` — Vitest spec (mock PrismaService).
- `apps/api/src/admin/platform-analytics.controller.ts` — `@Roles(SUPER_ADMIN) @Controller('admin')`, `GET /overview` + `GET /analytics`.
- `apps/api/src/admin/dto/platform.dto.ts` — `OverviewDto`, `GrowthPointDto`, `CategoryCountDto`, `AnalyticsDto`.
- `apps/api/test/admin-platform.e2e-spec.ts` — e2e: super 200 + SCHOOL_ADMIN 403 across all new routes.

**Backend — MODIFY:**
- `apps/api/src/admin/admin.module.ts` — register `AuditController`, `PlatformAnalyticsController`, `AuditService`, `PlatformAnalyticsService`.
- `apps/api/src/demo-requests/demo-requests.service.ts` — add `listForAdmin()` + `updateStatus()`.
- `apps/api/src/demo-requests/demo-requests.module.ts` — register `AdminDemoRequestsController`.
- `apps/api/prisma/seed.ts` — capture `superAdmin`; add idempotent `seedDemoRequests(superAdmin.id)`.

**Web — CREATE:**
- `apps/web/lib/api/admin-client.ts` — shared `AdminApiError` + `adminRequest<T>` (extracted copy of the admin-tenants pattern; new clients import this).
- `apps/web/lib/api/admin-audit.ts` — `AuditEntry`, `AuditListResponse`, `AuditQuery`, `listAudit`.
- `apps/web/lib/api/admin-demo.ts` — `DEMO_STATUSES`, `DemoStatus`, `DemoRequestAdmin`, `listDemoRequests`, `updateDemoStatus`.
- `apps/web/lib/api/admin-analytics.ts` — `Overview`, `GrowthPoint`, `CategoryCount`, `Analytics`, `getOverview`, `getAnalytics`.

**Web — REWRITE (drop hardcoded arrays):**
- `apps/web/app/[locale]/(app)/admin/audit/page.tsx`
- `apps/web/app/[locale]/(app)/admin/demo/page.tsx`
- `apps/web/app/[locale]/(app)/admin/page.tsx`
- `apps/web/app/[locale]/(app)/admin/analytics/page.tsx`
- `apps/web/app/[locale]/(app)/admin/branding/page.tsx`

**Docs — CREATE:**
- `docs/adr/0013-t2d-saas-admin.md`

> **No new web proxy file:** `apps/web/app/api/admin/[[...action]]/route.ts` already forwards `GET/POST/PATCH/DELETE` to `${API_URL}/api/admin/${action}${search}` with the query string, so `/api/admin/audit`, `/api/admin/demo-requests`, `/api/admin/overview`, `/api/admin/analytics` are covered.

---

## Wave 1 — Audit + Demo requests

### Task 1: Audit API (service + DTO + controller)

**Files:**
- Create: `apps/api/src/admin/dto/audit.dto.ts`
- Create: `apps/api/src/admin/audit.service.ts`
- Create: `apps/api/src/admin/audit.service.spec.ts`
- Create: `apps/api/src/admin/audit.controller.ts`
- Modify: `apps/api/src/admin/admin.module.ts`

- [ ] **Step 1: Write the DTOs**

Create `apps/api/src/admin/dto/audit.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Filtre sur le nom de l’action (contient)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional({ description: 'Filtre exact sur la ressource' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  resource?: string;

  @ApiPropertyOptional({ description: 'Filtre par établissement (tenantId)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filtre par utilisateur acteur (userId)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @ApiPropertyOptional({ description: 'Borne basse de date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Borne haute de date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class AuditEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() action!: string;
  @ApiProperty() resource!: string;
  @ApiPropertyOptional({ nullable: true }) tenantId!: string | null;
  @ApiPropertyOptional({ nullable: true }) tenantSlug!: string | null;
  @ApiPropertyOptional({ nullable: true }) tenantName!: string | null;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;
  @ApiPropertyOptional({ nullable: true }) userEmail!: string | null;
  @ApiPropertyOptional({ nullable: true }) ip!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) metadata!: unknown;
  @ApiProperty() createdAt!: string;
}

export class AuditListDto {
  @ApiProperty({ type: [AuditEntryDto] }) items!: AuditEntryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
```

- [ ] **Step 2: Write the failing service spec**

Create `apps/api/src/admin/audit.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from './audit.service';

const meta = { ip: '127.0.0.1', userAgent: 'vitest' };

function buildPrisma() {
  return {
    auditLog: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'a1',
          action: 'admin.tenant.created',
          resource: 'tenant',
          tenantId: null,
          userId: 'super-1',
          ip: '10.0.0.1',
          metadata: { slug: 'demo' },
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
          user: { email: 'super@klasso.tn' },
          tenant: null,
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  it('maps rows to DTOs with tenant/user joins flattened', async () => {
    const result = await service.list('super-1', {}, meta);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.items[0]).toMatchObject({
      id: 'a1',
      action: 'admin.tenant.created',
      userEmail: 'super@klasso.tn',
      tenantSlug: null,
      createdAt: '2026-05-01T10:00:00.000Z',
    });
  });

  it('builds a filtered where clause and paginates', async () => {
    await service.list('super-1', { action: 'tenant', tenantId: 't1', page: 2, pageSize: 10 }, meta);
    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.where.action).toEqual({ contains: 'tenant', mode: 'insensitive' });
    expect(args.where.tenantId).toBe('t1');
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('clamps pageSize to the maximum', async () => {
    await service.list('super-1', { pageSize: 9999 }, meta);
    const args = prisma.auditLog.findMany.mock.calls[0][0];
    expect(args.take).toBe(100);
  });

  it('records an admin.audit.viewed row and never throws if the write fails', async () => {
    prisma.auditLog.create.mockRejectedValueOnce(new Error('boom'));
    await expect(service.list('super-1', {}, meta)).resolves.toBeDefined();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'admin.audit.viewed', userId: 'super-1' }),
      }),
    );
  });
});
```

- [ ] **Step 3: Run the spec to confirm it fails (CI; local = type-check only)**

Local: `pnpm --filter=@ecole-saas/api type-check` → FAILS (`Cannot find module './audit.service'`).
CI Vitest expectation: FAIL with "Cannot find module './audit.service'".

- [ ] **Step 4: Implement the service**

Create `apps/api/src/admin/audit.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../common/prisma/prisma.service';
import { RequestMeta } from '../auth/utils/request-meta.utils';
import { AuditEntryDto, AuditListDto, AuditQueryDto } from './dto/audit.dto';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type AuditRow = Prisma.AuditLogGetPayload<{
  include: { user: { select: { email: true } }; tenant: { select: { slug: true; name: true } } };
}>;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(viewerId: string, query: AuditQueryDto, meta: RequestMeta): Promise<AuditListDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = Math.min(query.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { email: true } }, tenant: { select: { slug: true, name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    await this.recordView(viewerId, meta);
    return { items: rows.map((row) => this.toDto(row)), total, page, pageSize };
  }

  private buildWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.resource) where.resource = query.resource;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    return where;
  }

  private toDto(row: AuditRow): AuditEntryDto {
    return {
      id: row.id,
      action: row.action,
      resource: row.resource,
      tenantId: row.tenantId,
      tenantSlug: row.tenant?.slug ?? null,
      tenantName: row.tenant?.name ?? null,
      userId: row.userId,
      userEmail: row.user?.email ?? null,
      ip: row.ip,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async recordView(viewerId: string, meta: RequestMeta): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'admin.audit.viewed',
          resource: 'audit',
          tenantId: null,
          userId: viewerId,
          metadata: {},
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`audit admin.audit.viewed failed: ${String(err)}`);
    }
  }
}
```

- [ ] **Step 5: Implement the controller**

Create `apps/api/src/admin/audit.controller.ts`:

```ts
import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { AuditService } from './audit.service';
import { AuditListDto, AuditQueryDto } from './dto/audit.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOkResponse({ type: AuditListDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuditQueryDto,
    @Req() req: Request,
  ): Promise<AuditListDto> {
    return this.auditService.list(user.id, query, getRequestMeta(req));
  }
}
```

- [ ] **Step 6: Register in the module**

Modify `apps/api/src/admin/admin.module.ts` — add imports and register the controller + provider:

```ts
import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { InviteTokensController } from './invite-tokens.controller';
import { InviteTokensService } from './invite-tokens.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [EmailModule],
  controllers: [InviteTokensController, TenantsController, AuditController],
  providers: [InviteTokensService, TenantsService, AuditService],
  exports: [InviteTokensService, TenantsService],
})
export class AdminModule {}
```

- [ ] **Step 7: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS (no errors).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/admin/dto/audit.dto.ts apps/api/src/admin/audit.service.ts apps/api/src/admin/audit.service.spec.ts apps/api/src/admin/audit.controller.ts apps/api/src/admin/admin.module.ts
git commit -m "feat(api): add SUPER_ADMIN audit log read endpoint"
```

---

### Task 2: Web audit page (real data)

**Files:**
- Create: `apps/web/lib/api/admin-client.ts`
- Create: `apps/web/lib/api/admin-audit.ts`
- Modify: `apps/web/app/[locale]/(app)/admin/audit/page.tsx`

- [ ] **Step 1: Extract the shared admin client**

Create `apps/web/lib/api/admin-client.ts` (copy of the `admin-tenants.ts` request pattern so new clients share it; leave `admin-tenants.ts` untouched):

```ts
const ADMIN_BASE = '/api/admin';

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function adminRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${ADMIN_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let code: string | undefined;
    let message = `Erreur ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string; code?: string };
      if (body.message) message = body.message;
      if (body.code) code = body.code;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new AdminApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
```

- [ ] **Step 2: Write the audit API client**

Create `apps/web/lib/api/admin-audit.ts`:

```ts
import { adminRequest } from './admin-client';

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName: string | null;
  userId: string | null;
  userEmail: string | null;
  ip: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditQuery {
  action?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function listAudit(token: string, query: AuditQuery): Promise<AuditListResponse> {
  const params = new URLSearchParams();
  if (query.action) params.set('action', query.action);
  if (query.tenantId) params.set('tenantId', query.tenantId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return adminRequest<AuditListResponse>(`/audit${qs ? `?${qs}` : ''}`, token);
}
```

- [ ] **Step 3: Rewrite the audit page**

Replace the entire contents of `apps/web/app/[locale]/(app)/admin/audit/page.tsx` (drops the `AUDIT_LOG` array and client-side filter):

```tsx
'use client';

import { useMemo, useState } from 'react';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { listAudit, type AuditQuery } from '@/lib/api/admin-audit';
import { listTenants, type TenantSummary } from '@/lib/api/admin-tenants';

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const query: AuditQuery = useMemo(
    () => ({
      action: action.trim() || undefined,
      tenantId: tenantId || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [action, tenantId, from, to, page],
  );

  const tenants = useResource<TenantSummary[]>(['admin', 'tenants', 'options'], (token) =>
    listTenants(token),
  );

  const audit = useResource(['admin', 'audit', JSON.stringify(query)], (token) =>
    listAudit(token, query),
  );

  const items = audit.data?.items ?? [];
  const total = audit.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <ResourceListPage
      title="Journal d’audit"
      description="Événements de la plateforme, tous établissements confondus."
      isLoading={audit.isLoading}
      isError={audit.isError}
      isEmpty={items.length === 0}
      onRetry={audit.refetch}
      errorMessage="Impossible de charger le journal d’audit."
      emptyTitle="Aucun événement"
      emptyDescription="Aucun événement ne correspond à ces filtres."
      skeletonCols={5}
      action={
        <form
          className="flex flex-wrap items-end gap-3"
          aria-label="Filtres du journal d’audit"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Action</span>
            <input
              type="text"
              value={action}
              onChange={(e) => resetToFirstPage(setAction)(e.target.value)}
              placeholder="ex. admin.tenant"
              className="rounded-md border px-2 py-1"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Établissement</span>
            <select
              value={tenantId}
              onChange={(e) => resetToFirstPage(setTenantId)(e.target.value)}
              disabled={tenants.isLoading || tenants.isError}
              className="rounded-md border px-2 py-1"
            >
              <option value="">Tous</option>
              {(tenants.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Du</span>
            <input
              type="date"
              value={from}
              onChange={(e) => resetToFirstPage(setFrom)(e.target.value)}
              className="rounded-md border px-2 py-1"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-muted-foreground">Au</span>
            <input
              type="date"
              value={to}
              onChange={(e) => resetToFirstPage(setTo)(e.target.value)}
              className="rounded-md border px-2 py-1"
            />
          </label>
        </form>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Journal d’audit">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Acteur</th>
              <th className="py-2 pr-4">Établissement</th>
              <th className="py-2 pr-4">IP</th>
              <th className="py-2 pr-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((entry) => (
              <tr key={entry.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs">{entry.action}</td>
                <td className="py-2 pr-4">{entry.userEmail ?? '—'}</td>
                <td className="py-2 pr-4">{entry.tenantName ?? '—'}</td>
                <td className="py-2 pr-4 font-mono text-xs">{entry.ip ?? '—'}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="mt-4 flex items-center justify-between" aria-label="Pagination du journal">
        <span className="text-sm text-muted-foreground">
          {total} événement(s) — page {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </nav>
    </ResourceListPage>
  );
}
```

> **If `listTenants`/`TenantSummary` names differ in `admin-tenants.ts`, match the existing exports** — the implementer must read `apps/web/lib/api/admin-tenants.ts` first and align the import. Do NOT rename the existing export.

- [ ] **Step 4: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api/admin-client.ts apps/web/lib/api/admin-audit.ts "apps/web/app/[locale]/(app)/admin/audit/page.tsx"
git commit -m "feat(web): wire admin audit page to real audit API"
```

---

### Task 3: Demo requests admin API (derive + status workflow)

**Files:**
- Create: `apps/api/src/demo-requests/demo-status.util.ts`
- Create: `apps/api/src/demo-requests/demo-status.util.spec.ts`
- Create: `apps/api/src/demo-requests/dto/demo-admin.dto.ts`
- Create: `apps/api/src/demo-requests/admin-demo-requests.controller.ts`
- Create: `apps/api/src/demo-requests/demo-requests.admin.service.spec.ts`
- Modify: `apps/api/src/demo-requests/demo-requests.service.ts`
- Modify: `apps/api/src/demo-requests/demo-requests.module.ts`

- [ ] **Step 1: Write the failing util spec**

Create `apps/api/src/demo-requests/demo-status.util.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveDemoRequests, isDemoStatus, isPendingDemo } from './demo-status.util';

const requestedRow = (requestId: string, createdAt: string, extra: Record<string, unknown> = {}) => ({
  action: 'demo.requested',
  metadata: { requestId, email: `${requestId}@x.tn`, schoolName: 'X', studentsCount: 10, locale: 'fr', ...extra },
  createdAt: new Date(createdAt),
});

const statusRow = (requestId: string, status: string, createdAt: string, note?: string) => ({
  action: 'demo.status_changed',
  metadata: { requestId, status, ...(note ? { note } : {}) },
  createdAt: new Date(createdAt),
});

describe('demo-status.util', () => {
  it('isPendingDemo true only for NEW/CONTACTED', () => {
    expect(isPendingDemo('NEW')).toBe(true);
    expect(isPendingDemo('CONTACTED')).toBe(true);
    expect(isPendingDemo('SCHEDULED')).toBe(false);
    expect(isPendingDemo('DONE')).toBe(false);
    expect(isPendingDemo('DECLINED')).toBe(false);
  });

  it('isDemoStatus guards unknown values', () => {
    expect(isDemoStatus('NEW')).toBe(true);
    expect(isDemoStatus('WHATEVER')).toBe(false);
  });

  it('defaults status to NEW when no status row exists', () => {
    const result = deriveDemoRequests([requestedRow('r1', '2026-05-01T10:00:00Z')], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ requestId: 'r1', status: 'NEW', schoolName: 'X', studentsCount: 10 });
  });

  it('applies the latest status row (rows passed DESC)', () => {
    const statusRowsDesc = [
      statusRow('r1', 'SCHEDULED', '2026-05-03T10:00:00Z', 'rendez-vous fixé'),
      statusRow('r1', 'CONTACTED', '2026-05-02T10:00:00Z'),
    ];
    const result = deriveDemoRequests([requestedRow('r1', '2026-05-01T10:00:00Z')], statusRowsDesc);
    expect(result[0].status).toBe('SCHEDULED');
    expect(result[0].note).toBe('rendez-vous fixé');
  });

  it('orders output by receivedAt desc', () => {
    const result = deriveDemoRequests(
      [requestedRow('old', '2026-05-01T10:00:00Z'), requestedRow('new', '2026-05-05T10:00:00Z')],
      [],
    );
    expect(result.map((r) => r.requestId)).toEqual(['new', 'old']);
  });
});
```

- [ ] **Step 2: Run the spec to confirm it fails**

Local: `pnpm --filter=@ecole-saas/api type-check` → FAILS (`Cannot find module './demo-status.util'`).
CI Vitest expectation: FAIL with "Cannot find module './demo-status.util'".

- [ ] **Step 3: Implement the pure util**

Create `apps/api/src/demo-requests/demo-status.util.ts`:

```ts
export const DEMO_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'DONE', 'DECLINED'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export interface DemoRequestRecord {
  requestId: string;
  email: string;
  schoolName: string;
  studentsCount: number | null;
  locale: string | null;
  receivedAt: string;
  status: DemoStatus;
  note: string | null;
  statusUpdatedAt: string | null;
}

interface AuditLike {
  action: string;
  metadata: unknown;
  createdAt: Date;
}

export function isDemoStatus(value: unknown): value is DemoStatus {
  return typeof value === 'string' && (DEMO_STATUSES as readonly string[]).includes(value);
}

export function isPendingDemo(status: DemoStatus): boolean {
  return status === 'NEW' || status === 'CONTACTED';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/**
 * Build demo-request records from audit rows.
 * @param requestedRows `demo.requested` rows, ordered createdAt DESC.
 * @param statusRows `demo.status_changed` rows, ordered createdAt DESC (first seen per requestId = latest).
 */
export function deriveDemoRequests(requestedRows: AuditLike[], statusRows: AuditLike[]): DemoRequestRecord[] {
  const latestStatus = new Map<string, { status: DemoStatus; note: string | null; at: Date }>();
  for (const row of statusRows) {
    const meta = asRecord(row.metadata);
    const requestId = readString(meta.requestId);
    const status = meta.status;
    if (!requestId || !isDemoStatus(status) || latestStatus.has(requestId)) continue;
    latestStatus.set(requestId, { status, note: readString(meta.note), at: row.createdAt });
  }

  return requestedRows
    .map((row) => {
      const meta = asRecord(row.metadata);
      const requestId = readString(meta.requestId);
      if (!requestId) return null;
      const current = latestStatus.get(requestId);
      return {
        requestId,
        email: readString(meta.email) ?? '',
        schoolName: readString(meta.schoolName) ?? '',
        studentsCount: readNumber(meta.studentsCount),
        locale: readString(meta.locale),
        receivedAt: row.createdAt.toISOString(),
        status: current?.status ?? 'NEW',
        note: current?.note ?? null,
        statusUpdatedAt: current ? current.at.toISOString() : null,
      } satisfies DemoRequestRecord;
    })
    .filter((r): r is DemoRequestRecord => r !== null)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
```

- [ ] **Step 4: Write the DTOs**

Create `apps/api/src/demo-requests/dto/demo-admin.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DEMO_STATUSES, type DemoStatus } from '../demo-status.util';

export class DemoRequestAdminDto {
  @ApiProperty() requestId!: string;
  @ApiProperty() email!: string;
  @ApiProperty() schoolName!: string;
  @ApiPropertyOptional({ nullable: true }) studentsCount!: number | null;
  @ApiPropertyOptional({ nullable: true }) locale!: string | null;
  @ApiProperty() receivedAt!: string;
  @ApiProperty({ enum: DEMO_STATUSES }) status!: DemoStatus;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiPropertyOptional({ nullable: true }) statusUpdatedAt!: string | null;
}

export class UpdateDemoStatusDto {
  @ApiProperty({ enum: DEMO_STATUSES })
  @IsIn(DEMO_STATUSES as unknown as string[])
  status!: DemoStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

- [ ] **Step 5: Write the failing admin-service spec**

Create `apps/api/src/demo-requests/demo-requests.admin.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../email/resend.service';
import { DemoRequestsService } from './demo-requests.service';

const meta = { ip: '127.0.0.1', userAgent: 'vitest' };

function buildPrisma() {
  return {
    auditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('DemoRequestsService (admin)', () => {
  let service: DemoRequestsService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DemoRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResendService, useValue: { sendEmail: vi.fn() } },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();
    service = moduleRef.get(DemoRequestsService);
  });

  it('listForAdmin derives records from requested + status rows', async () => {
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          action: 'demo.requested',
          metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X', studentsCount: 12, locale: 'fr' },
          createdAt: new Date('2026-05-01T10:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        { action: 'demo.status_changed', metadata: { requestId: 'r1', status: 'CONTACTED' }, createdAt: new Date('2026-05-02T10:00:00Z') },
      ]);
    const result = await service.listForAdmin();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ requestId: 'r1', status: 'CONTACTED' });
  });

  it('updateStatus throws NotFound when the request does not exist', async () => {
    prisma.auditLog.findFirst.mockResolvedValueOnce(null);
    await expect(service.updateStatus('super-1', 'missing', { status: 'DONE' }, meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('updateStatus writes a demo.status_changed row and returns the recomputed record', async () => {
    prisma.auditLog.findFirst.mockResolvedValueOnce({
      action: 'demo.requested',
      metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X', studentsCount: 12, locale: 'fr' },
      createdAt: new Date('2026-05-01T10:00:00Z'),
    });
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          action: 'demo.requested',
          metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X', studentsCount: 12, locale: 'fr' },
          createdAt: new Date('2026-05-01T10:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        { action: 'demo.status_changed', metadata: { requestId: 'r1', status: 'SCHEDULED', note: 'ok' }, createdAt: new Date('2026-05-03T10:00:00Z') },
      ]);
    const result = await service.updateStatus('super-1', 'r1', { status: 'SCHEDULED', note: 'ok' }, meta);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'demo.status_changed', userId: 'super-1' }),
      }),
    );
    expect(result).toMatchObject({ requestId: 'r1', status: 'SCHEDULED', note: 'ok' });
  });
});
```

- [ ] **Step 6: Run the spec to confirm it fails**

Local: `pnpm --filter=@ecole-saas/api type-check` → FAILS (`listForAdmin`/`updateStatus` do not exist on `DemoRequestsService`).
CI Vitest expectation: FAIL.

- [ ] **Step 7: Extend the service**

Add to `apps/api/src/demo-requests/demo-requests.service.ts` — imports at top, methods on the class (keep the existing `submit`):

```ts
// add to imports
import { NotFoundException } from '@nestjs/common';
import { RequestMeta } from '../auth/utils/request-meta.utils';
import { deriveDemoRequests, DemoRequestRecord } from './demo-status.util';
import { UpdateDemoStatusDto } from './dto/demo-admin.dto';
```

```ts
// add as methods on DemoRequestsService
async listForAdmin(): Promise<DemoRequestRecord[]> {
  const [requested, statuses] = await Promise.all([
    this.prisma.auditLog.findMany({ where: { action: 'demo.requested' }, orderBy: { createdAt: 'desc' } }),
    this.prisma.auditLog.findMany({ where: { action: 'demo.status_changed' }, orderBy: { createdAt: 'desc' } }),
  ]);
  return deriveDemoRequests(requested, statuses);
}

async updateStatus(
  superAdminId: string,
  requestId: string,
  dto: UpdateDemoStatusDto,
  meta: RequestMeta,
): Promise<DemoRequestRecord> {
  const existing = await this.prisma.auditLog.findFirst({
    where: { action: 'demo.requested', metadata: { path: ['requestId'], equals: requestId } },
  });
  if (!existing) {
    throw new NotFoundException({ code: 'DEMO_REQUEST_NOT_FOUND', message: 'Demande de démo introuvable.' });
  }

  await this.prisma.auditLog.create({
    data: {
      id: createId(),
      action: 'demo.status_changed',
      resource: 'demo',
      tenantId: null,
      userId: superAdminId,
      metadata: { requestId, status: dto.status, ...(dto.note ? { note: dto.note } : {}) },
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  const all = await this.listForAdmin();
  const updated = all.find((r) => r.requestId === requestId);
  if (!updated) {
    throw new NotFoundException({ code: 'DEMO_REQUEST_NOT_FOUND', message: 'Demande de démo introuvable.' });
  }
  return updated;
}
```

> Confirm `createId` is already imported in `demo-requests.service.ts` (it is — used by `submit`). If not, add `import { createId } from '@paralleldrive/cuid2';`.

- [ ] **Step 8: Implement the admin controller**

Create `apps/api/src/demo-requests/admin-demo-requests.controller.ts`:

```ts
import { Body, Controller, Get, HttpCode, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { DemoRequestsService } from './demo-requests.service';
import { DemoRequestAdminDto, UpdateDemoStatusDto } from './dto/demo-admin.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/demo-requests')
export class AdminDemoRequestsController {
  constructor(private readonly demoRequestsService: DemoRequestsService) {}

  @Get()
  @ApiOkResponse({ type: [DemoRequestAdminDto] })
  list(): Promise<DemoRequestAdminDto[]> {
    return this.demoRequestsService.listForAdmin();
  }

  @Patch(':requestId/status')
  @HttpCode(200)
  @ApiOkResponse({ type: DemoRequestAdminDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateDemoStatusDto,
    @Req() req: Request,
  ): Promise<DemoRequestAdminDto> {
    return this.demoRequestsService.updateStatus(user.id, requestId, dto, getRequestMeta(req));
  }
}
```

- [ ] **Step 9: Register the controller**

Modify `apps/api/src/demo-requests/demo-requests.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { AdminDemoRequestsController } from './admin-demo-requests.controller';
import { DemoRequestsController } from './demo-requests.controller';
import { DemoRequestsService } from './demo-requests.service';

@Module({
  controllers: [DemoRequestsController, AdminDemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
```

- [ ] **Step 10: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/demo-requests/demo-status.util.ts apps/api/src/demo-requests/demo-status.util.spec.ts apps/api/src/demo-requests/dto/demo-admin.dto.ts apps/api/src/demo-requests/admin-demo-requests.controller.ts apps/api/src/demo-requests/demo-requests.admin.service.spec.ts apps/api/src/demo-requests/demo-requests.service.ts apps/api/src/demo-requests/demo-requests.module.ts
git commit -m "feat(api): add SUPER_ADMIN demo-requests list and status workflow"
```

---

### Task 4: Web demo requests page (real data + status mutation)

**Files:**
- Create: `apps/web/lib/api/admin-demo.ts`
- Modify: `apps/web/app/[locale]/(app)/admin/demo/page.tsx`

- [ ] **Step 1: Write the demo API client**

Create `apps/web/lib/api/admin-demo.ts`:

```ts
import { adminRequest } from './admin-client';

export const DEMO_STATUSES = ['NEW', 'CONTACTED', 'SCHEDULED', 'DONE', 'DECLINED'] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_STATUS_LABELS: Record<DemoStatus, string> = {
  NEW: 'Nouvelle',
  CONTACTED: 'Contactée',
  SCHEDULED: 'Planifiée',
  DONE: 'Terminée',
  DECLINED: 'Refusée',
};

export interface DemoRequestAdmin {
  requestId: string;
  email: string;
  schoolName: string;
  studentsCount: number | null;
  locale: string | null;
  receivedAt: string;
  status: DemoStatus;
  note: string | null;
  statusUpdatedAt: string | null;
}

export function listDemoRequests(token: string): Promise<DemoRequestAdmin[]> {
  return adminRequest<DemoRequestAdmin[]>('/demo-requests', token);
}

export function updateDemoStatus(
  token: string,
  requestId: string,
  payload: { status: DemoStatus; note?: string },
): Promise<DemoRequestAdmin> {
  return adminRequest<DemoRequestAdmin>(`/demo-requests/${encodeURIComponent(requestId)}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 2: Rewrite the demo page**

Replace the entire contents of `apps/web/app/[locale]/(app)/admin/demo/page.tsx` (drops `INITIAL_REQUESTS` + local `useState` store; real list + status mutation):

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { useAuthStore } from '@/lib/stores/auth-store';
import { requireToken } from '@/lib/api/require-token';
import {
  DEMO_STATUSES,
  DEMO_STATUS_LABELS,
  listDemoRequests,
  updateDemoStatus,
  type DemoRequestAdmin,
  type DemoStatus,
} from '@/lib/api/admin-demo';

export default function AdminDemoPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demo = useResource(['admin', 'demo'], (token) => listDemoRequests(token));

  const mutation = useMutation({
    mutationFn: (vars: { requestId: string; status: DemoStatus }) =>
      updateDemoStatus(requireToken(accessToken), vars.requestId, { status: vars.status }),
    onSuccess: (record) => {
      setErrorMessage(null);
      setFeedback(`Statut mis à jour : ${DEMO_STATUS_LABELS[record.status]}`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'demo'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
    onError: () => {
      setFeedback(null);
      setErrorMessage('Impossible de mettre à jour le statut.');
    },
  });

  const items = demo.data ?? [];

  return (
    <ResourceListPage
      title="Demandes de démo"
      description="Prospects ayant demandé une démonstration depuis le site public."
      isLoading={demo.isLoading}
      isError={demo.isError}
      isEmpty={items.length === 0}
      onRetry={demo.refetch}
      errorMessage="Impossible de charger les demandes de démo."
      emptyTitle="Aucune demande"
      emptyDescription="Aucune demande de démo n’a encore été reçue."
      skeletonCols={5}
    >
      {feedback ? (
        <p role="status" className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {feedback}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Demandes de démo">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">École</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Effectif</th>
              <th className="py-2 pr-4">Reçue le</th>
              <th className="py-2 pr-4">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((req: DemoRequestAdmin) => (
              <tr key={req.requestId} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{req.schoolName}</td>
                <td className="py-2 pr-4">{req.email}</td>
                <td className="py-2 pr-4">{req.studentsCount ?? '—'}</td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(req.receivedAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="py-2 pr-4">
                  <label className="sr-only" htmlFor={`status-${req.requestId}`}>
                    Statut de {req.schoolName}
                  </label>
                  <select
                    id={`status-${req.requestId}`}
                    value={req.status}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({ requestId: req.requestId, status: e.target.value as DemoStatus })
                    }
                    className="rounded-md border px-2 py-1"
                  >
                    {DEMO_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {DEMO_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResourceListPage>
  );
}
```

> The implementer must confirm `requireToken` lives at `@/lib/api/require-token` (it was added during T2a). If the path differs, align the import.

- [ ] **Step 3: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/api/admin-demo.ts "apps/web/app/[locale]/(app)/admin/demo/page.tsx"
git commit -m "feat(web): wire admin demo-requests page to real API with status workflow"
```

---

## Wave 2 — Platform overview + analytics

### Task 5: Platform analytics API (overview + analytics)

**Files:**
- Create: `apps/api/src/admin/dto/platform.dto.ts`
- Create: `apps/api/src/admin/platform-analytics.service.ts`
- Create: `apps/api/src/admin/platform-analytics.service.spec.ts`
- Create: `apps/api/src/admin/platform-analytics.controller.ts`
- Modify: `apps/api/src/admin/admin.module.ts`

- [ ] **Step 1: Write the DTOs**

Create `apps/api/src/admin/dto/platform.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';

export class OverviewDto {
  @ApiProperty() tenants!: number;
  @ApiProperty() users!: number;
  @ApiProperty() students!: number;
  @ApiProperty() pendingDemoRequests!: number;
}

export class GrowthPointDto {
  @ApiProperty({ description: 'Mois au format YYYY-MM' }) month!: string;
  @ApiProperty() newTenants!: number;
  @ApiProperty() cumulativeTenants!: number;
}

export class CategoryCountDto {
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
}

export class AnalyticsDto {
  @ApiProperty({ type: [GrowthPointDto] }) tenantGrowth!: GrowthPointDto[];
  @ApiProperty({ type: [CategoryCountDto] }) tenantsByType!: CategoryCountDto[];
  @ApiProperty({ type: [CategoryCountDto] }) tenantsByLocale!: CategoryCountDto[];
  @ApiProperty({ type: [CategoryCountDto] }) usersByRole!: CategoryCountDto[];
}
```

- [ ] **Step 2: Write the failing service spec**

Create `apps/api/src/admin/platform-analytics.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlatformAnalyticsService } from './platform-analytics.service';

function buildPrisma() {
  return {
    tenant: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
    student: { count: vi.fn() },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('PlatformAnalyticsService', () => {
  let service: PlatformAnalyticsService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [PlatformAnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PlatformAnalyticsService);
  });

  it('overview returns counts and pending demo requests', async () => {
    prisma.tenant.count.mockResolvedValue(3);
    prisma.user.count.mockResolvedValue(12);
    prisma.student.count.mockResolvedValue(40);
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        { action: 'demo.requested', metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X' }, createdAt: new Date('2026-05-01T10:00:00Z') },
      ])
      .mockResolvedValueOnce([]);
    const result = await service.overview();
    expect(result).toEqual({ tenants: 3, users: 12, students: 40, pendingDemoRequests: 1 });
  });

  it('analytics builds cumulative monthly growth and distributions', async () => {
    prisma.tenant.findMany.mockResolvedValue([
      { createdAt: new Date('2026-03-10T00:00:00Z'), type: 'PRIMARY_SCHOOL', locale: 'fr' },
      { createdAt: new Date('2026-03-20T00:00:00Z'), type: 'KINDERGARTEN', locale: 'fr' },
      { createdAt: new Date('2026-04-05T00:00:00Z'), type: 'PRIMARY_SCHOOL', locale: 'ar' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { role: 'SCHOOL_ADMIN' },
      { role: 'TEACHER' },
      { role: 'TEACHER' },
    ]);
    const result = await service.analytics();
    expect(result.tenantGrowth).toEqual([
      { month: '2026-03', newTenants: 2, cumulativeTenants: 2 },
      { month: '2026-04', newTenants: 1, cumulativeTenants: 3 },
    ]);
    expect(result.tenantsByType).toEqual(
      expect.arrayContaining([
        { label: 'PRIMARY_SCHOOL', count: 2 },
        { label: 'KINDERGARTEN', count: 1 },
      ]),
    );
    expect(result.tenantsByLocale).toEqual(
      expect.arrayContaining([
        { label: 'fr', count: 2 },
        { label: 'ar', count: 1 },
      ]),
    );
    expect(result.usersByRole).toEqual(
      expect.arrayContaining([
        { label: 'TEACHER', count: 2 },
        { label: 'SCHOOL_ADMIN', count: 1 },
      ]),
    );
  });
});
```

- [ ] **Step 3: Run the spec to confirm it fails**

Local: `pnpm --filter=@ecole-saas/api type-check` → FAILS (`Cannot find module './platform-analytics.service'`).
CI Vitest expectation: FAIL.

- [ ] **Step 4: Implement the service**

Create `apps/api/src/admin/platform-analytics.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { deriveDemoRequests, isPendingDemo } from '../demo-requests/demo-status.util';
import { AnalyticsDto, CategoryCountDto, GrowthPointDto, OverviewDto } from './dto/platform.dto';

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildGrowth(dates: Date[]): GrowthPointDto[] {
  const byMonth = new Map<string, number>();
  for (const date of dates) {
    const key = monthKey(date);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const months = [...byMonth.keys()].sort();
  let cumulative = 0;
  return months.map((month) => {
    const newTenants = byMonth.get(month) ?? 0;
    cumulative += newTenants;
    return { month, newTenants, cumulativeTenants: cumulative };
  });
}

function countBy(values: Array<string | null>): CategoryCountDto[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value ?? 'inconnu';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

@Injectable()
export class PlatformAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<OverviewDto> {
    const [tenants, users, students, requested, statuses] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.student.count(),
      this.prisma.auditLog.findMany({ where: { action: 'demo.requested' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.findMany({ where: { action: 'demo.status_changed' }, orderBy: { createdAt: 'desc' } }),
    ]);
    const pendingDemoRequests = deriveDemoRequests(requested, statuses).filter((r) => isPendingDemo(r.status)).length;
    return { tenants, users, students, pendingDemoRequests };
  }

  async analytics(): Promise<AnalyticsDto> {
    const [tenants, users] = await Promise.all([
      this.prisma.tenant.findMany({ where: { deletedAt: null }, select: { createdAt: true, type: true, locale: true } }),
      this.prisma.user.findMany({ where: { deletedAt: null }, select: { role: true } }),
    ]);
    return {
      tenantGrowth: buildGrowth(tenants.map((t) => t.createdAt)),
      tenantsByType: countBy(tenants.map((t) => t.type)),
      tenantsByLocale: countBy(tenants.map((t) => t.locale)),
      usersByRole: countBy(users.map((u) => u.role)),
    };
  }
}
```

> The implementer must confirm the `Tenant` model exposes `type` and `locale` scalar fields and that `User.role` is selectable (all confirmed in the schema). If `Tenant.locale` is named differently, align the `select` and the `countBy` argument.

- [ ] **Step 5: Implement the controller**

Create `apps/api/src/admin/platform-analytics.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { AnalyticsDto, OverviewDto } from './dto/platform.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class PlatformAnalyticsController {
  constructor(private readonly platformAnalyticsService: PlatformAnalyticsService) {}

  @Get('overview')
  @ApiOkResponse({ type: OverviewDto })
  overview(): Promise<OverviewDto> {
    return this.platformAnalyticsService.overview();
  }

  @Get('analytics')
  @ApiOkResponse({ type: AnalyticsDto })
  analytics(): Promise<AnalyticsDto> {
    return this.platformAnalyticsService.analytics();
  }
}
```

- [ ] **Step 6: Register in the module**

Modify `apps/api/src/admin/admin.module.ts` — final state (now also has audit from Task 1):

```ts
import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { InviteTokensController } from './invite-tokens.controller';
import { InviteTokensService } from './invite-tokens.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [EmailModule],
  controllers: [InviteTokensController, TenantsController, AuditController, PlatformAnalyticsController],
  providers: [InviteTokensService, TenantsService, AuditService, PlatformAnalyticsService],
  exports: [InviteTokensService, TenantsService],
})
export class AdminModule {}
```

> `PlatformAnalyticsService` imports from `../demo-requests/demo-status.util`. That util is a plain function (no DI), so no module import is required. Confirm `DemoRequestsModule` is unaffected.

- [ ] **Step 7: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/admin/dto/platform.dto.ts apps/api/src/admin/platform-analytics.service.ts apps/api/src/admin/platform-analytics.service.spec.ts apps/api/src/admin/platform-analytics.controller.ts apps/api/src/admin/admin.module.ts
git commit -m "feat(api): add SUPER_ADMIN platform overview and analytics endpoints"
```

---

### Task 6: Web platform dashboard (real overview, honest MRR)

**Files:**
- Create: `apps/web/lib/api/admin-analytics.ts`
- Modify: `apps/web/app/[locale]/(app)/admin/page.tsx`

- [ ] **Step 1: Write the analytics API client**

Create `apps/web/lib/api/admin-analytics.ts`:

```ts
import { adminRequest } from './admin-client';

export interface Overview {
  tenants: number;
  users: number;
  students: number;
  pendingDemoRequests: number;
}

export interface GrowthPoint {
  month: string;
  newTenants: number;
  cumulativeTenants: number;
}

export interface CategoryCount {
  label: string;
  count: number;
}

export interface Analytics {
  tenantGrowth: GrowthPoint[];
  tenantsByType: CategoryCount[];
  tenantsByLocale: CategoryCount[];
  usersByRole: CategoryCount[];
}

export function getOverview(token: string): Promise<Overview> {
  return adminRequest<Overview>('/overview', token);
}

export function getAnalytics(token: string): Promise<Analytics> {
  return adminRequest<Analytics>('/analytics', token);
}
```

- [ ] **Step 2: Rewrite the dashboard page**

Replace the entire contents of `apps/web/app/[locale]/(app)/admin/page.tsx` (drops `PLATFORM_STATS` incl. fake MRR + `TENANTS` array):

```tsx
'use client';

import Link from 'next/link';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { getOverview, type Overview } from '@/lib/api/admin-analytics';

interface StatCard {
  label: string;
  value: number;
}

export default function AdminOverviewPage() {
  const overview = useResource<Overview>(['admin', 'overview'], (token) => getOverview(token));

  const cards: StatCard[] = overview.data
    ? [
        { label: 'Établissements', value: overview.data.tenants },
        { label: 'Utilisateurs', value: overview.data.users },
        { label: 'Élèves', value: overview.data.students },
        { label: 'Demandes de démo en attente', value: overview.data.pendingDemoRequests },
      ]
    : [];

  return (
    <ResourceListPage
      title="Tableau de bord plateforme"
      description="Vue d’ensemble de tous les établissements."
      isLoading={overview.isLoading}
      isError={overview.isError}
      isEmpty={false}
      onRetry={overview.refetch}
      errorMessage="Impossible de charger les indicateurs de la plateforme."
      emptyTitle=""
      skeletonCols={4}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
          </div>
        ))}
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-sm text-muted-foreground">Revenu mensuel récurrent (MRR)</p>
          <p className="mt-1 text-lg font-medium text-muted-foreground">À venir</p>
          <p className="mt-1 text-xs text-muted-foreground">
            La facturation par abonnement n’est pas encore activée.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="tenants" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
          Gérer les établissements
        </Link>
        <Link href="demo" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
          Demandes de démo
        </Link>
        <Link href="analytics" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
          Analytique
        </Link>
        <Link href="audit" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
          Journal d’audit
        </Link>
      </div>
    </ResourceListPage>
  );
}
```

> Relative `href` values (`tenants`, `demo`, …) resolve under the current `/[locale]/admin` segment. If the existing pages use locale-prefixed absolute hrefs via a helper, match that convention instead — the implementer reads a sibling admin page first to confirm the link style.

- [ ] **Step 3: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/api/admin-analytics.ts "apps/web/app/[locale]/(app)/admin/page.tsx"
git commit -m "feat(web): wire admin dashboard to real overview, honest MRR placeholder"
```

---

### Task 7: Web analytics page (real distributions, honest revenue)

**Files:**
- Modify: `apps/web/app/[locale]/(app)/admin/analytics/page.tsx`

- [ ] **Step 1: Rewrite the analytics page**

Replace the entire contents of `apps/web/app/[locale]/(app)/admin/analytics/page.tsx` (drops `MONTHLY_METRICS`/`KPIS`/`PLAN_DIST`):

```tsx
'use client';

import { ResourceListPage } from '@/components/crud/resource-list-page';
import { useResource } from '@/lib/hooks/use-resource';
import { getAnalytics, type Analytics, type CategoryCount, type GrowthPoint } from '@/lib/api/admin-analytics';

function maxCount(rows: CategoryCount[]): number {
  return rows.reduce((max, row) => Math.max(max, row.count), 0);
}

function DistributionBars({ title, rows }: { title: string; rows: CategoryCount[] }) {
  const max = maxCount(rows);
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune donnée.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex justify-between text-sm">
                <span>{row.label}</span>
                <span className="text-muted-foreground">{row.count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: max > 0 ? `${(row.count / max) * 100}%` : '0%' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GrowthChart({ rows }: { rows: GrowthPoint[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.cumulativeTenants), 0);
  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Croissance des établissements</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune donnée.</p>
      ) : (
        <div className="flex items-end gap-2" aria-label="Croissance cumulée par mois">
          {rows.map((point) => (
            <div key={point.month} className="flex flex-1 flex-col items-center">
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: max > 0 ? `${(point.cumulativeTenants / max) * 120}px` : '0px' }}
                title={`${point.month}: ${point.cumulativeTenants} (cumulé)`}
              />
              <span className="mt-1 text-xs text-muted-foreground">{point.month}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const analytics = useResource<Analytics>(['admin', 'analytics'], (token) => getAnalytics(token));
  const data = analytics.data;

  return (
    <ResourceListPage
      title="Analytique plateforme"
      description="Croissance et répartition des établissements et utilisateurs."
      isLoading={analytics.isLoading}
      isError={analytics.isError}
      isEmpty={false}
      onRetry={analytics.refetch}
      errorMessage="Impossible de charger l’analytique."
      emptyTitle=""
      skeletonCols={3}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthChart rows={data?.tenantGrowth ?? []} />
        <DistributionBars title="Par type d’établissement" rows={data?.tenantsByType ?? []} />
        <DistributionBars title="Par langue" rows={data?.tenantsByLocale ?? []} />
        <DistributionBars title="Utilisateurs par rôle" rows={data?.usersByRole ?? []} />
      </div>
      <section className="mt-4 rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Revenu (MRR / ARR / churn / ARPU)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          À venir — la facturation par abonnement n’est pas encore activée. Aucun chiffre de revenu n’est
          affiché tant que les abonnements ne sont pas branchés.
        </p>
      </section>
    </ResourceListPage>
  );
}
```

- [ ] **Step 2: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/(app)/admin/analytics/page.tsx"
git commit -m "feat(web): wire admin analytics page to real distributions, honest revenue placeholder"
```

---

## Wave 3 — Honest branding, seed, e2e, finalization

### Task 8: Honest branding info page (no fake save)

**Files:**
- Modify: `apps/web/app/[locale]/(app)/admin/branding/page.tsx`

- [ ] **Step 1: Replace the fake-save form with an honest info page**

Replace the entire contents of `apps/web/app/[locale]/(app)/admin/branding/page.tsx` (drops the `setSaved(true); setTimeout(...)` pretend-save):

```tsx
'use client';

export default function AdminBrandingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Apparence globale</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personnalisation visuelle de la plateforme (logo, couleurs, nom public).
        </p>
      </header>

      <section className="rounded-lg border border-dashed p-6">
        <h2 className="text-base font-semibold text-muted-foreground">Fonctionnalité à venir</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La personnalisation de l’apparence globale n’est pas encore disponible. Cette section permettra
          prochainement de définir le logo, la palette de couleurs et le nom public de la plateforme. Aucun
          réglage n’est enregistré pour le moment.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pour toute demande de personnalisation, contactez{' '}
          <a className="underline" href="mailto:ultra3omda@gmail.com">
            ultra3omda@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/web type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/(app)/admin/branding/page.tsx"
git commit -m "fix(web): replace fake branding save with honest 'à venir' info page"
```

---

### Task 9: Seed demo requests (idempotent, on super-admin)

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Capture the super-admin id**

In `apps/api/prisma/seed.ts`, the super-admin is created (around line 247) with `await upsertUser({ tenantId: null, email: 'super@klasso.tn', ... })`. Capture its return value:

```ts
const superAdmin = await upsertUser({
  tenantId: null,
  email: 'super@klasso.tn',
  firstName: 'Super',
  lastName: 'Admin',
  role: UserRole.SUPER_ADMIN,
  passwordHash,
});
```

> Confirm `upsertUser` returns the created/updated user (it does — it uses `prisma.user.upsert`). If it returns void, change it to `return prisma.user.upsert(...)`.

- [ ] **Step 2: Add the idempotent seeding helper**

Add this function near the other `seed*` helpers in `apps/api/prisma/seed.ts`:

```ts
const DEMO_REQUEST_SEEDS = [
  {
    requestId: 'dr_seed_el_amal',
    email: 'direction@el-amal.tn',
    schoolName: 'École El Amal',
    studentsCount: 240,
    locale: 'fr',
    daysAgo: 14,
    status: 'CONTACTED' as const,
    note: 'Premier appel effectué, intéressés par l’offre annuelle.',
  },
  {
    requestId: 'dr_seed_ibn_khaldoun',
    email: 'contact@ibn-khaldoun.tn',
    schoolName: 'Institut Ibn Khaldoun',
    studentsCount: 520,
    locale: 'ar',
    daysAgo: 9,
    status: 'SCHEDULED' as const,
    note: 'Démo planifiée la semaine prochaine.',
  },
  {
    requestId: 'dr_seed_les_pins',
    email: 'admin@les-pins.tn',
    schoolName: 'Jardin Les Pins',
    studentsCount: 80,
    locale: 'fr',
    daysAgo: 4,
    status: null,
    note: null,
  },
  {
    requestId: 'dr_seed_erriadh',
    email: 'hello@erriadh.tn',
    schoolName: 'École Erriadh',
    studentsCount: 310,
    locale: 'fr',
    daysAgo: 1,
    status: null,
    note: null,
  },
];

async function seedDemoRequests(prisma: PrismaClient, superAdminId: string): Promise<void> {
  const now = Date.now();
  for (const seed of DEMO_REQUEST_SEEDS) {
    const existing = await prisma.auditLog.findFirst({
      where: { action: 'demo.requested', metadata: { path: ['requestId'], equals: seed.requestId } },
    });
    const receivedAt = new Date(now - seed.daysAgo * 24 * 60 * 60 * 1000);
    if (!existing) {
      await prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'demo.requested',
          resource: 'public',
          tenantId: null,
          userId: null,
          metadata: {
            requestId: seed.requestId,
            email: seed.email,
            schoolName: seed.schoolName,
            studentsCount: seed.studentsCount,
            locale: seed.locale,
          },
          ip: '127.0.0.1',
          userAgent: 'seed',
          createdAt: receivedAt,
        },
      });
    }

    if (!seed.status) continue;
    const existingStatus = await prisma.auditLog.findFirst({
      where: { action: 'demo.status_changed', metadata: { path: ['requestId'], equals: seed.requestId } },
    });
    if (!existingStatus) {
      await prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'demo.status_changed',
          resource: 'demo',
          tenantId: null,
          userId: superAdminId,
          metadata: { requestId: seed.requestId, status: seed.status, ...(seed.note ? { note: seed.note } : {}) },
          ip: '127.0.0.1',
          userAgent: 'seed',
          createdAt: new Date(receivedAt.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    }
  }
}
```

> Confirm `createId` (from `@paralleldrive/cuid2`) and `PrismaClient` are already imported at the top of `seed.ts` (they are). The `createdAt` override is allowed because the seed uses a raw `new PrismaClient()` (no tenant extension) and `AuditLog.createdAt` has a default but is settable.

- [ ] **Step 3: Call the helper in `main()`**

In `main()`, after the parent links are seeded and after `superAdmin` is created, add:

```ts
await seedDemoRequests(prisma, superAdmin.id);
```

> `prisma` here is the top-level `new PrismaClient()` instance used throughout `main()`. Pass that same instance.

- [ ] **Step 4: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

> The seed cannot run locally (`prisma` triggers ERR_DLOPEN_FAILED). It executes in CI / on deploy. Type-check is the local gate.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): seed demo requests with derived statuses (idempotent)"
```

---

### Task 10: E2E — RBAC + persistence for all new admin routes

**Files:**
- Create: `apps/api/test/admin-platform.e2e-spec.ts`

- [ ] **Step 1: Write the e2e spec**

Create `apps/api/test/admin-platform.e2e-spec.ts` (mirrors the structure of `apps/api/test/admin-tenants.e2e-spec.ts`):

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ResendService } from '../src/email/resend.service';

const PREFIX = 't2de2e-';
const EMAIL_DOMAIN = 't2de2e.test';
const PASSWORD = createId(); // runtime-generated cuid, never a hardcoded secret
const SEED_REQUEST_ID = 'dr_t2de2e_1';

const noopResend = { sendEmail: async () => undefined };

describe('Admin platform (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superToken: string;
  let schoolAdminToken: string;
  let tenantId: string;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendService)
      .useValue(noopResend)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    prisma = app.get(PrismaService);

    await cleanup();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const tenant = await prisma.tenant.create({
      data: { id: createId(), slug: `${PREFIX}school`, name: `${PREFIX}School`, type: 'PRIMARY_SCHOOL', locale: 'fr' },
    });
    tenantId = tenant.id;

    await prisma.user.create({
      data: {
        id: createId(),
        tenantId: null,
        email: `super@${EMAIL_DOMAIN}`,
        firstName: 'Super',
        lastName: 'T2d',
        role: UserRole.SUPER_ADMIN,
        passwordHash,
      },
    });
    await prisma.user.create({
      data: {
        id: createId(),
        tenantId,
        email: `admin@${EMAIL_DOMAIN}`,
        firstName: 'Admin',
        lastName: 'T2d',
        role: UserRole.SCHOOL_ADMIN,
        passwordHash,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: createId(),
        action: 'demo.requested',
        resource: 'public',
        tenantId: null,
        userId: null,
        metadata: { requestId: SEED_REQUEST_ID, email: `prospect@${EMAIL_DOMAIN}`, schoolName: `${PREFIX}Prospect`, studentsCount: 100, locale: 'fr' },
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    });

    superToken = await login(`super@${EMAIL_DOMAIN}`);
    schoolAdminToken = await login(`admin@${EMAIL_DOMAIN}`);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup() {
    await prisma.auditLog.deleteMany({
      where: { metadata: { path: ['requestId'], equals: SEED_REQUEST_ID } },
    });
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } });
    await prisma.tenant.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  }

  const protectedGets = ['/api/admin/audit', '/api/admin/overview', '/api/admin/analytics', '/api/admin/demo-requests'];

  it.each(protectedGets)('SUPER_ADMIN gets 200 on %s', async (path) => {
    await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${superToken}`).expect(200);
  });

  it.each(protectedGets)('SCHOOL_ADMIN gets 403 on %s', async (path) => {
    await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${schoolAdminToken}`).expect(403);
  });

  it('SUPER_ADMIN can update a demo request status and it persists', async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/demo-requests/${SEED_REQUEST_ID}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ status: 'SCHEDULED', note: 'e2e' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('SCHEDULED');
        expect(res.body.requestId).toBe(SEED_REQUEST_ID);
      });

    const after = await request(app.getHttpServer())
      .get('/api/admin/demo-requests')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    const record = (after.body as Array<{ requestId: string; status: string }>).find(
      (r) => r.requestId === SEED_REQUEST_ID,
    );
    expect(record?.status).toBe('SCHEDULED');
  });

  it('SCHOOL_ADMIN gets 403 when patching a demo status', async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/demo-requests/${SEED_REQUEST_ID}/status`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ status: 'DONE' })
      .expect(403);
  });
});
```

> The implementer must confirm: (a) login returns 201 (matches `admin-tenants.e2e-spec.ts`); if it returns 200, align `.expect(...)`. (b) The `Tenant.create` required fields match the schema (slug/name/type/locale) — read the model first. (c) `accessToken` is the body field name (confirmed in the existing e2e template).

- [ ] **Step 2: Type-check (local gate)**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

> The e2e spec runs in CI (needs Postgres + native bindings). Locally only type-check.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/admin-platform.e2e-spec.ts
git commit -m "test(api): e2e RBAC + persistence for SUPER_ADMIN platform routes"
```

---

### Task 11: ADR, final type-check, PR, CI, auto-merge

**Files:**
- Create: `docs/adr/0013-t2d-saas-admin.md`

- [ ] **Step 1: Write the ADR**

Create `docs/adr/0013-t2d-saas-admin.md`:

```markdown
# ADR 0013 — T2d : console Admin SaaS sur données réelles (sans migration)

- **Statut :** Accepté
- **Date :** 2026-05-30
- **Contexte projet :** T2d (Track 2), après T2a (remédiation CRUD).

## Contexte

Les quatre pages SUPER_ADMIN (`/admin`, `/admin/audit`, `/admin/demo`, `/admin/analytics`)
et la page `/admin/branding` affichaient des tableaux codés en dur (faux MRR, faux audit,
faux prospects). Objectif : données réelles persistées, sans nouvelle table.

## Décision

1. **Audit** : lecture directe du modèle `AuditLog` existant, filtré + paginé, réservé
   `@Roles(SUPER_ADMIN)`. La consultation écrit elle-même une ligne `admin.audit.viewed`.
2. **Demandes de démo** : dérivées de `AuditLog action='demo.requested'`. Le statut est
   persisté comme nouvelles lignes `action='demo.status_changed'`
   (`metadata = { requestId, status, note? }`, `userId = super-admin`). Le statut courant
   est la dernière ligne par `requestId` (défaut `NEW`). Aucune nouvelle table.
3. **Overview / Analytics** : agrégations en mémoire sur `tenant`/`user`/`student`
   (compteurs + croissance mensuelle cumulée + répartitions type/langue/rôle).
4. **Revenu (MRR/ARR/churn/ARPU) et plans/abonnements** : explicitement reportés. L’UI
   affiche « À venir », jamais un chiffre inventé.
5. **Isolation** : le cross-tenant repose uniquement sur le mécanisme JWT existant
   (`TenantContextInterceptor` → `skipTenantFilter` si `SUPER_ADMIN` ; `RolesGuard` global
   renvoie 403 avant le service). Jamais sur le Host/Origin.

## Conséquences

- **+** Aucune migration ; réutilise l’infra d’audit et le pattern CRUD T2a.
- **+** Démos A→Z réelles et persistées, vérifiables après reload.
- **−** Le statut des démos vit dans `AuditLog` (event-sourcing léger) ; si le volume
  explose, une table dédiée pourra être introduite plus tard (migration gated).
- **−** Pas de revenu affiché tant que la facturation par abonnement n’est pas branchée.
```

- [ ] **Step 2: Final type-check (both workspaces)**

Run: `pnpm --filter=@ecole-saas/api type-check && pnpm --filter=@ecole-saas/web type-check`
Expected: PASS for both.

- [ ] **Step 3: Commit the ADR**

```bash
git add docs/adr/0013-t2d-saas-admin.md
git commit -m "docs(adr): record T2d SaaS admin design (real data, no migration)"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/t2d-saas-admin
gh pr create --title "feat: T2d — SaaS admin console on real data (no migration)" --body "$(cat <<'EOF'
## Summary
- Replace hardcoded SUPER_ADMIN pages (audit, demo, dashboard, analytics) with real persisted data.
- New `@Roles(SUPER_ADMIN)` endpoints: `GET /admin/audit`, `GET /admin/demo-requests` + `PATCH /admin/demo-requests/:id/status`, `GET /admin/overview`, `GET /admin/analytics`.
- Demo-request status persisted via `AuditLog action='demo.status_changed'` (no schema migration).
- Honest "à venir" placeholders for MRR/ARR/churn/ARPU and global branding (no fabricated numbers, no fake save).
- Idempotent seed for demo requests; e2e covers SUPER_ADMIN 200 + SCHOOL_ADMIN 403 + status persistence.

## Test plan
- [ ] CI: API unit + e2e + isolation green
- [ ] CI: Lint/Type-check/Build green
- [ ] CI: Web E2E (Playwright) green
- [ ] Manual: SUPER_ADMIN sees real counts, audit rows, demo requests; status change persists after reload
- [ ] Manual: SCHOOL_ADMIN cannot reach `/admin/*` APIs (403)
EOF
)"
```

- [ ] **Step 5: Monitor CI and auto-merge on green**

Watch CI (4 jobs: Lint/Type-check/Build, API tests, Web E2E, GitGuardian). When all required checks are green:

```bash
gh pr merge <PR_NUMBER> --merge
```

> Per CLAUDE.md policy: CI green → merge immediately (merge commit, not squash). Do NOT wait for explicit OK. STOP after merge — do not start T2b/T2c without user validation.

---

## Notes for the executor

- **Untracked artifacts must NOT be committed:** `.playwright-mcp/`, `invite-created-klasso-url.png`, `invitee-dashboard-after-register.png`. Stage only the files listed per task.
- **Read-before-align:** several web tasks tell you to confirm an existing export name/path (`listTenants`/`TenantSummary`, `requireToken`, locale link style). Read the sibling file FIRST and match — never rename an existing tested export.
- **Local gate is type-check only** (`@ecole-saas/api` and `@ecole-saas/web`). Vitest, `next build`, `next lint`, Playwright, and `prisma` all run in CI (ERR_DLOPEN_FAILED locally). The "run the spec, watch it fail/pass" steps are CI-authoritative.
- **No `any`, no `@ts-ignore`.** If a Prisma type needs help, use `Prisma.<Model>WhereInput` / `Prisma.<Model>GetPayload<...>` as shown.
- **STOP conditions (escalate, do not proceed):** any task appearing to need a Prisma migration; any change to `.github/workflows/`, root `package.json`, or tenant isolation; deleting a file >100 lines.
