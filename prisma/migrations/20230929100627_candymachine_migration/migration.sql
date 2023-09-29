/*
  Warnings:

  - Added the required column `supply` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandyMachineGroup" ADD COLUMN     "mintLimit" INTEGER,
ADD COLUMN     "supply" INTEGER NOT NULL;
