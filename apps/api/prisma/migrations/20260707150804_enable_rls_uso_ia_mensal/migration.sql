-- Camada 2 (RLS) — mesma disciplina da migração 20260706105932 (Passo 4),
-- estendida à nova tabela UsoIAMensal (Especificação Técnica do Passo 15, 3.5).

ALTER TABLE "UsoIAMensal" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "UsoIAMensal"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));
