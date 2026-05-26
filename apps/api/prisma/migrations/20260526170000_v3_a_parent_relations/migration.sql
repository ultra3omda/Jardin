-- V3-A — Lien parent ↔ élève (N-N) via User(role=PARENT).
-- Modèle pivot ParentStudent + enum RelationType.

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('FATHER', 'MOTHER', 'LEGAL_GUARDIAN', 'OTHER');

-- CreateTable
CREATE TABLE "parent_students" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique parent+student, plus tenant/student/parent lookups)
CREATE UNIQUE INDEX "parent_students_parentUserId_studentId_key" ON "parent_students"("parentUserId", "studentId");
CREATE INDEX "parent_students_tenantId_idx" ON "parent_students"("tenantId");
CREATE INDEX "parent_students_studentId_idx" ON "parent_students"("studentId");
CREATE INDEX "parent_students_parentUserId_idx" ON "parent_students"("parentUserId");

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
