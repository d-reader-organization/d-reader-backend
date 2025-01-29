-- AlterTable
ALTER TABLE "WheelRewardReceipt" 
ADD COLUMN "amount" INTEGER,
ADD COLUMN "dropName" TEXT NOT NULL DEFAULT '';

-- UpdateTable set amount = 0
UPDATE "WheelRewardReceipt" SET "amount" = 0;

-- AlterTable
ALTER TABLE "WheelRewardReceipt" ALTER COLUMN "amount" SET NOT NULL;
