-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ACTIVITY_REPORT';

-- CreateTable
CREATE TABLE "activity_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibleToParent" BOOLEAN NOT NULL DEFAULT true,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_reports_activityId_key" ON "activity_reports"("activityId");

-- CreateIndex
CREATE INDEX "activity_reports_tenantId_activityId_idx" ON "activity_reports"("tenantId", "activityId");

-- AddForeignKey
ALTER TABLE "activity_reports" ADD CONSTRAINT "activity_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_reports" ADD CONSTRAINT "activity_reports_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
