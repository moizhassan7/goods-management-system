-- CreateTable
CREATE TABLE `Labour_Person` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `contact_info` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Labour_Assignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `labour_person_id` INTEGER NOT NULL,
    `shipment_id` VARCHAR(50) NOT NULL,
    `assigned_date` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `due_date` DATE NULL,
    `status` ENUM('ASSIGNED', 'DELIVERED', 'COLLECTED', 'SETTLED') NOT NULL DEFAULT 'ASSIGNED',
    `delivered_date` DATETIME(6) NULL,
    `collected_amount` DECIMAL(10, 2) NULL,
    `settled_date` DATETIME(6) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updatedAt` DATETIME(6) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Labour_Assignment` ADD CONSTRAINT `Labour_Assignment_labour_person_id_fkey` FOREIGN KEY (`labour_person_id`) REFERENCES `Labour_Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Labour_Assignment` ADD CONSTRAINT `Labour_Assignment_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `Shipment`(`register_number`) ON DELETE RESTRICT ON UPDATE CASCADE;
