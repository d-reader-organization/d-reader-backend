-- AlterEnum
BEGIN;
-- Rename the enum values
ALTER TYPE "WheelRewardType" RENAME VALUE 'Physicals' TO 'Physical';
ALTER TYPE "WheelRewardType" RENAME VALUE 'Fungibles' TO 'Fungible';

COMMIT;

-- AlterTable
ALTER TABLE "WheelReward" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '';
