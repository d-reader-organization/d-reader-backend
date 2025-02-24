-- DropForeignKey
ALTER TABLE "UserInterestedReceipt" DROP CONSTRAINT "UserInterestedReceipt_referrerId_fkey";

-- DropForeignKey
ALTER TABLE "UserInterestedReceipt" DROP CONSTRAINT "UserInterestedReceipt_userId_fkey";

-- RenameTable
ALTER TABLE "UserInterestedReceipt" RENAME TO "UserCampaignInterest";

-- RenameColumn
ALTER TABLE "UserCampaignInterest" RENAME COLUMN "projectSlug" TO "campaignSlug";

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
CREATE TABLE "CampaginGenre" (
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "CampaginGenre_pkey" PRIMARY KEY ("slug")
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

-- CreateTable
CREATE TABLE "_CampaginGenreToCampaign" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCampaignInterest_campaignSlug_userId_key" ON "UserCampaignInterest"("campaignSlug", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CampaginGenre_name_key" ON "CampaginGenre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_CampaginGenreToCampaign_AB_unique" ON "_CampaginGenreToCampaign"("A", "B");

-- CreateIndex
CREATE INDEX "_CampaginGenreToCampaign_B_index" ON "_CampaginGenreToCampaign"("B");

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_campaignSlug_fkey" FOREIGN KEY ("campaignSlug") REFERENCES "Campaign"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCampaignInterest" ADD CONSTRAINT "UserCampaignInterest_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReward" ADD CONSTRAINT "CampaignReward_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaginGenreToCampaign" ADD CONSTRAINT "_CampaginGenreToCampaign_A_fkey" FOREIGN KEY ("A") REFERENCES "CampaginGenre"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaginGenreToCampaign" ADD CONSTRAINT "_CampaginGenreToCampaign_B_fkey" FOREIGN KEY ("B") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
