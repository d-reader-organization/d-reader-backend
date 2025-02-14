-- AlterTable
ALTER TABLE "UserInterestedReceipt" ADD COLUMN     "referrerId" INTEGER;

-- AddForeignKey
ALTER TABLE "UserInterestedReceipt" ADD CONSTRAINT "UserInterestedReceipt_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
