-- CreateEnum
CREATE TYPE "MealRegime" AS ENUM ('STANDARD', 'VEGETARIAN', 'HALAL', 'NO_PORK', 'OTHER');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransportDirection" AS ENUM ('MORNING', 'EVENING', 'BOTH');

-- CreateTable
CREATE TABLE "canteen_menus" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "starter" VARCHAR(200),
    "main" VARCHAR(200),
    "dessert" VARCHAR(200),
    "vegetarian" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "canteen_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "regime" "MealRegime" NOT NULL DEFAULT 'STANDARD',
    "allergies" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_routes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "driverName" VARCHAR(160),
    "driverPhone" VARCHAR(40),
    "vehiclePlate" VARCHAR(20),
    "departureTime" VARCHAR(5) NOT NULL,
    "returnTime" VARCHAR(5),
    "status" "RouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "bus_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_stops" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "order" INTEGER NOT NULL,
    "pickupTime" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bus_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_assignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopId" TEXT,
    "direction" "TransportDirection" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "transport_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_canteen_menu_per_day" ON "canteen_menus"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "unique_meal_plan_per_student" ON "meal_plans"("tenantId", "studentId");

-- CreateIndex
CREATE INDEX "meal_plans_tenantId_idx" ON "meal_plans"("tenantId");

-- CreateIndex
CREATE INDEX "bus_routes_tenantId_idx" ON "bus_routes"("tenantId");

-- CreateIndex
CREATE INDEX "bus_stops_tenantId_routeId_idx" ON "bus_stops"("tenantId", "routeId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_transport_assignment" ON "transport_assignments"("tenantId", "studentId", "routeId", "direction");

-- CreateIndex
CREATE INDEX "transport_assignments_tenantId_routeId_idx" ON "transport_assignments"("tenantId", "routeId");

-- CreateIndex
CREATE INDEX "transport_assignments_tenantId_studentId_idx" ON "transport_assignments"("tenantId", "studentId");

-- AddForeignKey
ALTER TABLE "canteen_menus" ADD CONSTRAINT "canteen_menus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_routes" ADD CONSTRAINT "bus_routes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_stops" ADD CONSTRAINT "bus_stops_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_stops" ADD CONSTRAINT "bus_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "bus_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "bus_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_assignments" ADD CONSTRAINT "transport_assignments_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "bus_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
