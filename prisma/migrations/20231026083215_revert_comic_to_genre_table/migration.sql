/*
  Warnings:

  - You are about to drop the `ComicToGenre` table. The data from that table will be moved to a new table `_ComicToGenre`.

*/
-- CreateTable
CREATE TABLE "_ComicToGenre" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ComicToGenre_AB_unique" ON "_ComicToGenre"("A", "B");

-- CreateIndex
CREATE INDEX "_ComicToGenre_B_index" ON "_ComicToGenre"("B");

-- AddForeignKey
ALTER TABLE "_ComicToGenre" ADD CONSTRAINT "_ComicToGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "Comic"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComicToGenre" ADD CONSTRAINT "_ComicToGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "Genre"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate from ComicToGenre to _ComicToGenre
INSERT INTO "_ComicToGenre" ("A", "B")
SELECT "comicSlug", "genreSlug"
FROM "ComicToGenre";

-- DropForeignKey
ALTER TABLE "ComicToGenre" DROP CONSTRAINT "ComicToGenre_comicSlug_fkey";

-- DropForeignKey
ALTER TABLE "ComicToGenre" DROP CONSTRAINT "ComicToGenre_genreSlug_fkey";

-- DropTable
DROP TABLE "ComicToGenre";

