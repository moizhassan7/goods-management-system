-- Keep the newest delivery when a shipment already has duplicates.
DELETE FROM "Delivery" AS older
USING "Delivery" AS newer
WHERE older.shipment_id = newer.shipment_id
  AND (
    older."createdAt" < newer."createdAt"
    OR (older."createdAt" = newer."createdAt" AND older.delivery_id < newer.delivery_id)
  );

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_shipment_id_key" ON "Delivery"("shipment_id");

-- CreateIndex
CREATE INDEX "Transactions_shipment_id_idx" ON "Transactions"("shipment_id");

-- CreateIndex
CREATE INDEX "Labour_Assignment_shipment_id_idx" ON "Labour_Assignment"("shipment_id");
