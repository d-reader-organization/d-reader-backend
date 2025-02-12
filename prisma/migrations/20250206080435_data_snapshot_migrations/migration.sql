-- CreateEnum
CREATE TYPE "CreatorSnapshotType" AS ENUM ('Follower', 'Reader', 'View', 'Like', 'Bookmark', 'Sale', 'Royalty', 'Other');

-- CreateEnum
CREATE TYPE "ComicSnapshotType" AS ENUM ('Reader', 'Like', 'Bookmark', 'View');

-- CreateEnum
CREATE TYPE "ComicIssueSnapshotType" AS ENUM ('Reader', 'Like', 'View');

-- AlterTable
ALTER TABLE "CandyMachine" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CreatorSnapshot" (
    "id" SERIAL NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "type" "CreatorSnapshotType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicSnapshot" (
    "id" SERIAL NOT NULL,
    "comicSlug" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "type" "ComicSnapshotType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicIssueSnapshot" (
    "id" SERIAL NOT NULL,
    "comicIssueId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "type" "ComicIssueSnapshotType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComicIssueSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreatorSnapshot" ADD CONSTRAINT "CreatorSnapshot_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicSnapshot" ADD CONSTRAINT "ComicSnapshot_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssueSnapshot" ADD CONSTRAINT "ComicIssueSnapshot_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
