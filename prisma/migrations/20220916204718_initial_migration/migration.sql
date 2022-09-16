-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Superadmin', 'Admin', 'User');

-- CreateTable
CREATE TABLE "Wallet" (
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nonce" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'User',

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Collection" (
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "thumbnail" TEXT NOT NULL,
    "pfp" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "twitter" TEXT NOT NULL DEFAULT '',
    "discord" TEXT NOT NULL DEFAULT '',
    "telegram" TEXT NOT NULL DEFAULT '',
    "instagram" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "tikTok" TEXT NOT NULL DEFAULT '',
    "youTube" TEXT NOT NULL DEFAULT '',
    "magicEden" TEXT NOT NULL DEFAULT '',
    "openSea" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "NFT" (
    "mint" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,

    CONSTRAINT "NFT_pkey" PRIMARY KEY ("mint")
);

-- CreateTable
CREATE TABLE "Comic" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "flavorText" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "cover" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL DEFAULT 1,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "collectionName" TEXT NOT NULL,
    "soundtrack" TEXT,

    CONSTRAINT "Comic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicPage" (
    "id" SERIAL NOT NULL,
    "pageNumber" SERIAL NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "isPreviewable" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT NOT NULL,
    "altImage" TEXT,
    "comicId" INTEGER NOT NULL,

    CONSTRAINT "ComicPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_nonce_key" ON "Wallet"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ComicPage_pageNumber_chapterNumber_comicId_key" ON "ComicPage"("pageNumber", "chapterNumber", "comicId");

-- AddForeignKey
ALTER TABLE "NFT" ADD CONSTRAINT "NFT_collectionName_fkey" FOREIGN KEY ("collectionName") REFERENCES "Collection"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comic" ADD CONSTRAINT "Comic_collectionName_fkey" FOREIGN KEY ("collectionName") REFERENCES "Collection"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicPage" ADD CONSTRAINT "ComicPage_comicId_fkey" FOREIGN KEY ("comicId") REFERENCES "Comic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
