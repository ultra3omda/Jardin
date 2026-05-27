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
  await upsertUser({ tenantId: ecole.id, email: 'parent@demo-ecole.klasso.tn', firstName: 'Salma',   lastName: 'Ben Ali',  role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: ecole.id, email: 'staff@demo-ecole.klasso.tn',  firstName: 'Omar',    lastName: 'Mansour',  role: UserRole.STAFF,        passwordHash });

  await upsertUser({ tenantId: maternelle.id, email: 'admin@demo-maternelle.klasso.tn',  firstName: 'Yasmine', lastName: 'Trabelsi', role: UserRole.SCHOOL_ADMIN, passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'anim@demo-maternelle.klasso.tn',   firstName: 'Leila',   lastName: 'Marzouki', role: UserRole.TEACHER,      passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'parent@demo-maternelle.klasso.tn', firstName: 'Fatma',   lastName: 'Zouari',   role: UserRole.PARENT,       passwordHash });
  await upsertUser({ tenantId: maternelle.id, email: 'staff@demo-maternelle.klasso.tn',  firstName: 'Nour',    lastName: 'Hamdi',    role: UserRole.STAFF,        passwordHash });

  await upsertUser({ tenantId: null, email: 'super@klasso.tn', firstName: 'Super', lastName: 'Admin', role: UserRole.SUPER_ADMIN, passwordHash });

  // -- V6 academic seed (subjects + grade periods) ---------------------------
  await seedV6ForTenant(ecole.id, '2025-2026');
  await seedV6ForTenant(maternelle.id, '2025-2026');

  // -- Classes -- only PRIMARY_SCHOOL (V4) -----------------------------------
  await seedClass(ecole.id, 'CP-A',  'CP',  '2025-2026');
  await seedClass(ecole.id, 'CE1-B', 'CE1', '2025-2026');
  await seedClass(ecole.id, 'CE2-A', 'CE2', '2025-2026');

  // -- Students -- realistic, ~50 split across 3 classes ---------------------
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
  console.log('Demo data seeded successfully (V7).');
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
  console.log(`  Password (all accounts): ${password}`);
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
