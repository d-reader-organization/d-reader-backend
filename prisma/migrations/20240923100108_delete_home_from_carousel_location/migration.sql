/*
  Warnings:

  - The values [Home] on the enum `CarouselLocation` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CarouselLocation_new" AS ENUM ('HomePrimary', 'HomeSecondary');
ALTER TABLE "CarouselSlide" ALTER COLUMN "location" DROP DEFAULT;
ALTER TABLE "CarouselSlide" ALTER COLUMN "location" TYPE "CarouselLocation_new" USING ("location"::text::"CarouselLocation_new");
ALTER TYPE "CarouselLocation" RENAME TO "CarouselLocation_old";
ALTER TYPE "CarouselLocation_new" RENAME TO "CarouselLocation";
DROP TYPE "CarouselLocation_old";
ALTER TABLE "CarouselSlide" ALTER COLUMN "location" SET DEFAULT 'HomePrimary';
COMMIT;
