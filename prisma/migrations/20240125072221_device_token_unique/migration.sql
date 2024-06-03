/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Device_token_key" ON "Device"("token");
