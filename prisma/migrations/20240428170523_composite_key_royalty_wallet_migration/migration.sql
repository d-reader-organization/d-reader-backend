/*
  Warnings:

  - A unique constraint covering the columns `[address,comicIssueId]` on the table `RoyaltyWallet` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RoyaltyWallet_address_key";

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyWallet_address_comicIssueId_key" ON "RoyaltyWallet"("address", "comicIssueId");
