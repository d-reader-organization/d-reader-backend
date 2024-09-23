-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


BEGIN;
ALTER TYPE "CarouselLocation" ADD VALUE 'HomePrimary';
ALTER TYPE "CarouselLocation" ADD VALUE 'HomeSecondary';
COMMIT;

UPDATE "CarouselSlide" SET "location" = 'HomePrimary' WHERE "location"='Home';
ALTER TABLE "CarouselSlide" ALTER COLUMN "location" SET DEFAULT 'HomePrimary';

