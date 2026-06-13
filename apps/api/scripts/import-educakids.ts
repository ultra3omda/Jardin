/**
 * Import EducaKids → Klasso (socle élèves/profs + paiements).
 *
 * Idempotent & rejouable via `externalRef`. Mode `--dry-run` obligatoire avant
 * tout import réel (collisions de noms arabes translittérés, `sex` absent de
 * l'extraction). Données de MINEURS — exécuter uniquement sur le tenant cible,
 * jamais committer la sortie (output/ est gitignored).
 *
 * Usage (depuis apps/api, .env rempli) :
 *   tsx scripts/import-educakids.ts --tenant <ID> --phase all --dry-run
 *   tsx scripts/import-educakids.ts --tenant <ID> --phase classes
 *   ... teachers | students | payments
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { createId } from '@paralleldrive/cuid2';
import { PrismaClient, Sex } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { parseAmount, parseClassLabel, parseLegacyDate, splitName } from '../src/imports/educakids/parse';
import { dedupeParentsByPhone, matchPaymentToStudent, StudentRow } from '../src/imports/educakids/reconcile';

const DATA_DIR = join(__dirname, '../../../tools/educakids-export/output/data');
const SCHOOL_YEAR = '2025-2026';
const EMAIL_DOMAIN = 'import.klasso.tn';

const args = process.argv.slice(2);
const arg = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const tenantId = arg('--tenant');
const phase = arg('--phase') ?? 'all';
const dryRun = args.includes('--dry-run');
const defaultSex: Sex = (arg('--default-sex') as Sex) ?? Sex.F;

if (!tenantId) {
  console.error('Usage: import-educakids.ts --tenant <ID> [--phase all|classes|teachers|students|payments] [--dry-run] [--default-sex M|F]');
  process.exit(1);
}

const prisma = new PrismaClient();
const load = (f: string): unknown[] => JSON.parse(readFileSync(join(DATA_DIR, f), 'utf-8'));

const report = {
  mode: dryRun ? 'DRY-RUN (aucune écriture)' : 'IMPORT RÉEL',
  tenantId,
  classes: 0,
  teachers: 0,
  parents: 0,
  students: 0,
  payments: 0,
  skipped: 0,
  unmatchedPayments: [] as string[],
  notes: [] as string[],
};

async function importClasses(students: StudentRow[]): Promise<void> {
  const seen = new Map<string, { level: string; name: string }>();
  for (const s of students) seen.set(s.class_label, parseClassLabel(s.class_label));
  for (const c of seen.values()) {
    report.classes++;
    if (dryRun) continue;
    await prisma.class.upsert({
      where: { unique_class_per_year: { tenantId: tenantId!, schoolYear: SCHOOL_YEAR, name: c.name } },
      create: { id: createId(), tenantId: tenantId!, name: c.name, level: c.level, schoolYear: SCHOOL_YEAR },
      update: {},
    });
  }
}

async function importTeachers(teachers: Record<string, string>[]): Promise<void> {
  for (const t of teachers) {
    const ext = `ek-teacher-${t['CIN'] || t['Numéro de téléphone'] || createId()}`;
    const exists = await prisma.user.findFirst({ where: { tenantId: tenantId!, externalRef: ext } });
    if (exists) { report.skipped++; continue; }
    report.teachers++;
    if (dryRun) continue;
    await prisma.user.create({
      data: {
        id: createId(),
        tenantId: tenantId!,
        role: 'TEACHER',
        externalRef: ext,
        firstName: (t['Prénom'] ?? '').trim() || 'Enseignant',
        lastName: (t['Nom'] ?? '').trim(),
        email: (t['Email'] ?? '').trim() || `teacher-${createId()}@${EMAIL_DOMAIN}`,
        phone: t['Numéro de téléphone'] ?? null,
        passwordHash: await bcrypt.hash(createId(), 12),
        emailVerifiedAt: new Date(),
      },
    });
  }
}

async function importStudents(students: StudentRow[]): Promise<void> {
  const byPhone = dedupeParentsByPhone(students);
  const parentByPhone = new Map<string, string>();

  for (const phone of byPhone.keys()) {
    const ext = `ek-parent-${phone}`;
    let parent = await prisma.user.findFirst({ where: { tenantId: tenantId!, externalRef: ext } });
    report.parents++;
    if (!parent && !dryRun) {
      parent = await prisma.user.create({
        data: {
          id: createId(),
          tenantId: tenantId!,
          role: 'PARENT',
          externalRef: ext,
          firstName: 'Parent',
          lastName: phone,
          email: `parent-${phone}@${EMAIL_DOMAIN}`,
          phone,
          passwordHash: await bcrypt.hash(createId(), 12),
        },
      });
    }
    if (parent) parentByPhone.set(phone, parent.id);
  }

  for (const s of students) {
    const ext = `ek-student-${s.student_id}`;
    const exists = await prisma.student.findFirst({ where: { tenantId: tenantId!, externalRef: ext } });
    if (exists) { report.skipped++; continue; }
    report.students++;
    if (dryRun) continue;
    const { firstName, lastName } = splitName(s.name);
    const { name: className } = parseClassLabel(s.class_label);
    const cls = await prisma.class.findFirst({ where: { tenantId: tenantId!, schoolYear: SCHOOL_YEAR, name: className } });
    const phone = (s.phone ?? '').replace(/\s/g, '');
    const parentEmail = phone ? `parent-${phone}@${EMAIL_DOMAIN}` : `unknown-${createId()}@${EMAIL_DOMAIN}`;
    const student = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantId!,
        externalRef: ext,
        firstName,
        lastName,
        dateOfBirth: new Date(s.birth_date as unknown as string),
        sex: s.sex === 'M' || s.sex === 'F' ? (s.sex as Sex) : defaultSex,
        classroom: className,
        classId: cls?.id ?? null,
        parentEmail,
      },
    });
    const parentId = phone ? parentByPhone.get(phone) : undefined;
    if (parentId) {
      await prisma.parentStudent.create({
        data: {
          id: createId(),
          tenantId: tenantId!,
          parentUserId: parentId,
          studentId: student.id,
          relationType: 'LEGAL_GUARDIAN',
          isPrimaryContact: true,
        },
      });
    }
  }
}

async function importPayments(students: StudentRow[], cash: Record<string, string>[], cheque: Record<string, string>[]): Promise<void> {
  // 1re ligne de chaque export = en-tête → slice(1).
  const rows = [
    ...cash.slice(1).map((r, i) => ({ src: 'cash', i, name: r['Espece null   null'], niveau: r.col1, classe: r.col2, amount: r.col3, frais: r.col4, mois: r.col5, method: 'cash', date: r.col7, ref: null as string | null })),
    ...cheque.slice(1).map((r, i) => ({ src: 'cheque', i, name: r.col0, niveau: r.col1, classe: r.col2, amount: r.col3, frais: r.col4, mois: r.col5, method: 'cheque', date: r.col8, ref: r.col7 ?? null })),
  ];

  for (const row of rows) {
    const sid = matchPaymentToStudent({ name: row.name, niveau: row.niveau, classe: row.classe }, students);
    if (!sid) { report.unmatchedPayments.push(`${row.name} / ${row.classe}`); continue; }
    const ext = `ek-pay-${row.src}-${row.i}`;
    const exists = await prisma.invoice.findFirst({ where: { tenantId: tenantId!, externalRef: ext } });
    if (exists) { report.skipped++; continue; }
    report.payments++;
    if (dryRun) continue;
    const student = await prisma.student.findFirst({ where: { tenantId: tenantId!, externalRef: `ek-student-${sid}` } });
    if (!student) continue;
    const amount = parseAmount(row.amount);
    const paidAt = parseLegacyDate(row.date);
    const invoiceId = createId();
    await prisma.invoice.create({
      data: {
        id: invoiceId,
        tenantId: tenantId!,
        externalRef: ext,
        studentId: student.id,
        title: `${row.frais} — ${row.mois}`,
        amount,
        currency: 'TND',
        status: 'PAID',
        dueDate: paidAt,
        paidAt,
      },
    });
    await prisma.payment.create({
      data: {
        id: createId(),
        externalRef: ext,
        invoiceId,
        amount,
        method: row.method,
        reference: row.ref,
        paidAt,
      },
    });
  }
}

async function main(): Promise<void> {
  const students = load('students.json') as StudentRow[];
  const teachers = load('export_ExportteacherFile.json') as Record<string, string>[];
  const cash = load('export_ExportExcel.json') as Record<string, string>[];
  const cheque = load('export_ExportExcel2.json') as Record<string, string>[];

  const withSex = students.filter((s) => s.sex === 'M' || s.sex === 'F').length;
  report.notes.push(`sex re-scrapé depuis EducaKids : ${withSex}/${students.length} (genre exact) ; le reste → défaut "${defaultSex}".`);
  report.notes.push(`parentEmail synthétique déterministe (parent-<phone>@${EMAIL_DOMAIN}).`);

  if (phase === 'all' || phase === 'classes') await importClasses(students);
  if (phase === 'all' || phase === 'teachers') await importTeachers(teachers);
  if (phase === 'all' || phase === 'students') await importStudents(students);
  if (phase === 'all' || phase === 'payments') await importPayments(students, cash, cheque);

  console.log(`\n===== ${report.mode} =====`);
  console.log(JSON.stringify({ ...report, unmatchedPaymentsCount: report.unmatchedPayments.length }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
