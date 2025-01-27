/*
  Warnings:

  - Added the required column `wheelId` to the `WheelRewardReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WheelRewardReceipt" ADD COLUMN     "wheelId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "WheelRewardReceipt" ADD CONSTRAINT "WheelRewardReceipt_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "Wheel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
