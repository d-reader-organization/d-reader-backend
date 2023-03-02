/*
  Warnings:

  - The primary key for the `CandyMachineReceipt` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CandyMachineReceipt` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CandyMachineReceipt" DROP CONSTRAINT "CandyMachineReceipt_nftAddress_fkey";

-- AlterTable
ALTER TABLE "CandyMachineReceipt" DROP CONSTRAINT "CandyMachineReceipt_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "CandyMachineReceipt_pkey" PRIMARY KEY ("nftAddress");

-- AddForeignKey
ALTER TABLE "CandyMachineReceipt" ADD CONSTRAINT "CandyMachineReceipt_nftAddress_fkey" FOREIGN KEY ("nftAddress") REFERENCES "Nft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
