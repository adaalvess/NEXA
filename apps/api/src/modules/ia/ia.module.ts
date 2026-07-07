import { Module } from '@nestjs/common';
import { FundacaoModule } from '../fundacao/fundacao.module';
import { AiGatewayService } from './gateway/ai-gateway.service';
import { QuotaService } from './gateway/quota.service';
import { CircuitBreakerService } from './gateway/circuit-breaker';
import { AI_ADAPTER } from './gateway/adapters/ai-adapter.interface';
import { AnthropicAdapter } from './gateway/adapters/anthropic.adapter';

/**
 * Módulo `ia` (Especificação Técnica do Passo 15) — primeiro passo do M3.
 * Sem controlador nesta fase (sem endpoints de produto, ver 1 da
 * especificação); só a infraestrutura do AI Gateway de que os Passos 16/17
 * dependem. Importa `FundacaoModule` para `TenantPrismaService`, mesma
 * disciplina de todos os módulos de negócio (regra não-negociável #1).
 *
 * `IA_FORNECEDOR_PADRAO` seleciona o adaptador por configuração, nunca por
 * código (System Design Principles, 3.5) — só `anthropic` implementado
 * neste passo (Decisão Já Validada A da Proposta do M3); estrutura pronta
 * para outros fornecedores sem alterar este módulo.
 */
@Module({
  imports: [FundacaoModule],
  providers: [
    AiGatewayService,
    QuotaService,
    CircuitBreakerService,
    { provide: AI_ADAPTER, useClass: AnthropicAdapter },
  ],
  exports: [AiGatewayService],
})
export class IaModule {}
