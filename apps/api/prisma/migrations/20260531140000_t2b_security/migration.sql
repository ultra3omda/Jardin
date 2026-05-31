-- CreateEnum
CREATE TYPE "SecurityIncidentType" AS ENUM ('INTRUSION', 'THEFT', 'INJURY', 'FIRE', 'OTHER');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DrillType" AS ENUM ('FIRE', 'EARTHQUAKE', 'LOCKDOWN', 'OTHER');

-- CreateTable
CREATE TABLE "security_incidents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "SecurityIncidentType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'LOW',
    "location" VARCHAR(160),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reportedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitorName" VARCHAR(160) NOT NULL,
    "reason" VARCHAR(300),
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "badgeNumber" VARCHAR(40),
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "visitor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_drills" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "DrillType" NOT NULL,
    "conductedAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "safety_drills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_incidents_tenantId_idx" ON "security_incidents"("tenantId");

-- CreateIndex
CREATE INDEX "security_incidents_tenantId_status_idx" ON "security_incidents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "visitor_logs_tenantId_checkInAt_idx" ON "visitor_logs"("tenantId", "checkInAt");

-- CreateIndex
CREATE INDEX "safety_drills_tenantId_conductedAt_idx" ON "safety_drills"("tenantId", "conductedAt");

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_drills" ADD CONSTRAINT "safety_drills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_drills" ADD CONSTRAINT "safety_drills_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
