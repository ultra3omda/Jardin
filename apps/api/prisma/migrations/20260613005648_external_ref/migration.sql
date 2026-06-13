-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "externalRef" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "externalRef" TEXT;

-- CreateIndex
CREATE INDEX "Payment_externalRef_idx" ON "Payment"("externalRef");

-- CreateIndex
CREATE INDEX "students_tenantId_externalRef_idx" ON "students"("tenantId", "externalRef");

-- CreateIndex
CREATE INDEX "users_tenantId_externalRef_idx" ON "users"("tenantId", "externalRef");
