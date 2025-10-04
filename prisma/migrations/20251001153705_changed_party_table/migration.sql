/*
  Warnings:

  - Added the required column `contactInfo` to the `Party` table without a default value. This is not possible if the table is not empty.
  - Added the required column `opening_balance` to the `Party` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "contactInfo" VARCHAR(100) NOT NULL,
ADD COLUMN     "opening_balance" DECIMAL(10,2) NOT NULL;
