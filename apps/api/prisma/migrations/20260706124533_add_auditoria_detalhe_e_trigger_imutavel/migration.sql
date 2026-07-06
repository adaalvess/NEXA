-- AlterTable
ALTER TABLE "RegistoAuditoria" ADD COLUMN     "detalhe" JSONB;

-- Imutabilidade a nível de BD (Data & Consistency Rules, 3.3; Especificação
-- Técnica do Passo 6, 3.4) — aplica-se a TODOS os roles, incluindo o owner
-- (ao contrário do RLS, triggers não têm bypass por ownership).
CREATE OR REPLACE FUNCTION registo_auditoria_imutavel() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'RegistoAuditoria é append-only — UPDATE/DELETE nunca são permitidos (Data & Consistency Rules, 3.3)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registo_auditoria_imutavel
  BEFORE UPDATE OR DELETE ON "RegistoAuditoria"
  FOR EACH ROW EXECUTE FUNCTION registo_auditoria_imutavel();

-- Reverso documentado (Especificação Técnica do Passo 6, plano de rollback
-- implícito no mesmo padrão dos Passos 4/5) — não aplicado automaticamente:
-- DROP TRIGGER IF EXISTS trg_registo_auditoria_imutavel ON "RegistoAuditoria";
-- DROP FUNCTION IF EXISTS registo_auditoria_imutavel();
-- ALTER TABLE "RegistoAuditoria" DROP COLUMN "detalhe";
