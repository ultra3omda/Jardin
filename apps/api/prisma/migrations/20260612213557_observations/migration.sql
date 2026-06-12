-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('LANGAGE', 'MOTRICITE', 'SOCIAL', 'AUTONOMIE', 'COGNITIF', 'ARTISTIQUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "ObservationMediaKind" AS ENUM ('PHOTO', 'VIDEO');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OBSERVATION';

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" "ObservationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "visibleToParent" BOOLEAN NOT NULL DEFAULT true,
    "batchId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observation_media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "kind" "ObservationMediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observation_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observations_tenantId_studentId_observedAt_idx" ON "observations"("tenantId", "studentId", "observedAt");

-- CreateIndex
CREATE INDEX "observations_tenantId_category_idx" ON "observations"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_media" ADD CONSTRAINT "observation_media_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observation_media" ADD CONSTRAINT "observation_media_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
