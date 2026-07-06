-- CreateEnum
CREATE TYPE "NivelAcessoPartilha" AS ENUM ('leitura');

-- AlterTable
ALTER TABLE "Partilha" ADD COLUMN     "nivelAcesso" "NivelAcessoPartilha" NOT NULL DEFAULT 'leitura',
ADD COLUMN     "revogadoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Partilha_empresaId_convidadoId_idx" ON "Partilha"("empresaId", "convidadoId");
