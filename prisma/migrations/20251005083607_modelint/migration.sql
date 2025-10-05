-- CreateTable
CREATE TABLE `City` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `City_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Agency` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `Agency_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehicleNumber` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Vehicle_vehicleNumber_key`(`vehicleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Party` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `contactInfo` VARCHAR(100) NOT NULL,
    `opening_balance` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemCatalog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_description` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ItemCatalog_item_description_key`(`item_description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Goods_Details` (
    `good_detail_id` INTEGER NOT NULL AUTO_INCREMENT,
    `shipment_id` VARCHAR(50) NOT NULL,
    `item_name_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `charges` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `delivery_charges` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`good_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transactions` (
    `transaction_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_date` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `party_type` VARCHAR(20) NOT NULL,
    `party_ref_id` INTEGER NOT NULL,
    `shipment_id` VARCHAR(50) NOT NULL,
    `credit_amount` DECIMAL(10, 2) NOT NULL,
    `debit_amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shipment` (
    `register_number` VARCHAR(50) NOT NULL,
    `bility_number` VARCHAR(50) NOT NULL,
    `bility_date` DATE NOT NULL,
    `departure_city_id` INTEGER NOT NULL,
    `to_city_id` INTEGER NULL,
    `forwarding_agency_id` INTEGER NOT NULL,
    `vehicle_number_id` INTEGER NOT NULL,
    `sender_id` INTEGER NOT NULL,
    `receiver_id` INTEGER NOT NULL,
    `walk_in_sender_name` VARCHAR(100) NULL,
    `walk_in_receiver_name` VARCHAR(100) NULL,
    `total_charges` DECIMAL(10, 2) NOT NULL,
    `delivery_date` DATE NULL,
    `remarks` TEXT NULL,
    `total_delivery_charges` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Shipment_bility_number_key`(`bility_number`),
    PRIMARY KEY (`register_number`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delivery` (
    `delivery_id` INTEGER NOT NULL AUTO_INCREMENT,
    `shipment_id` VARCHAR(50) NOT NULL,
    `delivery_date` DATE NOT NULL,
    `delivery_time` TIME(6) NULL,
    `station_expense` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `bility_expense` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `station_labour` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cart_labour` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_expenses` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `receiver_name` VARCHAR(100) NOT NULL,
    `receiver_phone` VARCHAR(20) NOT NULL,
    `receiver_cnic` VARCHAR(15) NOT NULL,
    `receiver_address` TEXT NOT NULL,
    `delivery_notes` TEXT NULL,
    `delivery_status` VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`delivery_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Goods_Details` ADD CONSTRAINT `Goods_Details_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goods_Details` ADD CONSTRAINT `Goods_Details_item_name_id_fkey` FOREIGN KEY (`item_name_id`) REFERENCES `ItemCatalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transactions` ADD CONSTRAINT `Transactions_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_departure_city_id_fkey` FOREIGN KEY (`departure_city_id`) REFERENCES `City`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_to_city_id_fkey` FOREIGN KEY (`to_city_id`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_forwarding_agency_id_fkey` FOREIGN KEY (`forwarding_agency_id`) REFERENCES `Agency`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_vehicle_number_id_fkey` FOREIGN KEY (`vehicle_number_id`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `Party`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `Party`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;
