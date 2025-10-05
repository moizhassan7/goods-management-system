-- AlterTable
ALTER TABLE `delivery` MODIFY `delivery_time` TIME(0) NULL,
    MODIFY `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    MODIFY `updatedAt` DATETIME(6) NOT NULL;

-- AlterTable
ALTER TABLE `goods_details` MODIFY `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    MODIFY `updatedAt` DATETIME(6) NOT NULL;

-- AlterTable
ALTER TABLE `itemcatalog` MODIFY `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    MODIFY `updatedAt` DATETIME(6) NOT NULL;

-- AlterTable
ALTER TABLE `shipment` MODIFY `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    MODIFY `updatedAt` DATETIME(6) NOT NULL;

-- AlterTable
ALTER TABLE `transactions` MODIFY `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    MODIFY `updatedAt` DATETIME(6) NOT NULL;

-- CreateTable
CREATE TABLE `Trip_Log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicle_id` INTEGER NOT NULL,
    `driver_name` VARCHAR(100) NOT NULL,
    `driver_mobile` VARCHAR(20) NOT NULL,
    `station_name` VARCHAR(100) NOT NULL,
    `city` VARCHAR(50) NOT NULL,
    `date` DATE NOT NULL,
    `arrival_time` VARCHAR(10) NOT NULL,
    `departure_time` VARCHAR(10) NOT NULL,
    `total_fare_collected` DECIMAL(10, 2) NOT NULL,
    `delivery_cut` DECIMAL(10, 2) NOT NULL,
    `commission` DECIMAL(10, 2) NOT NULL,
    `received_amount` DECIMAL(10, 2) NOT NULL,
    `accountant_reward` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `remaining_fare` DECIMAL(10, 2) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trip_Shipment_Log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trip_log_id` INTEGER NOT NULL,
    `shipment_id` VARCHAR(50) NOT NULL,
    `serial_number` INTEGER NOT NULL,
    `receiver_name` VARCHAR(100) NOT NULL,
    `item_details` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `delivery_charges` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `Trip_Shipment_Log_trip_log_id_shipment_id_key`(`trip_log_id`, `shipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Trip_Log` ADD CONSTRAINT `Trip_Log_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip_Shipment_Log` ADD CONSTRAINT `Trip_Shipment_Log_trip_log_id_fkey` FOREIGN KEY (`trip_log_id`) REFERENCES `Trip_Log`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trip_Shipment_Log` ADD CONSTRAINT `Trip_Shipment_Log_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;
