-- Camada 2 (RLS) — mesma disciplina das migrações 20260706105932 (Passo 4)
-- e 20260708090948 (Passo 22), estendida à nova tabela ConviteUtilizador
-- (Especificação Técnica do Passo 29, 3.3).

ALTER TABLE "ConviteUtilizador" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ConviteUtilizador"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));