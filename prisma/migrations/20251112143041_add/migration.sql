-- CreateTable
CREATE TABLE "Labour_Payment_History" (
    "id" SERIAL NOT NULL,
    "labour_person_id" INTEGER NOT NULL,
    "shipment_id" VARCHAR(50) NOT NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Labour_Payment_History_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Labour_Payment_History" ADD CONSTRAINT "Labour_Payment_History_labour_person_id_fkey" FOREIGN KEY ("labour_person_id") REFERENCES "Labour_Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labour_Payment_History" ADD CONSTRAINT "Labour_Payment_History_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "Shipment"("register_number") ON DELETE RESTRICT ON UPDATE CASCADE;
