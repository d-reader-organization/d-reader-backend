-- DropForeignKey
ALTER TABLE "Nft" DROP CONSTRAINT "Nft_candyMachineAddress_fkey";

-- DropForeignKey
ALTER TABLE "Nft" DROP CONSTRAINT "Nft_collectionNftAddress_fkey";

-- AlterTable
ALTER TABLE "Nft" ALTER COLUMN "candyMachineAddress" DROP NOT NULL,
ALTER COLUMN "collectionNftAddress" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Listing" (
    "mint" TEXT NOT NULL,
    "tradeStateAddress" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "feePayer" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("mint")
);

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nft" ADD CONSTRAINT "Nft_collectionNftAddress_fkey" FOREIGN KEY ("collectionNftAddress") REFERENCES "CollectionNft"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_mint_fkey" FOREIGN KEY ("mint") REFERENCES "Nft"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
