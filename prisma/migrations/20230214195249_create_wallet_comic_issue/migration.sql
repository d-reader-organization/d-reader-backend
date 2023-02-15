-- CreateTable
CREATE TABLE "WalletComicIssue" (
    "comicIssueId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "rating" INTEGER,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "WalletComicIssue_pkey" PRIMARY KEY ("comicIssueId","walletAddress")
);

-- AddForeignKey
ALTER TABLE "WalletComicIssue" ADD CONSTRAINT "WalletComicIssue_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletComicIssue" ADD CONSTRAINT "WalletComicIssue_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE CASCADE ON UPDATE CASCADE;
