-- CreateTable
CREATE TABLE "DraftComicIssueSalesData" (
    "id" SERIAL NOT NULL,
    "comicIssueId" INTEGER NOT NULL,
    "revenueRange" TEXT NOT NULL,
    "supplyRange" TEXT NOT NULL,
    "launchDateRange" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL,
    "royaltyBasisPoint" INTEGER NOT NULL DEFAULT 0,
    "royaltyAddress" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "DraftComicIssueSalesData_pkey" PRIMARY KEY ("id")
);
