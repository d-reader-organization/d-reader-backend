-- CreateTable
CREATE TABLE "MintReceipt" (
    "id" SERIAL NOT NULL,
    "buyer" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "mintedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "MintReceipt_pkey" PRIMARY KEY ("id")
);
