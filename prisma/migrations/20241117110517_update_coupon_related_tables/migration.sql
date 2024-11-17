/*
  Warnings:

  - You are about to drop the `CandyMachineCouponWhitelistedUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CandyMachineCouponWhitelistedWallet` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[transactionSignature]` on the table `CandyMachineReceipt` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "CandyMachineCouponWhitelistedUser" DROP CONSTRAINT "CandyMachineCouponWhitelistedUser_couponId_fkey";

-- DropForeignKey
ALTER TABLE "CandyMachineCouponWhitelistedUser" DROP CONSTRAINT "CandyMachineCouponWhitelistedUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "CandyMachineCouponWhitelistedWallet" DROP CONSTRAINT "CandyMachineCouponWhitelistedWallet_couponId_fkey";

-- DropForeignKey
ALTER TABLE "CandyMachineCouponWhitelistedWallet" DROP CONSTRAINT "CandyMachineCouponWhitelistedWallet_walletAddress_fkey";

-- DropTable
DROP TABLE "CandyMachineCouponWhitelistedUser";

-- DropTable
DROP TABLE "CandyMachineCouponWhitelistedWallet";

-- CreateTable
CREATE TABLE "CandyMachineCouponWallet" (
    "walletAddress" TEXT NOT NULL,
    "couponId" INTEGER NOT NULL,
    "itemsRedeemed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CandyMachineCouponWallet_pkey" PRIMARY KEY ("couponId","walletAddress")
);

-- CreateTable
CREATE TABLE "CandyMachineCouponUser" (
    "userId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "itemsRedeemed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CandyMachineCouponUser_pkey" PRIMARY KEY ("couponId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandyMachineReceipt_transactionSignature_key" ON "CandyMachineReceipt"("transactionSignature");
