/*
  Warnings:

  - You are about to drop the `_ComicToGenre` table. The data from that table will be moved to a new table `ComicToGenre`.

*/


-- CreateTable
CREATE TABLE "ComicToGenre" (
    "comicSlug" TEXT NOT NULL,
    "genreSlug" TEXT NOT NULL,

    CONSTRAINT "ComicToGenre_pkey" PRIMARY KEY ("comicSlug","genreSlug")
);

-- AddForeignKey
ALTER TABLE "ComicToGenre" ADD CONSTRAINT "ComicToGenre_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicToGenre" ADD CONSTRAINT "ComicToGenre_genreSlug_fkey" FOREIGN KEY ("genreSlug") REFERENCES "Genre"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate from _ComicToGenre to ComicToGenre
INSERT INTO "ComicToGenre" ("comicSlug", "genreSlug")
SELECT "A", "B"
FROM "_ComicToGenre";

-- DropForeignKey
ALTER TABLE "_ComicToGenre" DROP CONSTRAINT "_ComicToGenre_A_fkey";

-- DropForeignKey
ALTER TABLE "_ComicToGenre" DROP CONSTRAINT "_ComicToGenre_B_fkey";

-- DropTable
DROP TABLE "_ComicToGenre";
