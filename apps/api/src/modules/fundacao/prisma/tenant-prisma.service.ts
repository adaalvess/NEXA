import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { tenantContext } from '../tenant/tenant-context';

/**
 * Camada 1 — implementação concreta do "middleware que injeta tenant_id em
 * cada transação" já previsto em ADR-003 (3.2). Especificação Técnica do
 * Passo 4, 3.2.3.
 *
 * Único caminho de acesso a dados de negócio permitido a partir deste passo
 * (Coding Standards, 3.3). O `PrismaService` bruto (Passo 2/3) fica privado
 * ao módulo Fundação — exceção documentada para `AuthService` (verificação
 * global de email no registo) e para o `TenantContextMiddleware` (resolução
 * de sessão, que acontece antes de existir um TenantContext).
 */

const OPERACOES_COM_DATA = new Set(['create', 'createMany']);
const OPERACOES_COM_WHERE = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

/** `Empresa` é o próprio tenant — não tem `empresaId` a filtrar. */
const MODELO_TENANT_RAIZ = 'Empresa';

function injetarFiltroTenant(operation: string, args: unknown, empresaId: string): unknown {
  const scoped: Record<string, unknown> = { ...(args as Record<string, unknown>) };

  if (OPERACOES_COM_DATA.has(operation)) {
    if (operation === 'createMany' && Array.isArray(scoped.data)) {
      scoped.data = (scoped.data as Record<string, unknown>[]).map((item) => ({ ...item, empresaId }));
    } else {
      scoped.data = { ...(scoped.data as Record<string, unknown>), empresaId };
    }
  }

  if (OPERACOES_COM_WHERE.has(operation)) {
    scoped.where = { ...(scoped.where as Record<string, unknown>), empresaId };
  }

  if (operation === 'upsert') {
    scoped.where = { ...(scoped.where as Record<string, unknown>), empresaId };
    scoped.create = { ...(scoped.create as Record<string, unknown>), empresaId };
    scoped.update = { ...(scoped.update as Record<string, unknown>), empresaId };
  }

  return scoped;
}

@Injectable()
export class TenantPrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaService.name);
  private readonly rawClient = new PrismaClient();

  /** Cliente Prisma com injeção automática de `empresaId` — usar sempre este, nunca o PrismaClient bruto, em módulos de negócio. */
  readonly client = this.rawClient.$extends({
    query: {
      $allModels: {
        $allOperations: async ({ model, operation, args, query }) => {
          if (model === MODELO_TENANT_RAIZ) {
            return query(args);
          }

          const ctx = tenantContext.getStore();
          if (!ctx) {
            // Fail Secure (Security & Access Principles, 3.9) — nunca executa
            // sem filtro de tenant, mesmo por engano.
            throw new Error(
              'TenantContext ausente — operação de negócio fora de um pedido autenticado ' +
                '(Especificação Técnica do Passo 4, 3.2.3).',
            );
          }

          const scopedArgs = injetarFiltroTenant(operation, args, ctx.empresaId);

          // SET LOCAL (via set_config, terceiro argumento TRUE) — o valor só
          // vive dentro desta transação, nunca vaza para outra ligação do
          // pool (Especificação Técnica do Passo 4, 3.2.4).
          //
          // `as any` deliberado: `query` aceita a união de ~190 tipos de
          // argumentos possíveis (um por modelo/operação); esta função opera
          // genericamente sobre qualquer modelo/operação, pelo que o Prisma
          // não consegue estreitar o tipo aqui — a validação de forma real
          // acontece nos testes (Especificação Técnica do Passo 4, 3.6).
          const [, resultado] = await this.rawClient.$transaction([
            this.rawClient.$executeRaw(
              Prisma.sql`SELECT set_config('app.current_empresa_id', ${ctx.empresaId}, TRUE)`,
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            query(scopedArgs as any),
          ]);

          return resultado;
        },
      },
    },
  });

  async onModuleInit() {
    await this.rawClient.$connect();
    this.logger.log('TenantPrismaService ligado (Camada 1 ativa).');
  }

  async onModuleDestroy() {
    await this.rawClient.$disconnect();
  }
}
