-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "emoji" TEXT;

-- RenameIndex
ALTER INDEX "unique_participation" RENAME TO "activity_participations_activityId_studentId_key";

-- RenameIndex
ALTER INDEX "unique_attendance_per_day" RENAME TO "attendance_tenantId_studentId_date_key";

-- RenameIndex
ALTER INDEX "unique_canteen_menu_per_day" RENAME TO "canteen_menus_tenantId_date_key";

-- RenameIndex
ALTER INDEX "unique_daily_log_per_day" RENAME TO "daily_log_entries_tenantId_studentId_date_key";

-- RenameIndex
ALTER INDEX "unique_health_record_per_student" RENAME TO "health_records_tenantId_studentId_key";

-- RenameIndex
ALTER INDEX "unique_meal_plan_per_student" RENAME TO "meal_plans_tenantId_studentId_key";

-- RenameIndex
ALTER INDEX "unique_transport_assignment" RENAME TO "transport_assignments_tenantId_studentId_routeId_direction_key";

