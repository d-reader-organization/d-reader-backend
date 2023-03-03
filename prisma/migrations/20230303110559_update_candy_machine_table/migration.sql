/*
  Warnings:

  - You are about to drop the column `buyer` on the `CandyMachineReceipt` table. All the data in the column will be lost.
  - You are about to drop the column `owner` on the `Nft` table. All the data in the column will be lost.
  - Added the required column `baseMintPrice` to the `CandyMachine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyerAddress` to the `CandyMachineReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerAddress` to the `Nft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandyMachine" ADD COLUMN     "baseMintPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "endsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CandyMachineReceipt" DROP COLUMN "buyer",
ADD COLUMN     "buyerAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Nft" DROP COLUMN "owner",
ADD COLUMN     "ownerAddress" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineReceipt" ADD CONSTRAINT "CandyMachineReceipt_buyerAddress_fkey" FOREIGN KEY ("buyerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
