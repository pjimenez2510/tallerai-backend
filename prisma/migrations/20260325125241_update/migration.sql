-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "parent_id" TEXT,
ALTER COLUMN "order_number" SET DATA TYPE VARCHAR(30);

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_parent_id_idx" ON "work_orders"("tenant_id", "parent_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
