-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'APPOINTMENT';

-- CreateTable
CREATE TABLE "appointment_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_slots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "studentId" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_types_tenantId_active_idx" ON "appointment_types"("tenantId", "active");

-- CreateIndex
CREATE INDEX "appointment_slots_tenantId_staffUserId_startsAt_idx" ON "appointment_slots"("tenantId", "staffUserId", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_slots_tenantId_isBooked_startsAt_idx" ON "appointment_slots"("tenantId", "isBooked", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_slotId_key" ON "appointments"("slotId");

-- CreateIndex
CREATE INDEX "appointments_tenantId_parentUserId_idx" ON "appointments"("tenantId", "parentUserId");

-- CreateIndex
CREATE INDEX "appointments_tenantId_status_idx" ON "appointments"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_slots" ADD CONSTRAINT "appointment_slots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "appointment_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
