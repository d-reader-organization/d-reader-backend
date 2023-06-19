/*
  Warnings:

  - You are about to drop the column `cover` on the `ComicIssue` table. All the data in the column will be lost.
  - Added the required column `isDefault` to the `StatelessCover` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComicIssue" DROP COLUMN "cover",
ADD COLUMN     "pdf" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "signature" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "StatelessCover" ADD COLUMN     "isDefault" BOOLEAN NOT NULL;
