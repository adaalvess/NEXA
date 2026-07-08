import { Injectable } from '@nestjs/common';
import { EstadoSubscricao } from '@prisma/client';
import { TenantPrismaService } from '../fundacao/prisma/tenant-prisma.service';

// FR-30, literal — não uma configuração de negócio em aberto.
const TRIAL_DURACAO_DIAS = 14;

/**
 * Único ponto de cálculo do estado efetivo de subscrição (Especificação
 * Técnica do Passo 20, 3.1) — consumido pelo `SubscricaoGuard` (RN-11) e,
 * no futuro, por `GET /subscricao` (Passo 23), nunca duplicado.
 *
 * "Efetivo" distingue-se do `estado` armazenado em `SubscricaoPlano`: um
 * trial expirado nunca é escrito como `limitada` por um job em segundo
 * plano (o projeto evita deliberadamente introduzir infraestrutura de
 * tarefas agendadas antes de ser genuinamente necessária, mesmo raciocínio
 * já usado em PSD-003/ADR-005 §3.9a) — é sempre recalculado a partir de
 * `trialIniciadoEm`. `estado` armazenado só muda por eventos reais
 * (pagamento confirmado, Passo 22).
 */
@Injectable()
export class SubscricaoService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async obterEstadoEfetivo(empresaId: string): Promise<EstadoSubscricao> {
    const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId } });

    // Fail Secure — nunca deveria acontecer desde o Passo 19 (toda Empresa
    // ganha uma subscrição de trial automaticamente), mas a ausência de
    // dados nunca é lida como acesso total.
    if (!subscricao) {
      return 'limitada';
    }

    if (subscricao.estado === 'trial') {
      const diasDesde = (Date.now() - subscricao.trialIniciadoEm.getTime()) / (1000 * 60 * 60 * 24);
      return diasDesde > TRIAL_DURACAO_DIAS ? 'limitada' : 'trial';
    }

    return subscricao.estado;
  }
}
