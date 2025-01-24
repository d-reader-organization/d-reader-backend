-- CreateEnum
CREATE TYPE "WalletProvider" AS ENUM ('NonCustodial', 'Embedded');

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "provider" "WalletProvider" NOT NULL DEFAULT 'NonCustodial';
