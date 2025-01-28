-- AlterTable: Add 'creatorHandle' column to the "CarouselSlide" table
ALTER TABLE "CarouselSlide" ADD COLUMN "creatorHandle" TEXT;

-- Update 'creatorHandle' values using 'creatorSlug' and 'Creator' table
UPDATE "CarouselSlide" cs
SET "creatorHandle" = cr."name"
FROM "Creator" cr
WHERE cs."creatorSlug" = cr."slug";

-- AlterTable: Drop 'creatorSlug' column from "CarouselSlide"
ALTER TABLE "CarouselSlide" DROP COLUMN "creatorSlug";

-- Insert new users, appending a random number to the name if it already exists
INSERT INTO "User"(
  email, password, username, role, "deletedAt", "lastLogin", "lastActiveAt", 
  "emailVerifiedAt", "createdAt", "displayName", "referrerId", 
  "referCompeletedAt", "nonce"
)
SELECT 
  cr.email, 
  cr.password, 
  -- Generate a unique username by checking if name exists and appending a random number
  CASE 
    WHEN EXISTS (SELECT 1 FROM "User" u WHERE u.username = cr.name) THEN 
      cr.name || '_' || FLOOR(random() * 1000)::int  -- Appending a random number to the name
    ELSE 
      cr.name  -- Use the original name if it doesn't exist in the User table
  END AS username,
  'Creator' AS role,
  cr."deletedAt", 
  cr."lastLogin", 
  cr."lastActiveAt", 
  cr."emailVerifiedAt", 
  cr."createdAt", 
  cr.name AS displayName,  -- Display name can remain the same as the creator's name
  NULL AS referrerId,  -- referrerId set to NULL for now
  NULL AS referCompeletedAt,  -- referCompeletedAt set to NULL for now
  gen_random_uuid() AS nonce  -- Generating a new UUID for the nonce field
FROM "Creator" cr
WHERE NOT EXISTS (
  SELECT 1 
  FROM "User" u 
  WHERE u.email = cr.email
);

-- AlterTable: Add userId in Creator
ALTER TABLE "Creator" ADD COLUMN "userId" INTEGER;

-- Update user role to Creator for all creators
UPDATE "User" u 
SET role='Creator'
FROM "Creator" cr 
WHERE u.email=cr.email;

-- Update the userId for creators with user emails
UPDATE "Creator" cr
SET "userId" = u.id
FROM "User" u
WHERE u.email = cr.email;

-- AlterTable: Add 'creatorId' column to the "UserCreator" table
ALTER TABLE "UserCreator" ADD COLUMN "creatorId" INTEGER;

-- Update 'creatorId' in "UserCreator" using 'creatorSlug' and the "Creator" table
UPDATE "UserCreator" uc
SET "creatorId" = cr.id
FROM "Creator" cr
WHERE uc."creatorSlug" = cr."slug";

-- Drop old primary key and add a new one for "UserCreator" (composed of 'creatorId' and 'userId')
ALTER TABLE "UserCreator" 
  DROP CONSTRAINT "UserCreator_pkey", 
  ADD CONSTRAINT "UserCreator_pkey" PRIMARY KEY ("creatorId", "userId");

-- Drop the foreign key constraint on "UserCreator" (for 'creatorSlug')
ALTER TABLE "UserCreator" DROP CONSTRAINT "UserCreator_creatorSlug_fkey";

-- Drop 'creatorSlug' column from "UserCreator"
ALTER TABLE "UserCreator" DROP COLUMN "creatorSlug";

-- Set 'creatorId' column to NOT NULL in "UserCreator"
ALTER TABLE "UserCreator" ALTER COLUMN "creatorId" SET NOT NULL;

-- Drop the unnecessary columns from the "Creator" table
ALTER TABLE "Creator" 
  DROP COLUMN "logo", 
  DROP COLUMN "role", 
  DROP COLUMN "email", 
  DROP COLUMN "password", 
  DROP COLUMN "lastActiveAt", 
  DROP COLUMN "lastLogin", 
  DROP COLUMN "emailVerifiedAt";

-- Drop the index associated with the 'slug' column
DROP INDEX IF EXISTS "Creator_slug_key";

-- Drop the 'slug' column from the "Creator" table
ALTER TABLE "Creator" DROP COLUMN "slug";

-- Rename the 'name' column to 'handle'
ALTER TABLE "Creator" RENAME COLUMN "name" TO "handle";

-- Rename "Creator" table to "CreatorChannel"
ALTER TABLE "Creator" RENAME TO "CreatorChannel";

-- Create a unique index on "handle" in the "CreatorChannel" table
CREATE UNIQUE INDEX "CreatorChannel_handle_key" ON "CreatorChannel"("handle");

-- Add foreign key constraint on "CreatorChannel" referencing "User.id"
ALTER TABLE "CreatorChannel" ADD CONSTRAINT "CreatorChannel_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;
ALTER INDEX "Creator_s3BucketSlug_key" RENAME TO "CreatorChannel_s3BucketSlug_key";
ALTER TABLE "CreatorChannel" RENAME CONSTRAINT "Creator_pkey" TO "CreatorChannel_pkey";

-- Add foreign key constraint on "UserCreator" referencing "CreatorChannel.id"
ALTER TABLE "UserCreator" ADD CONSTRAINT "UserCreator_creatorId_fkey" 
  FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Drop foreign key constraint on "Comic" referencing "CreatorChannel.id"
ALTER TABLE "Comic" DROP CONSTRAINT "Comic_creatorId_fkey";

-- Add foreign key constraint on "Comic" referencing "CreatorChannel.id"
ALTER TABLE "Comic" ADD CONSTRAINT "Comic_creatorId_fkey" 
  FOREIGN KEY ("creatorId") REFERENCES "CreatorChannel"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Alter table: set "userId" not null
ALTER TABLE "CreatorChannel" ALTER COLUMN "userId" SET NOT NULL;

-- Create unique index on "channelId" in the "CreatorChannel" table
CREATE UNIQUE INDEX "CreatorChannel_userId_key" ON "CreatorChannel"("userId");