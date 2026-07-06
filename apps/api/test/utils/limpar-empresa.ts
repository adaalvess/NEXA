import { PrismaClient } from '@prisma/client';

/**
 * Elimina Empresas de teste que já têm entradas de RegistoAuditoria
 * associadas (Passo 6 em diante — qualquer teste que registe/faça login
 * gera auditoria real). O trigger de imutabilidade (Especificação Técnica
 * do Passo 6, 3.4) bloqueia sempre UPDATE/DELETE em RegistoAuditoria,
 * incluindo via cascade a partir de Empresa — por isso a limpeza de dados
 * de teste tem de desativar o trigger, apagar, e reativá-lo. `adminClient`
 * liga como `nexa_dev` (owner), com privilégio para o fazer; a aplicação
 * em runtime nunca faz isto.
 *
 * `ALTER TABLE ... DISABLE/ENABLE TRIGGER` é uma alteração de catálogo
 * **global**, não scoped à sessão (a alternativa `SET LOCAL
 * session_replication_role = replica` exigiria `nexa_dev` ser superuser, o
 * que não é — Least Privilege). Por ser global, os testes e2e **têm de
 * correr em série** (`--runInBand`, ver `test:e2e` em package.json), nunca
 * em paralelo — descoberto por uma falha intermitente real quando o Jest
 * corria ficheiros de teste em simultâneo e um reativava o trigger a meio
 * da limpeza de outro.
 */
export async function limparEmpresasDeTeste(adminClient: PrismaClient, empresaIds: string[]): Promise<void> {
  if (empresaIds.length === 0) {
    return;
  }

  await adminClient.$executeRawUnsafe('ALTER TABLE "RegistoAuditoria" DISABLE TRIGGER trg_registo_auditoria_imutavel');
  try {
    await adminClient.empresa.deleteMany({ where: { id: { in: empresaIds } } });
  } finally {
    await adminClient.$executeRawUnsafe('ALTER TABLE "RegistoAuditoria" ENABLE TRIGGER trg_registo_auditoria_imutavel');
  }
}
