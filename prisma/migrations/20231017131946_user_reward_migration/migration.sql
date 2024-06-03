-- AlterTable
ALTER TABLE "CandyMachineGroup" ALTER COLUMN "endDate" DROP NOT NULL,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rewardClaimedAt" TIMESTAMP(3);
