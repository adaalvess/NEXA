import { Module } from '@nestjs/common';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { AiGatewayService } from './gateway/ai-gateway.service';
import { QuotaService } from './gateway/quota.service';
import { CircuitBreakerService } from './gateway/circuit-breaker';
import { AI_ADAPTER } from './gateway/adapters/ai-adapter.interface';
import { AnthropicAdapter } from './gateway/adapters/anthropic.adapter';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';

/**
 * Módulo `ia` (Especificações Técnicas dos Passos 15 e 16). Importa
 * `FundacaoModule` para `TenantPrismaService`/`AuthorizationService`, mesma
 * disciplina de todos os módulos de negócio (regra não-negociável #1).
 *
 * `IA_FORNECEDOR_PADRAO` seleciona o adaptador por configuração, nunca por
 * código (System Design Principles, 3.5) — só `anthropic` implementado
 * neste passo (Decisão Já Validada A da Proposta do M3); estrutura pronta
 * para outros fornecedores sem alterar este módulo.
 */
@Module({
  imports: [FundacaoModule],
  controllers: [IaController],
  providers: [
    AiGatewayService,
    QuotaService,
    CircuitBreakerService,
    IaService,
    { provide: AI_ADAPTER, useClass: AnthropicAdapter },
  ],
  exports: [AiGatewayService],
})
export class IaModule {}
