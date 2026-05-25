-- V2 — Module Élèves : Sex enum + Student model (15 champs)
-- Décision D24 (2026-05-25, voir spec V2).
-- Spec  : docs/superpowers/specs/2026-05-25-v2-eleves-module-design.md
-- Plan  : docs/superpowers/plans/2026-05-25-v2-eleves-module.md
--
-- Additive only. Première entité métier post-V1.8 tenant-provisioning.
-- Multi-tenant : auto-scoped via tenant.extension TENANT_SCOPED_MODELS.

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "nationality" TEXT,
    "classroom" TEXT NOT NULL,
    "enrollmentDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousSchooling" TEXT,
    "parentEmail" TEXT NOT NULL,
    "siblingsCount" INTEGER NOT NULL DEFAULT 0,
    "addressLine" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'TN',
    "motherTongue" TEXT,
    "medicalNotes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_tenantId_lastName_idx" ON "students"("tenantId", "lastName");

-- CreateIndex
CREATE INDEX "students_tenantId_classroom_idx" ON "students"("tenantId", "classroom");

-- CreateIndex
CREATE INDEX "students_tenantId_parentEmail_idx" ON "students"("tenantId", "parentEmail");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
