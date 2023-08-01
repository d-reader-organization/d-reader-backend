/*
  Warnings:

  - Added the required column `ownerChangedAt` to the `Nft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Nft" ADD COLUMN     "ownerChangedAt" TIMESTAMP(3) NOT NULL;
