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
  SubmissionStatus,
  TenantType,
  TransportDirection,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function generateSeedPassword(): string {
  // Stable, documented demo password when DEMO_PASSWORD is provided (>= 12 chars);
  // otherwise a fresh random one per run. See SETUP.md / docs/DEMO_CREDENTIALS.md.
  const fromEnv = process.env.DEMO_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= 12) return fromEnv;
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
      // Update the password too, so a re-seed keeps every demo account on the
      // current DEMO_PASSWORD (otherwise existing rows silently diverge).
      update: {
        firstName: args.firstName,
        lastName: args.lastName,
        role: args.role,
        passwordHash: args.passwordHash,
      },
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
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { firstName: args.firstName, lastName: args.lastName, passwordHash: args.passwordHash },
    });
  }
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
    { name: 'Mathématiques', code: 'MATH', coefficient: 4, levels: ['CP', 'CE1', 'CE2'] },
    { name: 'Français', code: 'FR', coefficient: 4, levels: ['CP', 'CE1', 'CE2'] },
    { name: 'Sciences', code: 'SCI', coefficient: 2, levels: ['CE1', 'CE2'] },
    { name: 'Histoire-Géographie', code: 'HG', coefficient: 2, levels: ['CE2'] },
    { name: 'Anglais', code: 'EN', coefficient: 2, levels: ['CE1', 'CE2'] },
    { name: 'Éducation Physique', code: 'EPS', coefficient: 1, levels: [] }, // tous niveaux
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { unique_subject_per_tenant: { tenantId, name: s.name } },
      update: { coefficient: s.coefficient, levels: s.levels },
      create: { id: createId(), tenantId, name: s.name, code: s.code, coefficient: s.coefficient, levels: s.levels },
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
  parentEmailDomain = 'demo-ecole.klasso.tn',
  classId?: string,
): Promise<SeededStudent[]> {
  const seeded: SeededStudent[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const [firstName, lastName] = names[i];
    const parentEmail = `parent.${lastName.toLowerCase()}.${firstName.toLowerCase()}@${parentEmailDomain}`;
    // Seed-only idempotency: (firstName, lastName, classroom) is treated as the
    // natural key for a student, and parentEmail derives from it. The curated
    // name arrays below are kept collision-free so no two distinct children
    // share a name within a class (or an email across classes). There is no DB
    // unique constraint backing this, so keep the arrays unambiguous.
    const existing = await prisma.student.findFirst({
      where: { tenantId, firstName, lastName, classroom },
    });
    if (existing) {
      // Lot 3 — relier les élèves déjà semés à leur classe (FK) lors d'un re-seed.
      if (classId && existing.classId !== classId) {
        await prisma.student.update({ where: { id: existing.id }, data: { classId } });
      }
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
        ...(classId ? { classId } : {}),
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

// Plausible Tunisian mother first names — assigned deterministically per family
// so a re-seed is stable and parent users have realistic, varied names.
const MOTHER_FIRST_NAMES = [
  'Mouna', 'Sonia', 'Leila', 'Faten', 'Rania', 'Sawsen', 'Ibtissem', 'Hayet',
  'Najet', 'Olfa', 'Wafa', 'Sabrine', 'Imen', 'Dorra', 'Amel', 'Hela',
];

async function seedParentLinks(
  tenantId: string,
  students: SeededStudent[],
  passwordHash: string,
): Promise<number> {
  let links = 0;
  for (let i = 0; i < students.length; i += 1) {
    const s = students[i];
    const motherFirstName = MOTHER_FIRST_NAMES[i % MOTHER_FIRST_NAMES.length];
    const parent = await upsertUser({
      tenantId,
      email: s.parentEmail,
      firstName: motherFirstName,
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

/**
 * Lot démo parent — rattache le PARENT de démo (persona `parent-primary` /
 * `parent-kindergarten`) à ses premiers élèves, qui ont déjà notes, présences,
 * emploi du temps, factures et journal. Sans ça, le compte parent de démo
 * n'avait aucun enfant et toutes ses vues étaient vides.
 */
async function linkDemoParentToChildren(
  tenantId: string,
  demoParentEmail: string,
  students: SeededStudent[],
  count = 2,
): Promise<void> {
  const parent = await prisma.user.findFirst({
    where: { tenantId, email: normalizeEmail(demoParentEmail), role: UserRole.PARENT },
  });
  if (!parent) return;
  const author = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SCHOOL_ADMIN },
  });
  const linked = students.slice(0, count);
  for (const s of linked) {
    const exists = await prisma.parentStudent.findFirst({
      where: { parentUserId: parent.id, studentId: s.id },
    });
    if (!exists) {
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
    }

    // Cahier de liaison : 2 entrées récentes par enfant pour que la vue parent
    // « Journal » ne soit jamais vide (la fixture générique cible d'autres élèves).
    if (author) {
      const moods = [ChildMood.HAPPY, ChildMood.CALM];
      for (let d = 0; d < 2; d += 1) {
        const date = daysAgo(d);
        await prisma.dailyLogEntry.upsert({
          where: { unique_daily_log_per_day: { tenantId, studentId: s.id, date } },
          update: {},
          create: {
            id: createId(),
            tenantId,
            studentId: s.id,
            date,
            meals: 'A bien mangé à la cantine',
            nap: 'Repos calme',
            mood: moods[d % moods.length],
            generalNote: 'Bonne journée, participation active en classe.',
            authorId: author.id,
          },
        });
      }
    }
  }
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
// Today (midnight) so the KG dashboard "Photos du jour" / journal panel show
// current data on demo.
const T2B_LOG_DATE = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

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
  await seedPayroll(tenantId, employees);
}

// -- T2c V3 -- RH / Paie fixtures ---------------------------------------------
const T2C_PAYSLIP_PERIOD = '2026-04';
const T2C_PAYSLIP_ISSUED_AT = new Date('2026-04-28T10:00:00.000Z');

/**
 * Seed an idempotent ISSUED payslip for the first employee of a tenant, computed
 * from their ACTIVE contract + one earning component. No-op on re-run via a
 * findFirst guard on (userId, period). MVP calc: gross = base + earnings,
 * net = gross − deductions. Amounts are Decimal/TND.
 */
async function seedPayroll(
  tenantId: string,
  employees: ReadonlyArray<{ id: string }>,
): Promise<void> {
  const employee = employees[0];
  if (!employee) return;

  const contract = await prisma.employmentContract.findFirst({
    where: { tenantId, userId: employee.id, status: 'ACTIVE', deletedAt: null },
    orderBy: { startDate: 'desc' },
  });
  if (!contract) return;

  const existing = await prisma.payslip.findFirst({
    where: { tenantId, userId: employee.id, period: T2C_PAYSLIP_PERIOD },
  });
  if (existing) return;

  const bonus = new Prisma.Decimal('120.000');
  const gross = contract.baseSalary.add(bonus);
  const deductions = new Prisma.Decimal('0.000');

  const payslip = await prisma.payslip.create({
    data: {
      id: createId(),
      tenantId,
      userId: employee.id,
      period: T2C_PAYSLIP_PERIOD,
      baseSalary: contract.baseSalary,
      grossSalary: gross,
      totalDeductions: deductions,
      netSalary: gross.sub(deductions),
      currency: contract.currency,
      status: 'ISSUED',
      issuedAt: T2C_PAYSLIP_ISSUED_AT,
    },
  });

  await prisma.payslipComponent.create({
    data: {
      id: createId(),
      tenantId,
      payslipId: payslip.id,
      label: 'Prime de rendement',
      kind: 'EARNING',
      amount: bonus,
    },
  });
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

// -- Academic life: class teachers, timetable, evaluations+grades, attendance,
//    announcements, invoices. Idempotent. Makes the SCHOOL_ADMIN (direction)
//    dashboard coherent: classes have teachers, students have grades & attendance.
// Dates relative to "now" so the demo dashboards (which read the most recent
// day with data) always show coherent, current-looking figures — regardless of
// when the seed runs.
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
const T_ANNOUNCE_AT = daysAgo(2);
const T_EVAL_DATE = daysAgo(10);
const T_ATTENDANCE_DAYS = [daysAgo(2), daysAgo(1), daysAgo(0)];

interface ClassRef {
  id: string;
  name: string;
  students: SeededStudent[];
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

// Devoirs (TAF) — quelques devoirs sur la 1re classe + rendus variés, pour que
// la vue enseignant (suivi) ET la vue parent (statut de l'enfant) aient du contenu.
async function seedHomework(tenantId: string): Promise<void> {
  const teacher = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.TEACHER, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const cls = await prisma.class.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { students: { where: { deletedAt: null }, take: 5, orderBy: { createdAt: 'asc' } } },
  });
  if (!teacher || !cls || cls.students.length === 0) return;
  const subject = await prisma.subject.findFirst({ where: { tenantId } });

  const defs = [
    { title: 'Exercices de mathématiques p.42', instructions: 'Faire les exercices 1 à 5. À rendre lundi.', dueIn: 3 },
    { title: 'Lecture — chapitre 4', instructions: 'Lire le chapitre 4 et résumer en 5 lignes.', dueIn: 6 },
  ];
  const statuses = [SubmissionStatus.SUBMITTED, SubmissionStatus.PENDING, SubmissionStatus.LATE];

  for (const d of defs) {
    let hw = await prisma.homework.findFirst({ where: { tenantId, classId: cls.id, title: d.title } });
    if (!hw) {
      hw = await prisma.homework.create({
        data: {
          id: createId(),
          tenantId,
          classId: cls.id,
          subjectId: subject?.id ?? null,
          createdById: teacher.id,
          title: d.title,
          instructions: d.instructions,
          dueDate: daysFromNow(d.dueIn),
        },
      });
    }
    for (let i = 0; i < Math.min(3, cls.students.length); i += 1) {
      const st = cls.students[i];
      const status = statuses[i % statuses.length];
      await prisma.homeworkSubmission.upsert({
        where: { unique_submission_per_student: { homeworkId: hw.id, studentId: st.id } },
        update: {},
        create: {
          id: createId(),
          tenantId,
          homeworkId: hw.id,
          studentId: st.id,
          status,
          submittedAt: status === SubmissionStatus.PENDING ? null : new Date(),
        },
      });
    }
  }
}

async function seedAcademicLife(
  tenantId: string,
  classes: ClassRef[],
  schoolYear: string,
): Promise<void> {
  const teachers = await prisma.user.findMany({
    where: { tenantId, role: UserRole.TEACHER, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  const admin = await prisma.user.findFirst({
    where: { tenantId, role: UserRole.SCHOOL_ADMIN },
  });
  const subjects = await prisma.subject.findMany({ where: { tenantId } });
  // Use the SAME period the parent "current grades" view resolves (latest open
  // period) so seeded grades actually show up in /evaluations/my-grades and in
  // the current-term bulletin — not an out-of-range past term.
  const period = await prisma.gradePeriod.findFirst({
    where: { tenantId, schoolYear, isClosed: false },
    orderBy: { startDate: 'desc' },
  });
  if (teachers.length === 0 || subjects.length === 0 || !admin) return;

  const subjMath = subjects.find((s) => s.code === 'MATH') ?? subjects[0];
  const subjFr = subjects.find((s) => s.code === 'FR') ?? subjects[0];

  for (let ci = 0; ci < classes.length; ci += 1) {
    const cls = classes[ci];
    const mainTeacher = teachers[ci % teachers.length];

    // 1. Main teacher assignment (idempotent).
    const hasTeacher = await prisma.classTeacher.findFirst({
      where: { tenantId, classId: cls.id, teacherUserId: mainTeacher.id },
    });
    if (!hasTeacher) {
      await prisma.classTeacher.create({
        data: {
          id: createId(),
          tenantId,
          classId: cls.id,
          teacherUserId: mainTeacher.id,
          subject: subjMath.name,
          isMainTeacher: true,
        },
      });
    }

    // 2. Timetable — two slots Monday (idempotent on classId+day+start).
    for (const slot of [
      { dayOfWeek: 1, periodStart: '08:30', periodEnd: '10:00', subject: subjMath.name, room: 'Salle 3' },
      { dayOfWeek: 1, periodStart: '10:15', periodEnd: '11:45', subject: subjFr.name, room: 'Salle 3' },
    ]) {
      const exists = await prisma.timeSlot.findFirst({
        where: { tenantId, classId: cls.id, dayOfWeek: slot.dayOfWeek, periodStart: slot.periodStart },
      });
      if (!exists) {
        await prisma.timeSlot.create({
          data: {
            id: createId(),
            tenantId,
            classId: cls.id,
            teacherUserId: mainTeacher.id,
            ...slot,
          },
        });
      }
    }

    // 3. One evaluation in the current period (Maths) + grades per student.
    if (period) {
      let evaluation = await prisma.evaluation.findFirst({
        where: { tenantId, classId: cls.id, gradePeriodId: period.id, subjectId: subjMath.id },
      });
      if (!evaluation) {
        evaluation = await prisma.evaluation.create({
          data: {
            id: createId(),
            tenantId,
            classId: cls.id,
            subjectId: subjMath.id,
            gradePeriodId: period.id,
            title: 'Contrôle de mathématiques',
            date: T_EVAL_DATE,
            maxScore: 20,
            createdById: mainTeacher.id,
          },
        });
      }
      for (let si = 0; si < cls.students.length; si += 1) {
        const st = cls.students[si];
        const hasGrade = await prisma.grade.findFirst({
          where: { tenantId, evaluationId: evaluation.id, studentId: st.id },
        });
        if (!hasGrade) {
          // Plausible spread 10–18/20.
          const score = 10 + ((si * 7) % 9);
          await prisma.grade.create({
            data: {
              id: createId(),
              tenantId,
              evaluationId: evaluation.id,
              studentId: st.id,
              score,
            },
          });
        }
      }
    }

    // 4. Attendance over 3 recent days; most present, a couple absent/late.
    for (let di = 0; di < T_ATTENDANCE_DAYS.length; di += 1) {
      const day = T_ATTENDANCE_DAYS[di];
      for (let si = 0; si < cls.students.length; si += 1) {
        const st = cls.students[si];
        const exists = await prisma.attendance.findFirst({
          where: { tenantId, studentId: st.id, date: day },
        });
        if (exists) continue;
        const mod = (si + di) % 12;
        const status =
          mod === 0 ? 'ABSENT' : mod === 5 ? 'LATE' : mod === 9 ? 'EXCUSED' : 'PRESENT';
        await prisma.attendance.create({
          data: {
            id: createId(),
            tenantId,
            studentId: st.id,
            classId: cls.id,
            date: day,
            status: status as never,
            recordedById: mainTeacher.id,
          },
        });
      }
    }
  }

  // 5. Announcements (idempotent on title).
  for (const ann of [
    { title: 'Réunion parents-professeurs', body: 'La réunion trimestrielle se tiendra le 5 juin à 17h dans la salle polyvalente.', audience: 'PARENTS' as const },
    { title: 'Sortie pédagogique au musée du Bardo', body: 'Les classes de CE2 visiteront le musée le 12 juin. Autorisation à signer.', audience: 'ALL' as const },
  ]) {
    const exists = await prisma.announcement.findFirst({ where: { tenantId, title: ann.title } });
    if (!exists) {
      await prisma.announcement.create({
        data: {
          id: createId(),
          tenantId,
          title: ann.title,
          body: ann.body,
          audience: ann.audience as never,
          authorId: admin.id,
          publishAt: T_ANNOUNCE_AT,
        },
      });
    }
  }

  // 6. Invoices — school fees for the first few students (idempotent on title+student).
  const allStudents = classes.flatMap((c) => c.students);
  for (let i = 0; i < Math.min(6, allStudents.length); i += 1) {
    const st = allStudents[i];
    const title = 'Frais de scolarité — 2e trimestre';
    const exists = await prisma.invoice.findFirst({
      where: { tenantId, studentId: st.id, title },
    });
    if (exists) continue;
    const paid = i % 3 !== 0;
    await prisma.invoice.create({
      data: {
        id: createId(),
        tenantId,
        studentId: st.id,
        title,
        amount: new Prisma.Decimal('450.000'),
        currency: 'TND',
        status: paid ? 'PAID' : 'PENDING',
        dueDate: new Date('2026-04-30'),
        paidAt: paid ? new Date('2026-04-15') : null,
      },
    });
  }
}

/**
 * Public subscription catalogue (global, not tenant-scoped). Prices are
 * PER STUDENT, charged at checkout as price × the tenant's active student
 * count. Seeded in every environment (incl. production) so the billing flow
 * is never empty. Idempotent (upsert by code). Keep in sync with the landing
 * pricing in apps/web/messages/*.json.
 */
const SUBSCRIPTION_PLANS: Array<{
  code: string;
  name: string;
  interval: 'MONTHLY' | 'YEARLY';
  price: string; // TND per student, Decimal(10,3)
  maxStudents: number | null;
}> = [
  { code: 'starter-monthly', name: 'Starter (mensuel)', interval: 'MONTHLY', price: '7.000', maxStudents: 50 },
  { code: 'standard-monthly', name: 'Standard (mensuel)', interval: 'MONTHLY', price: '6.000', maxStudents: 200 },
  { code: 'pro-monthly', name: 'Pro (mensuel)', interval: 'MONTHLY', price: '5.000', maxStudents: null },
  { code: 'starter-annual', name: 'Starter (annuel)', interval: 'YEARLY', price: '59.000', maxStudents: 50 },
  { code: 'standard-annual', name: 'Standard (annuel)', interval: 'YEARLY', price: '49.000', maxStudents: 200 },
  { code: 'pro-annual', name: 'Pro (annuel)', interval: 'YEARLY', price: '39.000', maxStudents: null },
];

async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        interval: plan.interval,
        price: new Prisma.Decimal(plan.price),
        currency: 'TND',
        maxStudents: plan.maxStudents,
        active: true,
      },
      create: {
        id: createId(),
        code: plan.code,
        name: plan.name,
        interval: plan.interval,
        price: new Prisma.Decimal(plan.price),
        currency: 'TND',
        maxStudents: plan.maxStudents,
        active: true,
      },
    });
  }
  console.log(`  Seeded ${SUBSCRIPTION_PLANS.length} subscription plans (per-student TND).`);
}

async function main(): Promise<void> {
  const password = generateSeedPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // Global subscription catalogue — needed in every environment so checkout
  // never sees an empty plan list. Independent of demo content.
  await seedSubscriptionPlans();

  // Sales/marketing demo fixtures (commercial agent, signed contract, demo
  // requests) are opt-in. They are NEVER created in production so the
  // super-admin only ever sees real data; set SEED_DEMO_CONTENT=true locally
  // to get the full GTM pipeline demo.
  const seedDemoContent = process.env.SEED_DEMO_CONTENT === 'true';

  // -- DEMO TENANT 1 -- Ecole primaire ---------------------------------------
  const ecole = await prisma.tenant.upsert({
    where: { slug: 'demo-ecole' },
    // Demo tenants are already operational → ACTIVE + onboarding done so the
    // SCHOOL_ADMIN isn't bounced into the blocking onboarding wizard.
    update: {
      name: 'Démo École Pilote',
      type: TenantType.PRIMARY_SCHOOL,
      status: 'ACTIVE',
      onboardingCompletedAt: new Date(),
    },
    create: {
      id: createId(),
      name: 'Démo École Pilote',
      slug: 'demo-ecole',
      type: TenantType.PRIMARY_SCHOOL,
      locale: Locale.fr,
      timezone: 'Africa/Tunis',
      status: 'ACTIVE',
      onboardingCompletedAt: new Date(),
    },
  });

  // -- DEMO TENANT 2 -- Jardin d'enfants -------------------------------------
  const maternelle = await prisma.tenant.upsert({
    where: { slug: 'demo-maternelle' },
    update: {
      name: 'Démo Jardin Les Pétales',
      type: TenantType.KINDERGARTEN,
      status: 'ACTIVE',
      onboardingCompletedAt: new Date(),
    },
    create: {
      id: createId(),
      name: 'Démo Jardin Les Pétales',
      slug: 'demo-maternelle',
      type: TenantType.KINDERGARTEN,
      locale: Locale.fr,
      timezone: 'Africa/Tunis',
      status: 'ACTIVE',
      onboardingCompletedAt: new Date(),
    },
  });

  // -- 4 personas per tenant + super-admin -----------------------------------
  await upsertUser({ tenantId: ecole.id, email: 'admin@demo-ecole.klasso.tn',  firstName: 'Hatem',   lastName: 'Bouzid',   role: UserRole.SCHOOL_ADMIN, passwordHash });
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

  // Vrai super-admin (NON exposé en démo). Mot de passe à définir via le
  // workflow reset-super-admin (SUPER_ADMIN_EMAIL=support@klasso.tn).
  const superAdmin = await upsertUser({
    tenantId: null,
    email: 'support@klasso.tn',
    firstName: 'Support',
    lastName: 'Klasso',
    role: UserRole.SUPER_ADMIN,
    passwordHash,
  });

  // -- GTM — A signed organization still awaiting its admin's onboarding -----
  // Kept as a demo school (slug demo-*, hidden from the super-admin views).
  const pendingOrg = await prisma.tenant.upsert({
    where: { slug: 'demo-lycee-avenir' },
    update: { name: 'Démo Lycée Avenir', type: TenantType.PRIMARY_SCHOOL },
    create: {
      id: createId(),
      name: 'Démo Lycée Avenir',
      slug: 'demo-lycee-avenir',
      type: TenantType.PRIMARY_SCHOOL,
      locale: Locale.fr,
      timezone: 'Africa/Tunis',
      // Left PENDING_ONBOARDING on purpose to demo the commercial pipeline.
    },
  });

  // -- GTM demo fixtures — commercial agent + signed contract (opt-in only) ---
  if (seedDemoContent) {
    const commercial = await upsertUser({
      tenantId: null,
      email: 'commercial@klasso.tn',
      firstName: 'Sami',
      lastName: 'Commercial',
      role: UserRole.COMMERCIAL,
      passwordHash,
    });
    const existingContract = await prisma.contract.findFirst({ where: { tenantId: pendingOrg.id } });
    if (!existingContract) {
      await prisma.contract.create({
        data: {
          id: createId(),
          tenantId: pendingOrg.id,
          reference: 'KL-2026-DEMO',
          fileKey: 'contracts/demo-lycee-avenir.pdf',
          fileName: 'contrat-demo-lycee-avenir.pdf',
          signedAt: new Date('2026-05-20'),
          startDate: new Date('2026-06-01'),
          endDate: new Date('2027-06-01'),
          notes: 'Contrat de démonstration (pipeline commercial).',
          createdById: commercial.id,
        },
      });
    }
  }

  // -- V6 academic seed (subjects + grade periods) ---------------------------
  await seedV6ForTenant(ecole.id, '2025-2026');
  await seedV6ForTenant(maternelle.id, '2025-2026');

  // -- Classes -- only PRIMARY_SCHOOL (V4) -----------------------------------
  const cpAId = await seedClass(ecole.id, 'CP-A',  'CP',  '2025-2026');
  const ce1BId = await seedClass(ecole.id, 'CE1-B', 'CE1', '2025-2026');
  const ce2AId = await seedClass(ecole.id, 'CE2-A', 'CE2', '2025-2026');

  // -- Students -- realistic, ~50 split across 3 classes ---------------------
  const cpA = await seedStudents(ecole.id, 'CP-A', [
    ['Lina', 'Ben Ali'], ['Karim', 'Ben Ali'], ['Yacine', 'Mansour'], ['Maya', 'Trabelsi'],
    ['Adam', 'Hadj'], ['Sara', 'Belhaj'], ['Anis', 'Riahi'], ['Nour', 'Khaldi'],
    ['Inès', 'Bouaziz'], ['Rayan', 'Mejri'], ['Aya', 'Hammami'], ['Wassim', 'Lassoued'],
    ['Yasmine', 'Saidi'], ['Mehdi', 'Chaabane'], ['Sirine', 'Karoui'], ['Hamza', 'Jbeli'],
  ], undefined, cpAId);
  const ce1B = await seedStudents(ecole.id, 'CE1-B', [
    ['Iheb', 'Gharbi'], ['Emna', 'Sassi'], ['Mohamed', 'Ayari'], ['Amani', 'Jelassi'],
    ['Oussama', 'Nasri'], ['Farah', 'Brahim'], ['Bilel', 'Ouni'], ['Asma', 'Ferchichi'],
    ['Chedi', 'Baccouche'], ['Maram', 'Sghaier'], ['Slim', 'Toumi'], ['Khaoula', 'Guesmi'],
    ['Montassar', 'Khelil'], ['Bochra', 'Aouadi'], ['Aymen', 'Dridi'], ['Salima', 'Largueche'],
  ], undefined, ce1BId);
  const ce2A = await seedStudents(ecole.id, 'CE2-A', [
    ['Tarek', 'Trabelsi'], ['Lilia', 'Bouaziz'], ['Skander', 'Ben Hassine'], ['Mariem', 'Mejri'],
    ['Aziz', 'Lassoued'], ['Nadia', 'Hammami'], ['Bilel', 'Karoui'], ['Donia', 'Jbeli'],
    ['Hatem', 'Saidi'], ['Ines', 'Khaldi'], ['Walid', 'Riahi'], ['Habiba', 'Chaabane'],
  ], undefined, ce2AId);

  // -- Parents -- one PARENT user per student, linked idempotently -----------
  const parentLinks = await seedParentLinks(ecole.id, [...cpA, ...ce1B, ...ce2A], passwordHash);

  // -- Academic life (teachers, timetable, grades, attendance, announcements,
  //    invoices) so the SCHOOL_ADMIN dashboard is coherent (primary school).
  await seedAcademicLife(
    ecole.id,
    [
      { id: cpAId, name: 'CP-A', students: cpA },
      { id: ce1BId, name: 'CE1-B', students: ce1B },
      { id: ce2AId, name: 'CE2-A', students: ce2A },
    ],
    '2025-2026',
  );

  // -- Maternelle (KINDERGARTEN) — classes + children + families -------------
  // So journal, activités, cantine, transport, santé are demoable on the KG too.
  const matPSId = await seedClass(maternelle.id, 'Petite Section', 'PS', '2025-2026');
  const matGSId = await seedClass(maternelle.id, 'Grande Section', 'GS', '2025-2026');
  const matPS = await seedStudents(
    maternelle.id,
    'Petite Section',
    [
      ['Aziz', 'Gharbi'], ['Maryam', 'Trabelsi'], ['Youssef', 'Khelifi'], ['Nour', 'Bouazizi'],
      ['Rayan', 'Hamdi'], ['Lina', 'Marzouki'], ['Adam', 'Zouari'],
    ],
    'demo-maternelle.klasso.tn',
    matPSId,
  );
  const matGS = await seedStudents(
    maternelle.id,
    'Grande Section',
    [
      ['Sami', 'Ben Romdhane'], ['Eya', 'Cherni'], ['Hedi', 'Mansour'], ['Selim', 'Khaldi'],
      ['Mariem', 'Brahmi'], ['Aymen', 'Saadaoui'], ['Farah', 'Nasri'],
    ],
    'demo-maternelle.klasso.tn',
    matGSId,
  );
  const maternelleParentLinks = await seedParentLinks(
    maternelle.id,
    [...matPS, ...matGS],
    passwordHash,
  );

  // -- Academic life for the kindergarten (attendance, announcements, invoices;
  //    grades/timetable are light for KG but the function is shared & idempotent).
  await seedAcademicLife(
    maternelle.id,
    [
      { id: matPSId, name: 'Petite Section', students: matPS },
      { id: matGSId, name: 'Grande Section', students: matGS },
    ],
    '2025-2026',
  );

  // -- Devoirs (TAF) -- devoirs + rendus variés sur la 1re classe ------------
  await seedHomework(ecole.id);
  await seedHomework(maternelle.id);

  // -- Démo parent -- rattache le parent de démo à ses premiers enfants -------
  // (ces élèves ont déjà notes/présences/EDT/factures/devoirs via les seeds).
  await linkDemoParentToChildren(ecole.id, 'parent@demo-ecole.klasso.tn', cpA);
  await linkDemoParentToChildren(maternelle.id, 'parent@demo-maternelle.klasso.tn', matPS);

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
  // Opt-in only: fake prospects must never pollute the production pipeline.
  if (seedDemoContent) {
    await seedDemoRequests(prisma, superAdmin.id);
  }

  console.log('');
  console.log(
    `Demo data seeded successfully (T2a): ${parentLinks + maternelleParentLinks} new parent link(s) ` +
      `(école ${parentLinks}, maternelle ${maternelleParentLinks}).`,
  );
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
  console.log(`  Super-admin (réel, non-démo): support@klasso.tn`);
  if (seedDemoContent) {
    console.log(`  Commercial : commercial@klasso.tn`);
    console.log(`  Pending org (commercial pipeline): ${pendingOrg.slug}`);
  }
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
