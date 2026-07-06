/*
  Warnings:

  - Changed the type of `papel` on the `Utilizador` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('super_admin', 'admin_empresa', 'gestor', 'colaborador', 'convidado');

-- AlterTable
ALTER TABLE "Utilizador" DROP COLUMN "papel",
ADD COLUMN     "papel" "Papel" NOT NULL;

-- CreateTable
CREATE TABLE "RegraPermissao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,
    "modulo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL,
    "criadoPor" TEXT,
    "atualizadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraPermissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegraPermissao_empresaId_idx" ON "RegraPermissao"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "RegraPermissao_empresaId_papel_modulo_acao_key" ON "RegraPermissao"("empresaId", "papel", "modulo", "acao");

-- AddForeignKey
ALTER TABLE "RegraPermissao" ADD CONSTRAINT "RegraPermissao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Camada 2 (RLS) — mesmo padrão do Passo 4 (ADR-001 §3.3), estendido à nova
-- tabela de negócio (Especificação Técnica do Passo 5, 3.8).
ALTER TABLE "RegraPermissao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "RegraPermissao"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

-- Reverso documentado (não aplicado automaticamente):
-- DROP POLICY IF EXISTS tenant_isolation ON "RegraPermissao";
-- ALTER TABLE "RegraPermissao" DISABLE ROW LEVEL SECURITY;
-- DROP TABLE "RegraPermissao";
-- ALTER TABLE "Utilizador" ALTER COLUMN "papel" TYPE TEXT;
-- DROP TYPE "Papel";
