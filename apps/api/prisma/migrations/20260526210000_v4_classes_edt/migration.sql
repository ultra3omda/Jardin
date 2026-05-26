-- V4 — Classes + Teachers assignments + EDT (recurring weekly slots, D31)

CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "classes_tenantId_schoolYear_name_key" ON "classes"("tenantId", "schoolYear", "name");
CREATE INDEX "classes_tenantId_schoolYear_idx" ON "classes"("tenantId", "schoolYear");

ALTER TABLE "classes" ADD CONSTRAINT "classes_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "class_teachers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "isMainTeacher" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_teachers_classId_teacherUserId_subject_key" ON "class_teachers"("classId", "teacherUserId", "subject");
CREATE INDEX "class_teachers_tenantId_idx" ON "class_teachers"("tenantId");
CREATE INDEX "class_teachers_classId_idx" ON "class_teachers"("classId");
CREATE INDEX "class_teachers_teacherUserId_idx" ON "class_teachers"("teacherUserId");

ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacherUserId_fkey"
    FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "teacherUserId" TEXT,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_slots_tenantId_idx" ON "time_slots"("tenantId");
CREATE INDEX "time_slots_classId_dayOfWeek_idx" ON "time_slots"("classId", "dayOfWeek");
CREATE INDEX "time_slots_teacherUserId_idx" ON "time_slots"("teacherUserId");

ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_teacherUserId_fkey"
    FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
