/**
 * Multi-tenant isolation e2e test (CRITICAL).
 *
 * Vague 1 contract: a user from tenant A MUST NEVER be able to read or
 * write data belonging to tenant B, regardless of the query used.
 *
 * This test verifies the Prisma client extension that auto-injects
 * `tenantId` into all read queries on tenant-scoped models when a tenant
 * context is set. It also verifies the SUPER_ADMIN bypass for cross-tenant
 * platform operations.
 *
 * Requires a running Postgres (docker compose up -d) and a clean DB.
 */
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import {
  ActivityCategory,
  ChildMood,
  DisciplineSeverity,
  InfirmaryOutcome,
  Locale,
  Prisma,
  Sex,
  TenantType,
  UserRole,
} from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { configuration } from '../src/common/config/configuration';
import { validateEnv } from '../src/common/config/env.validation';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { TenantPrismaService } from '../src/common/prisma/tenant-prisma.service';
import { TenantContextService } from '../src/common/tenant/tenant-context.service';
import { TenantModule } from '../src/common/tenant/tenant.module';

describe('Multi-tenant isolation (CRITICAL)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let tenantPrisma: TenantPrismaService;
  let tenantContext: TenantContextService;

  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let userBId: string;
  let studentAId: string;
  let studentBId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnv,
          cache: true,
        }),
        TenantModule,
        PrismaModule,
      ],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    tenantPrisma = moduleRef.get(TenantPrismaService);
    tenantContext = moduleRef.get(TenantContextService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Wipe tenant-scoped data, then seed two isolated tenants.
    // T2b — clear the new operational tables FIRST (they FK to students /
    // activities / tenants), respecting FK order before the student/user/tenant
    // deletes below.
    await prisma.dailyLogEntry.deleteMany({});
    await prisma.activityParticipation.deleteMany({});
    await prisma.activity.deleteMany({});
    // T2b PR-2 — medical / discipline rows have RESTRICT *ById FKs to User, so
    // they must be cleared before the user-delete isolation tests below.
    await prisma.disciplineIncident.deleteMany({});
    await prisma.infirmaryVisit.deleteMany({});
    await prisma.vaccination.deleteMany({});
    await prisma.healthRecord.deleteMany({});
    // T2b PR-3 — transport/canteen (FK-safe: assignments → stops → routes).
    await prisma.transportAssignment.deleteMany({});
    await prisma.busStop.deleteMany({});
    await prisma.busRoute.deleteMany({});
    await prisma.mealPlan.deleteMany({});
    await prisma.canteenMenu.deleteMany({});
    // T2b PR-4 — security (RESTRICT *ById FKs → before user delete).
    await prisma.securityIncident.deleteMany({});
    await prisma.visitorLog.deleteMany({});
    await prisma.safetyDrill.deleteMany({});
    // T2c V1 — HR contracts (userId FK → before user delete).
    await prisma.employmentContract.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});

    tenantAId = createId();
    tenantBId = createId();
    userAId = createId();
    userBId = createId();
    studentAId = createId();
    studentBId = createId();

    await prisma.tenant.createMany({
      data: [
        {
          id: tenantAId,
          name: 'Tenant A',
          slug: `tenant-a-${tenantAId.slice(0, 6)}`,
          type: TenantType.KINDERGARTEN,
          locale: Locale.fr,
          timezone: 'Europe/Paris',
        },
        {
          id: tenantBId,
          name: 'Tenant B',
          slug: `tenant-b-${tenantBId.slice(0, 6)}`,
          type: TenantType.PRIMARY_SCHOOL,
          locale: Locale.fr,
          timezone: 'Europe/Paris',
        },
      ],
    });

    await prisma.user.createMany({
      data: [
        {
          id: userAId,
          tenantId: tenantAId,
          email: 'user-a@tenant-a.test',
          passwordHash: 'irrelevant',
          firstName: 'User',
          lastName: 'A',
          role: UserRole.SCHOOL_ADMIN,
          locale: Locale.fr,
        },
        {
          id: userBId,
          tenantId: tenantBId,
          email: 'user-b@tenant-b.test',
          passwordHash: 'irrelevant',
          firstName: 'User',
          lastName: 'B',
          role: UserRole.SCHOOL_ADMIN,
          locale: Locale.fr,
        },
      ],
    });

    // V2 — Student model added to TENANT_SCOPED_MODELS (Phase A) : seed one per tenant
    await prisma.student.createMany({
      data: [
        {
          id: studentAId,
          tenantId: tenantAId,
          firstName: 'Alice',
          lastName: 'Iso-A',
          dateOfBirth: new Date('2018-09-15'),
          sex: Sex.F,
          classroom: 'CP-A',
          parentEmail: 'parent-a@iso.test',
        },
        {
          id: studentBId,
          tenantId: tenantBId,
          firstName: 'Bob',
          lastName: 'Iso-B',
          dateOfBirth: new Date('2017-04-10'),
          sex: Sex.M,
          classroom: 'CE1-B',
          parentEmail: 'parent-b@iso.test',
        },
      ],
    });
  });

  it('findMany returns only tenant A users when context = tenant A', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const users = await tenantPrisma.client.user.findMany();
        expect(users).toHaveLength(1);
        expect(users[0]!.id).toBe(userAId);
        expect(users[0]!.tenantId).toBe(tenantAId);
      },
    );
  });

  it('findMany returns only tenant B users when context = tenant B', async () => {
    await tenantContext.run(
      { tenantId: tenantBId, userId: userBId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const users = await tenantPrisma.client.user.findMany();
        expect(users).toHaveLength(1);
        expect(users[0]!.id).toBe(userBId);
        expect(users[0]!.tenantId).toBe(tenantBId);
      },
    );
  });

  it('findFirst by id of tenant B from tenant A context returns null', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const stolen = await tenantPrisma.client.user.findFirst({ where: { id: userBId } });
        expect(stolen).toBeNull();
      },
    );
  });

  it('count is tenant-scoped', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const count = await tenantPrisma.client.user.count();
        expect(count).toBe(1);
      },
    );
  });

  it('updateMany scoped to tenant A does NOT touch tenant B rows', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const result = await tenantPrisma.client.user.updateMany({
          data: { firstName: 'Pwned' },
        });
        expect(result.count).toBe(1);
      },
    );

    const userB = await prisma.user.findUnique({ where: { id: userBId } });
    expect(userB?.firstName).toBe('User');

    const userA = await prisma.user.findUnique({ where: { id: userAId } });
    expect(userA?.firstName).toBe('Pwned');
  });

  it('deleteMany scoped to tenant A does NOT delete tenant B rows', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        await tenantPrisma.client.user.deleteMany({});
      },
    );

    const userB = await prisma.user.findUnique({ where: { id: userBId } });
    expect(userB).not.toBeNull();
    expect(userB?.tenantId).toBe(tenantBId);
  });

  it('SUPER_ADMIN bypass (skipTenantFilter=true) returns both tenants', async () => {
    await tenantContext.run(
      { tenantId: null, userId: 'super-admin', role: UserRole.SUPER_ADMIN, skipTenantFilter: true },
      async () => {
        const users = await tenantPrisma.client.user.findMany();
        expect(users).toHaveLength(2);
      },
    );
  });

  it('without context, queries are NOT scoped (used by auth lookups)', async () => {
    // No context set — useful for login flow where we need to find a user
    // across tenants by email before issuing tokens. Auth service is the
    // ONLY caller allowed to do this; everything else must run inside a
    // tenant context.
    const users = await tenantPrisma.client.user.findMany();
    expect(users).toHaveLength(2);
  });

  // ==========================================================================
  // V2 — Student model isolation (R10 extended)
  // Phase A added `Student` to TENANT_SCOPED_MODELS — these 4 tests prove the
  // extension scopes Student queries the same way it scopes User queries.
  // ==========================================================================

  it('Student.findMany returns only tenant A students from tenant A context', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const rows = await tenantPrisma.client.student.findMany();
        expect(rows).toHaveLength(1);
        expect(rows[0]!.id).toBe(studentAId);
        expect(rows[0]!.tenantId).toBe(tenantAId);
      },
    );
  });

  it('Student.findFirst by tenant B id from tenant A context returns null', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const stolen = await tenantPrisma.client.student.findFirst({
          where: { id: studentBId },
        });
        expect(stolen).toBeNull();
      },
    );
  });

  it('Student.updateMany scoped to tenant A does NOT touch tenant B rows', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        const result = await tenantPrisma.client.student.updateMany({
          data: { classroom: 'HACK' },
        });
        expect(result.count).toBe(1);
      },
    );
    const stillTouchedB = await prisma.student.findUnique({ where: { id: studentBId } });
    expect(stillTouchedB?.classroom).toBe('CE1-B');
    const touchedA = await prisma.student.findUnique({ where: { id: studentAId } });
    expect(touchedA?.classroom).toBe('HACK');
  });

  it('Student.deleteMany scoped to tenant A does NOT delete tenant B rows', async () => {
    await tenantContext.run(
      { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
      async () => {
        await tenantPrisma.client.student.deleteMany({});
      },
    );
    const survivorB = await prisma.student.findUnique({ where: { id: studentBId } });
    expect(survivorB).not.toBeNull();
    expect(survivorB?.tenantId).toBe(tenantBId);
    const goneA = await prisma.student.findUnique({ where: { id: studentAId } });
    expect(goneA).toBeNull();
  });

  // ==========================================================================
  // T2b — DailyLogEntry + Activity isolation
  // T2b added `DailyLogEntry` and `Activity` to TENANT_SCOPED_MODELS — these
  // tests prove the extension scopes the new operational models the same way
  // it scopes Student/User queries.
  //
  // The Activity + DailyLogEntry rows are seeded HERE (nested beforeEach, runs
  // after the global one) rather than globally: `DailyLogEntry.authorId` → User
  // is a RESTRICT FK, so seeding it globally would block the user-delete
  // isolation test above from running `user.deleteMany({})` (P2003).
  // ==========================================================================
  describe('Operational models isolation (T2b)', () => {
    let activityAId: string;
    let activityBId: string;
    let logEntryAId: string;
    let logEntryBId: string;
    // T2b PR-2 — discipline + santé
    let incidentAId: string;
    let incidentBId: string;
    let recordAId: string;
    let recordBId: string;
    let visitAId: string;
    let visitBId: string;
    let vaccinationAId: string;
    let vaccinationBId: string;
    // T2b PR-3 — cantine + transport
    let menuAId: string;
    let menuBId: string;
    let mealPlanAId: string;
    let mealPlanBId: string;
    let routeAId: string;
    let routeBId: string;
    let assignmentAId: string;
    let assignmentBId: string;
    // T2b PR-4 — sécurité
    let secIncidentAId: string;
    let secIncidentBId: string;
    let visitorAId: string;
    let visitorBId: string;
    let drillAId: string;
    let drillBId: string;
    // T2c V1 — RH contrats
    let contractAId: string;
    let contractBId: string;

    beforeEach(async () => {
      // Parent tenants/users/students already exist (global beforeEach ran).
      // Seed one Activity + one DailyLogEntry per tenant; the log entry
      // references the per-tenant student + the per-tenant SCHOOL_ADMIN author.
      activityAId = createId();
      activityBId = createId();
      logEntryAId = createId();
      logEntryBId = createId();

      await prisma.activity.createMany({
        data: [
          { id: activityAId, tenantId: tenantAId, name: 'Chorale A', category: ActivityCategory.MUSIC },
          { id: activityBId, tenantId: tenantBId, name: 'Chorale B', category: ActivityCategory.MUSIC },
        ],
      });

      await prisma.dailyLogEntry.createMany({
        data: [
          {
            id: logEntryAId,
            tenantId: tenantAId,
            studentId: studentAId,
            date: new Date('2026-05-28'),
            mood: ChildMood.HAPPY,
            authorId: userAId,
          },
          {
            id: logEntryBId,
            tenantId: tenantBId,
            studentId: studentBId,
            date: new Date('2026-05-28'),
            mood: ChildMood.CALM,
            authorId: userBId,
          },
        ],
      });

      // T2b PR-2 — one DisciplineIncident / HealthRecord / InfirmaryVisit /
      // Vaccination per tenant, referencing the per-tenant student + admin.
      incidentAId = createId();
      incidentBId = createId();
      recordAId = createId();
      recordBId = createId();
      visitAId = createId();
      visitBId = createId();
      vaccinationAId = createId();
      vaccinationBId = createId();

      await prisma.disciplineIncident.createMany({
        data: [
          {
            id: incidentAId,
            tenantId: tenantAId,
            studentId: studentAId,
            type: DisciplineSeverity.MINOR,
            occurredAt: new Date('2026-05-20'),
            description: 'Incident A',
            reportedById: userAId,
          },
          {
            id: incidentBId,
            tenantId: tenantBId,
            studentId: studentBId,
            type: DisciplineSeverity.MAJOR,
            occurredAt: new Date('2026-05-20'),
            description: 'Incident B',
            reportedById: userBId,
          },
        ],
      });

      await prisma.healthRecord.createMany({
        data: [
          { id: recordAId, tenantId: tenantAId, studentId: studentAId, allergies: 'A', updatedById: userAId },
          { id: recordBId, tenantId: tenantBId, studentId: studentBId, allergies: 'B', updatedById: userBId },
        ],
      });

      await prisma.infirmaryVisit.createMany({
        data: [
          {
            id: visitAId,
            tenantId: tenantAId,
            studentId: studentAId,
            visitedAt: new Date('2026-05-21T09:00:00.000Z'),
            reason: 'A',
            outcome: InfirmaryOutcome.RETURNED_TO_CLASS,
            recordedById: userAId,
          },
          {
            id: visitBId,
            tenantId: tenantBId,
            studentId: studentBId,
            visitedAt: new Date('2026-05-21T09:00:00.000Z'),
            reason: 'B',
            outcome: InfirmaryOutcome.RETURNED_TO_CLASS,
            recordedById: userBId,
          },
        ],
      });

      await prisma.vaccination.createMany({
        data: [
          {
            id: vaccinationAId,
            tenantId: tenantAId,
            studentId: studentAId,
            vaccineName: 'DTP',
            administeredAt: new Date('2025-09-15'),
            recordedById: userAId,
          },
          {
            id: vaccinationBId,
            tenantId: tenantBId,
            studentId: studentBId,
            vaccineName: 'DTP',
            administeredAt: new Date('2025-09-15'),
            recordedById: userBId,
          },
        ],
      });

      // T2b PR-3 — one CanteenMenu / MealPlan / BusRoute / TransportAssignment per tenant.
      menuAId = createId();
      menuBId = createId();
      mealPlanAId = createId();
      mealPlanBId = createId();
      routeAId = createId();
      routeBId = createId();
      assignmentAId = createId();
      assignmentBId = createId();

      await prisma.canteenMenu.createMany({
        data: [
          { id: menuAId, tenantId: tenantAId, date: new Date('2026-05-25'), main: 'A' },
          { id: menuBId, tenantId: tenantBId, date: new Date('2026-05-25'), main: 'B' },
        ],
      });

      await prisma.mealPlan.createMany({
        data: [
          { id: mealPlanAId, tenantId: tenantAId, studentId: studentAId },
          { id: mealPlanBId, tenantId: tenantBId, studentId: studentBId },
        ],
      });

      await prisma.busRoute.createMany({
        data: [
          { id: routeAId, tenantId: tenantAId, name: 'Ligne A', departureTime: '07:15' },
          { id: routeBId, tenantId: tenantBId, name: 'Ligne B', departureTime: '07:15' },
        ],
      });

      await prisma.transportAssignment.createMany({
        data: [
          { id: assignmentAId, tenantId: tenantAId, studentId: studentAId, routeId: routeAId },
          { id: assignmentBId, tenantId: tenantBId, studentId: studentBId, routeId: routeBId },
        ],
      });

      // T2b PR-4 — one SecurityIncident / VisitorLog / SafetyDrill per tenant
      // (reportedById/recordedById → the per-tenant SCHOOL_ADMIN).
      secIncidentAId = createId();
      secIncidentBId = createId();
      visitorAId = createId();
      visitorBId = createId();
      drillAId = createId();
      drillBId = createId();

      await prisma.securityIncident.createMany({
        data: [
          {
            id: secIncidentAId,
            tenantId: tenantAId,
            type: 'INTRUSION',
            occurredAt: new Date('2026-05-23T10:30:00.000Z'),
            description: 'A',
            reportedById: userAId,
          },
          {
            id: secIncidentBId,
            tenantId: tenantBId,
            type: 'THEFT',
            occurredAt: new Date('2026-05-23T10:30:00.000Z'),
            description: 'B',
            reportedById: userBId,
          },
        ],
      });

      await prisma.visitorLog.createMany({
        data: [
          {
            id: visitorAId,
            tenantId: tenantAId,
            visitorName: 'Visiteur A',
            checkInAt: new Date('2026-05-23T08:15:00.000Z'),
            recordedById: userAId,
          },
          {
            id: visitorBId,
            tenantId: tenantBId,
            visitorName: 'Visiteur B',
            checkInAt: new Date('2026-05-23T08:15:00.000Z'),
            recordedById: userBId,
          },
        ],
      });

      await prisma.safetyDrill.createMany({
        data: [
          {
            id: drillAId,
            tenantId: tenantAId,
            type: 'FIRE',
            conductedAt: new Date('2026-05-22T11:00:00.000Z'),
            recordedById: userAId,
          },
          {
            id: drillBId,
            tenantId: tenantBId,
            type: 'LOCKDOWN',
            conductedAt: new Date('2026-05-22T11:00:00.000Z'),
            recordedById: userBId,
          },
        ],
      });

      // T2c V1 — one EmploymentContract per tenant (userId → per-tenant admin).
      contractAId = createId();
      contractBId = createId();
      await prisma.employmentContract.createMany({
        data: [
          {
            id: contractAId,
            tenantId: tenantAId,
            userId: userAId,
            type: 'CDI',
            startDate: new Date('2025-09-01T00:00:00.000Z'),
            baseSalary: new Prisma.Decimal('2200.000'),
          },
          {
            id: contractBId,
            tenantId: tenantBId,
            userId: userBId,
            type: 'CDD',
            startDate: new Date('2025-09-01T00:00:00.000Z'),
            baseSalary: new Prisma.Decimal('1800.000'),
          },
        ],
      });
    });

    it('DailyLogEntry.findMany returns only tenant A entries from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.dailyLogEntry.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(logEntryAId);
          expect(rows[0]!.tenantId).toBe(tenantAId);
        },
      );
    });

    it('DailyLogEntry.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.dailyLogEntry.findFirst({
            where: { id: logEntryBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    it('Activity.findMany returns only tenant A activities from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.activity.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(activityAId);
          expect(rows[0]!.tenantId).toBe(tenantAId);
        },
      );
    });

    it('Activity.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.activity.findFirst({
            where: { id: activityBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    // ── T2b PR-2 — Discipline + Santé isolation ──────────────────────────────

    it('DisciplineIncident.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.disciplineIncident.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(incidentAId);
        },
      );
    });

    it('DisciplineIncident.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.disciplineIncident.findFirst({
            where: { id: incidentBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    it('HealthRecord.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.healthRecord.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(recordAId);
        },
      );
    });

    it('HealthRecord.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.healthRecord.findFirst({
            where: { id: recordBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    it('InfirmaryVisit.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.infirmaryVisit.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(visitAId);
        },
      );
    });

    it('InfirmaryVisit.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.infirmaryVisit.findFirst({
            where: { id: visitBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    it('Vaccination.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.vaccination.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(vaccinationAId);
        },
      );
    });

    it('Vaccination.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.vaccination.findFirst({
            where: { id: vaccinationBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    // ── T2b PR-3 — Cantine + Transport isolation ─────────────────────────────

    it('CanteenMenu.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.canteenMenu.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(menuAId);
        },
      );
    });

    it('CanteenMenu.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.canteenMenu.findFirst({ where: { id: menuBId } });
          expect(stolen).toBeNull();
        },
      );
    });

    it('MealPlan.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.mealPlan.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(mealPlanAId);
        },
      );
    });

    it('MealPlan.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.mealPlan.findFirst({ where: { id: mealPlanBId } });
          expect(stolen).toBeNull();
        },
      );
    });

    it('BusRoute.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.busRoute.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(routeAId);
        },
      );
    });

    it('BusRoute.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.busRoute.findFirst({ where: { id: routeBId } });
          expect(stolen).toBeNull();
        },
      );
    });

    it('TransportAssignment.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.transportAssignment.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(assignmentAId);
        },
      );
    });

    it('TransportAssignment.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.transportAssignment.findFirst({
            where: { id: assignmentBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    // ── T2b PR-4 — Sécurité isolation ────────────────────────────────────────

    it('SecurityIncident.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.securityIncident.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(secIncidentAId);
        },
      );
    });

    it('SecurityIncident.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.securityIncident.findFirst({
            where: { id: secIncidentBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });

    it('VisitorLog.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.visitorLog.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(visitorAId);
        },
      );
    });

    it('VisitorLog.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.visitorLog.findFirst({ where: { id: visitorBId } });
          expect(stolen).toBeNull();
        },
      );
    });

    it('SafetyDrill.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.safetyDrill.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(drillAId);
        },
      );
    });

    it('SafetyDrill.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.safetyDrill.findFirst({ where: { id: drillBId } });
          expect(stolen).toBeNull();
        },
      );
    });

    // ── T2c V1 — RH contrats isolation ───────────────────────────────────────

    it('EmploymentContract.findMany returns only tenant A from tenant A context', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const rows = await tenantPrisma.client.employmentContract.findMany();
          expect(rows).toHaveLength(1);
          expect(rows[0]!.id).toBe(contractAId);
        },
      );
    });

    it('EmploymentContract.findFirst by tenant B id from tenant A context returns null', async () => {
      await tenantContext.run(
        { tenantId: tenantAId, userId: userAId, role: UserRole.SCHOOL_ADMIN, skipTenantFilter: false },
        async () => {
          const stolen = await tenantPrisma.client.employmentContract.findFirst({
            where: { id: contractBId },
          });
          expect(stolen).toBeNull();
        },
      );
    });
  });
});
