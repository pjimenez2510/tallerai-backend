-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('cedula', 'ruc', 'pasaporte');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'cedula',
    "document_number" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200),
    "phone" VARCHAR(20),
    "phone_secondary" VARCHAR(20),
    "address" VARCHAR(500),
    "notes" VARCHAR(2000),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "plate" VARCHAR(10) NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "year" INTEGER NOT NULL,
    "color" VARCHAR(50),
    "vin" VARCHAR(17),
    "engine" VARCHAR(100),
    "transmission" VARCHAR(50),
    "fuel_type" VARCHAR(30),
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(2000),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_tenant_id_is_active_idx" ON "clients"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "clients_tenant_id_name_idx" ON "clients"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tenant_id_document_number_key" ON "clients"("tenant_id", "document_number");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_client_id_idx" ON "vehicles"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_is_active_idx" ON "vehicles"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "vehicles_tenant_id_plate_idx" ON "vehicles"("tenant_id", "plate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tenant_id_plate_key" ON "vehicles"("tenant_id", "plate");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
