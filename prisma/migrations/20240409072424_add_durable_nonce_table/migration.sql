-- CreateEnum
CREATE TYPE "DurableNonceStatus" AS ENUM ('Available', 'InUse');

-- CreateTable
CREATE TABLE "DurableNonce" (
    "address" TEXT NOT NULL,
    "status" "DurableNonceStatus" NOT NULL DEFAULT 'Available',
    "nonce" TEXT NOT NULL,

    CONSTRAINT "DurableNonce_pkey" PRIMARY KEY ("address")
);
