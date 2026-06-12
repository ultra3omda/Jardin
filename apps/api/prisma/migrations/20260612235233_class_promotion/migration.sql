-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'ALUMNI');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "class_promotion_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromYear" TEXT NOT NULL,
    "toYear" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "executedById" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_promotion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_promotion_logs_tenantId_toYear_idx" ON "class_promotion_logs"("tenantId", "toYear");

-- AddForeignKey
ALTER TABLE "class_promotion_logs" ADD CONSTRAINT "class_promotion_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
