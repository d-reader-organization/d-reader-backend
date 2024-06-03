-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CollaboratorRole" ADD VALUE 'Advisor';
ALTER TYPE "CollaboratorRole" ADD VALUE 'Arist';
ALTER TYPE "CollaboratorRole" ADD VALUE 'CoWriter';
ALTER TYPE "CollaboratorRole" ADD VALUE 'Cover';
ALTER TYPE "CollaboratorRole" ADD VALUE 'Illustrator';
ALTER TYPE "CollaboratorRole" ADD VALUE 'Inker';
ALTER TYPE "CollaboratorRole" ADD VALUE 'Penciler';
ALTER TYPE "CollaboratorRole" ADD VALUE 'Translator';
