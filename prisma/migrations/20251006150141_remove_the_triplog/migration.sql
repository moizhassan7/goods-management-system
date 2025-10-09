/*
  Warnings:

  - You are about to drop the `trip_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `trip_shipment_log` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `trip_log` DROP FOREIGN KEY `Trip_Log_vehicle_id_fkey`;

-- DropForeignKey
ALTER TABLE `trip_shipment_log` DROP FOREIGN KEY `Trip_Shipment_Log_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `trip_shipment_log` DROP FOREIGN KEY `Trip_Shipment_Log_trip_log_id_fkey`;

-- DropTable
DROP TABLE `trip_log`;

-- DropTable
DROP TABLE `trip_shipment_log`;
