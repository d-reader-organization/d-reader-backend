-- AlterTable
ALTER TABLE IF EXISTS "Creator" RENAME COLUMN "twitter" to "twitterHandle";

-- UpdateColumn
UPDATE "Creator"
SET "twitterHandle" = CASE
    WHEN "twitterHandle" <> '' AND POSITION('/' IN "twitterHandle") > 0 
    THEN SUBSTRING("twitterHandle", LENGTH("twitterHandle") - POSITION('/' IN REVERSE("twitterHandle")) + 2)
    ELSE "twitterHandle"
END;