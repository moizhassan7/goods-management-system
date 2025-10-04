-- CreateTable
CREATE TABLE "Goods_Details" (
    "good_detail_id" SERIAL NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "item_name_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "charges" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- AddForeignKey
ALTER TABLE "Goods_Details" ADD CONSTRAINT "Goods_Details_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goods_Details" ADD CONSTRAINT "Goods_Details_item_name_id_fkey" FOREIGN KEY ("item_name_id") REFERENCES "ItemCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;
