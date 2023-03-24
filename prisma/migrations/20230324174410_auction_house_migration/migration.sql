/*
  Warnings:

  - Added the required column `collectionUri` to the `Nft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Nft" ADD COLUMN     "collectionUri" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Metadata" (
    "collectionUri" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "isSigned" BOOLEAN,
    "isMint" BOOLEAN,

    CONSTRAINT "Metadata_pkey" PRIMARY KEY ("collectionUri")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "collectionUri" TEXT NOT NULL,
    "nftAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "feePayer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_nftAddress_canceledAt_key" ON "Listing"("nftAddress", "canceledAt");

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_collectionUri_fkey" FOREIGN KEY ("collectionUri") REFERENCES "Metadata"("collectionUri") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_collectionUri_fkey" FOREIGN KEY ("collectionUri") REFERENCES "Metadata"("collectionUri") ON DELETE RESTRICT ON UPDATE CASCADE;
