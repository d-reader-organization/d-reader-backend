-- DropForeignKey
ALTER TABLE "UserInterestedReceipt" DROP CONSTRAINT "UserInterestedReceipt_walletAddress_fkey";

-- DropIndex
DROP INDEX "UserInterestedReceipt_transactionSignature_key";

-- AlterTable
ALTER TABLE "UserInterestedReceipt" DROP COLUMN "transactionSignature",
DROP COLUMN "walletAddress";
