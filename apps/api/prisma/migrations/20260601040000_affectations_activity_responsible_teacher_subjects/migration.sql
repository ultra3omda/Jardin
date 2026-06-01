-- Affectations — animateur responsable d'une activité + matières enseignées par un prof.

-- AlterTable — Activity gets an optional responsible teacher/animateur.
ALTER TABLE "activities" ADD COLUMN "responsibleUserId" TEXT;

-- CreateIndex
CREATE INDEX "activities_responsibleUserId_idx" ON "activities"("responsibleUserId");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable — teacher ↔ subject (declared teaching scope, N:N).
CREATE TABLE "teacher_subjects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_subjects_teacherUserId_subjectId_key" ON "teacher_subjects"("teacherUserId", "subjectId");

-- CreateIndex
CREATE INDEX "teacher_subjects_tenantId_idx" ON "teacher_subjects"("tenantId");

-- CreateIndex
CREATE INDEX "teacher_subjects_subjectId_idx" ON "teacher_subjects"("subjectId");

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_subjects" ADD CONSTRAINT "teacher_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
