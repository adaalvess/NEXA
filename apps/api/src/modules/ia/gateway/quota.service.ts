import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantPrismaService } from '../../fundacao/prisma/tenant-prisma.service';
import { tenantContext } from '../../fundacao/tenant/tenant-context';
import { QuotaExcedidaError } from './errors';

// Lida a cada chamada (nunca cacheada a nível de módulo) — permite testar
// diferentes valores de quota sem depender da ordem de carregamento de
// módulos (import vs. definição de variável de ambiente).
function quotaPadraoMensal(): number {
  return Number(process.env.IA_QUOTA_PADRAO_MENSAL ?? 50);
}

function anoMesAtual(): string {
  const agora = new Date();
  return `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Imposição de quota por Empresa, antes de qualquer chamada ao fornecedor
 * (ADR-005 §3.3 ponto 6, D12; Especificação Técnica do Passo 15, 3.5).
 *
 * `SubscricaoPlano.limiteUsoIA` (Passo 2) é um teto configurável por plano,
 * nunca criado ainda para nenhuma Empresa (Comercial/M4 por construir) — na
 * ausência de `SubscricaoPlano`, usa-se o valor conservador temporário
 * `IA_QUOTA_PADRAO_MENSAL` (Decisão Já Validada E da Proposta do M3),
 * explicitamente marcado como configuração técnica, nunca a política
 * comercial definitiva. `UsoIAMensal` (novo, descoberta real deste passo)
 * é o contador real — `SubscricaoPlano.limiteUsoIA` nunca foi um contador,
 * só um teto, e decrementá-lo destruiria o valor original do limite.
 */
@Injectable()
export class QuotaService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async verificarEConsumir(): Promise<void> {
    const ctx = tenantContext.getStore();
    if (!ctx) {
      throw new UnauthorizedException();
    }

    const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId: ctx.empresaId } });
    const limite = subscricao?.limiteUsoIA ?? quotaPadraoMensal();

    const anoMes = anoMesAtual();
    const uso = await this.tenantPrisma.client.usoIAMensal.findUnique({
      where: { empresaId_anoMes: { empresaId: ctx.empresaId, anoMes } },
    });

    if ((uso?.contagem ?? 0) >= limite) {
      throw new QuotaExcedidaError();
    }

    await this.tenantPrisma.client.usoIAMensal.upsert({
      where: { empresaId_anoMes: { empresaId: ctx.empresaId, anoMes } },
      create: { empresaId: ctx.empresaId, anoMes, contagem: 1 },
      update: { contagem: { increment: 1 } },
    });
  }
}
