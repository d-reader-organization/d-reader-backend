/*
  Warnings:

  - You are about to drop the column `baseMintPrice` on the `CandyMachine` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `CandyMachine` table. All the data in the column will be lost.
  - You are about to drop the column `discountMintPrice` on the `ComicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `mintPrice` on the `ComicIssue` table. All the data in the column will be lost.
  - You are about to drop the column `supply` on the `ComicIssue` table. All the data in the column will be lost.
  - Added the required column `endDate` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mintPrice` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `splTokenAddress` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `CandyMachineGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CandyMachine" DROP COLUMN "baseMintPrice",
DROP COLUMN "endsAt",
ADD COLUMN     "supply" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CandyMachineGroup" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "mintPrice" INTEGER NOT NULL,
ADD COLUMN     "splTokenAddress" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ComicIssue" DROP COLUMN "discountMintPrice",
DROP COLUMN "mintPrice",
DROP COLUMN "supply",
ADD COLUMN     "isSecondarySaleActive" BOOLEAN NOT NULL DEFAULT false;
