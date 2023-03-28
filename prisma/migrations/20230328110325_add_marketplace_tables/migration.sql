-- CreateTable
CREATE TABLE "Metadata" (
    "uri" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL,
    "isSigned" BOOLEAN NOT NULL,

    CONSTRAINT "Metadata_pkey" PRIMARY KEY ("uri")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "uri" TEXT NOT NULL,
    "nftAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "feePayer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_nftAddress_canceledAt_key" ON "Listing"("nftAddress", "canceledAt");

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_uri_fkey" FOREIGN KEY ("uri") REFERENCES "Metadata"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_uri_fkey" FOREIGN KEY ("uri") REFERENCES "Metadata"("uri") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerAddress_fkey" FOREIGN KEY ("sellerAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
