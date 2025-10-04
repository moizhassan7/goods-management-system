/*
  Warnings:

  - Added the required column `bility_date` to the `Shipment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Goods_Details" ADD COLUMN     "deliverability_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "extra_charges" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "bility_date" DATE NOT NULL,
ADD COLUMN     "walk_in_receiver_name" VARCHAR(100),
ADD COLUMN     "walk_in_sender_name" VARCHAR(100);
