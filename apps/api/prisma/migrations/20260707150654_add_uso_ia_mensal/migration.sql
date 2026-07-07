-- CreateTable
CREATE TABLE "UsoIAMensal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "anoMes" TEXT NOT NULL,
    "contagem" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsoIAMensal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsoIAMensal_empresaId_idx" ON "UsoIAMensal"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "UsoIAMensal_empresaId_anoMes_key" ON "UsoIAMensal"("empresaId", "anoMes");

-- AddForeignKey
ALTER TABLE "UsoIAMensal" ADD CONSTRAINT "UsoIAMensal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
