/*
  Warnings:

  - You are about to drop the column `accountant_reward` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `remaining_fare` on the `trip_log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `trip_log` DROP COLUMN `accountant_reward`,
    DROP COLUMN `remaining_fare`,
    ADD COLUMN `accountant_munsiana` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `arrears` DECIMAL(10, 2) NULL,
    ADD COLUMN `cuts` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `distant_charges` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `reward` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
