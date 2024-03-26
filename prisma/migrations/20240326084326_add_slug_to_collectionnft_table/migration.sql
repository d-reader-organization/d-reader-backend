-- AlterTable
ALTER TABLE "CollectionNft" ADD COLUMN "slug" TEXT;
UPDATE "CollectionNft" SET "slug" = "address" WHERE "slug" IS NULL;
ALTER TABLE "CollectionNft" ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX "CollectionNft_slug_key" ON "CollectionNft"("slug");