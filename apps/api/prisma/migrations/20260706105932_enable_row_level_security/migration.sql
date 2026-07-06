-- Camada 2 (RLS) — ADR-001 §3.3, ADR-003 §3.2/3.3, Especificação Técnica do
-- Passo 4, §3.2.4. Segunda camada de isolamento multi-tenant, independente
-- da Camada 1 (TenantPrismaService) — reforça exatamente a mesma fronteira
-- de tenant, não uma responsabilidade nova (Defense in Depth).
--
-- current_setting(..., true) devolve NULL quando a variável de sessão não
-- está definida — NULL = qualquer coisa é sempre falso, logo negação por
-- defeito (regra não-negociável #14) sem tratamento especial.

-- Empresa é o próprio tenant — predicado por "id", não por "empresaId".
ALTER TABLE "Empresa" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Empresa"
  USING ("id" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("id" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Utilizador" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Utilizador"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Sessao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Sessao"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Departamento" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Departamento"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "RegistoAuditoria" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "RegistoAuditoria"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Partilha" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Partilha"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Processo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Processo"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Cliente" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Cliente"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Interacao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Interacao"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "SugestaoIA" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SugestaoIA"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "Notificacao" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Notificacao"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

ALTER TABLE "SubscricaoPlano" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SubscricaoPlano"
  USING ("empresaId" = current_setting('app.current_empresa_id', true))
  WITH CHECK ("empresaId" = current_setting('app.current_empresa_id', true));

-- ============================================================================
-- Reverso documentado (Especificação Técnica do Passo 4, §3.8 — Plano de
-- Rollback). Não aplicado automaticamente; executar manualmente se necessário:
--
-- DROP POLICY IF EXISTS tenant_isolation ON "Empresa";
-- ALTER TABLE "Empresa" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Utilizador";
-- ALTER TABLE "Utilizador" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Sessao";
-- ALTER TABLE "Sessao" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Departamento";
-- ALTER TABLE "Departamento" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "RegistoAuditoria";
-- ALTER TABLE "RegistoAuditoria" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Partilha";
-- ALTER TABLE "Partilha" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Processo";
-- ALTER TABLE "Processo" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Cliente";
-- ALTER TABLE "Cliente" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Interacao";
-- ALTER TABLE "Interacao" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "SugestaoIA";
-- ALTER TABLE "SugestaoIA" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "Notificacao";
-- ALTER TABLE "Notificacao" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS tenant_isolation ON "SubscricaoPlano";
-- ALTER TABLE "SubscricaoPlano" DISABLE ROW LEVEL SECURITY;
