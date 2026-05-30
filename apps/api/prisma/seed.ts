/* eslint-disable no-console */
import { randomBytes } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import {
  Locale,
  PrismaClient,
  RelationType,
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
