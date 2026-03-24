-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('recepcion', 'diagnostico', 'aprobado', 'en_progreso', 'completado', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('baja', 'normal', 'alta', 'urgente');

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_number" VARCHAR(20) NOT NULL,
    "client_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "assigned_to" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'recepcion',
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'normal',
    "description" VARCHAR(5000) NOT NULL,
    "diagnosis" VARCHAR(5000),
    "internal_notes" VARCHAR(5000),
    "mileage_in" INTEGER,
    "estimated_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "delivered_date" TIMESTAMP(3),
    "total_parts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_labor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_tasks" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "labor_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "labor_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_status_idx" ON "work_orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_client_id_idx" ON "work_orders"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_vehicle_id_idx" ON "work_orders"("tenant_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_assigned_to_idx" ON "work_orders"("tenant_id", "assigned_to");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_created_at_idx" ON "work_orders"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_tenant_id_order_number_key" ON "work_orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "work_order_tasks_work_order_id_idx" ON "work_order_tasks"("work_order_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_tasks" ADD CONSTRAINT "work_order_tasks_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
