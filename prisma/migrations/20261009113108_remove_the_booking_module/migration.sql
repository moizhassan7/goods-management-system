/*
  Warnings:

  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Booking_Item` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_from_city_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_to_city_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking_Item" DROP CONSTRAINT "Booking_Item_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking_Item" DROP CONSTRAINT "Booking_Item_item_name_id_fkey";

-- DropTable
DROP TABLE "public"."Booking";

-- DropTable
DROP TABLE "public"."Booking_Item";

-- DropEnum
DROP TYPE "public"."BookingPaymentStatus";
