/*
  Warnings:

  - The primary key for the `Newsletter` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Newsletter` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Newsletter_email_key";

-- AlterTable
ALTER TABLE "Newsletter" DROP CONSTRAINT "Newsletter_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("email");
