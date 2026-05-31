-- Lot 3 — Relation réelle élève↔classe (FK) + matières par niveau.
-- `classroom` (texte) est conservé et reste synchronisé applicativement avec
-- `class.name`. `classId` devient la source de vérité pour les nouvelles features.

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "classId" TEXT;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "levels" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "students_tenantId_classId_idx" ON "students"("tenantId", "classId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data backfill — rattache chaque élève à la classe dont le `name` == `classroom`
-- (même tenant, classe non supprimée, année scolaire la plus récente en cas
-- d'homonymie entre années). Les élèves dont la classe n'existe pas restent NULL.
UPDATE "students" s
SET "classId" = (
  SELECT c."id"
  FROM "classes" c
  WHERE c."tenantId" = s."tenantId"
    AND c."name" = s."classroom"
    AND c."deletedAt" IS NULL
  ORDER BY c."schoolYear" DESC
  LIMIT 1
)
WHERE s."classroom" IS NOT NULL AND s."classroom" <> '';
