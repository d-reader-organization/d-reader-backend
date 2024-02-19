/*
  Warnings:

  - A unique constraint covering the columns `[token,userId]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Device_token_key";

-- CreateIndex
CREATE UNIQUE INDEX "Device_token_userId_key" ON "Device"("token", "userId");
