/*
  Warnings:

  - You are about to drop the column `walk_in_receiver_name` on the `Shipment` table. All the data in the column will be lost.
  - You are about to drop the column `walk_in_sender_name` on the `Shipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shipment" DROP COLUMN "walk_in_receiver_name",
DROP COLUMN "walk_in_sender_name";
