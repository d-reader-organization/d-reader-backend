-- CreateEnum
CREATE TYPE "CreatorActivityFeedType" AS ENUM ('ComicRated', 'ComicLiked', 'ComicBookmarked', 'ComicVerified', 'ComicPublished', 'ComicIssueLiked', 'ComicIssueRated', 'ComicIssueVerified', 'ComicIssuePublished', 'CreatorFollow', 'CreatorVerified');

-- CreateEnum
CREATE TYPE "ActivityTargetType" AS ENUM ('Creator', 'Comic', 'ComicIssue');

-- CreateTable
CREATE TABLE "CreatorActivityFeed" (
    "id" SERIAL NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" "ActivityTargetType" NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "CreatorActivityFeedType" NOT NULL,

    CONSTRAINT "CreatorActivityFeed_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreatorActivityFeed" ADD CONSTRAINT "CreatorActivityFeed_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorActivityFeed" ADD CONSTRAINT "CreatorActivityFeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
