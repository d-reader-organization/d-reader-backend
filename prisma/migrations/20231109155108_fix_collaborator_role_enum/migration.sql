/*
  Warnings:

  - The values [Arist,Cover] on the enum `CollaboratorRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CollaboratorRole_new" AS ENUM ('Advisor', 'Artist', 'CoWriter', 'Colorist', 'CoverArtist', 'Editor', 'Illustrator', 'Inker', 'Letterer', 'Penciler', 'Translator', 'Writer');
ALTER TABLE "ComicCollaborator" ALTER COLUMN "role" TYPE "CollaboratorRole_new" USING ("role"::text::"CollaboratorRole_new");
ALTER TABLE "ComicIssueCollaborator" ALTER COLUMN "role" TYPE "CollaboratorRole_new" USING ("role"::text::"CollaboratorRole_new");
ALTER TYPE "CollaboratorRole" RENAME TO "CollaboratorRole_old";
ALTER TYPE "CollaboratorRole_new" RENAME TO "CollaboratorRole";
DROP TYPE "CollaboratorRole_old";
COMMIT;
