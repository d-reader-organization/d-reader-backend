-- Drop the existing index
DROP INDEX IF EXISTS "User_name_key";

-- Alter the table: add a new column
ALTER TABLE "User"
    ADD COLUMN "displayName" TEXT;

-- Rename the column "name" to "username"
ALTER TABLE "User"
    RENAME COLUMN "name" TO "username";

-- Update the displayName column with the username values
UPDATE "User"
SET "displayName" = "username";

-- Alter the displayName column to be NOT NULL
ALTER TABLE "User"
    ALTER COLUMN "displayName" SET NOT NULL;

-- Create a new unique index on the username column
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
