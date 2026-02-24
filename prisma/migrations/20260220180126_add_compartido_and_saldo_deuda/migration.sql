-- AlterTable
ALTER TABLE "Movimiento" ADD COLUMN     "cuotaInfo" TEXT,
ADD COLUMN     "esCompartido" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SaldoDeuda" (
    "id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "SaldoDeuda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaldoDeuda_organizationId_idx" ON "SaldoDeuda"("organizationId");

-- CreateIndex
CREATE INDEX "SaldoDeuda_organizationId_creadoEn_idx" ON "SaldoDeuda"("organizationId", "creadoEn");

-- CreateIndex
CREATE INDEX "Movimiento_organizationId_esCompartido_idx" ON "Movimiento"("organizationId", "esCompartido");

-- AddForeignKey
ALTER TABLE "SaldoDeuda" ADD CONSTRAINT "SaldoDeuda_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
