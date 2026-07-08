-- CreateEnum
CREATE TYPE "EstadoConvite" AS ENUM ('pendente', 'aceite', 'revogado');

-- CreateTable
CREATE TABLE "ConviteUtilizador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papelPretendido" "Papel" NOT NULL,
    "departamentoPretendidoId" TEXT,
    "token" TEXT NOT NULL,
    "estado" "EstadoConvite" NOT NULL DEFAULT 'pendente',
    "convidadoPorId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConviteUtilizador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConviteUtilizador_token_key" ON "ConviteUtilizador"("token");

-- CreateIndex
CREATE INDEX "ConviteUtilizador_empresaId_idx" ON "ConviteUtilizador"("empresaId");

-- AddForeignKey
ALTER TABLE "ConviteUtilizador" ADD CONSTRAINT "ConviteUtilizador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteUtilizador" ADD CONSTRAINT "ConviteUtilizador_departamentoPretendidoId_empresaId_fkey" FOREIGN KEY ("departamentoPretendidoId", "empresaId") REFERENCES "Departamento"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConviteUtilizador" ADD CONSTRAINT "ConviteUtilizador_convidadoPorId_empresaId_fkey" FOREIGN KEY ("convidadoPorId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;
