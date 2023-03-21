-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "nftAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "tradeStateAddress" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "feePayer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);
