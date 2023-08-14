-- CreateTable
CREATE TABLE "AllowList" (
    "id" SERIAL NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "whitelistSupply" INTEGER NOT NULL,
    "whitelistUsed" INTEGER NOT NULL DEFAULT 0,
    "candyMachineAddress" TEXT NOT NULL,

    CONSTRAINT "AllowList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowListOnWallets" (
    "id" SERIAL NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "allowListId" INTEGER NOT NULL,

    CONSTRAINT "AllowListOnWallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowList_groupLabel_candyMachineAddress_key" ON "AllowList"("groupLabel", "candyMachineAddress");

-- AddForeignKey
ALTER TABLE "AllowList" ADD CONSTRAINT "AllowList_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowListOnWallets" ADD CONSTRAINT "AllowListOnWallets_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowListOnWallets" ADD CONSTRAINT "AllowListOnWallets_allowListId_fkey" FOREIGN KEY ("allowListId") REFERENCES "AllowList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
