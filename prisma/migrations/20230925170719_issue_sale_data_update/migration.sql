-- AlterTable
ALTER TABLE "ComicIssue" ADD COLUMN     "isPrimarySaleActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSecondarySaleActive" BOOLEAN NOT NULL DEFAULT false;
