import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { FundacaoModule } from './modules/fundacao/fundacao.module';
import { ProcessosModule } from './modules/processos/processos.module';
import { CrmModule } from './modules/crm/crm.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IaModule } from './modules/ia/ia.module';

/**
 * Módulo raiz da aplicação NEXA.
 *
 * Nota de arquitetura (System Design Principles, 3.1-3.2): este módulo raiz
 * apenas importa módulos de domínio — nunca contém lógica de negócio
 * diretamente. Cada módulo de domínio (fundacao, dashboard, processos, crm,
 * ia, comercial) é auto-contido e só comunica com os outros através de
 * interfaces explícitas ou eventos, nunca por acesso direto a dados.
 *
 * Módulos de domínio são adicionados aqui progressivamente, um passo de
 * cada vez.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting de base (Especificação Técnica do Passo 3, 3.2.4) —
    // valores por rota via @Throttle, este é só o limite por defeito global.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    FundacaoModule,
    ProcessosModule,
    CrmModule,
    DashboardModule,
    IaModule,
    // Módulos de domínio a adicionar aqui: Comercial.
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
