-- CreateEnum
CREATE TYPE "NonceAccountStatus" AS ENUM ('Available', 'Loaded');

-- CreateTable
CREATE TABLE "NonceAccount" (
    "address" TEXT NOT NULL,
    "status" "NonceAccountStatus" NOT NULL DEFAULT 'Available',
    "nonce" TEXT NOT NULL,

    CONSTRAINT "NonceAccount_pkey" PRIMARY KEY ("address")
);

-- CreateIndex
CREATE UNIQUE INDEX "NonceAccount_nonce_key" ON "NonceAccount"("nonce");
