/*
  Warnings:

  - You are about to drop the column `slug` on the `CollectionNft` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CollectionNft_slug_key";

-- AlterTable
ALTER TABLE "CollectionNft" DROP COLUMN "slug";
