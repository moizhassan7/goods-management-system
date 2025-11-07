-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPERATOR', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPROVED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "LabourAssignmentStatus" AS ENUM ('ASSIGNED', 'DELIVERED', 'COLLECTED', 'SETTLED');

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

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
    "contactInfo" VARCHAR(100) NOT NULL,
    "opening_balance" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCatalog" (
    "id" SERIAL NOT NULL,
    "item_description" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ItemCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goods_Details" (
    "good_detail_id" SERIAL NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "item_name_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "delivery_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Goods_Details_pkey" PRIMARY KEY ("good_detail_id")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "transaction_id" SERIAL NOT NULL,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "party_type" VARCHAR(20) NOT NULL,
    "party_ref_id" INTEGER NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "credit_amount" DECIMAL(10,2) NOT NULL,
    "debit_amount" DECIMAL(10,2) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "register_number" VARCHAR(50) NOT NULL,
    "bility_number" VARCHAR(50) NOT NULL,
    "bility_date" DATE NOT NULL,
    "departure_city_id" INTEGER NOT NULL,
    "to_city_id" INTEGER,
    "forwarding_agency_id" INTEGER NOT NULL,
    "vehicle_number_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "walk_in_sender_name" VARCHAR(100),
    "walk_in_receiver_name" VARCHAR(100),
    "total_charges" DECIMAL(10,2) NOT NULL,
    "delivery_date" DATE,
    "remarks" TEXT,
    "total_delivery_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "station_expense" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bility_expense" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "station_labour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cart_labour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_expenses" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_day" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("register_number")
);

-- CreateTable
CREATE TABLE "Return_Shipment" (
    "id" SERIAL NOT NULL,
    "original_shipment_id" TEXT NOT NULL,
    "return_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(255) NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "action_taken" VARCHAR(255),
    "resolution_date" TIMESTAMPTZ(3),
    "comments" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Return_Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return_Items" (
    "id" SERIAL NOT NULL,
    "return_shipment_id" INTEGER NOT NULL,
    "goods_detail_id" INTEGER NOT NULL,
    "quantity_returned" INTEGER NOT NULL,
    "condition" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Return_Items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip_Log" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_name" VARCHAR(100) NOT NULL,
    "driver_mobile" VARCHAR(20) NOT NULL,
    "station_name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(50) NOT NULL,
    "date" DATE NOT NULL,
    "arrival_time" VARCHAR(10) NOT NULL,
    "departure_time" VARCHAR(10) NOT NULL,
    "total_fare_collected" DECIMAL(10,2) NOT NULL,
    "delivery_cut" DECIMAL(10,2) NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL,
    "arrears" DECIMAL(10,2) NOT NULL,
    "cuts" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "munsihna_reward" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "distant_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "accountant_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "received_amount" DECIMAL(10,2) NOT NULL,
    "fare_is_paid" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "delivery_cut_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "Trip_Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip_Shipment_Log" (
    "id" SERIAL NOT NULL,
    "trip_log_id" INTEGER NOT NULL,
    "bilty_number" VARCHAR(50) NOT NULL,
    "serial_number" INTEGER NOT NULL,
    "receiver_name" VARCHAR(100) NOT NULL,
    "item_details" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delivery_charges" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_Shipment_Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "delivery_id" SERIAL NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "delivery_date" DATE NOT NULL,
    "delivery_time" TIME(0),
    "station_expense" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bility_expense" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "station_labour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "cart_labour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_expenses" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "receiver_name" VARCHAR(100) NOT NULL,
    "receiver_phone" VARCHAR(20) NOT NULL,
    "receiver_cnic" VARCHAR(15) NOT NULL,
    "receiver_address" TEXT NOT NULL,
    "delivery_notes" TEXT,
    "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" VARCHAR(100),
    "approved_at" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "Vehicle_Transactions" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "shipment_id" VARCHAR(50),
    "trip_id" INTEGER,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credit_amount" DECIMAL(10,2) NOT NULL,
    "debit_amount" DECIMAL(10,2) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Vehicle_Transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Labour_Person" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "contact_info" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Labour_Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Labour_Assignment" (
    "id" SERIAL NOT NULL,
    "labour_person_id" INTEGER NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "assigned_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE,
    "status" "LabourAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "delivered_date" TIMESTAMPTZ(6),
    "collected_amount" DECIMAL(10,2),
    "settled_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Labour_Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_key" ON "Agency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCatalog_item_description_key" ON "ItemCatalog"("item_description");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_bility_number_key" ON "Shipment"("bility_number");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_Shipment_Log_trip_log_id_bilty_number_key" ON "Trip_Shipment_Log"("trip_log_id", "bilty_number");

-- AddForeignKey
ALTER TABLE "Goods_Details" ADD CONSTRAINT "Goods_Details_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goods_Details" ADD CONSTRAINT "Goods_Details_item_name_id_fkey" FOREIGN KEY ("item_name_id") REFERENCES "ItemCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Return_Shipment" ADD CONSTRAINT "Return_Shipment_original_shipment_id_fkey" FOREIGN KEY ("original_shipment_id") REFERENCES "Shipment"("register_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return_Items" ADD CONSTRAINT "Return_Items_return_shipment_id_fkey" FOREIGN KEY ("return_shipment_id") REFERENCES "Return_Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Return_Items" ADD CONSTRAINT "Return_Items_goods_detail_id_fkey" FOREIGN KEY ("goods_detail_id") REFERENCES "Goods_Details"("good_detail_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip_Log" ADD CONSTRAINT "Trip_Log_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip_Shipment_Log" ADD CONSTRAINT "Trip_Shipment_Log_trip_log_id_fkey" FOREIGN KEY ("trip_log_id") REFERENCES "Trip_Log"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle_Transactions" ADD CONSTRAINT "Vehicle_Transactions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle_Transactions" ADD CONSTRAINT "Vehicle_Transactions_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle_Transactions" ADD CONSTRAINT "Vehicle_Transactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip_Log"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labour_Assignment" ADD CONSTRAINT "Labour_Assignment_labour_person_id_fkey" FOREIGN KEY ("labour_person_id") REFERENCES "Labour_Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labour_Assignment" ADD CONSTRAINT "Labour_Assignment_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;
