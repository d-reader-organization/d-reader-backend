/*
  Warnings:

  - You are about to alter the column `baseMintPrice` on the `CandyMachine` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `discountMintPrice` on the `ComicIssue` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `mintPrice` on the `ComicIssue` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "CandyMachine" ALTER COLUMN "baseMintPrice" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "ComicIssue" ALTER COLUMN "discountMintPrice" SET DATA TYPE INTEGER,
ALTER COLUMN "mintPrice" SET DATA TYPE INTEGER;
