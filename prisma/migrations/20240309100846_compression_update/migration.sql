/*
  Warnings:

  - A unique constraint covering the columns `[address,comicIssueId]` on the table `RoyaltyWallet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RoyaltyWallet_address_key";

-- AlterTable
ALTER TABLE "CandyMachine" ADD COLUMN     "compressed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "collectionAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyWallet_address_comicIssueId_key" ON "RoyaltyWallet"("address", "comicIssueId");
