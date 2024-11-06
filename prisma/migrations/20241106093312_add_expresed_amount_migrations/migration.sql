/*
  Warnings:

  - You are about to drop the column `projectId` on the `UserInterestedReceipt` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectSlug,userId]` on the table `UserInterestedReceipt` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectSlug` to the `UserInterestedReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserInterestedReceipt_projectId_userId_key";

-- AlterTable
ALTER TABLE "UserInterestedReceipt" DROP COLUMN "projectId",
ADD COLUMN     "expressedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "projectSlug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserInterestedReceipt_projectSlug_userId_key" ON "UserInterestedReceipt"("projectSlug", "userId");
