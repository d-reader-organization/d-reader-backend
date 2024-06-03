-- AlterTables

-- Comic
ALTER TABLE "Comic" ADD COLUMN "s3BucketSlug" TEXT;
UPDATE "Comic" SET "s3BucketSlug" = "slug" WHERE "s3BucketSlug" IS NULL;
ALTER TABLE "Comic" ALTER COLUMN "s3BucketSlug" SET NOT NULL;
CREATE UNIQUE INDEX "Comic_s3BucketSlug_key" ON "Comic"("s3BucketSlug");

-- Comic Issue
ALTER TABLE "ComicIssue" ADD COLUMN "s3BucketSlug" TEXT;
UPDATE "ComicIssue" SET "s3BucketSlug" = "slug" WHERE "s3BucketSlug" IS NULL;
ALTER TABLE "ComicIssue" ALTER COLUMN "s3BucketSlug" SET NOT NULL;

-- Comic
ALTER TABLE "Creator" ADD COLUMN "s3BucketSlug" TEXT;
UPDATE "Creator" SET "s3BucketSlug" = "slug" WHERE "s3BucketSlug" IS NULL;
ALTER TABLE "Creator" ALTER COLUMN "s3BucketSlug" SET NOT NULL;
CREATE UNIQUE INDEX "Creator_s3BucketSlug_key" ON "Creator"("s3BucketSlug");