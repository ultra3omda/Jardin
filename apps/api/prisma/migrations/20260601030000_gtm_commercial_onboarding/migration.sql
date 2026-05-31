-- GTM — Flux commercial : rôle COMMERCIAL, cycle de vie d'organisation
-- (onboarding bloquant) et contrats signés rattachés à la création d'une org.

-- AlterEnum — nouveau rôle plateforme COMMERCIAL (juste après SUPER_ADMIN).
ALTER TYPE "UserRole" ADD VALUE 'COMMERCIAL' AFTER 'SUPER_ADMIN';

-- CreateEnum — statut d'une organisation.
CREATE TYPE "TenantStatus" AS ENUM ('PENDING_ONBOARDING', 'ACTIVE', 'SUSPENDED');

-- AlterTable — statut + verrou d'onboarding sur les organisations.
ALTER TABLE "tenants"
  ADD COLUMN "status" "TenantStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING',
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill — les organisations existantes sont déjà opérationnelles : on les
-- marque ACTIVE et on considère leur onboarding terminé (date de création) afin
-- qu'elles ne soient pas redirigées de force vers le wizard de personnalisation.
UPDATE "tenants"
SET "status" = 'ACTIVE', "onboardingCompletedAt" = "createdAt"
WHERE "onboardingCompletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- AlterTable — une invitation peut être liée à une organisation déjà créée.
ALTER TABLE "invite_tokens" ADD COLUMN "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "invite_tokens_tenantId_idx" ON "invite_tokens"("tenantId");

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable — contrats signés (PDF stocké sur R2).
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
