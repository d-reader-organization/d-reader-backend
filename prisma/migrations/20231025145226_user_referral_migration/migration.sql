/*
  Warnings:

  - You are about to drop the column `rewardClaimedAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CandyMachineReceipt" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "rewardClaimedAt";

-- AddForeignKey
ALTER TABLE "CandyMachineReceipt" ADD CONSTRAINT "CandyMachineReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
