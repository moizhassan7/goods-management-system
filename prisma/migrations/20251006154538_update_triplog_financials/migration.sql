/*
  Warnings:

  - You are about to drop the column `delivery_charges` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `munsihna` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `remaining_fare` on the `trip_log` table. All the data in the column will be lost.
  - Added the required column `arrears` to the `Trip_Log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_cut` to the `Trip_Log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `trip_log` DROP COLUMN `delivery_charges`,
    DROP COLUMN `munsihna`,
    DROP COLUMN `remaining_fare`,
    ADD COLUMN `arrears` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `delivery_cut` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `munsihna_reward` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
