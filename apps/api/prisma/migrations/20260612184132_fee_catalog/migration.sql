-- CreateEnum
CREATE TYPE "FeeCategory" AS ENUM ('STANDARD', 'DIVERS', 'OPTIONNEL');

-- CreateEnum
CREATE TYPE "FeeRecurrence" AS ENUM ('ONCE', 'MONTHLY', 'TERM', 'YEARLY');

-- CreateEnum
CREATE TYPE "FeeAssignmentStatus" AS ENUM ('DUE', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "feeTypeId" TEXT;

-- CreateTable
CREATE TABLE "fee_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FeeCategory" NOT NULL,
    "defaultAmount" DECIMAL(10,3) NOT NULL,
    "recurrence" "FeeRecurrence" NOT NULL DEFAULT 'YEARLY',
    "level" TEXT,
    "schoolYear" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,3) NOT NULL,
    "advanceAmount" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "status" "FeeAssignmentStatus" NOT NULL DEFAULT 'DUE',
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_installments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "invoiceId" TEXT,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "toMasked" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL,
    "context" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_types_tenantId_schoolYear_category_idx" ON "fee_types"("tenantId", "schoolYear", "category");

-- CreateIndex
CREATE INDEX "fee_assignments_tenantId_status_idx" ON "fee_assignments"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_assignments_studentId_feeTypeId_schoolYear_key" ON "fee_assignments"("studentId", "feeTypeId", "schoolYear");

-- CreateIndex
CREATE INDEX "fee_installments_tenantId_dueDate_status_idx" ON "fee_installments"("tenantId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "sms_logs_tenantId_createdAt_idx" ON "sms_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_externalRef_idx" ON "Invoice"("tenantId", "externalRef");

-- AddForeignKey
ALTER TABLE "fee_types" ADD CONSTRAINT "fee_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assignments" ADD CONSTRAINT "fee_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assignments" ADD CONSTRAINT "fee_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assignments" ADD CONSTRAINT "fee_assignments_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "fee_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
