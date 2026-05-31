# T2b PR-3 — Cantine + Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded demo pages for **Cantine** and **Transport** with real, persisted, tenant-scoped, role-adapted modules (Prisma + NestJS + web), per the validated spec `docs/superpowers/specs/2026-05-29-t2b-operational-modules-design.md` (§4.3 Cantine, §4.4 Transport). Logistics domain: no notification fan-out (not in §5.7). Web-first (mobile menu read deferred per §5.4).

**Architecture:** One `canteen/` module (routes `/canteen-menus` school-level + `/meal-plans` per-student) and one `transport/` module (routes `/bus-routes` with embedded stops + `/transport-assignments` per-student). Both mirror `apps/api/src/subjects` (tenant-scoped CRUD) and `apps/api/src/discipline` / `apps/api/src/student-health` (parent-scoped reads via `ParentStudent`, PR-2 gabarit). New additive Prisma models (`CanteenMenu`, `MealPlan`, `BusRoute`, `BusStop`, `TransportAssignment`) + enums (`MealRegime`, `RouteStatus`, `TransportDirection`). Web: `[[...action]]` proxies + typed clients + Zod + tabbed page rewrites using the T2a CRUD infra. Isolation derives only from the JWT.

**Tech Stack:** NestJS 10, Prisma, PostgreSQL, class-validator, Next.js 14 App Router, TanStack Query, react-hook-form, Zod, Vitest (unit + e2e in CI).

**Conventions (apply to every task):** identical to PR-2 (`docs/superpowers/plans/2026-05-31-t2b-pr2-discipline-sante.md`):
- cuid2 ids, soft-delete `deletedAt`, `createdAt/updatedAt`.
- Services scope **every** query explicitly (`where: { tenantId, deletedAt: null }`); `ForbiddenException({ code: 'TENANT_REQUIRED' })` when `!user.tenantId`. Lists `{ items, total }`. `toResponse()` Date→ISO.
- Parent reads via `parentStudent.findMany(... select studentId)`: list filters `studentId in ids`; single-record not owned → `ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' })`. **CanteenMenu + BusRoute/BusStop are school-level → no parent scoping (all parents read them); MealPlan + TransportAssignment are per-student → parent-scoped.**
- Controllers: `@ApiTags` + `@ApiBearerAuth` + `@Roles(...)` per route + `@CurrentUser()` + `@HttpCode(201|204)`.
- **No notifications** in this PR (Cantine/Transport not in §5.7).
- **Local gate = `pnpm --filter @ecole-saas/api type-check` + `pnpm --filter web type-check` + `pnpm lint` ONLY** (Windows native-binding block; Vitest/`next build`/`prisma migrate` run in CI).
- **Migration checkpoint:** Task 1 STOPS for explicit user approval. Migration **hand-authored** (copy `20260531120000_t2b_discipline_health/migration.sql` style), **additive only** (no `ALTER`/`DROP` on existing tables, no `ALTER TYPE`).
- Commits: Conventional Commits, **no `Co-Authored-By`**. Branch: `feat/t2b-pr3-cantine-transport` (already created off `origin/main` with PR-2 merged).

---

### Task 1: Prisma models + enums + migration (Cantine & Transport)

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (3 enums, 5 models, back-refs on `Tenant`, `Student`)
- Modify: `apps/api/src/common/prisma/tenant.extension.ts` (add 5 models to `TENANT_SCOPED_MODELS`)
- Create: `apps/api/prisma/migrations/20260531130000_t2b_canteen_transport/migration.sql`

- [ ] **Step 1: Add enums + models** after the PR-2 `// T2b — Discipline + Santé` block (new `// T2b — Cantine + Transport` section):

```prisma
// ============================================================================
// T2b — Cantine + Transport
// ============================================================================

enum MealRegime {
  STANDARD
  VEGETARIAN
  HALAL
  NO_PORK
  OTHER
}

enum RouteStatus {
  ACTIVE
  INACTIVE
}

enum TransportDirection {
  MORNING
  EVENING
  BOTH
}

// T2b — Menu de cantine du jour (niveau école, pas de lien élève).
model CanteenMenu {
  id         String    @id
  tenantId   String
  date       DateTime  @db.Date
  starter    String?   @db.VarChar(200)
  main       String?   @db.VarChar(200)
  dessert    String?   @db.VarChar(200)
  vegetarian String?   @db.VarChar(200)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, date], name: "unique_canteen_menu_per_day")
  @@map("canteen_menus")
}

// T2b — Régime alimentaire d'un élève (1 seul par élève).
model MealPlan {
  id         String     @id
  tenantId   String
  studentId  String
  regime     MealRegime @default(STANDARD)
  allergies  String?    @db.Text
  active     Boolean    @default(true)
  notes      String?    @db.VarChar(500)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  deletedAt  DateTime?

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([tenantId, studentId], name: "unique_meal_plan_per_student")
  @@index([tenantId])
  @@map("meal_plans")
}

// T2b — Ligne de bus scolaire (niveau école) + arrêts + affectations.
model BusRoute {
  id            String      @id
  tenantId      String
  name          String      @db.VarChar(120)
  driverName    String?     @db.VarChar(160)
  driverPhone   String?     @db.VarChar(40)
  vehiclePlate  String?     @db.VarChar(20)
  departureTime String      @db.VarChar(5)
  returnTime    String?     @db.VarChar(5)
  status        RouteStatus @default(ACTIVE)
  capacity      Int?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  deletedAt     DateTime?

  tenant      Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  stops       BusStop[]
  assignments TransportAssignment[]

  @@index([tenantId])
  @@map("bus_routes")
}

// T2b — Arrêt d'une ligne de bus.
model BusStop {
  id         String   @id
  tenantId   String
  routeId    String
  name       String   @db.VarChar(120)
  order      Int
  pickupTime String?  @db.VarChar(5)
  createdAt  DateTime @default(now())

  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  route  BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)

  @@index([tenantId, routeId])
  @@map("bus_stops")
}

// T2b — Affectation d'un élève à une ligne (et arrêt) pour une direction.
model TransportAssignment {
  id        String             @id
  tenantId  String
  studentId String
  routeId   String
  stopId    String?
  direction TransportDirection @default(BOTH)
  createdAt DateTime           @default(now())
  deletedAt DateTime?

  tenant  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  route   BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  stop    BusStop? @relation(fields: [stopId], references: [id], onDelete: SetNull)

  @@unique([tenantId, studentId, routeId, direction], name: "unique_transport_assignment")
  @@index([tenantId, routeId])
  @@index([tenantId, studentId])
  @@map("transport_assignments")
}
```

> **Note:** `BusStop` needs a back-reference for the `TransportAssignment.stop` relation — add `assignments TransportAssignment[]` to `BusStop` (relation field only, no SQL column). Run `prisma format` to confirm Prisma is satisfied with the relation pairing.

- [ ] **Step 2: Back-references** (no SQL columns):
  - `model Tenant`: after the PR-2 santé back-refs add
    ```prisma
    canteenMenus         CanteenMenu[]         // T2b PR-3
    mealPlans            MealPlan[]            // T2b PR-3
    busRoutes            BusRoute[]            // T2b PR-3
    busStops             BusStop[]             // T2b PR-3
    transportAssignments TransportAssignment[] // T2b PR-3
    ```
  - `model Student`: after the PR-2 santé back-refs add
    ```prisma
    mealPlans            MealPlan[]            // T2b PR-3 (1/student via @@unique)
    transportAssignments TransportAssignment[] // T2b PR-3
    ```
  - `model BusStop`: add `assignments TransportAssignment[]` (see note above).
  - **No `User` back-refs** (these models carry no `*ById` attribution per spec §4.3/§4.4).

- [ ] **Step 3: Register the 5 models** in `TENANT_SCOPED_MODELS` (`apps/api/src/common/prisma/tenant.extension.ts`), after the PR-2 entries:
  ```ts
  'CanteenMenu', // T2b PR-3
  'MealPlan', // T2b PR-3
  'BusRoute', // T2b PR-3
  'BusStop', // T2b PR-3
  'TransportAssignment', // T2b PR-3
  ```

- [ ] **Step 4: Validate + regenerate** — `pnpm --filter @ecole-saas/api exec prisma format` then `... prisma generate` (offline-safe; `validate` will fail only on missing `DATABASE_URL`, which is fine). The regenerated client is required for Tasks 2-9 to type-check.

- [ ] **Step 5: 🛑 CHECKPOINT — request user approval for the migration** (name `t2b_canteen_transport`). Do not commit migration SQL until approved.

- [ ] **Step 6: Hand-author the migration** at `apps/api/prisma/migrations/20260531130000_t2b_canteen_transport/migration.sql` (copy the `t2b_discipline_health` SQL style; additive only). Statements: 3× `CREATE TYPE`; 5× `CREATE TABLE` (`canteen_menus`, `meal_plans`, `bus_routes`, `bus_stops`, `transport_assignments` — `date`/`administeredAt`-style `DATE`, `VARCHAR(n)` per `@db`, `capacity`/`order` `INTEGER`, `active` `BOOLEAN NOT NULL DEFAULT true`, enum cols with defaults); indexes (`unique_canteen_menu_per_day`, `unique_meal_plan_per_student`, `meal_plans_tenantId_idx`, `bus_routes_tenantId_idx`, `bus_stops_tenantId_routeId_idx`, `unique_transport_assignment`, `transport_assignments_tenantId_routeId_idx`, `transport_assignments_tenantId_studentId_idx`); FKs (all `tenantId`→`tenants` CASCADE; `meal_plans.studentId`→`students` CASCADE; `bus_stops.routeId`→`bus_routes` CASCADE; `transport_assignments.studentId`→`students` CASCADE, `routeId`→`bus_routes` CASCADE, `stopId`→`bus_stops` SET NULL). **No `*ById`/User FKs.**

> **CI drift check:** after `prisma migrate deploy`, `prisma migrate status` must be clean. If CI's diff check fails, regenerate via `prisma migrate dev --create-only` in CI and replace the file.

- [ ] **Step 7: Commit** — `git add apps/api/prisma/schema.prisma apps/api/src/common/prisma/tenant.extension.ts apps/api/prisma/migrations && git commit -m "feat(api): add CanteenMenu, MealPlan, BusRoute, BusStop, TransportAssignment models (T2b PR-3)"`

---

### Task 2: Canteen DTOs

**Files:** Create `apps/api/src/canteen/dto/canteen-menu.dto.ts`, `apps/api/src/canteen/dto/meal-plan.dto.ts`

- [ ] **canteen-menu.dto.ts** — `Create`/`Update`/`ListQuery`/`Response`/`ListResponse` (mirror `vaccination.dto.ts`). Fields: `date` (`@IsISO8601`), `starter`/`main`/`dessert`/`vegetarian` (`@IsOptional @IsString @MaxLength(200)`). `ListCanteenMenusQueryDto`: optional `from`/`to` (`@IsISO8601`) date range. Response `date` is `YYYY-MM-DD`.
- [ ] **meal-plan.dto.ts** — Create requires `studentId` + optional `regime` (`@IsEnum(MealRegime)`), `allergies`(`@MaxLength(2000)`), `active`(`@IsBoolean`), `notes`(`@MaxLength(500)`). Update = same minus `studentId`. `ListMealPlansQueryDto`: optional `studentId`. Response includes `studentName`.
- [ ] Type-check → PASS. Commit: `feat(api): add canteen DTOs (T2b PR-3)`.

---

### Task 3: Canteen services (+ specs)

**Files:** `canteen-menus.service.ts` (+spec), `meal-plans.service.ts` (+spec)

- [ ] **canteen-menus.service.ts** — tenant-scoped CRUD, **no parent scoping** (school-level; PARENT reads all menus). `list` supports `from`/`to` filter (`where.date = { gte, lte }`), `orderBy: { date: 'desc' }`. Create maps P2002 on `unique_canteen_menu_per_day` → `BadRequestException({ code: 'CANTEEN_MENU_ALREADY_EXISTS' })`. `toResponse` slices `date` to `YYYY-MM-DD`.
- [ ] **meal-plans.service.ts** — tenant + **parent-scoped** (mirror `health-records.service.ts`): list filters owned `studentId in ids` for PARENT; single not-owned → `STUDENT_NOT_OWNED_BY_PARENT`. Validates student in tenant on create; P2002 on `unique_meal_plan_per_student` → `BadRequestException({ code: 'MEAL_PLAN_ALREADY_EXISTS' })`. `toResponse` includes `studentName`.
- [ ] **Specs** (mirror `health-records.service.spec.ts`): create `TENANT_REQUIRED`; PARENT list scoping (meal-plans); P2002 mapping (both). canteen-menus has no parent scoping → test list returns tenant rows.
- [ ] Type-check + (CI) run specs → PASS. Commit: `feat(api): canteen services (menus + meal plans) (T2b PR-3)`.

---

### Task 4: Canteen controllers + module + registration

**Files:** `canteen-menus.controller.ts` (`@Controller('canteen-menus')`), `meal-plans.controller.ts` (`@Controller('meal-plans')`), `canteen.module.ts`, modify `app.module.ts`.

- [ ] RBAC (§4.8): **read** (`GET` list + `:id`) = `SCHOOL_ADMIN, STAFF, PARENT`; **write** = `SCHOOL_ADMIN, STAFF`. (TEACHER no access to canteen.) Mirror `vaccinations.controller.ts`.
- [ ] `canteen.module.ts`: `@Module({ controllers: [CanteenMenusController, MealPlansController], providers: [CanteenMenusService, MealPlansService] })` (no `NotificationsModule`).
- [ ] Register `CanteenModule` in `app.module.ts` (import + `imports` array near the PR-2 modules). Type-check → PASS. Commit: `feat(api): canteen controllers + module (T2b PR-3)`.

---

### Task 5: Transport DTOs

**Files:** `apps/api/src/transport/dto/bus-route.dto.ts`, `apps/api/src/transport/dto/transport-assignment.dto.ts`

- [ ] **bus-route.dto.ts** — `CreateBusRouteDto`: `name`(`@MaxLength(120)`), optional `driverName`/`driverPhone`/`vehiclePlate`, `departureTime`(`@Matches(/^\d{2}:\d{2}$/)` HH:mm), optional `returnTime`(same regex), `status`(`@IsEnum(RouteStatus)` optional), `capacity`(`@IsInt @Min(1)` optional), and `stops?: CreateBusStopDto[]` (`@IsOptional @ValidateNested({each:true}) @Type(() => CreateBusStopDto) @IsArray`). `CreateBusStopDto`: `name`(`@MaxLength(120)`), `order`(`@IsInt @Min(0)`), `pickupTime?`(HH:mm regex). `UpdateBusRouteDto`: optional scalars (no `stops` — stops managed via dedicated endpoints, see Task 6). `BusStopResponseDto` + `BusRouteResponseDto` (includes `stops: BusStopResponseDto[]`, `assignmentCount: number`). `ListBusRoutesResponseDto`.
- [ ] **transport-assignment.dto.ts** — `CreateTransportAssignmentDto`: `studentId`, `routeId`, optional `stopId`, `direction?`(`@IsEnum(TransportDirection)`). `UpdateTransportAssignmentDto`: optional `stopId`, `direction`. `ListTransportAssignmentsQueryDto`: optional `studentId`, `routeId`. `TransportAssignmentResponseDto` (incl `studentName`, `routeName`, `stopName | null`). `ListTransportAssignmentsResponseDto`.
- [ ] Type-check → PASS. Commit: `feat(api): add transport DTOs (T2b PR-3)`.

---

### Task 6: Transport services (+ specs)

**Files:** `bus-routes.service.ts` (+spec), `transport-assignments.service.ts` (+spec)

- [ ] **bus-routes.service.ts** — tenant-scoped CRUD, **no parent scoping** (routes are school-level; PARENT reads all). `create` uses `$transaction` to create the route + its `stops[]` (each stop gets its own `createId()` + `tenantId`). `list`/`getById` include `stops` (ordered by `order asc`) + `_count.assignments`. Stop sub-resource methods: `addStop(routeId, dto, user)`, `removeStop(routeId, stopId, user)` (validate route in tenant first). `remove` soft-deletes the route (stops cascade-delete only on hard delete; for soft-delete, leave stops — they're hidden with the route). `toResponse` maps stops + `assignmentCount`.
- [ ] **transport-assignments.service.ts** — tenant + **parent-scoped** (mirror `health-records.service.ts`). `create` validates student + route in tenant (and stop if provided belongs to the route); P2002 on `unique_transport_assignment` → `BadRequestException({ code: 'ASSIGNMENT_ALREADY_EXISTS' })`. `list` filters by `studentId`/`routeId`; PARENT restricted to owned children. `toResponse` includes `studentName` (include student), `routeName` (include route), `stopName` (include stop).
- [ ] **Specs**: bus-routes — create `TENANT_REQUIRED`, create-with-stops calls `$transaction`/creates stops, getById missing → NotFound. transport-assignments — `TENANT_REQUIRED`, PARENT list scoping, P2002 mapping.
- [ ] Type-check + (CI) specs → PASS. Commit: `feat(api): transport services (routes + stops + assignments) (T2b PR-3)`.

---

### Task 7: Transport controllers + module + registration

**Files:** `bus-routes.controller.ts` (`@Controller('bus-routes')`), `transport-assignments.controller.ts` (`@Controller('transport-assignments')`), `transport.module.ts`, modify `app.module.ts`.

- [ ] RBAC: **read** = `SCHOOL_ADMIN, STAFF, PARENT`; **write** = `SCHOOL_ADMIN, STAFF`. bus-routes endpoints: list, getById, create, update (`PATCH :id`), delete; plus `POST :id/stops` + `DELETE :id/stops/:stopId` (write roles). transport-assignments: list, getById, create, update, delete.
- [ ] `transport.module.ts` providers/controllers (no `NotificationsModule`). Register `TransportModule` in `app.module.ts`. Type-check → PASS. Commit: `feat(api): transport controllers + module (T2b PR-3)`.

---

### Task 8: Web proxies (canteen + transport)

**Files:** Create `apps/web/app/api/canteen-menus/[[...action]]/route.ts`, `meal-plans/[[...action]]/route.ts`, `bus-routes/[[...action]]/route.ts`, `transport-assignments/[[...action]]/route.ts`.

- [ ] Copy the `journal` proxy verbatim, swapping the resource name in the JSDoc + `targetUrl` (e.g. `${API_URL}/api/bus-routes${suffix}${url.search}`). Type-check → PASS. Commit: `feat(web): canteen + transport API proxies (T2b PR-3)`.

---

### Task 9: Web API clients + Zod schemas

**Files:** `apps/web/lib/api/canteen.ts`, `apps/web/lib/api/transport.ts`, `apps/web/lib/validation/canteen.schemas.ts`, `apps/web/lib/validation/transport.schemas.ts`.

- [ ] **canteen.ts** — `CanteenMenu` + `MealPlan` interfaces + `MealRegime` type + `list*/create*/update*/delete*` over `/api/canteen-menus` + `/api/meal-plans` (mirror `health.ts`).
- [ ] **transport.ts** — `BusRoute` (with `stops: BusStop[]`, `assignmentCount`) + `BusStop` + `TransportAssignment` interfaces + `RouteStatus`/`TransportDirection` types + CRUD fns over `/api/bus-routes` (incl `addStop`/`removeStop`) + `/api/transport-assignments`.
- [ ] **canteen.schemas.ts** — `REGIMES` const + `canteenMenuSchema` (date required; starter/main/dessert/vegetarian optional max 200) + `mealPlanSchema` (studentId required; regime enum; allergies/notes; active boolean).
- [ ] **transport.schemas.ts** — `ROUTE_STATUSES`, `DIRECTIONS` consts; `busRouteSchema` (name required; departureTime required HH:mm via `.regex(/^\d{2}:\d{2}$/)`; optional driver/plate/returnTime/status/capacity(`z.coerce.number().int().min(1)`)); `transportAssignmentSchema` (studentId+routeId required; stopId/direction optional).
- [ ] Type-check → PASS. Commit: `feat(web): canteen + transport API clients and schemas (T2b PR-3)`.

---

### Task 10: Canteen page rewrite (real data, tabbed)

**Files:** Create `apps/web/components/crud/canteen-menu-form.tsx`, `meal-plan-form.tsx`; `apps/web/components/canteen/menus-section.tsx`, `meal-plans-section.tsx`; rewrite `apps/web/app/[locale]/(app)/canteen/page.tsx`.

- [ ] Forms mirror PR-2 forms (`activity-form.tsx`). Menu form: `date`(type=date), starter/main/dessert/vegetarian. Meal-plan form: `studentId` (hidden on edit), `regime`(select over `REGIMES`), `allergies`, `active`, `notes`.
- [ ] Sections mirror `apps/web/components/health/*-section.tsx`: `canManage = role ∈ {SCHOOL_ADMIN, STAFF}`. **Menus section** = card grid by date (replaces the hardcoded `WEEKLY_MENU`; show starter/main/dessert/vegetarian); manage actions when `canManage`. **Meal-plans section** = table (studentName, regime badge, allergies, active); manage when `canManage`. Drop the hardcoded `STATS` (or derive a couple of counts from real data).
- [ ] Page: access-gate (canView = `canManage || PARENT`; else "Accès non autorisé"), segmented control (`'menus' | 'plans'`), render active section. Keep an h1 only via the section's `ResourceListPage` title.
- [ ] Type-check + lint → PASS. Commit: `feat(web): canteen page on real data (menus + meal plans) (T2b PR-3)`.

---

### Task 11: Transport page rewrite (real data, tabbed)

**Files:** Create `apps/web/components/crud/bus-route-form.tsx`, `transport-assignment-form.tsx`; `apps/web/components/transport/routes-section.tsx`, `assignments-section.tsx`; rewrite `apps/web/app/[locale]/(app)/transport/page.tsx`.

- [ ] **bus-route-form.tsx**: name, driverName, driverPhone, vehiclePlate, departureTime(type=time → string HH:mm), returnTime(time), status(select), capacity(number). (Stops managed inline in the routes section after creation via add/remove, OR a simple comma-free repeatable — for MVP, create route without stops then add stops via the section's "Ajouter un arrêt" control; keep the form scalar-only.)
- [ ] **routes-section.tsx** (mirror the demo card layout + `activities/page.tsx`): card per route (name, status badge re-keyed to `ACTIVE/INACTIVE`, driver, plate, departure/return, stops as chips ordered by `order`, `assignmentCount`). `canManage` → create/edit/delete route + add/remove stop controls.
- [ ] **transport-assignment-form.tsx**: studentId, routeId, stopId(optional), direction(select). **assignments-section.tsx**: table (studentName, routeName, stopName, direction); manage when `canManage`; PARENT sees only their children.
- [ ] Page: access-gate (canView = canManage || PARENT), segmented control (`'routes' | 'assignments'`).
- [ ] Type-check + lint → PASS. Commit: `feat(web): transport page on real data (routes + assignments) (T2b PR-3)`.

---

### Task 12: Seed fixtures (idempotent)

**Files:** Modify `apps/api/prisma/seed.ts`.

- [ ] Add `seedCanteenAndTransport(tenantId)` (mirror `seedDisciplineAndHealth`), called for both demo tenants after the PR-2 seed calls. Fixed dates only. Guards:
  - `CanteenMenu`: `upsert` by `unique_canteen_menu_per_day` for 2-3 fixed dates (e.g. `2026-05-25`, `2026-05-26`).
  - `MealPlan`: `upsert` by `unique_meal_plan_per_student` for the first student (`regime: STANDARD`).
  - `BusRoute`: guard via `findFirst({ where: { tenantId, name } })`; create "Ligne A — Nord" with `departureTime: '07:15'`, 2 stops (nested `create`).
  - `TransportAssignment`: `upsert` by `unique_transport_assignment` linking the first student to the route (`direction: BOTH`).
  - Import `MealRegime`, `RouteStatus`, `TransportDirection` from `@prisma/client`.
- [ ] Type-check → PASS. Commit: `feat(api): seed canteen + transport fixtures (idempotent, T2b PR-3)`.

---

### Task 13: E2E — RBAC + persistence + isolation (canteen & transport)

**Files:** Create `apps/api/test/canteen.e2e-spec.ts`, `apps/api/test/transport.e2e-spec.ts`; modify `apps/api/test/multi-tenant-isolation.e2e-spec.ts`.

- [ ] **canteen.e2e** (mirror `student-health.e2e-spec.ts` bootstrap; actors ADMIN/STAFF/TEACHER/PARENT + owned/other students + parent link):
  - canteen-menus: `POST` STAFF → 201; TEACHER → 403; PARENT → 403; duplicate date → 400 `CANTEEN_MENU_ALREADY_EXISTS`; `GET` PARENT → 200 (sees menus).
  - meal-plans: `POST` STAFF → 201; PARENT → 403; duplicate student → 400 `MEAL_PLAN_ALREADY_EXISTS`; `GET` PARENT → only owned; `GET /:id` non-owned → 403 `STUDENT_NOT_OWNED_BY_PARENT`.
  - cleanup deletes: `mealPlan`, `canteenMenu` (+ parentStudent/student/user/tenant).
- [ ] **transport.e2e**:
  - bus-routes: `POST` STAFF (with 2 stops) → 201 (response has `stops.length === 2`); TEACHER → 403; `GET` PARENT → 200; `POST :id/stops` STAFF → 201; PARENT → 403.
  - transport-assignments: `POST` STAFF → 201; duplicate (same student+route+direction) → 400 `ASSIGNMENT_ALREADY_EXISTS`; PARENT `POST` → 403; `GET` PARENT → only owned children.
  - cleanup order: `transportAssignment` → `busStop` → `busRoute` (+ parentStudent/student/user/tenant).
- [ ] **isolation e2e**: add `canteenMenu`, `mealPlan`, `transportAssignment`, `busStop`, `busRoute` to the global `beforeEach` cleanup (FK-safe order: assignments → stops → routes; mealPlan; canteenMenu — before `student.deleteMany`). In the nested `Operational models isolation (T2b)` block, seed one `CanteenMenu` + one `BusRoute` (+ stop) + one `MealPlan` + one `TransportAssignment` per tenant, then add `findMany` tenant-scoping + `findFirst` cross-tenant-null tests for `canteenMenu`, `mealPlan`, `busRoute`, `transportAssignment`. (These models carry **no User FK**, so they may be seeded in the global block too — but keep them in the nested block for consistency with PR-1/PR-2.)
- [ ] Type-check + lint → PASS. Commit: `test(api): e2e RBAC + isolation for canteen + transport (T2b PR-3)`.

---

### Task 14: Verify, open PR, auto-merge on green

- [ ] **Full local gate** — `pnpm --filter @ecole-saas/api type-check && pnpm --filter web type-check && pnpm lint` → all PASS.
- [ ] **Push** — `git push -u origin feat/t2b-pr3-cantine-transport`.
- [ ] **Open PR** — base `main`, title `feat(t2b): PR-3 Cantine + Transport (real persisted modules)`. Body: new models, RBAC matrix, migration name `t2b_canteen_transport`, "no notifications (logistics)", "Part of the T2b umbrella spec".
- [ ] **Watch CI** — verify EXPLICITLY each check (`pull_request_read get_check_runs`). Build + unit + e2e + GitGuardian + Vercel.
- [ ] **Auto-merge on green** — merge commit, no `Co-Authored-By`. Then **STOP** — do not start PR-4 (Sécurité) without user validation.

---

## Self-review (against the spec)

- **§4.3 Cantine** (`CanteenMenu` school-level `@@unique(tenantId,date)`, `MealPlan` 1/élève `@@unique(tenantId,studentId)`, enum `MealRegime`): Task 1 ✓.
- **§4.4 Transport** (`BusRoute` + `BusStop` + `TransportAssignment` `@@unique(tenantId,studentId,routeId,direction)`, enums `RouteStatus`/`TransportDirection`, route+stops via `$transaction`): Tasks 1, 6 ✓.
- **§4.8 RBAC**: Cantine + Transport → ADMIN/STAFF manage, PARENT read (menu+plan / routes+own assignments), TEACHER no access: Tasks 4, 7 ✓.
- **§5.6 parent scoping** (`STUDENT_NOT_OWNED_BY_PARENT`) on the per-student resources (MealPlan, TransportAssignment); school-level resources (menus, routes/stops) intentionally **not** parent-scoped: Tasks 3, 6, 13 ✓.
- **§5.7 notifications**: none for Cantine/Transport — correctly omitted.
- **§5.3 web** (no hardcoded data, loading/empty/error, role-adapted, tabbed): Tasks 10, 11 ✓.
- **§5.4 mobile**: menu read deferred (web-first) — noted, not silently dropped.
- **§7 tests** (RBAC 200/403, persistence, isolation tenant + parent): Task 13 ✓.
- **§10 migration checkpoint** (additive, no enum mutation): Task 1 Step 5 🛑 ✓.

## Notes for the next plan
PR-4 (Sécurité — incidents + visiteurs + exercices, school-level) reuses Tasks 1-14. **STOP after PR-3 merges** — do not start PR-4 without explicit user go-ahead.
