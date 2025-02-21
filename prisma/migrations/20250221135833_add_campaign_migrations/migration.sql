/*
  Warnings:

  - You are about to drop the `UserInterestedReceipt` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InvestCampaignInfoSection" AS ENUM ('Overview', 'Team', 'Offering', 'Roadmap');

ALTER TABLE "UserInterestedReceipt" DROP CONSTRAINT "UserInterestedReceipt_userId_fkey";

-- RenameTable
ALTER TABLE "UserInterestedReceipt" RENAME TO "UserCampaignInterestReceipt";

-- RenameColumn
ALTER TABLE "UserCampaignInterestReceipt" RENAME COLUMN "projectSlug" TO "campaignSlug";


-- CreateTable
CREATE TABLE "InvestCampaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "s3BucketSlug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "banner" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "raiseGoal" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "InvestCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestCampaignReward" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,

    CONSTRAINT "InvestCampaignReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestCampaignInfo" (
    "id" SERIAL NOT NULL,
    "section" "InvestCampaignInfoSection" NOT NULL,
    "value" TEXT NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "campaignId" INTEGER NOT NULL,

    CONSTRAINT "InvestCampaignInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToInvestCampaign" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCampaignInterestReceipt_campaignSlug_userId_key" ON "UserCampaignInterestReceipt"("campaignSlug", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestCampaign_slug_key" ON "InvestCampaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "_GenreToInvestCampaign_AB_unique" ON "_GenreToInvestCampaign"("A", "B");

-- CreateIndex
CREATE INDEX "_GenreToInvestCampaign_B_index" ON "_GenreToInvestCampaign"("B");

-- AddForeignKey
ALTER TABLE "UserCampaignInterestReceipt" ADD CONSTRAINT "UserCampaignInterestReceipt_campaignSlug_fkey" FOREIGN KEY ("campaignSlug") REFERENCES "InvestCampaign"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterestReceipt" ADD CONSTRAINT "UserCampaignInterestReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterestReceipt" ADD CONSTRAINT "UserCampaignInterestReceipt_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestCampaign" ADD CONSTRAINT "InvestCampaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestCampaignReward" ADD CONSTRAINT "InvestCampaignReward_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "InvestCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestCampaignInfo" ADD CONSTRAINT "InvestCampaignInfo_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "InvestCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToInvestCampaign" ADD CONSTRAINT "_GenreToInvestCampaign_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToInvestCampaign" ADD CONSTRAINT "_GenreToInvestCampaign_B_fkey" FOREIGN KEY ("B") REFERENCES "InvestCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
