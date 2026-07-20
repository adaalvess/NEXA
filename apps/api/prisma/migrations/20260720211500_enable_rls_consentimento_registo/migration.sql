-- Camada 2 (RLS) — mesma disciplina das migrações 20260706105932 (Passo 4)
-- e 20260708192722 (Passo 29), estendida à nova tabela ConsentimentoRegisto
-- (Especificação Técnica do Passo 47, 3.4/Decisão A).

ALTER TABLE "ConsentimentoRegisto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ConsentimentoRegisto"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));
