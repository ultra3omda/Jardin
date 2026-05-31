-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'ISSUED');

-- CreateEnum
CREATE TYPE "PayslipComponentKind" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "baseSalary" DECIMAL(10,3) NOT NULL,
    "grossSalary" DECIMAL(10,3) NOT NULL,
    "totalDeductions" DECIMAL(10,3) NOT NULL,
    "netSalary" DECIMAL(10,3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "label" VARCHAR(160) NOT NULL,
    "kind" "PayslipComponentKind" NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payslip_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payslips_tenantId_idx" ON "payslips"("tenantId");

-- CreateIndex
CREATE INDEX "payslips_tenantId_userId_idx" ON "payslips"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_tenantId_userId_period_key" ON "payslips"("tenantId", "userId", "period");

-- CreateIndex
CREATE INDEX "payslip_components_tenantId_idx" ON "payslip_components"("tenantId");

-- CreateIndex
CREATE INDEX "payslip_components_tenantId_payslipId_idx" ON "payslip_components"("tenantId", "payslipId");

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_components" ADD CONSTRAINT "payslip_components_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_components" ADD CONSTRAINT "payslip_components_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
