import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { ComercialController } from './comercial.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { SubscricaoListener } from './subscricao.listener';
import { SubscricaoService } from './subscricao.service';
import { SubscricaoGuard } from './subscricao.guard';
import { SubscricaoExceptionFilter } from './subscricao-exception.filter';
import { stripeClientProvider } from './stripe-client.provider';

/**
 * Módulo `comercial` (Especificações Técnicas dos Passos 19 e 20) — já
 * antecipado desde a regra não-negociável #1 ("Módulos: fundacao,
 * dashboard, processos, crm, ia, comercial"), agora construído. Importa
 * `FundacaoModule` para `TenantPrismaService`/`PermissaoGuard`/`SessionGuard`,
 * mesma disciplina de todos os módulos de negócio — nunca o inverso:
 * `FundacaoModule` nunca importa `ComercialModule` (toda a lógica de
 * subscrição, estados e limites fica centralizada aqui, exposta a outros
 * módulos via serviços, nunca o contrário).
 *
 * `SubscricaoGuard`/`SubscricaoExceptionFilter` registados globalmente
 * (`APP_GUARD`/`APP_FILTER`, Especificação Técnica do Passo 20, 3.1/3.5) —
 * garantem RN-11 uniforme em toda a aplicação estruturalmente, nunca por
 * convenção entre módulos. Os módulos de negócio só importam o decorator
 * leve `@BloqueadoPorSubscricao()`, nunca este módulo inteiro.
 */
@Module({
  imports: [FundacaoModule],
  controllers: [ComercialController, StripeWebhookController],
  providers: [
    SubscricaoListener,
    SubscricaoService,
    stripeClientProvider,
    { provide: APP_GUARD, useClass: SubscricaoGuard },
    { provide: APP_FILTER, useClass: SubscricaoExceptionFilter },
  ],
  exports: [SubscricaoService],
})
export class ComercialModule {}
