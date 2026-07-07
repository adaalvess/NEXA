import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { tenantContext } from '../../fundacao/tenant/tenant-context';
import { EVENTO_AUDITORIA, EventoAuditoria } from '../../fundacao/auditoria/eventos-auditoria';
import { AIAdapterInterface, AI_ADAPTER } from './adapters/ai-adapter.interface';
import { AIRequest, AIResponse } from './ai-gateway.types';
import { QuotaService } from './quota.service';
import { CircuitBreakerService } from './circuit-breaker';
import { CapacidadeNaoSuportadaError, ErroGenericoFornecedorError, FornecedorIndisponivelError, TimeoutIAError } from './errors';

// Lido a cada chamada, nunca cacheado a nível de módulo (mesma razão de
// quota.service.ts/circuit-breaker.ts).
function timeoutMs(): number {
  return Number(process.env.IA_TIMEOUT_MS ?? 30_000);
}

async function comTimeout<T>(promessa: Promise<T>, ms: number, fornecedor: string): Promise<T> {
  let temporizador: NodeJS.Timeout;
  const timeout = new Promise<never>((_resolve, reject) => {
    temporizador = setTimeout(() => reject(new TimeoutIAError(fornecedor)), ms);
  });
  try {
    return await Promise.race([promessa, timeout]);
  } finally {
    clearTimeout(temporizador!);
  }
}

/**
 * AI Gateway (ADR-005) — único ponto de acesso a qualquer fornecedor de IA
 * em toda a plataforma (Especificação Técnica do Passo 15). Sem endpoint de
 * produto neste passo — consumido a partir do Passo 16.
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    @Inject(AI_ADAPTER) private readonly adapter: AIAdapterInterface,
    private readonly quotaService: QuotaService,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async perguntar(pedido: AIRequest): Promise<AIResponse> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    // Negociação de capacidades (ADR-005 §3.5) — nunca degradação silenciosa.
    const capacidadeEmFalta = pedido.capacidadesRequeridas?.find((c) => !this.adapter.capacidadesSuportadas.includes(c));
    if (capacidadeEmFalta) {
      throw new CapacidadeNaoSuportadaError(capacidadeEmFalta, this.adapter.nome);
    }

    // Quota (ADR-005 D12) — sempre antes de qualquer chamada ao fornecedor.
    await this.quotaService.verificarEConsumir();

    // Circuit breaker (ADR-005 §3.8) — fail secure imediato, sem tentar a rede.
    if (this.circuitBreaker.estaAberto(this.adapter.nome)) {
      await this.auditar(ctx.empresaId, ctx.utilizadorId, 'fornecedor_indisponivel', undefined);
      throw new FornecedorIndisponivelError(this.adapter.nome);
    }

    const requestId = randomUUID();
    const inicio = Date.now();
    await this.auditar(ctx.empresaId, ctx.utilizadorId, 'pergunta_iniciada', requestId);

    try {
      const resposta = await comTimeout(this.adapter.enviar(pedido), timeoutMs(), this.adapter.nome);
      this.circuitBreaker.registarSucesso(this.adapter.nome);
      this.logger.log(
        `IA sucesso — empresa=${ctx.empresaId} fornecedor=${this.adapter.nome} duracaoMs=${Date.now() - inicio} requestId=${requestId}`,
      );
      await this.auditar(ctx.empresaId, ctx.utilizadorId, 'resposta_recebida', requestId, { fornecedorUsado: resposta.fornecedorUsado });
      return resposta;
    } catch (erro) {
      this.circuitBreaker.registarFalha(this.adapter.nome);
      const erroTraduzido = erro instanceof TimeoutIAError ? erro : new ErroGenericoFornecedorError(this.adapter.nome, erro);
      this.logger.warn(
        `IA falhou — empresa=${ctx.empresaId} fornecedor=${this.adapter.nome} duracaoMs=${Date.now() - inicio} requestId=${requestId} erro=${erroTraduzido.constructor.name}`,
      );
      await this.auditar(ctx.empresaId, ctx.utilizadorId, 'pergunta_falhou', requestId, { tipoErro: erroTraduzido.constructor.name });
      throw erroTraduzido;
    }
  }

  /**
   * Regista a interação no Registo de Auditoria (ADR-005 §3.3 ponto 4) —
   * cada evento é imediato e discreto em si mesmo, nunca pendente da
   * duração da chamada externa (ADR-005 D11). Nunca inclui o conteúdo
   * completo da pergunta/resposta aqui — só metadados (Especificação
   * Técnica do Passo 15, 3.8); o conteúdo, sujeito a retenção configurável
   * (PSD-003), é responsabilidade da entidade `SugestaoIA` (Passo 16).
   */
  private async auditar(empresaId: string, utilizadorId: string, acao: string, requestId?: string, detalhe?: Record<string, unknown>) {
    await this.eventEmitter.emitAsync(EVENTO_AUDITORIA, {
      empresaId,
      ator: utilizadorId,
      acao,
      entidade: 'InteracaoIA',
      entidadeId: requestId ?? randomUUID(),
      detalhe,
    } satisfies EventoAuditoria);
  }
}
