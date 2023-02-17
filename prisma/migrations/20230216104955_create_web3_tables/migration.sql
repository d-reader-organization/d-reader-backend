/*
  Warnings:

  - The primary key for the `ComicIssueNft` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `comicIssueId` on the `ComicIssueNft` table. All the data in the column will be lost.
  - You are about to drop the column `mint` on the `ComicIssueNft` table. All the data in the column will be lost.
  - Added the required column `address` to the `ComicIssueNft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `candyMachineAddress` to the `ComicIssueNft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collectionNftAddress` to the `ComicIssueNft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ComicIssueNft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner` to the `ComicIssueNft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uri` to the `ComicIssueNft` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ComicIssueNft" DROP CONSTRAINT "ComicIssueNft_comicIssueId_fkey";

-- AlterTable
ALTER TABLE "ComicIssueNft" DROP CONSTRAINT "ComicIssueNft_pkey",
DROP COLUMN "comicIssueId",
DROP COLUMN "mint",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "candyMachineAddress" TEXT NOT NULL,
ADD COLUMN     "collectionNftAddress" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "owner" TEXT NOT NULL,
ADD COLUMN     "uri" TEXT NOT NULL,
ADD CONSTRAINT "ComicIssueNft_pkey" PRIMARY KEY ("address");

-- CreateTable
CREATE TABLE "ComicIssueCandyMachine" (
    "address" TEXT NOT NULL,
    "mintAuthorityAddress" TEXT,
    "itemsAvailable" INTEGER NOT NULL,
    "itemsMinted" INTEGER NOT NULL,
    "itemsRemaining" INTEGER NOT NULL,
    "itemsLoaded" INTEGER NOT NULL,
    "isFullyLoaded" INTEGER NOT NULL,

    CONSTRAINT "ComicIssueCandyMachine_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "ComicIssueCollectionNft" (
    "address" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comicIssueId" INTEGER NOT NULL,

    CONSTRAINT "ComicIssueCollectionNft_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComicIssueCollectionNft_comicIssueId_key" ON "ComicIssueCollectionNft"("comicIssueId");

-- AddForeignKey
ALTER TABLE "ComicIssueNft" ADD CONSTRAINT "ComicIssueNft_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "ComicIssueCandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssueNft" ADD CONSTRAINT "ComicIssueNft_collectionNftAddress_fkey" FOREIGN KEY ("collectionNftAddress") REFERENCES "ComicIssueCollectionNft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssueCollectionNft" ADD CONSTRAINT "ComicIssueCollectionNft_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
