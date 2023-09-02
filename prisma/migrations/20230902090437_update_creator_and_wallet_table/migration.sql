-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "tippingAddress" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "label" TEXT NOT NULL DEFAULT '';
