import { PrismaClient } from '@prisma/client';

/**
 * Elimina Empresas de teste que já têm entradas de RegistoAuditoria e/ou
 * ConsentimentoRegisto associadas (Passo 6 em diante — qualquer teste que
 * registe/faça login gera auditoria real; a partir do Passo 47, qualquer
 * teste que registe via `/auth/registar` gera também um registo de
 * consentimento). Os triggers de imutabilidade (Especificação Técnica do
 * Passo 6, 3.4; Especificação Técnica do Passo 47, Decisão B) bloqueiam
 * sempre UPDATE/DELETE nestas tabelas, incluindo via cascade a partir de
 * Empresa — por isso a limpeza de dados de teste tem de desativar ambos os
 * triggers, apagar, e reativá-los. `adminClient` liga como `nexa_dev`
 * (owner), com privilégio para o fazer; a aplicação em runtime nunca faz
 * isto.
 *
 * `ALTER TABLE ... DISABLE/ENABLE TRIGGER` é uma alteração de catálogo
 * **global**, não scoped à sessão (a alternativa `SET LOCAL
 * session_replication_role = replica` exigiria `nexa_dev` ser superuser, o
 * que não é — Least Privilege). Por ser global, os testes e2e **têm de
 * correr em série** (`--runInBand`, ver `test:e2e` em package.json), nunca
 * em paralelo — descoberto por uma falha intermitente real quando o Jest
 * corria ficheiros de teste em simultâneo e um reativava o trigger a meio
 * da limpeza de outro.
 *
 * Espera curta antes de eliminar (Passo 11, `NotificacaoListener`): esse
 * consumidor é fire-and-forget — a sua escrita em `Notificacao` pode ainda
 * estar em curso quando o teste chama esta função logo a seguir ao pedido
 * HTTP, e eliminar a Empresa nesse intervalo causa uma violação de chave
 * estrangeira (a escrita tenta referenciar uma Empresa já apagada). Este
 * atraso é só um artefacto de limpeza de teste — em produção a Empresa
 * nunca é eliminada fisicamente logo a seguir a uma ação (PSD-001, ainda
 * sem decisão de hard-delete).
 */
export async function limparEmpresasDeTeste(adminClient: PrismaClient, empresaIds: string[]): Promise<void> {
  if (empresaIds.length === 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 150));

  await adminClient.$executeRawUnsafe('ALTER TABLE "RegistoAuditoria" DISABLE TRIGGER trg_registo_auditoria_imutavel');
  await adminClient.$executeRawUnsafe('ALTER TABLE "ConsentimentoRegisto" DISABLE TRIGGER trg_consentimento_registo_imutavel');
  try {
    await adminClient.empresa.deleteMany({ where: { id: { in: empresaIds } } });
  } finally {
    await adminClient.$executeRawUnsafe('ALTER TABLE "RegistoAuditoria" ENABLE TRIGGER trg_registo_auditoria_imutavel');
    await adminClient.$executeRawUnsafe('ALTER TABLE "ConsentimentoRegisto" ENABLE TRIGGER trg_consentimento_registo_imutavel');
  }
}
