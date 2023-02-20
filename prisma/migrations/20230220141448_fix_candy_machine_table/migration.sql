/*
  Warnings:

  - Changed the type of `isFullyLoaded` on the `ComicIssueCandyMachine` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ComicIssueCandyMachine" DROP COLUMN "isFullyLoaded",
ADD COLUMN     "isFullyLoaded" BOOLEAN NOT NULL;
