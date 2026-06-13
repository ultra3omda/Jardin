-- CreateEnum
CREATE TYPE "AnnouncementKind" AS ENUM ('NEWS', 'CIRCULAIRE');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('VACATION', 'HOLIDAY', 'EVENT', 'EXAM', 'MEETING');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "kind" "AnnouncementKind" NOT NULL DEFAULT 'NEWS';

-- CreateTable
CREATE TABLE "school_calendar_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_calendar_events_tenantId_schoolYear_startDate_idx" ON "school_calendar_events"("tenantId", "schoolYear", "startDate");

-- AddForeignKey
ALTER TABLE "school_calendar_events" ADD CONSTRAINT "school_calendar_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
