/*
  Warnings:

  - You are about to drop the column `label` on the `Wallet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Wallet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "label",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "referralsRemaining" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referredAt" TIMESTAMP(3),
ADD COLUMN     "referrerAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_key" ON "Wallet"("name");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_referrerAddress_fkey" FOREIGN KEY ("referrerAddress") REFERENCES "Wallet"("address") ON DELETE SET NULL ON UPDATE CASCADE;
