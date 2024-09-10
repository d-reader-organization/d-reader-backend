-- DropForeignKey
ALTER TABLE "CandyMachineGroup" DROP CONSTRAINT "CandyMachineGroup_candyMachineAddress_fkey";

-- AlterTable
ALTER TABLE "CandyMachineReceipt" DROP COLUMN "label",
ALTER COLUMN "couponId" SET NOT NULL;

-- DropTable
DROP TABLE "CandyMachineGroup";

-- DropEnum
DROP TYPE "WhiteListType";
