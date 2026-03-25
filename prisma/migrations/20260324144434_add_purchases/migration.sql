-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "client_signature" TEXT,
ADD COLUMN     "signature_date" TIMESTAMP(3);
