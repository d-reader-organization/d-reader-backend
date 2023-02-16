-- CreateTable
CREATE TABLE "WalletCreator" (
    "creatorSlug" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isFollowing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WalletCreator_pkey" PRIMARY KEY ("creatorSlug","walletAddress")
);

-- AddForeignKey
ALTER TABLE "WalletCreator" ADD CONSTRAINT "WalletCreator_creatorSlug_fkey" FOREIGN KEY ("creatorSlug") REFERENCES "Creator"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletCreator" ADD CONSTRAINT "WalletCreator_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE CASCADE ON UPDATE CASCADE;
