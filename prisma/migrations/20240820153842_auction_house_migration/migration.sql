-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('PrintEditionCollection', 'PrintEdition', 'OneOfOne', 'OneOfOneCollection', 'CollectibleComic', 'CollectibleComicCollection');

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

-- DropForeignKey
ALTER TABLE "Listing" DROP CONSTRAINT "Listing_assetAddress_fkey";

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
ALTER TABLE "CollectibleComic" ADD COLUMN "digitalAssetId" INTEGER;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN  "digitalAssetId" INTEGER,
ADD COLUMN     "splToken" TEXT,
ADD COLUMN     "type" "AssetType" ;

-- AlterTable
ALTER TABLE "RoyaltyWallet" ADD COLUMN "digitalAssetId" INTEGER;

-- DropTable
ALTER TABLE "Collection" RENAME TO "CollectibleComicCollection";
ALTER TABLE "CollectibleComicCollection" RENAME CONSTRAINT "Collection_pkey" TO "CollectibleComicCollection_pkey";
ALTER TABLE "CollectibleComicCollection" ADD COLUMN "digitalAssetId" INTEGER;

-- DropTable
ALTER TABLE "Metadata" RENAME TO "CollectibleComicMetadata";
ALTER TABLE "CollectibleComicMetadata" RENAME CONSTRAINT "Metadata_pkey" TO "CollectibleComicMetadata_pkey";

-- DigitalAsset
-- CreateTable
CREATE TABLE "DigitalAsset" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "ownerChangedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalAssetGenre" (
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "DigitalAssetGenre_pkey" PRIMARY KEY ("slug")
);

CREATE TABLE "_DigitalAssetToDigitalAssetGenre" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OneOfOneCollection" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "banner" TEXT NOT NULL DEFAULT '',
    "digitalAssetId" INTEGER NOT NULL,
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
    "digitalAssetId" INTEGER NOT NULL,
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
    "digitalAssetId" INTEGER NOT NULL,

    CONSTRAINT "DigitalAssetTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintEdition" (
    "address" TEXT NOT NULL,
    "collectionAddress" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "digitalAssetId" INTEGER NOT NULL,

    CONSTRAINT "PrintEdition_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "OneOfOne" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "digitalAssetId" INTEGER NOT NULL,
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
    "digitalAssetId" INTEGER NOT NULL,

    CONSTRAINT "DigitalAssetTrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleComicCollection_digitalAssetId_key" ON "CollectibleComicCollection"("digitalAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleComic_digitalAssetId_key" ON "CollectibleComic"("digitalAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleComicCollection_comicIssueId_key" ON "CollectibleComicCollection"("comicIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectibleComicMetadata_isUsed_isSigned_rarity_collectionA_key" ON "CollectibleComicMetadata"("isUsed", "isSigned", "rarity", "collectionAddress");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalAssetGenre_name_key" ON "DigitalAssetGenre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OneOfOneCollection_digitalAssetId_key" ON "OneOfOneCollection"("digitalAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintEditionCollection_digitalAssetId_key" ON "PrintEditionCollection"("digitalAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintEditionSaleConfig_collectionAddress_key" ON "PrintEditionSaleConfig"("collectionAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PrintEdition_digitalAssetId_key" ON "PrintEdition"("digitalAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "OneOfOne_digitalAssetId_key" ON "OneOfOne"("digitalAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyWallet_digitalAssetId_address_key" ON "RoyaltyWallet"("digitalAssetId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "_DigitalAssetToDigitalAssetGenre_AB_unique" ON "_DigitalAssetToDigitalAssetGenre"("A", "B");

-- CreateIndex
CREATE INDEX "_DigitalAssetToDigitalAssetGenre_B_index" ON "_DigitalAssetToDigitalAssetGenre"("B");

-- AddForeignKey
ALTER TABLE "RoyaltyWallet" ADD CONSTRAINT "RoyaltyWallet_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_uri_fkey" FOREIGN KEY ("uri") REFERENCES "CollectibleComicMetadata"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachine" ADD CONSTRAINT "CandyMachine_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "CollectibleComicCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAsset" ADD CONSTRAINT "DigitalAsset_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComicCollection" ADD CONSTRAINT "CollectibleComicCollection_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComicMetadata" ADD CONSTRAINT "CollectibleComicMetadata_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "CollectibleComicCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectibleComicCollection" ADD CONSTRAINT "CollectibleComicCollection_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOfOneCollection" ADD CONSTRAINT "OneOfOneCollection_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEditionCollection" ADD CONSTRAINT "PrintEditionCollection_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEditionSaleConfig" ADD CONSTRAINT "PrintEditionSaleConfig_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "PrintEditionCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAssetTag" ADD CONSTRAINT "DigitalAssetTag_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEdition" ADD CONSTRAINT "PrintEdition_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "PrintEditionCollection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintEdition" ADD CONSTRAINT "PrintEdition_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOfOne" ADD CONSTRAINT "OneOfOne_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOfOne" ADD CONSTRAINT "OneOfOne_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "OneOfOneCollection"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalAssetTrait" ADD CONSTRAINT "DigitalAssetTrait_digitalAssetId_fkey" FOREIGN KEY ("digitalAssetId") REFERENCES "DigitalAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DigitalAssetToDigitalAssetGenre" ADD CONSTRAINT "_DigitalAssetToDigitalAssetGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "DigitalAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DigitalAssetToDigitalAssetGenre" ADD CONSTRAINT "_DigitalAssetToDigitalAssetGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "DigitalAssetGenre"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$ 
DECLARE 
    comic RECORD;
    new_asset_id INT;
BEGIN
    FOR comic IN 
        SELECT "address", "ownerAddress", "ownerChangedAt"
        FROM "CollectibleComic" 
        WHERE "digitalAssetId" IS NULL
    LOOP
        -- Insert a new row into DigitalAsset
        INSERT INTO "DigitalAsset" ("ownerAddress","ownerChangedAt")
        VALUES (comic."ownerAddress",comic."ownerChangedAt")
        RETURNING id INTO new_asset_id;
        
        -- Update the corresponding CollectibleComic row with the new DigitalAsset id
        UPDATE "CollectibleComic"
        SET "digitalAssetId" = new_asset_id
        WHERE "address" = comic."address";
    END LOOP;
END $$;

-- Step 2: Update Listing table to link to the newly created DigitalAsset entries
UPDATE "Listing" AS l
SET "digitalAssetId" = cc."digitalAssetId" , "splToken"='So11111111111111111111111111111111111111112', "type"='CollectibleComic'
FROM "CollectibleComic" AS cc
WHERE l."assetAddress" = cc."address"
AND l."digitalAssetId" IS NULL;

-- Insert new rows in DigitalAsset and link to CollectibleComicCollection
DO $$ 
DECLARE 
    asset RECORD;
    new_asset_id INT;
BEGIN
    FOR asset IN 
        SELECT "address"
        FROM "CollectibleComicCollection" 
        WHERE "digitalAssetId" IS NULL
    LOOP
        -- Insert a new row into DigitalAsset
        INSERT INTO "DigitalAsset" ("ownerAddress","ownerChangedAt")
        VALUES ('FXj8W4m33SgLB5ZAg35g8wsqFTvywc6fmJTXzoQQhrVf',CURRENT_DATE) -- Change this value as per the environment treasury wallet
        RETURNING id INTO new_asset_id;
        
        -- Update the corresponding CollectibleComicCollection row with the new DigitalAsset id
        UPDATE "CollectibleComicCollection"
        SET "digitalAssetId" = new_asset_id
        WHERE "address" = asset."address";
    END LOOP;
END $$;

UPDATE "RoyaltyWallet" AS r
SET "digitalAssetId" = cc."digitalAssetId"
FROM "ComicIssue" AS ci JOIN "CollectibleComicCollection" cc ON ci.id=cc."comicIssueId"
WHERE r."comicIssueId" = ci.id;

ALTER TABLE "Listing" ALTER COLUMN "splToken" SET NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "digitalAssetId" SET NOT NULL;
ALTER TABLE "CollectibleComic" ALTER COLUMN "digitalAssetId" SET NOT NULL;
ALTER TABLE "CollectibleComicCollection" ALTER COLUMN "digitalAssetId" SET NOT NULL;

-- Drop Columns From CollectibleComic
ALTER TABLE "CollectibleComic" DROP COLUMN "ownerAddress";
ALTER TABLE "CollectibleComic" DROP COLUMN "ownerChangedAt";

-- Rename Column
ALTER TABLE "RoyaltyWallet" ALTER COLUMN "digitalAssetId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "RoyaltyWallet" DROP CONSTRAINT "RoyaltyWallet_comicIssueId_fkey";

-- DropIndex
DROP INDEX "RoyaltyWallet_address_comicIssueId_key";

-- Drop Column From  RoyaltyWallet
ALTER TABLE "RoyaltyWallet" DROP COLUMN "comicIssueId";
