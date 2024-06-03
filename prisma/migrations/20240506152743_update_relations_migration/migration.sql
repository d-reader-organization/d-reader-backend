-- AlterTable
ALTER TABLE IF EXISTS "CandyMachine" RENAME COLUMN "collectionNftAddress" TO "collectionAddress";

-- AlterTable
ALTER TABLE IF EXISTS "CandyMachineReceipt" RENAME COLUMN "nftAddress" TO "assetAddress";

-- AlterTable
ALTER TABLE IF EXISTS "CollectionNft" RENAME TO "Collection";

-- AlterTable
ALTER TABLE IF EXISTS "Listing" RENAME COLUMN "nftAddress" TO "assetAddress";

-- AlterTable
ALTER TABLE IF EXISTS "Nft" RENAME TO "DigitalAsset";

-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN "collectionAddress" TEXT;

-- AlterTable
ALTER TABLE "Collection" RENAME CONSTRAINT "CollectionNft_pkey" TO "Collection_pkey";

-- AlterTable
ALTER TABLE "DigitalAsset" RENAME CONSTRAINT "Nft_pkey" TO "DigitalAsset_pkey";

-- RenameForeignKey
ALTER TABLE "CandyMachine" RENAME CONSTRAINT "CandyMachine_collectionNftAddress_fkey" TO "CandyMachine_collectionAddress_fkey";

-- RenameForeignKey
ALTER TABLE "CandyMachineReceipt" RENAME CONSTRAINT "CandyMachineReceipt_nftAddress_fkey" TO "CandyMachineReceipt_assetAddress_fkey";

-- RenameForeignKey
ALTER TABLE "Collection" RENAME CONSTRAINT "CollectionNft_comicIssueId_fkey" TO "Collection_comicIssueId_fkey";

-- RenameForeignKey
ALTER TABLE "DigitalAsset" RENAME CONSTRAINT "Nft_candyMachineAddress_fkey" TO "DigitalAsset_candyMachineAddress_fkey";

-- RenameForeignKey
ALTER TABLE "DigitalAsset" RENAME CONSTRAINT "Nft_ownerAddress_fkey" TO "DigitalAsset_ownerAddress_fkey";

-- RenameForeignKey
ALTER TABLE "DigitalAsset" RENAME CONSTRAINT "Nft_uri_fkey" TO "DigitalAsset_uri_fkey";

-- RenameForeignKey
ALTER TABLE "Listing" RENAME CONSTRAINT "Listing_nftAddress_fkey" TO "Listing_assetAddress_fkey";

-- RenameIndex
ALTER INDEX "CollectionNft_comicIssueId_key" RENAME TO "Collection_comicIssueId_key";

-- RenameIndex
ALTER INDEX "Listing_nftAddress_canceledAt_key" RENAME TO "Listing_assetAddress_canceledAt_key";

-- UpdateTable
UPDATE "Metadata" AS m
SET "collectionAddress" = d."collectionNftAddress"
FROM ( SELECT DISTINCT ON (m."collectionName") m."collectionName", d.uri FROM "Metadata" AS m INNER JOIN "DigitalAsset" AS d ON m.uri = d.uri) AS sub
INNER JOIN "DigitalAsset" AS d ON sub.uri = d.uri WHERE m."collectionName" = sub."collectionName";

-- AlterTable
ALTER TABLE "DigitalAsset" DROP COLUMN "collectionNftAddress";

-- AlterTable
ALTER TABLE "Metadata" ALTER COLUMN "collectionAddress" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Metadata_isUsed_isSigned_rarity_collectionAddress_key" ON "Metadata"("isUsed", "isSigned", "rarity", "collectionAddress");

-- AddForeignKey
ALTER TABLE "Metadata" ADD CONSTRAINT "Metadata_collectionAddress_fkey" FOREIGN KEY ("collectionAddress") REFERENCES "Collection"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
