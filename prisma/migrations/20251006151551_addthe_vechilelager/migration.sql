-- CreateTable
CREATE TABLE `Vehicle_Ledger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ledger_date` DATE NOT NULL,
    `vehicle_number_id` INTEGER NOT NULL,
    `departure_city_id` INTEGER NOT NULL,
    `arrival_city_id` INTEGER NOT NULL,
    `station_name` VARCHAR(100) NOT NULL,
    `driver_name` VARCHAR(100) NOT NULL,
    `driver_contact` VARCHAR(20) NOT NULL,
    `total_delivery_charges` DECIMAL(10, 2) NOT NULL,
    `delivery_cut` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `munshiana` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `rewards` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `arrears` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cuts` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `distant_charges` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle_Ledger_Shipments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ledger_id` INTEGER NOT NULL,
    `shipment_id` VARCHAR(50) NOT NULL,
    `bility_delivery_charges` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `Vehicle_Ledger_Shipments_ledger_id_shipment_id_key`(`ledger_id`, `shipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Vehicle_Ledger` ADD CONSTRAINT `Vehicle_Ledger_vehicle_number_id_fkey` FOREIGN KEY (`vehicle_number_id`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle_Ledger` ADD CONSTRAINT `Vehicle_Ledger_departure_city_id_fkey` FOREIGN KEY (`departure_city_id`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle_Ledger` ADD CONSTRAINT `Vehicle_Ledger_arrival_city_id_fkey` FOREIGN KEY (`arrival_city_id`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle_Ledger_Shipments` ADD CONSTRAINT `Vehicle_Ledger_Shipments_ledger_id_fkey` FOREIGN KEY (`ledger_id`) REFERENCES `Vehicle_Ledger`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle_Ledger_Shipments` ADD CONSTRAINT `Vehicle_Ledger_Shipments_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;
