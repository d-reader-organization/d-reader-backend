-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('Marketing', 'DataAnalytics');

-- CreateTable
CREATE TABLE "UserPrivacyConsent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentType" "ConsentType" NOT NULL,

    CONSTRAINT "UserPrivacyConsent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserPrivacyConsent" ADD CONSTRAINT "UserPrivacyConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
