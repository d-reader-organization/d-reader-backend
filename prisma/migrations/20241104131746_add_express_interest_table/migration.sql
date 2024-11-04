-- CreateTable
CREATE TABLE "UserInterestedReceipt" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "transactionSignature" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserInterestedReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserInterestedReceipt_transactionSignature_key" ON "UserInterestedReceipt"("transactionSignature");

-- CreateIndex
CREATE UNIQUE INDEX "UserInterestedReceipt_projectId_userId_key" ON "UserInterestedReceipt"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "UserInterestedReceipt" ADD CONSTRAINT "UserInterestedReceipt_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInterestedReceipt" ADD CONSTRAINT "UserInterestedReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
