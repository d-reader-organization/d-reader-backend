-- CreateEnum
CREATE TYPE "SignatureRequestStatus" AS ENUM ('Approved', 'Pending', 'Rejected');

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" SERIAL NOT NULL,
    "collectibleComicAddress" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL,
    "status" "SignatureRequestStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRequest_collectibleComicAddress_resolvedAt_key" ON "SignatureRequest"("collectibleComicAddress", "resolvedAt");

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_collectibleComicAddress_fkey" FOREIGN KEY ("collectibleComicAddress") REFERENCES "CollectibleComic"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
