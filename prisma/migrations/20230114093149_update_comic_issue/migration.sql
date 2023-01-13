/*
  Warnings:

  - Added the required column `discountMintPrice` to the `ComicIssue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mintPrice` to the `ComicIssue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supply` to the `ComicIssue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComicIssue" ADD COLUMN     "discountMintPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "mintPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "supply" INTEGER NOT NULL;
