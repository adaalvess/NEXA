-- CreateTable
CREATE TABLE "ConsentimentoRegisto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "versaoTermos" TEXT NOT NULL,
    "versaoPrivacidade" TEXT NOT NULL,
    "aceiteEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentimentoRegisto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentimentoRegisto_empresaId_idx" ON "ConsentimentoRegisto"("empresaId");

-- AddForeignKey
ALTER TABLE "ConsentimentoRegisto" ADD CONSTRAINT "ConsentimentoRegisto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentimentoRegisto" ADD CONSTRAINT "ConsentimentoRegisto_utilizadorId_empresaId_fkey" FOREIGN KEY ("utilizadorId", "empresaId") REFERENCES "Utilizador"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Imutabilidade a nível de BD (Especificação Técnica do Passo 47, Decisão B,
-- aprovada pela Fundadora/CEO) — mesmo padrão do RegistoAuditoria (Passo 6,
-- migração 20260706124533): aplica-se a TODOS os roles, incluindo o owner.
-- Um registo de consentimento é prova legal permanente; se uma política mudar
-- de versão, o fluxo cria um NOVO registo, nunca altera um já existente.
CREATE OR REPLACE FUNCTION consentimento_registo_imutavel() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ConsentimentoRegisto é append-only — UPDATE/DELETE nunca são permitidos (Especificação Técnica do Passo 47)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consentimento_registo_imutavel
  BEFORE UPDATE OR DELETE ON "ConsentimentoRegisto"
  FOR EACH ROW EXECUTE FUNCTION consentimento_registo_imutavel();

-- Reverso documentado (mesmo padrão do Passo 6), não aplicado automaticamente:
-- DROP TRIGGER IF EXISTS trg_consentimento_registo_imutavel ON "ConsentimentoRegisto";
-- DROP FUNCTION IF EXISTS consentimento_registo_imutavel();
-- DROP TABLE "ConsentimentoRegisto";
