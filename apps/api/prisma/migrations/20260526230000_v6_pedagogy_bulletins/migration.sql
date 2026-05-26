-- V6 — Pédagogie + Bulletins (Subject, GradePeriod, Evaluation, Grade, Bulletin)

-- ─── Subject ──────────────────────────────────────────────────────────────
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subjects_tenantId_name_key" ON "subjects"("tenantId", "name");
CREATE INDEX "subjects_tenantId_idx" ON "subjects"("tenantId");

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── GradePeriod ──────────────────────────────────────────────────────────
CREATE TABLE "grade_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grade_periods_tenantId_schoolYear_name_key" ON "grade_periods"("tenantId", "schoolYear", "name");
CREATE INDEX "grade_periods_tenantId_schoolYear_idx" ON "grade_periods"("tenantId", "schoolYear");

ALTER TABLE "grade_periods" ADD CONSTRAINT "grade_periods_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Evaluation ───────────────────────────────────────────────────────────
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "gradePeriodId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evaluations_tenantId_idx" ON "evaluations"("tenantId");
CREATE INDEX "evaluations_classId_gradePeriodId_idx" ON "evaluations"("classId", "gradePeriodId");
CREATE INDEX "evaluations_subjectId_idx" ON "evaluations"("subjectId");

ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_gradePeriodId_fkey"
    FOREIGN KEY ("gradePeriodId") REFERENCES "grade_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Grade ────────────────────────────────────────────────────────────────
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grades_evaluationId_studentId_key" ON "grades"("evaluationId", "studentId");
CREATE INDEX "grades_tenantId_idx" ON "grades"("tenantId");
CREATE INDEX "grades_studentId_idx" ON "grades"("studentId");

ALTER TABLE "grades" ADD CONSTRAINT "grades_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_evaluationId_fkey"
    FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Bulletin ─────────────────────────────────────────────────────────────
CREATE TABLE "bulletins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gradePeriodId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bulletins_studentId_gradePeriodId_key" ON "bulletins"("studentId", "gradePeriodId");
CREATE INDEX "bulletins_tenantId_idx" ON "bulletins"("tenantId");
CREATE INDEX "bulletins_gradePeriodId_idx" ON "bulletins"("gradePeriodId");

ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_gradePeriodId_fkey"
    FOREIGN KEY ("gradePeriodId") REFERENCES "grade_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_generatedById_fkey"
    FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
