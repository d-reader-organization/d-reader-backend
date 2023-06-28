/*
  Warnings:

  - Made the column `rarity` on table `Metadata` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rarity` on table `StatefulCover` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rarity` on table `StatelessCover` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Metadata" ALTER COLUMN "rarity" SET NOT NULL;

-- AlterTable
ALTER TABLE "StatefulCover" ALTER COLUMN "rarity" SET NOT NULL;

-- AlterTable
ALTER TABLE "StatelessCover" ALTER COLUMN "rarity" SET NOT NULL;
