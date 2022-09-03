-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Superadmin', 'Admin', 'User');

-- CreateTable
CREATE TABLE "Wallet" (
    "address" TEXT NOT NULL,
    "nonce" TEXT,
    "role" "Role" NOT NULL DEFAULT 'User',

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Collection" (
    "name" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "NFT" (
    "mint" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,

    CONSTRAINT "NFT_pkey" PRIMARY KEY ("mint")
);

-- CreateTable
CREATE TABLE "Comic" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "flavorText" TEXT,
    "description" TEXT,
    "thumbnail" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL DEFAULT 1,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "collectionName" TEXT NOT NULL,
    "soundtrack" TEXT,

    CONSTRAINT "Comic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComicPage" (
    "id" SERIAL NOT NULL,
    "isPreviewable" BOOLEAN NOT NULL,
    "image" TEXT NOT NULL,
    "altImage" TEXT,
    "comicId" INTEGER NOT NULL,

    CONSTRAINT "ComicPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_nonce_key" ON "Wallet"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "NFT_name_key" ON "NFT"("name");

-- AddForeignKey
ALTER TABLE "NFT" ADD CONSTRAINT "NFT_collectionName_fkey" FOREIGN KEY ("collectionName") REFERENCES "Collection"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comic" ADD CONSTRAINT "Comic_collectionName_fkey" FOREIGN KEY ("collectionName") REFERENCES "Collection"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicPage" ADD CONSTRAINT "ComicPage_comicId_fkey" FOREIGN KEY ("comicId") REFERENCES "Comic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
