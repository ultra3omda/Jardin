-- V10: Add Expo push token and notification preference columns to users table
-- expoPushToken: nullable, stores the ExponentPushToken[...] string
-- pushEnabled: per-user toggle for mobile push delivery
-- emailNotificationsEnabled: per-user toggle for email delivery

ALTER TABLE "users" ADD COLUMN "expoPushToken" TEXT;
ALTER TABLE "users" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
