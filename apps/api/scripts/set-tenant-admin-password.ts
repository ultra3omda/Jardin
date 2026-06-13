/**
 * Définit (ou crée) un SCHOOL_ADMIN avec un mot de passe connu, pour un tenant
 * donné. Utile après un import (l'admin créé a un mot de passe aléatoire).
 *
 * Usage : tsx scripts/set-tenant-admin-password.ts --slug smiley --email <mail> --password <pw>
 */
import { createId } from '@paralleldrive/cuid2';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const arg = (n: string): string | undefined => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main(): Promise<void> {
  const slug = (arg('--slug') ?? '').toLowerCase();
  const email = (arg('--email') ?? '').toLowerCase();
  // Mot de passe via env (ADMIN_PASSWORD) pour ne pas l'exposer dans les logs CI.
  const password = process.env.ADMIN_PASSWORD ?? arg('--password') ?? '';
  if (!slug || !email || !password) {
    console.error('Usage: --slug <slug> --email <email> --password <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Le mot de passe doit faire au moins 8 caractères.');
    process.exit(1);
  }

  const tenant = await prisma.tenant.findFirst({ where: { slug } });
  if (!tenant) {
    console.error(`Tenant introuvable (slug=${slug}).`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({ where: { tenantId: tenant.id, email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: 'SCHOOL_ADMIN', emailVerifiedAt: new Date(), deletedAt: null },
    });
    console.log(`OK — mot de passe mis à jour pour ${email} (tenant ${tenant.name}).`);
  } else {
    await prisma.user.create({
      data: {
        id: createId(),
        tenantId: tenant.id,
        role: 'SCHOOL_ADMIN',
        email,
        firstName: 'Admin',
        lastName: tenant.name,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`OK — SCHOOL_ADMIN ${email} créé (tenant ${tenant.name}).`);
  }
  console.log(`Connexion : email=${email} sur l'app web.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
