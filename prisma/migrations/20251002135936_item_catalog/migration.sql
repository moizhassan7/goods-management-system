-- CreateTable
CREATE TABLE "ItemCatalog" (
    "id" SERIAL NOT NULL,
    "item_description" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemCatalog_item_description_key" ON "ItemCatalog"("item_description");
