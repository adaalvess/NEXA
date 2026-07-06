import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Acesso ao PrismaClient para as operações transversais da Fundação
 * (registo, resolução de sessão) — nunca para módulos de negócio, que usam
 * `TenantPrismaService` (Camada 1, Passo 4).
 *
 * Liga-se com o role de BD `nexa_fundacao` (`FUNDACAO_DATABASE_URL`), com o
 * atributo `BYPASSRLS` — distinto de `nexa_app` (usado pelo
 * `TenantPrismaService`, sujeito a RLS). Justificação (Especificação Técnica
 * do Passo 4, correção pós-implementação): o registo cria uma Empresa nova,
 * que genuinamente não tem `empresaId` a definir na sessão de BD (é o
 * próprio bootstrap); a resolução de sessão acontece antes de existir
 * qualquer tenant conhecido. Ambos os casos são a mesma exceção já
 * documentada desde o Passo 3 (Fundação como única camada com acesso
 * transversal, System Design Principles 3.2, D3) — `nexa_fundacao` tem
 * exatamente os mesmos privilégios DML de `nexa_app` (nenhum DDL), só
 * ignora RLS; não é um alargamento de privilégio além do estritamente
 * necessário (Least Privilege, Security & Access Principles 3.9).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: process.env.FUNDACAO_DATABASE_URL },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
