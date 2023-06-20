/*
  Warnings:

  - You are about to drop the column `signedCover` on the `ComicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `usedCover` on the `ComicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `usedSignedCover` on the `ComicIssue` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('Writer', 'Artist', 'Colorist', 'Editor', 'Letterer', 'CoverArtist');

-- CreateEnum
CREATE TYPE "ComicRarity" AS ENUM ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary');

-- AlterTable
ALTER TABLE "ComicIssue" DROP COLUMN "signedCover",
DROP COLUMN "usedCover",
DROP COLUMN "usedSignedCover";

-- AlterTable
ALTER TABLE "Metadata" ADD COLUMN     "rarity" "ComicRarity";

-- CreateTable
CREATE TABLE "ComicCollaborator" (
    "id" SERIAL NOT NULL,
    "role" "CollaboratorRole" NOT NULL,
    "name" TEXT NOT NULL,
    "comicSlug" TEXT NOT NULL,

    CONSTRAINT "ComicCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicIssueCollaborator" (
    "id" SERIAL NOT NULL,
    "role" "CollaboratorRole" NOT NULL,
    "name" TEXT NOT NULL,
    "comicIssueId" INTEGER NOT NULL,

    CONSTRAINT "ComicIssueCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatelessCover" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL,
    "rarity" "ComicRarity",
    "comicIssueId" INTEGER NOT NULL,
    "artist" TEXT NOT NULL,
    "share" INTEGER NOT NULL,

    CONSTRAINT "StatelessCover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatefulCover" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "isSigned" BOOLEAN NOT NULL,
    "isUsed" BOOLEAN NOT NULL,
    "rarity" "ComicRarity",
    "comicIssueId" INTEGER NOT NULL,
    "artist" TEXT NOT NULL,

    CONSTRAINT "StatefulCover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComicCollaborator_role_name_comicSlug_key" ON "ComicCollaborator"("role", "name", "comicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ComicIssueCollaborator_role_name_comicIssueId_key" ON "ComicIssueCollaborator"("role", "name", "comicIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "StatelessCover_comicIssueId_rarity_key" ON "StatelessCover"("comicIssueId", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "StatefulCover_comicIssueId_isSigned_isUsed_rarity_key" ON "StatefulCover"("comicIssueId", "isSigned", "isUsed", "rarity");

-- AddForeignKey
ALTER TABLE "ComicCollaborator" ADD CONSTRAINT "ComicCollaborator_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssueCollaborator" ADD CONSTRAINT "ComicIssueCollaborator_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatelessCover" ADD CONSTRAINT "StatelessCover_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatefulCover" ADD CONSTRAINT "StatefulCover_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
