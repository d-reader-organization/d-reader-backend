-- DropForeignKey
ALTER TABLE "UserInterestedReceipt" DROP CONSTRAINT "UserInterestedReceipt_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "UserInterestedReceipt" DROP CONSTRAINT "UserInterestedReceipt_userId_fkey";

-- DropTable
DROP TABLE "UserInterestedReceipt";

-- CreateTable
CREATE TABLE "UserCampaignInterest" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "expressedInterestAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "referrerId" INTEGER,

    CONSTRAINT "UserCampaignInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "s3BucketSlug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "banner" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '',
    "video" TEXT NOT NULL DEFAULT '',
    "raiseGoal" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "info" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignReward" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "supply" INTEGER,
    "campaignId" INTEGER NOT NULL,

    CONSTRAINT "CampaignReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCampaignInterest_campaignId_userId_key" ON "UserCampaignInterest"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "CampaignReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReward" ADD CONSTRAINT "CampaignReward_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
