-- CreateTable
CREATE TABLE "MintReceipt" (
    "id" SERIAL NOT NULL,
    "buyer" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "comicIssueCandyMachineAddress" TEXT NOT NULL,
    "comicIssueNftAddress" TEXT NOT NULL,

    CONSTRAINT "MintReceipt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MintReceipt" ADD CONSTRAINT "MintReceipt_comicIssueCandyMachineAddress_fkey" FOREIGN KEY ("comicIssueCandyMachineAddress") REFERENCES "ComicIssueCandyMachine"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MintReceipt" ADD CONSTRAINT "MintReceipt_comicIssueNftAddress_fkey" FOREIGN KEY ("comicIssueNftAddress") REFERENCES "ComicIssueNft"("address") ON DELETE CASCADE ON UPDATE CASCADE;
