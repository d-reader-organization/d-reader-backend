-- CreateTable
CREATE TABLE "CandyMachineGroup" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "allowListSupply" INTEGER NOT NULL,
    "allowListUsed" INTEGER NOT NULL DEFAULT 0,
    "candyMachineAddress" TEXT NOT NULL,

    CONSTRAINT "CandyMachineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletCandyMachineGroup" (
    "walletAddress" TEXT NOT NULL,
    "candyMachineGroupId" INTEGER NOT NULL,

    CONSTRAINT "WalletCandyMachineGroup_pkey" PRIMARY KEY ("candyMachineGroupId","walletAddress")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandyMachineGroup_label_candyMachineAddress_key" ON "CandyMachineGroup"("label", "candyMachineAddress");

-- AddForeignKey
ALTER TABLE "CandyMachineGroup" ADD CONSTRAINT "CandyMachineGroup_candyMachineAddress_fkey" FOREIGN KEY ("candyMachineAddress") REFERENCES "CandyMachine"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletCandyMachineGroup" ADD CONSTRAINT "WalletCandyMachineGroup_walletAddress_fkey" FOREIGN KEY ("walletAddress") REFERENCES "Wallet"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletCandyMachineGroup" ADD CONSTRAINT "WalletCandyMachineGroup_candyMachineGroupId_fkey" FOREIGN KEY ("candyMachineGroupId") REFERENCES "CandyMachineGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
