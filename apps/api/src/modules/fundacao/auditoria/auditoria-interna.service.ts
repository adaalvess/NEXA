import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Consulta cross-tenant do Registo de Auditoria, exclusiva do papel
 * `super_admin` (Especificação Técnica do Passo 6, 3.4/D5). Liga-se com o
 * role de BD dedicado `nexa_auditoria_interna` — `BYPASSRLS`, mas só
 * `SELECT` e só nesta tabela (Least Privilege).
 *
 * Nunca usado para nenhuma outra tabela nem para escrita — a própria
 * consulta do Super Admin é auditada pelo mecanismo normal (`AuditoriaListener`,
 * via `PrismaService`), não por este serviço.
 */
@Injectable()
export class AuditoriaInternaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditoriaInternaService.name);
  private readonly client = new PrismaClient({
    datasources: { db: { url: process.env.AUDITORIA_INTERNA_DATABASE_URL } },
  });

  async listarTodas(take: number, skip: number) {
    return this.client.registoAuditoria.findMany({
      orderBy: { timestamp: 'desc' },
      take,
      skip,
    });
  }

  async onModuleInit() {
    await this.client.$connect();
    this.logger.log('AuditoriaInternaService ligado (role nexa_auditoria_interna, só-leitura).');
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
