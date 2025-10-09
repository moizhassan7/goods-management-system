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

-- AddForeignKey
ALTER TABLE `Trip_Shipment_Log` ADD CONSTRAINT `Trip_Shipment_Log_trip_log_id_fkey` FOREIGN KEY (`trip_log_id`) REFERENCES `Trip_Log`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip_Shipment_Log` ADD CONSTRAINT `Trip_Shipment_Log_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE CASCADE ON UPDATE CASCADE;
