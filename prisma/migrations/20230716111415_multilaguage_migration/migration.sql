/*
  Warnings:

  - You are about to drop the column `image` on the `CarouselSlide` table. All the data in the column will be lost.
  - You are about to drop the column `subtitle` on the `CarouselSlide` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CarouselSlide` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `ComicPage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Language" AS ENUM ('English', 'French');

-- AlterTable
ALTER TABLE "CarouselSlide" DROP COLUMN "image",
DROP COLUMN "subtitle",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "ComicPage" DROP COLUMN "image";

-- CreateTable
CREATE TABLE "ComicPageTranslation" (
    "image" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "pageId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "CarouselSlideTranslation" (
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "language" "Language" NOT NULL,
    "slideId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ComicPageTranslation_pageId_language_key" ON "ComicPageTranslation"("pageId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "CarouselSlideTranslation_slideId_language_key" ON "CarouselSlideTranslation"("slideId", "language");

-- AddForeignKey
ALTER TABLE "ComicPageTranslation" ADD CONSTRAINT "ComicPageTranslation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ComicPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselSlideTranslation" ADD CONSTRAINT "CarouselSlideTranslation_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "CarouselSlide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
