-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "classId" TEXT;

-- AlterTable
ALTER TABLE "daily_log_entries" ADD COLUMN     "photoUrl" TEXT;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
