-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('NONE', 'PROVISIONING', 'ACTIVE', 'FAILED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "domainError" TEXT,
ADD COLUMN     "domainProvisionedAt" TIMESTAMP(3),
ADD COLUMN     "domainStatus" "DomainStatus" NOT NULL DEFAULT 'NONE';
