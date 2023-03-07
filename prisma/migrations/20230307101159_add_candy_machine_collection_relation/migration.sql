/*
  Warnings:

  - Added the required column `collectionNftAddress` to the `CandyMachine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandyMachine" ADD COLUMN     "collectionNftAddress" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "CandyMachine" ADD CONSTRAINT "CandyMachine_collectionNftAddress_fkey" FOREIGN KEY ("collectionNftAddress") REFERENCES "CollectionNft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
