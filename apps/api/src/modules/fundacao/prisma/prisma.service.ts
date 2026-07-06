import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Acesso ao PrismaClient para o módulo Fundação.
 *
 * Nota de arquitetura (ADR-003, 3.9 — Substituibilidade Controlada): este
 * serviço é, por enquanto, um wrapper fino sobre o PrismaClient, sem
 * injeção de contexto de tenant. A partir do Passo 4, a Camada 1 (middleware
 * de tenant + serviço único de autorização) passa a ser o único ponto de
 * acesso a dados para os módulos de negócio — este serviço fica então
 * encapsulado atrás dela, não substituído por ela.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
