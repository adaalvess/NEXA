-- Camada 2 (RLS) — mesma disciplina das migrações 20260706105932 (Passo 4)
-- e 20260707150804 (Passo 15), estendida à nova tabela
-- WebhookStripeProcessado (Especificação Técnica do Passo 22, 3.1).

ALTER TABLE "WebhookStripeProcessado" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WebhookStripeProcessado"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));
