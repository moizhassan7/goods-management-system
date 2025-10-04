-- CreateTable
CREATE TABLE "Delivery" (
    "delivery_id" SERIAL NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "delivery_date" DATE NOT NULL,
    "delivery_time" TIMESTAMPTZ(6),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("delivery_id")
);

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;
