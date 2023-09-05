-- CreateEnum
CREATE TYPE "GlobalStatusType" AS ENUM ('Success', 'Info', 'Warning', 'Maintenance');

-- CreateTable
CREATE TABLE "GlobalStatus" (
    "id" SERIAL NOT NULL,
    "type" "GlobalStatusType" NOT NULL,
    "message" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GlobalStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalStatus_type_expiresAt_key" ON "GlobalStatus"("type", "expiresAt");
