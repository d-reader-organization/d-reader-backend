/*
  Warnings:

  - Added the required column `splTokenAddress` to the `CandyMachineReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandyMachineReceipt" ADD COLUMN     "splTokenAddress" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SplToken" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "Icon" TEXT NOT NULL,

    CONSTRAINT "SplToken_pkey" PRIMARY KEY ("id")
);
