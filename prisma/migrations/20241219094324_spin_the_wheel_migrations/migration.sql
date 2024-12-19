-- CreateEnum
CREATE TYPE "WheelType" AS ENUM ('Daily', 'Weekly', 'Monthly');

-- CreateEnum
CREATE TYPE "WheelRewardType" AS ENUM ('CollectibleComic', 'PrintEdition', 'OneOfOne', 'Physicals', 'Fungibles', 'None');

-- AlterTable
ALTER TABLE "PrintEditionCollection" ADD COLUMN     "isSponsored" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Wheel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "s3BucketSlug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "type" "WheelType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "winProbability" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Wheel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelReward" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "wheelId" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "type" "WheelRewardType" NOT NULL,

    CONSTRAINT "WheelReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardDrop" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RewardDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelRewardReceipt" (
    "id" SERIAL NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "walletAddress" TEXT,
    "transactionSignature" TEXT,
    "dropId" INTEGER,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelRewardReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PhysicalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wheel_s3BucketSlug_key" ON "Wheel"("s3BucketSlug");

-- CreateIndex
CREATE UNIQUE INDEX "RewardDrop_rewardId_itemId_key" ON "RewardDrop"("rewardId", "itemId");

-- AddForeignKey
ALTER TABLE "WheelReward" ADD CONSTRAINT "WheelReward_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "Wheel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDrop" ADD CONSTRAINT "RewardDrop_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "WheelReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelRewardReceipt" ADD CONSTRAINT "WheelRewardReceipt_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "WheelReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelRewardReceipt" ADD CONSTRAINT "WheelRewardReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelRewardReceipt" ADD CONSTRAINT "WheelRewardReceipt_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE SET NULL ON UPDATE CASCADE;
