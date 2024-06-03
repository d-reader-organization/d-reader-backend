/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Comic` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `ComicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Genre` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Comic" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "ComicIssue" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "Genre" DROP COLUMN "deletedAt";
