-- CreateIndex
CREATE INDEX "Party_name_idx" ON "Party"("name");

-- CreateIndex
CREATE INDEX "Goods_Details_shipment_id_idx" ON "Goods_Details"("shipment_id");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE INDEX "Shipment_created_day_idx" ON "Shipment"("created_day");

-- CreateIndex
CREATE INDEX "Shipment_bility_number_idx" ON "Shipment"("bility_number");

-- CreateIndex
CREATE INDEX "Shipment_vehicle_number_id_idx" ON "Shipment"("vehicle_number_id");

-- CreateIndex
CREATE INDEX "Shipment_delivery_date_idx" ON "Shipment"("delivery_date");
