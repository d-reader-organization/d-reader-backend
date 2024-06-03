-- CreateEnum
CREATE TYPE "TokenStandard" AS ENUM ('Legacy', 'Compression', 'Core');

-- AlterTable
ALTER TABLE "CandyMachine" ADD COLUMN     "standard" "TokenStandard" NOT NULL DEFAULT 'Legacy';
