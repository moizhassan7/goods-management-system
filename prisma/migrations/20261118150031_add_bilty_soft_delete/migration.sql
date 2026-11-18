-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "deleted_by_name" VARCHAR(100),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Shipment_is_deleted_idx" ON "Shipment"("is_deleted");

-- CreateIndex
CREATE INDEX "Shipment_deleted_at_idx" ON "Shipment"("deleted_at");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
