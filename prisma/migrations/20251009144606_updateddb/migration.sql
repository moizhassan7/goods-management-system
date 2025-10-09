-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "vehicleNumber" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactInfo" TEXT NOT NULL,
    "opening_balance" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCatalog" (
    "id" SERIAL NOT NULL,
    "item_description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goods_Details" (
    "good_detail_id" SERIAL NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "item_name_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "charges" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "delivery_charges" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goods_Details_pkey" PRIMARY KEY ("good_detail_id")
);

-- CreateTable
CREATE TABLE "Transactions" (
    "transaction_id" SERIAL NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "party_type" TEXT NOT NULL,
    "party_ref_id" INTEGER NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "credit_amount" DECIMAL(65,30) NOT NULL,
    "debit_amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "register_number" TEXT NOT NULL,
    "bility_number" TEXT NOT NULL,
    "bility_date" TIMESTAMP(3) NOT NULL,
    "departure_city_id" INTEGER NOT NULL,
    "to_city_id" INTEGER,
    "forwarding_agency_id" INTEGER NOT NULL,
    "vehicle_number_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "walk_in_sender_name" TEXT,
    "walk_in_receiver_name" TEXT,
    "total_charges" DECIMAL(65,30) NOT NULL,
    "delivery_date" TIMESTAMP(3),
    "remarks" TEXT,
    "total_delivery_charges" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("register_number")
);

-- CreateTable
CREATE TABLE "Trip_Log" (
    "id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_name" TEXT NOT NULL,
    "driver_mobile" TEXT NOT NULL,
    "station_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "arrival_time" TEXT NOT NULL,
    "departure_time" TEXT NOT NULL,
    "total_fare_collected" DECIMAL(65,30) NOT NULL,
    "delivery_cut" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "arrears" DECIMAL(65,30) NOT NULL,
    "cuts" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "munsihna_reward" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "distant_charges" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "accountant_charges" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "received_amount" DECIMAL(65,30) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip_Shipment_Log" (
    "id" SERIAL NOT NULL,
    "trip_log_id" INTEGER NOT NULL,
    "bilty_number" TEXT NOT NULL,
    "serial_number" INTEGER NOT NULL,
    "receiver_name" TEXT NOT NULL,
    "item_details" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delivery_charges" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_Shipment_Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "delivery_id" SERIAL NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL,
    "delivery_time" TIMESTAMP(3),
    "station_expense" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "bility_expense" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "station_labour" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "cart_labour" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "total_expenses" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "receiver_name" TEXT NOT NULL,
    "receiver_phone" TEXT NOT NULL,
    "receiver_cnic" TEXT NOT NULL,
    "receiver_address" TEXT NOT NULL,
    "delivery_notes" TEXT,
    "delivery_status" TEXT NOT NULL DEFAULT 'DELIVERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("delivery_id")
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
ALTER TABLE "Trip_Log" ADD CONSTRAINT "Trip_Log_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip_Shipment_Log" ADD CONSTRAINT "Trip_Shipment_Log_trip_log_id_fkey" FOREIGN KEY ("trip_log_id") REFERENCES "Trip_Log"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;
