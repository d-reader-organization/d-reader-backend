-- DropForeignKey
ALTER TABLE "ComicCollaborator" DROP CONSTRAINT "ComicCollaborator_comicSlug_fkey";

-- DropForeignKey
ALTER TABLE "ComicIssueCollaborator" DROP CONSTRAINT "ComicIssueCollaborator_comicIssueId_fkey";

-- DropForeignKey
ALTER TABLE "RoyaltyWallet" DROP CONSTRAINT "RoyaltyWallet_comicIssueId_fkey";

-- DropForeignKey
ALTER TABLE "StatefulCover" DROP CONSTRAINT "StatefulCover_comicIssueId_fkey";

-- DropForeignKey
ALTER TABLE "StatelessCover" DROP CONSTRAINT "StatelessCover_comicIssueId_fkey";

-- DropForeignKey
ALTER TABLE "WalletCandyMachineGroup" DROP CONSTRAINT "WalletCandyMachineGroup_candyMachineGroupId_fkey";

-- AddForeignKey
ALTER TABLE "RoyaltyWallet" ADD CONSTRAINT "RoyaltyWallet_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicCollaborator" ADD CONSTRAINT "ComicCollaborator_comicSlug_fkey" FOREIGN KEY ("comicSlug") REFERENCES "Comic"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComicIssueCollaborator" ADD CONSTRAINT "ComicIssueCollaborator_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatelessCover" ADD CONSTRAINT "StatelessCover_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatefulCover" ADD CONSTRAINT "StatefulCover_comicIssueId_fkey" FOREIGN KEY ("comicIssueId") REFERENCES "ComicIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletCandyMachineGroup" ADD CONSTRAINT "WalletCandyMachineGroup_candyMachineGroupId_fkey" FOREIGN KEY ("candyMachineGroupId") REFERENCES "CandyMachineGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
