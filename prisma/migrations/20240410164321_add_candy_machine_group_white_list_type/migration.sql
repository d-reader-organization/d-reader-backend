/*
  Warnings:

  - You are about to drop the column `hasAllowList` on the `CandyMachineGroup` table. All the data in the column will be lost.
  - Added the required column `whiteListType` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WhiteListType" AS ENUM ('User', 'Public', 'WalletWhiteList', 'UserWhiteList');

-- AlterTable
-- Adding the new column "whiteListType" to the table
ALTER TABLE "CandyMachineGroup" ADD COLUMN "whiteListType" "WhiteListType";

-- Updating the values of "whiteListType" based on the value of "hasAllowList"
UPDATE "CandyMachineGroup" SET "whiteListType" = 'WalletWhiteList' WHERE "hasAllowList" IS true;
UPDATE "CandyMachineGroup" SET "whiteListType" = 'Public' WHERE "hasAllowList" IS false;

-- Dropping the old column "hasAllowList"
ALTER TABLE "CandyMachineGroup" DROP COLUMN "hasAllowList";

-- Setting the "whiteListType" column to NOT NULL
ALTER TABLE "CandyMachineGroup" ALTER COLUMN "whiteListType" SET NOT NULL;

-- CreateTable
CREATE TABLE "UserCandyMachineGroup" (
    "userId" INTEGER NOT NULL,
    "candyMachineGroupId" INTEGER NOT NULL,

    CONSTRAINT "UserCandyMachineGroup_pkey" PRIMARY KEY ("candyMachineGroupId","userId")
);

-- AddForeignKey
ALTER TABLE "UserCandyMachineGroup" ADD CONSTRAINT "UserCandyMachineGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCandyMachineGroup" ADD CONSTRAINT "UserCandyMachineGroup_candyMachineGroupId_fkey" FOREIGN KEY ("candyMachineGroupId") REFERENCES "CandyMachineGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
