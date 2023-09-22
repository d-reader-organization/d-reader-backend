/*
  Warnings:

  - You are about to drop the column `allowListSupply` on the `CandyMachineGroup` table. All the data in the column will be lost.
  - Added the required column `displayLabel` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandyMachineGroup" DROP COLUMN "allowListSupply",
ADD COLUMN     "displayLabel" TEXT NOT NULL;
