-- DropForeignKey
ALTER TABLE "CandyMachine" DROP CONSTRAINT "CandyMachine_collectionAddress_fkey";

-- DropForeignKey
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_comicIssueId_fkey";

-- DropForeignKey
ALTER TABLE "DigitalAsset" DROP CONSTRAINT "DigitalAsset_candyMachineAddress_fkey";

-- DropForeignKey
ALTER TABLE "DigitalAsset" DROP CONSTRAINT "DigitalAsset_ownerAddress_fkey";

-- DropForeignKey
ALTER TABLE "DigitalAsset" DROP CONSTRAINT "DigitalAsset_uri_fkey";

-- Delete Listing rows
Delete FROM "Listing";

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_assetAddress_fkey";

-- DropIndex
DROP INDEX "Listing_assetAddress_canceledAt_key";

-- DropForeignKey
ALTER TABLE "Metadata" DROP CONSTRAINT "Metadata_collectionAddress_fkey";

-- AlterTable
ALTER TABLE "CandyMachine" ALTER COLUMN "standard" SET DEFAULT 'Core';

-- AlterTable
ALTER TABLE "CandyMachineReceipt" RENAME COLUMN "assetAddress" TO "collectibleComicAddress";

ALTER TABLE "CandyMachineReceipt" RENAME CONSTRAINT "CandyMachineReceipt_assetAddress_fkey" TO "CandyMachineReceipt_collectibleComicAddress_fkey";


-- CollectibleComic
-- RenameTable
ALTER TABLE "DigitalAsset" RENAME TO "CollectibleComic";
ALTER TABLE "CollectibleComic" RENAME CONSTRAINT "DigitalAsset_pkey" TO "CollectibleComic_pkey";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "canceledAt",
DROP COLUMN "feePayer",
DROP COLUMN "saleTransactionSignature",
DROP COLUMN "soldAt",
DROP COLUMN "symbol",
ADD COLUMN  "auctionHouseAddress" TEXT NOT NULL,
ADD COLUMN  "closedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN  "sellerAddress" TEXT NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "source" SET NOT NULL;

-- CreateTable
CREATE TABLE "ListingConfig" (
    "listingId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reservePrice" INTEGER NOT NULL DEFAULT 0,
    "minBidIncrement" INTEGER NOT NULL DEFAULT 0,
    "allowHighBidCancel" BOOLEAN NOT NULL DEFAULT false,
    "highestBidId" INTEGER
);

-- CreateTable
CREATE TABLE "AuctionSale" (
    "id" SERIAL NOT NULL,
    "signature" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "listingId" INTEGER NOT NULL,
    "bidId" INTEGER,
    "auctionHouseAddress" TEXT NOT NULL,

    CONSTRAINT "AuctionSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" SERIAL NOT NULL,
    "assetAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "bidderAddress" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "auctionHouseAddress" TEXT NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "RoyaltyWallet" ADD COLUMN "assetAddress" TEXT;

-- DropTable
ALTER TABLE "Collection" RENAME TO "CollectibleComicCollection";
ALTER TABLE "CollectibleComicCollection" RENAME CONSTRAINT "Collection_pkey" TO "CollectibleComicCollection_pkey";

-- DropTable
ALTER TABLE "Metadata" RENAME TO "CollectibleComicMetadata";
ALTER TABLE "CollectibleComicMetadata" RENAME CONSTRAINT "Metadata_pkey" TO "CollectibleComicMetadata_pkey";

-- DigitalAsset
-- CreateTable
CREATE TABLE "DigitalAsset" (
    "address" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "ownerChangedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalAsset_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "DigitalAssetGenre" (
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "DigitalAssetGenre_pkey" PRIMARY KEY ("slug")
);

CREATE TABLE "_DigitalAssetToDigitalAssetGenre" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OneOfOneCollection" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "banner" TEXT NOT NULL DEFAULT '',
    "sellerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "OneOfOneCollection_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "AuctionHouse" (
    "address" TEXT NOT NULL,
    "treasuryMint" TEXT NOT NULL,
    "sellerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "requiresSignOff" BOOLEAN NOT NULL,
    "canChangeSalePrice" BOOLEAN NOT NULL,

    CONSTRAINT "AuctionHouse_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "PrintEditionCollection" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "sellerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "isNSFW" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "PrintEditionCollection_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "PrintEditionSaleConfig" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "mintPrice" BIGINT NOT NULL,
    "currencyMint" TEXT NOT NULL,
    "itemsMinted" INTEGER NOT NULL DEFAULT 0,
    "supply" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "collectionAddress" TEXT NOT NULL,

    CONSTRAINT "PrintEditionSaleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalAssetTag" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "assetAddress" TEXT NOT NULL,

    CONSTRAINT "DigitalAssetTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintEdition" (
    "address" TEXT NOT NULL,
    "collectionAddress" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "PrintEdition_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "OneOfOne" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "collectionAddress" TEXT,
    "sellerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "isNSFW" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OneOfOne_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "DigitalAssetTrait" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "assetAddress" TEXT NOT NULL,

    CONSTRAINT "DigitalAssetTrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyWallet_assetAddress_address_key" ON "RoyaltyWallet"("assetAddress", "address");

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleComicCollection_comicIssueId_key" ON "CollectibleComicCollection"("comicIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleComicMetadata_isUsed_isSigned_rarity_collectionA_key" ON "CollectibleComicMetadata"("isUsed", "isSigned", "rarity", "collectionAddress");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalAssetGenre_name_key" ON "DigitalAssetGenre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PrintEditionSaleConfig_collectionAddress_key" ON "PrintEditionSaleConfig"("collectionAddress");

-- CreateIndex
CREATE UNIQUE INDEX "_DigitalAssetToDigitalAssetGenre_AB_unique" ON "_DigitalAssetToDigitalAssetGenre"("A", "B");

-- CreateIndex
CREATE INDEX "_DigitalAssetToDigitalAssetGenre_B_index" ON "_DigitalAssetToDigitalAssetGenre"("B");

-- CreateIndex
CREATE UNIQUE INDEX "ListingConfig_listingId_key" ON "ListingConfig"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionSale_listingId_key" ON "AuctionSale"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionSale_bidId_key" ON "AuctionSale"("bidId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_assetAddress_bidderAddress_closedAt_key" ON "Bid"("assetAddress", "bidderAddress", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionHouse_treasuryMint_key" ON "AuctionHouse"("treasuryMint");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_assetAddress_closedAt_key" ON "Listing"("assetAddress", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SplToken_address_key" ON "SplToken"("address");

-- Insert new rows in DigitalAsset from CollectibleComic
INSERT INTO "DigitalAsset" ("address", "ownerAddress", "ownerChangedAt")
SELECT "address", "ownerAddress", "ownerChangedAt"
FROM "CollectibleComic";

-- Insert new rows in DigitalAsset from CollectibleComicCollection
INSERT INTO "DigitalAsset" ("address", "ownerAddress", "ownerChangedAt")
SELECT cc."address", 'FXj8W4m33SgLB5ZAg35g8wsqFTvywc6fmJTXzoQQhrVf', CURRENT_DATE
FROM "CollectibleComicCollection" cc;

-- Update royalty wallet rows with assetAddress
UPDATE "RoyaltyWallet" AS r
SET "assetAddress" = cc."address"
FROM "ComicIssue" AS ci JOIN "CollectibleComicCollection" cc ON ci.id=cc."comicIssueId"
WHERE r."comicIssueId" = ci.id;

-- Drop Columns From CollectibleComic
ALTER TABLE "CollectibleComic" DROP COLUMN "ownerAddress";
ALTER TABLE "CollectibleComic" DROP COLUMN "ownerChangedAt";

-- Rename Column
ALTER TABLE "RoyaltyWallet" ALTER COLUMN "assetAddress" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "RoyaltyWallet" DROP CONSTRAINT "RoyaltyWallet_comicIssueId_fkey";

-- DropIndex
DROP INDEX "RoyaltyWallet_address_comicIssueId_key";

-- Drop Column From  RoyaltyWallet
ALTER TABLE "RoyaltyWallet" DROP COLUMN "comicIssueId";

-- AddForeignKey
ALTER TABLE "RoyaltyWallet" ADD CONSTRAINT "RoyaltyWallet_assetAddress_fkey" FOREIGN KEY ("assetAddress") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_uri_fkey" FOREIGN KEY ("uri") REFERENCES "CollectibleComicMetadata"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_address_fkey" FOREIGN KEY ("address") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachine" ADD CONSTRAINT "CandyMachine_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "CollectibleComicCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAsset" ADD CONSTRAINT "DigitalAsset_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComicCollection" ADD CONSTRAINT "CollectibleComicCollection_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComicMetadata" ADD CONSTRAINT "CollectibleComicMetadata_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "CollectibleComicCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComicCollection" ADD CONSTRAINT "CollectibleComicCollection_address_fkey" FOREIGN KEY ("address") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_assetAddress_fkey" FOREIGN KEY ("assetAddress") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOfOneCollection" ADD CONSTRAINT "OneOfOneCollection_address_fkey" FOREIGN KEY ("address") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEditionCollection" ADD CONSTRAINT "PrintEditionCollection_address_fkey" FOREIGN KEY ("address") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEditionSaleConfig" ADD CONSTRAINT "PrintEditionSaleConfig_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "PrintEditionCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAssetTag" ADD CONSTRAINT "DigitalAssetTag_assetAddress_fkey" FOREIGN KEY ("assetAddress") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEdition" ADD CONSTRAINT "PrintEdition_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "PrintEditionCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEdition" ADD CONSTRAINT "PrintEdition_address_fkey" FOREIGN KEY ("address") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOfOne" ADD CONSTRAINT "OneOfOne_address_fkey" FOREIGN KEY ("address") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOfOne" ADD CONSTRAINT "OneOfOne_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "OneOfOneCollection"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAssetTrait" ADD CONSTRAINT "DigitalAssetTrait_assetAddress_fkey" FOREIGN KEY ("assetAddress") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DigitalAssetToDigitalAssetGenre" ADD CONSTRAINT "_DigitalAssetToDigitalAssetGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "DigitalAsset"("address") ON DELETE CASCADE ON UPDATE CASCADE;
 
-- AddForeignKey
ALTER TABLE "_DigitalAssetToDigitalAssetGenre" ADD CONSTRAINT "_DigitalAssetToDigitalAssetGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "DigitalAssetGenre"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_auctionHouseAddress_fkey" FOREIGN KEY ("auctionHouseAddress") REFERENCES "AuctionHouse"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingConfig" ADD CONSTRAINT "ListingConfig_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionSale" ADD CONSTRAINT "AuctionSale_auctionHouseAddress_fkey" FOREIGN KEY ("auctionHouseAddress") REFERENCES "AuctionHouse"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_assetAddress_fkey" FOREIGN KEY ("assetAddress") REFERENCES "DigitalAsset"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionHouseAddress_fkey" FOREIGN KEY ("auctionHouseAddress") REFERENCES "AuctionHouse"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
