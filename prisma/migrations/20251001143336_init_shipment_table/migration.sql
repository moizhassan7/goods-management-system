/*
  Warnings:

  - You are about to alter the column `name` on the `City` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "City" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);

-- DropTable
DROP TABLE "public"."Product";

-- CreateTable
CREATE TABLE "Agency" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "vehicleNumber" VARCHAR(50) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "register_number" VARCHAR(50) NOT NULL,
    "bility_number" VARCHAR(50) NOT NULL,
    "departure_city_id" INTEGER NOT NULL,
    "to_city_id" INTEGER,
    "forwarding_agency_id" INTEGER NOT NULL,
    "vehicle_number_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "total_charges" DECIMAL(10,2) NOT NULL,
    "delivery_date" DATE,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("register_number")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_bility_number_key" ON "Shipment"("bility_number");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_departure_city_id_fkey" FOREIGN KEY ("departure_city_id") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_forwarding_agency_id_fkey" FOREIGN KEY ("forwarding_agency_id") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_vehicle_number_id_fkey" FOREIGN KEY ("vehicle_number_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
