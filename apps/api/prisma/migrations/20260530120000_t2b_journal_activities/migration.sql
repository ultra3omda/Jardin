-- CreateEnum
CREATE TYPE "ChildMood" AS ENUM ('HAPPY', 'CALM', 'TIRED', 'UPSET', 'SICK');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('ART', 'MUSIC', 'SPORT', 'OUTING', 'OTHER');

-- CreateTable
CREATE TABLE "daily_log_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meals" VARCHAR(200),
    "nap" VARCHAR(200),
    "mood" "ChildMood",
    "bathroom" VARCHAR(200),
    "activitiesNote" TEXT,
    "generalNote" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "daily_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "category" "ActivityCategory" NOT NULL DEFAULT 'OTHER',
    "scheduledAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "location" VARCHAR(160),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_participations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_participations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_daily_log_per_day" ON "daily_log_entries"("tenantId", "studentId", "date");
CREATE INDEX "daily_log_entries_tenantId_date_idx" ON "daily_log_entries"("tenantId", "date");
CREATE INDEX "daily_log_entries_tenantId_studentId_idx" ON "daily_log_entries"("tenantId", "studentId");
CREATE INDEX "activities_tenantId_idx" ON "activities"("tenantId");
CREATE UNIQUE INDEX "unique_participation" ON "activity_participations"("activityId", "studentId");
CREATE INDEX "activity_participations_tenantId_activityId_idx" ON "activity_participations"("tenantId", "activityId");

-- AddForeignKey
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_log_entries" ADD CONSTRAINT "daily_log_entries_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_participations" ADD CONSTRAINT "activity_participations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
