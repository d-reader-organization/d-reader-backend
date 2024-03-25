/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `CollectionNft` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `CollectionNft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CollectionNft" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CollectionNft_slug_key" ON "CollectionNft"("slug");
