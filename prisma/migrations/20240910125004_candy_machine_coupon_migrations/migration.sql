/*
  Warnings:

  - You are about to drop the column `label` on the `CandyMachineReceipt` table. All the data in the column will be lost.
  - You are about to drop the `CandyMachineGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCandyMachineGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WalletCandyMachineGroup` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `couponId` to the `CandyMachineReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('WhitelistedWallet', 'WhitelistedUser', 'RegisteredUser', 'PublicUser');

-- DropForeignKey
ALTER TABLE "UserCandyMachineGroup" DROP CONSTRAINT "UserCandyMachineGroup_candyMachineGroupId_fkey";

-- DropForeignKey
ALTER TABLE "UserCandyMachineGroup" DROP CONSTRAINT "UserCandyMachineGroup_userId_fkey";

-- DropForeignKey
ALTER TABLE "WalletCandyMachineGroup" DROP CONSTRAINT "WalletCandyMachineGroup_candyMachineGroupId_fkey";

-- DropForeignKey
ALTER TABLE "WalletCandyMachineGroup" DROP CONSTRAINT "WalletCandyMachineGroup_walletAddress_fkey";

ALTER TABLE "CandyMachineReceipt" ADD COLUMN "couponId" INTEGER;

-- DropTable
DROP TABLE "UserCandyMachineGroup";

-- DropTable
DROP TABLE "WalletCandyMachineGroup";

-- CreateTable
CREATE TABLE "CandyMachineCoupon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supply" INTEGER NOT NULL,
    "numberOfRedemptions" INTEGER,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "type" "CouponType" NOT NULL,
    "candyMachineAddress" TEXT NOT NULL,

    CONSTRAINT "CandyMachineCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandyMachineCouponCurrencySetting" (
    "label" TEXT NOT NULL,
    "mintPrice" BIGINT NOT NULL,
    "usdcEquivalent" INTEGER NOT NULL,
    "splTokenAddress" TEXT NOT NULL,
    "couponId" INTEGER NOT NULL,
    "candyMachineAddress" TEXT NOT NULL,

    CONSTRAINT "CandyMachineCouponCurrencySetting_pkey" PRIMARY KEY ("label","couponId")
);

-- CreateTable
CREATE TABLE "CandyMachineCouponEligibleWallet" (
    "walletAddress" TEXT NOT NULL,
    "couponId" INTEGER NOT NULL,

    CONSTRAINT "CandyMachineCouponEligibleWallet_pkey" PRIMARY KEY ("couponId","walletAddress")
);

-- CreateTable
CREATE TABLE "CandyMachineCouponEligibleUser" (
    "userId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,

    CONSTRAINT "CandyMachineCouponEligibleUser_pkey" PRIMARY KEY ("couponId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandyMachineCouponCurrencySetting_label_candyMachineAddress_key" ON "CandyMachineCouponCurrencySetting"("label", "candyMachineAddress");

-- CreateIndex
CREATE UNIQUE INDEX "CandyMachineCouponCurrencySetting_splTokenAddress_couponId_key" ON "CandyMachineCouponCurrencySetting"("splTokenAddress", "couponId");

-- AddForeignKey
ALTER TABLE "CandyMachineCoupon" ADD CONSTRAINT "CandyMachineCoupon_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineCouponCurrencySetting" ADD CONSTRAINT "CandyMachineCouponCurrencySetting_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CandyMachineCoupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineCouponEligibleWallet" ADD CONSTRAINT "CandyMachineCouponEligibleWallet_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineCouponEligibleWallet" ADD CONSTRAINT "CandyMachineCouponEligibleWallet_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CandyMachineCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineCouponEligibleUser" ADD CONSTRAINT "CandyMachineCouponEligibleUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineCouponEligibleUser" ADD CONSTRAINT "CandyMachineCouponEligibleUser_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "CandyMachineCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
