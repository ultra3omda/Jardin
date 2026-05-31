/* eslint-disable no-console */
import { randomBytes } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import {
  ActivityCategory,
  ChildMood,
  ContractType,
  DisciplineSeverity,
  DrillType,
  InfirmaryOutcome,
  LeaveType,
  Locale,
  MealRegime,
  Prisma,
  PrismaClient,
  RelationType,
  RouteStatus,
  SecurityIncidentType,
  SecuritySeverity,
  Sex,
  TenantType,
  TransportDirection,
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
        emailVerifiedAt: new Date(),
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
      emailVerifiedAt: new Date(),
    },
  });
}

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

interface SeededStudent {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string;
  parentEmail: string;
}

async function seedStudents(
  tenantId: string,
  classroom: string,
  names: Array<[string, string]>,
): Promise<SeededStudent[]> {
  const seeded: SeededStudent[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName] = names[i];
    const parentEmail = `parent.${lastName.toLowerCase()}.${firstName.toLowerCase()}@demo-ecole.klasso.tn`;
    // Seed-only idempotency: (firstName, lastName, classroom) is treated as the
    // natural key for a student, and parentEmail derives from it. The curated
    // name arrays below are kept collision-free so no two distinct children
    // share a name within a class (or an email across classes). There is no DB
    // unique constraint backing this, so keep the arrays unambiguous.
    const existing = await prisma.student.findFirst({
      where: { tenantId, firstName, lastName, classroom },
    });
    if (existing) {
      seeded.push({ id: existing.id, firstName, lastName, classroom, parentEmail });
      continue;
    }
    const id = createId();
    await prisma.student.create({
      data: {
        id,
        tenantId,
        firstName,
        lastName,
        dateOfBirth: new Date(2018 - Math.floor(i / 10), i % 12, 1 + (i % 27)),
        sex: i % 2 === 0 ? Sex.F : Sex.M,
        nationality: 'TN',
        classroom,
        parentEmail,
        siblingsCount: i % 3,
        country: 'TN',
        motherTongue: 'ar',
      },
    });
    seeded.push({ id, firstName, lastName, classroom, parentEmail });
  }
  return seeded;
}

async function seedParentLinks(
  tenantId: string,
  students: SeededStudent[],
  passwordHash: string,
): Promise<number> {
  let links = 0;
  for (const s of students) {
    const parent = await upsertUser({
      tenantId,
      email: s.parentEmail,
      firstName: 'Parent',
      lastName: s.lastName,
      role: UserRole.PARENT,
      passwordHash,
    });
    const existingLink = await prisma.parentStudent.findFirst({
      where: { parentUserId: parent.id, studentId: s.id },
    });
    if (existingLink) continue;
    await prisma.parentStudent.create({
      data: {
        id: createId(),
        tenantId,
        parentUserId: parent.id,
        studentId: s.id,
        relationType: RelationType.MOTHER,
        isPrimaryContact: true,
      },
    });
    links += 1;
  }
  return links;
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

// -- T2b -- Journal (cahier de liaison) + Activités fixtures ----------------
// Fixed seed date (deterministic — never Date.now()/argless new Date()).
const T2B_LOG_DATE = new Date('2026-05-29');

const T2B_SEED_ACTIVITIES = [
  { name: 'Chorale', category: ActivityCategory.MUSIC },
  { name: 'Club Sciences', category: ActivityCategory.SPORT },
  { name: 'Atelier Peinture', category: ActivityCategory.ART },
];

/**
 * Seed idempotent Journal + Activités fixtures for one tenant.
 * No-op for tenants without students (e.g. the kindergarten demo tenant),
 * so it stays safe to call for every demo tenant. Re-runs create no
 * duplicates: daily logs and participations are guarded by their unique
 * constraints via upsert, activities by a (tenantId, name) findFirst guard.
 */
async function seedJournalAndActivities(tenantId: string): Promise<void> {
  const author = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SCHOOL_ADMIN },
  });
  const someStudents = await prisma.student.findMany({
    where: { tenantId, deletedAt: null },
    take: 3,
  });
  if (!author || someStudents.length === 0) return;

  for (const s of someStudents) {
    await prisma.dailyLogEntry.upsert({
      where: { unique_daily_log_per_day: { tenantId, studentId: s.id, date: T2B_LOG_DATE } },
      update: {},
      create: {
        id: createId(),
        tenantId,
        studentId: s.id,
        date: T2B_LOG_DATE,
        meals: 'A bien mangé',
        nap: 'Sieste 13h-14h30',
        mood: ChildMood.HAPPY,
        generalNote: 'Belle journée.',
        authorId: author.id,
      },
    });
  }

  for (const a of T2B_SEED_ACTIVITIES) {
    const existing = await prisma.activity.findFirst({ where: { tenantId, name: a.name } });
    const activity =
      existing ??
      (await prisma.activity.create({
        data: { id: createId(), tenantId, name: a.name, category: a.category },
      }));
    await prisma.activityParticipation.upsert({
      where: { unique_participation: { activityId: activity.id, studentId: someStudents[0].id } },
      update: {},
      create: {
        id: createId(),
        tenantId,
        activityId: activity.id,
        studentId: someStudents[0].id,
      },
    });
  }
}

// -- T2b PR-2 -- Discipline + Santé fixtures ---------------------------------
// Fixed seed dates (deterministic — never Date.now()/argless new Date()).
const T2B_INCIDENT_DATE = new Date('2026-05-20');
const T2B_VISIT_DATE = new Date('2026-05-22T09:30:00.000Z');
const T2B_VACCINE_DATE = new Date('2025-09-15');
const T2B_INCIDENT_DESC = 'Bavardage répété en cours malgré plusieurs avertissements.';

/**
 * Seed idempotent Discipline + Santé fixtures for one tenant.
 * No-op for tenants without students. Re-runs create no duplicates: the health
 * record is guarded by its (tenantId, studentId) unique constraint via upsert;
 * the others by a deterministic findFirst guard (no natural unique key).
 */
async function seedDisciplineAndHealth(tenantId: string): Promise<void> {
  const author = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SCHOOL_ADMIN },
  });
  const someStudents = await prisma.student.findMany({
    where: { tenantId, deletedAt: null },
    take: 3,
  });
  if (!author || someStudents.length === 0) return;
  const student = someStudents[0];

  const existingIncident = await prisma.disciplineIncident.findFirst({
    where: { tenantId, studentId: student.id, description: T2B_INCIDENT_DESC },
  });
  if (!existingIncident) {
    await prisma.disciplineIncident.create({
      data: {
        id: createId(),
        tenantId,
        studentId: student.id,
        type: DisciplineSeverity.MINOR,
        occurredAt: T2B_INCIDENT_DATE,
        description: T2B_INCIDENT_DESC,
        sanction: 'Avertissement oral',
        reportedById: author.id,
      },
    });
  }

  await prisma.healthRecord.upsert({
    where: { unique_health_record_per_student: { tenantId, studentId: student.id } },
    update: {},
    create: {
      id: createId(),
      tenantId,
      studentId: student.id,
      bloodType: 'O+',
      allergies: 'Arachides',
      emergencyContactName: 'Contact familial',
      emergencyContactPhone: '+216 00 000 000',
      updatedById: author.id,
    },
  });

  const existingVisit = await prisma.infirmaryVisit.findFirst({
    where: { tenantId, studentId: student.id, visitedAt: T2B_VISIT_DATE },
  });
  if (!existingVisit) {
    await prisma.infirmaryVisit.create({
      data: {
        id: createId(),
        tenantId,
        studentId: student.id,
        visitedAt: T2B_VISIT_DATE,
        reason: 'Maux de tête',
        treatment: 'Repos 30 min',
        outcome: InfirmaryOutcome.RETURNED_TO_CLASS,
        recordedById: author.id,
      },
    });
  }

  const existingVaccination = await prisma.vaccination.findFirst({
    where: { tenantId, studentId: student.id, vaccineName: 'DTP' },
  });
  if (!existingVaccination) {
    await prisma.vaccination.create({
      data: {
        id: createId(),
        tenantId,
        studentId: student.id,
        vaccineName: 'DTP',
        administeredAt: T2B_VACCINE_DATE,
        recordedById: author.id,
      },
    });
  }
}

// -- T2b PR-3 -- Cantine + Transport fixtures --------------------------------
const T2B_MENU_DATES = [new Date('2026-05-25'), new Date('2026-05-26')];
const T2B_ROUTE_NAME = 'Ligne A — Nord';

/**
 * Seed idempotent Cantine + Transport fixtures for one tenant.
 * No-op for tenants without students. Re-runs create no duplicates: menus,
 * meal plans and assignments are guarded by their unique constraints via
 * upsert; the bus route by a (tenantId, name) findFirst guard.
 */
async function seedCanteenAndTransport(tenantId: string): Promise<void> {
  const someStudents = await prisma.student.findMany({
    where: { tenantId, deletedAt: null },
    take: 3,
  });
  if (someStudents.length === 0) return;
  const student = someStudents[0];

  for (const date of T2B_MENU_DATES) {
    await prisma.canteenMenu.upsert({
      where: { unique_canteen_menu_per_day: { tenantId, date } },
      update: {},
      create: {
        id: createId(),
        tenantId,
        date,
        starter: 'Salade de carottes',
        main: 'Poulet rôti, riz',
        dessert: 'Yaourt nature',
        vegetarian: 'Gratin de légumes',
      },
    });
  }

  await prisma.mealPlan.upsert({
    where: { unique_meal_plan_per_student: { tenantId, studentId: student.id } },
    update: {},
    create: {
      id: createId(),
      tenantId,
      studentId: student.id,
      regime: MealRegime.STANDARD,
      allergies: 'Arachides',
    },
  });

  const existingRoute = await prisma.busRoute.findFirst({
    where: { tenantId, name: T2B_ROUTE_NAME },
  });
  const route =
    existingRoute ??
    (await prisma.busRoute.create({
      data: {
        id: createId(),
        tenantId,
        name: T2B_ROUTE_NAME,
        driverName: 'Rachid Hammouda',
        vehiclePlate: 'TN-247-B',
        departureTime: '07:15',
        returnTime: '16:45',
        status: RouteStatus.ACTIVE,
        capacity: 30,
        stops: {
          create: [
            { id: createId(), tenantId, name: 'Ariana Centre', order: 0, pickupTime: '07:15' },
            { id: createId(), tenantId, name: 'La Soukra', order: 1, pickupTime: '07:25' },
          ],
        },
      },
    }));

  await prisma.transportAssignment.upsert({
    where: {
      unique_transport_assignment: {
        tenantId,
        studentId: student.id,
        routeId: route.id,
        direction: TransportDirection.BOTH,
      },
    },
    update: {},
    create: {
      id: createId(),
      tenantId,
      studentId: student.id,
      routeId: route.id,
      direction: TransportDirection.BOTH,
    },
  });
}

// -- T2b PR-4 -- Sécurité fixtures -------------------------------------------
// Fixed seed dates (deterministic — never Date.now()/argless new Date()).
const T2B_SECURITY_INCIDENT_AT = new Date('2026-05-23T10:30:00.000Z');
const T2B_SECURITY_INCIDENT_DESC = 'Individu non identifié observé près de la clôture nord.';
const T2B_VISITOR_AT = new Date('2026-05-23T08:15:00.000Z');
const T2B_DRILL_AT = new Date('2026-05-22T11:00:00.000Z');

/**
 * Seed idempotent Sécurité fixtures for one tenant.
 * No-op for tenants without a SCHOOL_ADMIN (used as reporter/recorder).
 * Re-runs create no duplicates via deterministic findFirst guards.
 */
async function seedSecurity(tenantId: string): Promise<void> {
  const author = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SCHOOL_ADMIN },
  });
  if (!author) return;

  const existingIncident = await prisma.securityIncident.findFirst({
    where: { tenantId, description: T2B_SECURITY_INCIDENT_DESC },
  });
  if (!existingIncident) {
    await prisma.securityIncident.create({
      data: {
        id: createId(),
        tenantId,
        type: SecurityIncidentType.INTRUSION,
        severity: SecuritySeverity.MEDIUM,
        location: 'Zone nord',
        occurredAt: T2B_SECURITY_INCIDENT_AT,
        description: T2B_SECURITY_INCIDENT_DESC,
        reportedById: author.id,
      },
    });
  }

  const existingVisitor = await prisma.visitorLog.findFirst({
    where: { tenantId, visitorName: 'M. Gharbi', checkInAt: T2B_VISITOR_AT },
  });
  if (!existingVisitor) {
    await prisma.visitorLog.create({
      data: {
        id: createId(),
        tenantId,
        visitorName: 'M. Gharbi',
        reason: 'Rendez-vous direction',
        checkInAt: T2B_VISITOR_AT,
        badgeNumber: 'N°142',
        recordedById: author.id,
      },
    });
  }

  const existingDrill = await prisma.safetyDrill.findFirst({
    where: { tenantId, type: DrillType.FIRE, conductedAt: T2B_DRILL_AT },
  });
  if (!existingDrill) {
    await prisma.safetyDrill.create({
      data: {
        id: createId(),
        tenantId,
        type: DrillType.FIRE,
        conductedAt: T2B_DRILL_AT,
        durationMin: 15,
        notes: 'Évacuation complète en 3 min.',
        recordedById: author.id,
      },
    });
  }
}

// -- T2c V1 -- RH / Contrats fixtures -----------------------------------------
// Fixed seed dates (deterministic — never Date.now()).
const T2C_CONTRACT_START = new Date('2025-09-01T00:00:00.000Z');

/**
 * Seed idempotent employment contracts for a tenant's employees
 * (TEACHER + STAFF). One ACTIVE contract per employee; re-runs no-op via
 * a deterministic findFirst guard on userId. Salaries are Decimal/TND.
 */
async function seedHr(tenantId: string): Promise<void> {
  const employees = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: [UserRole.TEACHER, UserRole.STAFF] },
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Plausible base salaries (TND) cycled per employee role.
  const teacherSalaries = ['2200.000', '2450.500', '2600.000', '2300.000'];
  const staffSalary = '1650.000';
  let teacherIdx = 0;

  for (const employee of employees) {
    const existing = await prisma.employmentContract.findFirst({
      where: { tenantId, userId: employee.id },
    });
    if (existing) continue;

    const isTeacher = employee.role === UserRole.TEACHER;
    const baseSalary = isTeacher
      ? teacherSalaries[teacherIdx++ % teacherSalaries.length]!
      : staffSalary;

    await prisma.employmentContract.create({
      data: {
        id: createId(),
        tenantId,
        userId: employee.id,
        type: isTeacher ? ContractType.CDI : ContractType.CDD,
        startDate: T2C_CONTRACT_START,
        baseSalary: new Prisma.Decimal(baseSalary),
        weeklyHours: isTeacher ? 35 : 40,
      },
    });
  }

  await seedLeaves(tenantId, employees);
}

// -- T2c V2 -- RH / Congés fixtures -------------------------------------------
// Fixed seed dates (deterministic — never Date.now()).
const T2C_LEAVE_APPROVED_START = new Date('2026-02-10T00:00:00.000Z');
const T2C_LEAVE_APPROVED_END = new Date('2026-02-14T00:00:00.000Z');
const T2C_LEAVE_PENDING_START = new Date('2026-07-01T00:00:00.000Z');
const T2C_LEAVE_PENDING_END = new Date('2026-07-05T00:00:00.000Z');
const T2C_LEAVE_REVIEWED_AT = new Date('2026-01-15T09:00:00.000Z');

/**
 * Seed idempotent leave requests for the first employee of a tenant:
 * one APPROVED (reviewed by the school admin) + one PENDING. Re-runs no-op
 * via a deterministic findFirst guard on (userId, startDate).
 */
async function seedLeaves(
  tenantId: string,
  employees: ReadonlyArray<{ id: string }>,
): Promise<void> {
  const employee = employees[0];
  if (!employee) return;
  const admin = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SCHOOL_ADMIN },
  });
  if (!admin) return;

  const approvedExists = await prisma.leaveRequest.findFirst({
    where: { tenantId, userId: employee.id, startDate: T2C_LEAVE_APPROVED_START },
  });
  if (!approvedExists) {
    await prisma.leaveRequest.create({
      data: {
        id: createId(),
        tenantId,
        userId: employee.id,
        type: LeaveType.PAID,
        status: 'APPROVED',
        startDate: T2C_LEAVE_APPROVED_START,
        endDate: T2C_LEAVE_APPROVED_END,
        reason: 'Congé annuel',
        reviewedById: admin.id,
        reviewedAt: T2C_LEAVE_REVIEWED_AT,
      },
    });
  }

  const pendingExists = await prisma.leaveRequest.findFirst({
    where: { tenantId, userId: employee.id, startDate: T2C_LEAVE_PENDING_START },
  });
  if (!pendingExists) {
    await prisma.leaveRequest.create({
      data: {
        id: createId(),
        tenantId,
        userId: employee.id,
        type: LeaveType.PAID,
        status: 'PENDING',
        startDate: T2C_LEAVE_PENDING_START,
        endDate: T2C_LEAVE_PENDING_END,
        reason: 'Vacances d’été',
      },
    });
  }
}

async function main(): Promise<void> {
  const password = generateSeedPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // -- DEMO TENANT 1 -- Ecole primaire ---------------------------------------
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

  // -- DEMO TENANT 2 -- Jardin d'enfants -------------------------------------
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

  // -- 4 personas per tenant + super-admin -----------------------------------
  await upsertUser({ tenantId: ecole.id, email: 'admin@demo-ecole.klasso.tn',  firstName: 'Amadou',  lastName: 'Koné',     role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof@demo-ecole.klasso.tn',   firstName: 'Sami',    lastName: 'Hadj',     role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof.math@demo-ecole.klasso.tn', firstName: 'Nabil', lastName: 'Gharbi',  role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof.fr@demo-ecole.klasso.tn',   firstName: 'Rim',   lastName: 'Cherif',  role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'prof.sci@demo-ecole.klasso.tn',  firstName: 'Hédi',  lastName: 'Brahmi',  role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'parent@demo-ecole.klasso.tn', firstName: 'Salma',   lastName: 'Ben Ali',  role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'staff@demo-ecole.klasso.tn',  firstName: 'Omar',    lastName: 'Mansour',  role: UserRole.STAFF,        passwordHash });

  await upsertUser({ tenantId: maternelle.id, email: 'admin@demo-maternelle.klasso.tn',  firstName: 'Yasmine', lastName: 'Trabelsi', role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'anim@demo-maternelle.klasso.tn',   firstName: 'Leila',   lastName: 'Marzouki', role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'parent@demo-maternelle.klasso.tn', firstName: 'Fatma',   lastName: 'Zouari',   role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'staff@demo-maternelle.klasso.tn',  firstName: 'Nour',    lastName: 'Hamdi',    role: UserRole.STAFF,        passwordHash });

  const superAdmin = await upsertUser({
    tenantId: null,
    email: 'super@klasso.tn',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    passwordHash,
  });

  // -- V6 academic seed (subjects + grade periods) ---------------------------
  await seedV6ForTenant(ecole.id, '2025-2026');
  await seedV6ForTenant(maternelle.id, '2025-2026');

  // -- Classes -- only PRIMARY_SCHOOL (V4) -----------------------------------
  await seedClass(ecole.id, 'CP-A',  'CP',  '2025-2026');
  await seedClass(ecole.id, 'CE1-B', 'CE1', '2025-2026');
  await seedClass(ecole.id, 'CE2-A', 'CE2', '2025-2026');

  // -- Students -- realistic, ~50 split across 3 classes ---------------------
  const cpA = await seedStudents(ecole.id, 'CP-A', [
    ['Lina', 'Ben Ali'], ['Karim', 'Ben Ali'], ['Yacine', 'Mansour'], ['Maya', 'Trabelsi'],
    ['Adam', 'Hadj'], ['Sara', 'Belhaj'], ['Anis', 'Riahi'], ['Nour', 'Khaldi'],
    ['Inès', 'Bouaziz'], ['Rayan', 'Mejri'], ['Aya', 'Hammami'], ['Wassim', 'Lassoued'],
    ['Yasmine', 'Saidi'], ['Mehdi', 'Chaabane'], ['Sirine', 'Karoui'], ['Hamza', 'Jbeli'],
  ]);
  const ce1B = await seedStudents(ecole.id, 'CE1-B', [
    ['Ibrahim', 'Ba'], ['Aïcha', 'Sow'], ['Mohamed', 'Diop'], ['Aminata', 'Cissé'],
    ['Ousmane', 'Diallo'], ['Fatou', 'Niang'], ['Bakary', 'Touré'], ['Awa', 'Ndiaye'],
    ['Cheikh', 'Fall'], ['Mariama', 'Sy'], ['Souleymane', 'Sarr'], ['Khadidja', 'Gueye'],
    ['Modibo', 'Konaté'], ['Bintou', 'Camara'], ['Lamine', 'Diakité'], ['Salimata', 'Doumbia'],
  ]);
  const ce2A = await seedStudents(ecole.id, 'CE2-A', [
    ['Tarek', 'Trabelsi'], ['Lilia', 'Bouaziz'], ['Skander', 'Ben Hassine'], ['Mariem', 'Mejri'],
    ['Aziz', 'Lassoued'], ['Nadia', 'Hammami'], ['Bilel', 'Karoui'], ['Donia', 'Jbeli'],
    ['Hatem', 'Saidi'], ['Ines', 'Khaldi'], ['Walid', 'Riahi'], ['Habiba', 'Chaabane'],
  ]);

  // -- Parents -- one PARENT user per student, linked idempotently -----------
  const parentLinks = await seedParentLinks(ecole.id, [...cpA, ...ce1B, ...ce2A], passwordHash);

  // -- T2b -- Journal + Activités fixtures (idempotent, students-only) -------
  // Called for both demo tenants; no-op where there are no students yet.
  await seedJournalAndActivities(ecole.id);
  await seedJournalAndActivities(maternelle.id);

  // -- T2b PR-2 -- Discipline + Santé fixtures (idempotent, students-only) ---
  await seedDisciplineAndHealth(ecole.id);
  await seedDisciplineAndHealth(maternelle.id);

  // -- T2b PR-3 -- Cantine + Transport fixtures (idempotent, students-only) --
  await seedCanteenAndTransport(ecole.id);
  await seedCanteenAndTransport(maternelle.id);

  // -- T2b PR-4 -- Sécurité fixtures (idempotent, admin-required) ------------
  await seedSecurity(ecole.id);
  await seedSecurity(maternelle.id);

  // -- T2c V1 -- RH / Contrats (idempotent) ---------------------------------
  await seedHr(ecole.id);
  await seedHr(maternelle.id);

  // -- Demo requests (platform-level, event-sourced in AuditLog) -------------
  await seedDemoRequests(prisma, superAdmin.id);

  console.log('');
  console.log(`Demo data seeded successfully (T2a): ${parentLinks} new parent link(s).`);
  console.log('------------------------------------------------------------');
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
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  Password (all accounts): ${password}`);
  } else {
    console.log('  Password: (hidden — see seed.ts / team docs)');
  }
  console.log('------------------------------------------------------------');
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
