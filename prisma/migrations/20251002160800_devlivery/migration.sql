/*
  Warnings:

  - You are about to drop the column `deliverability_charges` on the `Goods_Details` table. All the data in the column will be lost.
  - You are about to drop the column `extra_charges` on the `Goods_Details` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Goods_Details" DROP COLUMN "deliverability_charges",
DROP COLUMN "extra_charges",
ADD COLUMN     "delivery_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ALTER COLUMN "charges" SET DEFAULT 0.00;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "total_delivery_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
