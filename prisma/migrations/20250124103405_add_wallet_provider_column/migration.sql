-- CreateEnum
CREATE TYPE "WalletProvider" AS ENUM ('NonCustodial', 'Privy');

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "provider" "WalletProvider" NOT NULL DEFAULT 'NonCustodial';
