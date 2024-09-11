-- DropForeignKey
ALTER TABLE "CandyMachineGroup" DROP CONSTRAINT "CandyMachineGroup_candyMachineAddress_fkey";

-- AlterTable
ALTER TABLE "CandyMachineReceipt" ALTER COLUMN "couponId" SET NOT NULL;

-- DropTable
DROP TABLE "CandyMachineGroup";

-- DropEnum
DROP TYPE "WhiteListType";
