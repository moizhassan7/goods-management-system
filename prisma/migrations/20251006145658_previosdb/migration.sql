/*
  Warnings:

  - You are about to drop the column `accountants` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `arrears` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_cut` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `munsihna_reward` on the `trip_log` table. All the data in the column will be lost.
  - Added the required column `delivery_charges` to the `Trip_Log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaining_fare` to the `Trip_Log` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `trip_log` DROP COLUMN `accountants`,
    DROP COLUMN `arrears`,
    DROP COLUMN `delivery_cut`,
    DROP COLUMN `munsihna_reward`,
    ADD COLUMN `delivery_charges` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `munsihna` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `remaining_fare` DECIMAL(10, 2) NOT NULL;
