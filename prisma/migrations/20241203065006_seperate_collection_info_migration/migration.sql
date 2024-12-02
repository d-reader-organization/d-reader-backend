-- AlterTable
ALTER TABLE "CollectibleComicCollection" ADD COLUMN     "creatorAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "creatorBackupAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN "isSecondarySaleActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sellerFeeBasisPoints" INTEGER NOT NULL DEFAULT 0;

UPDATE "CollectibleComicCollection" cc
SET 
    "creatorAddress" = ci."creatorAddress",
    "creatorBackupAddress" = ci."creatorBackupAddress",
    "isSecondarySaleActive" = ci."isSecondarySaleActive",
    "sellerFeeBasisPoints" = ci."sellerFeeBasisPoints"
FROM "ComicIssue" ci
WHERE cc."comicIssueId" = ci.id;

-- AlterTable
ALTER TABLE "ComicIssue" DROP COLUMN "creatorAddress",
DROP COLUMN "creatorBackupAddress",
DROP COLUMN "isSecondarySaleActive",
DROP COLUMN "sellerFeeBasisPoints";

-- AlterTable
ALTER TABLE "Creator" DROP COLUMN "lynkfire",
ADD COLUMN     "linktree" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "UserComic" DROP COLUMN "whitelistedAt";

-- AlterTable
ALTER TABLE "UserComicIssue" DROP COLUMN "whitelistedAt",
ADD COLUMN "pageNumberLastRead" INTEGER;
