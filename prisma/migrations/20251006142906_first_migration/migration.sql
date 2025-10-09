/*
  Warnings:

  - You are about to drop the column `accountant_munsiana` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `arrears` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `delivery_cut` on the `trip_log` table. All the data in the column will be lost.
  - You are about to drop the column `reward` on the `trip_log` table. All the data in the column will be lost.
  - Added the required column `delivery_charges` to the `Trip_Log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaining_fare` to the `Trip_Log` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `delivery` DROP FOREIGN KEY `Delivery_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `trip_shipment_log` DROP FOREIGN KEY `Trip_Shipment_Log_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `trip_shipment_log` DROP FOREIGN KEY `Trip_Shipment_Log_trip_log_id_fkey`;

-- DropIndex
DROP INDEX `Delivery_shipment_id_fkey` ON `delivery`;

-- DropIndex
DROP INDEX `Trip_Shipment_Log_shipment_id_fkey` ON `trip_shipment_log`;

-- AlterTable
ALTER TABLE `trip_log` DROP COLUMN `accountant_munsiana`,
    DROP COLUMN `arrears`,
    DROP COLUMN `delivery_cut`,
    DROP COLUMN `reward`,
    ADD COLUMN `delivery_charges` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `munsihna` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `remaining_fare` DECIMAL(10, 2) NOT NULL;

-- AddForeignKey
ALTER TABLE `Trip_Shipment_Log` ADD CONSTRAINT `Trip_Shipment_Log_trip_log_id_fkey` FOREIGN KEY (`trip_log_id`) REFERENCES `Trip_Log`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip_Shipment_Log` ADD CONSTRAINT `Trip_Shipment_Log_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;
