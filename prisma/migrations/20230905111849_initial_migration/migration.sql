-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Superadmin', 'Admin', 'Tester', 'User');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('Everyone', 'Teen', 'TeenPlus', 'Mature');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('Writer', 'Artist', 'Colorist', 'Editor', 'Letterer', 'CoverArtist');

-- CreateEnum
CREATE TYPE "ComicRarity" AS ENUM ('None', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary');

-- CreateEnum
CREATE TYPE "CarouselLocation" AS ENUM ('Home');

-- CreateEnum
CREATE TYPE "GlobalStatusType" AS ENUM ('Success', 'Info', 'Warning', 'Maintenance');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "nonce" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'User',
    "referrerId" INTEGER,
    "referralsRemaining" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "referredAt" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "address" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedAt" TIMESTAMP(3),

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Creator" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "banner" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "flavorText" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "twitter" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "lynkfire" TEXT NOT NULL DEFAULT '',
    "tippingAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "popularizedAt" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comic" (
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "audienceType" "AudienceType" NOT NULL DEFAULT 'Everyone',
    "cover" TEXT NOT NULL DEFAULT '',
    "banner" TEXT NOT NULL DEFAULT '',
    "pfp" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "flavorText" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "twitter" TEXT NOT NULL DEFAULT '',
    "discord" TEXT NOT NULL DEFAULT '',
    "telegram" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "tikTok" TEXT NOT NULL DEFAULT '',
    "youTube" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "popularizedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "creatorId" INTEGER NOT NULL,

    CONSTRAINT "Comic_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "UserComic" (
    "comicSlug" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "UserComic_pkey" PRIMARY KEY ("comicSlug","userId")
);

-- CreateTable
CREATE TABLE "Genre" (
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "RoyaltyWallet" (
    "address" TEXT NOT NULL,
    "share" INTEGER NOT NULL,
    "comicIssueId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ComicIssue" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "supply" INTEGER NOT NULL DEFAULT 0,
    "discountMintPrice" INTEGER NOT NULL DEFAULT 0,
    "mintPrice" INTEGER NOT NULL DEFAULT 0,
    "sellerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "flavorText" TEXT NOT NULL DEFAULT '',
    "signature" TEXT NOT NULL DEFAULT '',
    "pdf" TEXT NOT NULL DEFAULT '',
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "featuredAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "popularizedAt" TIMESTAMP(3),
    "creatorAddress" TEXT NOT NULL DEFAULT '',
    "comicSlug" TEXT NOT NULL,

    CONSTRAINT "ComicIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicCollaborator" (
    "id" SERIAL NOT NULL,
    "role" "CollaboratorRole" NOT NULL,
    "name" TEXT NOT NULL,
    "comicSlug" TEXT NOT NULL,

    CONSTRAINT "ComicCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicIssueCollaborator" (
    "id" SERIAL NOT NULL,
    "role" "CollaboratorRole" NOT NULL,
    "name" TEXT NOT NULL,
    "comicIssueId" INTEGER NOT NULL,

    CONSTRAINT "ComicIssueCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatelessCover" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL,
    "rarity" "ComicRarity" NOT NULL,
    "comicIssueId" INTEGER NOT NULL,
    "artist" TEXT NOT NULL,
    "share" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL,

    CONSTRAINT "StatelessCover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatefulCover" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL DEFAULT '',
    "isSigned" BOOLEAN NOT NULL,
    "isUsed" BOOLEAN NOT NULL,
    "rarity" "ComicRarity" NOT NULL,
    "comicIssueId" INTEGER NOT NULL,
    "artist" TEXT NOT NULL,

    CONSTRAINT "StatefulCover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nft" (
    "address" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "ownerChangedAt" TIMESTAMP(3) NOT NULL,
    "candyMachineAddress" TEXT NOT NULL,
    "collectionNftAddress" TEXT NOT NULL,

    CONSTRAINT "Nft_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "CandyMachine" (
    "address" TEXT NOT NULL,
    "mintAuthorityAddress" TEXT NOT NULL,
    "authorityPda" TEXT NOT NULL,
    "itemsAvailable" INTEGER NOT NULL,
    "itemsMinted" INTEGER NOT NULL,
    "itemsRemaining" INTEGER NOT NULL,
    "itemsLoaded" INTEGER NOT NULL,
    "isFullyLoaded" BOOLEAN NOT NULL,
    "endsAt" TIMESTAMP(3),
    "baseMintPrice" INTEGER NOT NULL,
    "collectionNftAddress" TEXT NOT NULL,

    CONSTRAINT "CandyMachine_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "CandyMachineGroup" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "allowListSupply" INTEGER NOT NULL,
    "allowListUsed" INTEGER NOT NULL DEFAULT 0,
    "candyMachineAddress" TEXT NOT NULL,

    CONSTRAINT "CandyMachineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletCandyMachineGroup" (
    "walletAddress" TEXT NOT NULL,
    "candyMachineGroupId" INTEGER NOT NULL,

    CONSTRAINT "WalletCandyMachineGroup_pkey" PRIMARY KEY ("candyMachineGroupId","walletAddress")
);

-- CreateTable
CREATE TABLE "CandyMachineReceipt" (
    "nftAddress" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "candyMachineAddress" TEXT NOT NULL,
    "transactionSignature" TEXT NOT NULL,

    CONSTRAINT "CandyMachineReceipt_pkey" PRIMARY KEY ("nftAddress")
);

-- CreateTable
CREATE TABLE "CollectionNft" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "comicIssueId" INTEGER NOT NULL,

    CONSTRAINT "CollectionNft_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "ComicPage" (
    "id" SERIAL NOT NULL,
    "pageNumber" SERIAL NOT NULL,
    "isPreviewable" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL,
    "comicIssueId" INTEGER NOT NULL,

    CONSTRAINT "ComicPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselSlide" (
    "id" SERIAL NOT NULL,
    "image" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "priority" INTEGER NOT NULL,
    "comicIssueId" INTEGER,
    "comicSlug" TEXT,
    "creatorSlug" TEXT,
    "externalLink" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "location" "CarouselLocation" NOT NULL DEFAULT 'Home',

    CONSTRAINT "CarouselSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "ip" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "os" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "UserComicIssue" (
    "comicIssueId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER,
    "isSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "UserComicIssue_pkey" PRIMARY KEY ("comicIssueId","userId")
);

-- CreateTable
CREATE TABLE "UserCreator" (
    "creatorSlug" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isFollowing" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserCreator_pkey" PRIMARY KEY ("creatorSlug","userId")
);

-- CreateTable
CREATE TABLE "Metadata" (
    "uri" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL,
    "isSigned" BOOLEAN NOT NULL,
    "rarity" "ComicRarity" NOT NULL,

    CONSTRAINT "Metadata_pkey" PRIMARY KEY ("uri")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "nftAddress" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "feePayer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3) NOT NULL,
    "soldAt" TIMESTAMP(3),
    "saleTransactionSignature" TEXT,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalStatus" (
    "id" SERIAL NOT NULL,
    "type" "GlobalStatusType" NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GlobalStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ComicToGenre" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_nonce_key" ON "User"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_email_key" ON "Creator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_name_key" ON "Creator"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_slug_key" ON "Creator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyWallet_address_key" ON "RoyaltyWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "ComicIssue_number_comicSlug_key" ON "ComicIssue"("number", "comicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ComicIssue_slug_comicSlug_key" ON "ComicIssue"("slug", "comicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ComicIssue_title_comicSlug_key" ON "ComicIssue"("title", "comicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ComicCollaborator_role_name_comicSlug_key" ON "ComicCollaborator"("role", "name", "comicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ComicIssueCollaborator_role_name_comicIssueId_key" ON "ComicIssueCollaborator"("role", "name", "comicIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "StatelessCover_comicIssueId_rarity_key" ON "StatelessCover"("comicIssueId", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "StatefulCover_comicIssueId_isSigned_isUsed_rarity_key" ON "StatefulCover"("comicIssueId", "isSigned", "isUsed", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "CandyMachine_authorityPda_key" ON "CandyMachine"("authorityPda");

-- CreateIndex
CREATE UNIQUE INDEX "CandyMachineGroup_label_candyMachineAddress_key" ON "CandyMachineGroup"("label", "candyMachineAddress");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionNft_comicIssueId_key" ON "CollectionNft"("comicIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "ComicPage_pageNumber_comicIssueId_key" ON "ComicPage"("pageNumber", "comicIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_nftAddress_canceledAt_key" ON "Listing"("nftAddress", "canceledAt");

-- CreateIndex
CREATE UNIQUE INDEX "_ComicToGenre_AB_unique" ON "_ComicToGenre"("A", "B");

-- CreateIndex
CREATE INDEX "_ComicToGenre_B_index" ON "_ComicToGenre"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comic" ADD CONSTRAINT "Comic_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserComic" ADD CONSTRAINT "UserComic_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserComic" ADD CONSTRAINT "UserComic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyWallet" ADD CONSTRAINT "RoyaltyWallet_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssue" ADD CONSTRAINT "ComicIssue_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicCollaborator" ADD CONSTRAINT "ComicCollaborator_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssueCollaborator" ADD CONSTRAINT "ComicIssueCollaborator_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatelessCover" ADD CONSTRAINT "StatelessCover_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatefulCover" ADD CONSTRAINT "StatefulCover_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_uri_fkey" FOREIGN KEY ("uri") REFERENCES "Metadata"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_collectionNftAddress_fkey" FOREIGN KEY ("collectionNftAddress") REFERENCES "CollectionNft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachine" ADD CONSTRAINT "CandyMachine_collectionNftAddress_fkey" FOREIGN KEY ("collectionNftAddress") REFERENCES "CollectionNft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineGroup" ADD CONSTRAINT "CandyMachineGroup_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletCandyMachineGroup" ADD CONSTRAINT "WalletCandyMachineGroup_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletCandyMachineGroup" ADD CONSTRAINT "WalletCandyMachineGroup_candyMachineGroupId_fkey" FOREIGN KEY ("candyMachineGroupId") REFERENCES "CandyMachineGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineReceipt" ADD CONSTRAINT "CandyMachineReceipt_nftAddress_fkey" FOREIGN KEY ("nftAddress") REFERENCES "Nft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineReceipt" ADD CONSTRAINT "CandyMachineReceipt_buyerAddress_fkey" FOREIGN KEY ("buyerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandyMachineReceipt" ADD CONSTRAINT "CandyMachineReceipt_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionNft" ADD CONSTRAINT "CollectionNft_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicPage" ADD CONSTRAINT "ComicPage_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserComicIssue" ADD CONSTRAINT "UserComicIssue_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserComicIssue" ADD CONSTRAINT "UserComicIssue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCreator" ADD CONSTRAINT "UserCreator_creatorSlug_fkey" FOREIGN KEY ("creatorSlug") REFERENCES "Creator"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCreator" ADD CONSTRAINT "UserCreator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_nftAddress_fkey" FOREIGN KEY ("nftAddress") REFERENCES "Nft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComicToGenre" ADD CONSTRAINT "_ComicToGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "Comic"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComicToGenre" ADD CONSTRAINT "_ComicToGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "Genre"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
