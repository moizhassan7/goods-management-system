-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('PAID', 'TO_COLLECT');

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "bility_number" VARCHAR(50) NOT NULL,
    "booking_date" DATE NOT NULL,
    "from_city_id" INTEGER NOT NULL,
    "to_city_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "karaya" DECIMAL(10,2) NOT NULL,
    "station_rent" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "bility_expense" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "station_labour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_status" "BookingPaymentStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking_Item" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "item_name_id" INTEGER NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "Booking_Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bility_number_key" ON "Booking"("bility_number");

-- CreateIndex
CREATE INDEX "Booking_booking_date_idx" ON "Booking"("booking_date");

-- CreateIndex
CREATE INDEX "Booking_payment_status_idx" ON "Booking"("payment_status");

-- CreateIndex
CREATE INDEX "Booking_Item_booking_id_idx" ON "Booking_Item"("booking_id");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_from_city_id_fkey" FOREIGN KEY ("from_city_id") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_to_city_id_fkey" FOREIGN KEY ("to_city_id") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking_Item" ADD CONSTRAINT "Booking_Item_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking_Item" ADD CONSTRAINT "Booking_Item_item_name_id_fkey" FOREIGN KEY ("item_name_id") REFERENCES "ItemCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
