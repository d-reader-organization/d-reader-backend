-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('Processing', 'Confirmed', 'Failed');

-- AlterTable
ALTER TABLE "CandyMachineReceipt" DROP CONSTRAINT "CandyMachineReceipt_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "numberOfItems" INTEGER,
ADD COLUMN     "status" "TransactionStatus",
ADD CONSTRAINT "CandyMachineReceipt_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CollectibleComic" ADD COLUMN "receiptId" INTEGER;

UPDATE "CandyMachineReceipt" SET "numberOfItems" = 1, status='Confirmed';

ALTER TABLE "CandyMachineReceipt" 
ALTER COLUMN "numberOfItems" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CollectibleComic" ADD CONSTRAINT "CollectibleComic_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CandyMachineReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update receipt id in collectible comic table
UPDATE "CollectibleComic" cc
SET "receiptId" = cmr.id
FROM "CandyMachineReceipt" cmr
WHERE cmr."collectibleComicAddress" = cc.address
  AND EXISTS (
    SELECT 1
    FROM "CandyMachineReceipt"
    WHERE "collectibleComicAddress" = cc.address
  );

-- DropForeignKey
ALTER TABLE "CandyMachineReceipt" DROP CONSTRAINT "CandyMachineReceipt_collectibleComicAddress_fkey";

ALTER TABLE "CandyMachineReceipt" DROP COLUMN "collectibleComicAddress";